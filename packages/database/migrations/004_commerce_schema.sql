-- ============================================================================
-- Migration 004: Commerce Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Full commerce pipeline from cart through order, reservation,
--          refund, and protection add-ons. Supports multi-supplier bookings,
--          Stripe/PSP integration, and AI-driven risk scoring per reservation.
--
-- Dependencies:
--   - 001 (assumed): uuid-ossp extension
--   - 002 (assumed): identity schema (identity.identity_user)
--   - 003: trip schema (trip.trip_trip)
--   - Travel Graph schema: tg.tg_product, tg.tg_inventory_slot,
--     tg.tg_supplier, tg.tg_venue, tg.tg_policy
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS commerce;

-- ============================================================================
-- commerce.commerce_cart
-- ----------------------------------------------------------------------------
-- Shopping cart for accumulating bookable items before checkout. Optionally
-- tied to a trip so the AI can pre-populate the cart from itinerary gaps.
-- Status lifecycle: open -> submitted -> converted (or abandoned).
-- ============================================================================
CREATE TABLE commerce.commerce_cart (
    cart_id    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL
                           REFERENCES identity.identity_user (user_id),
    trip_id    UUID        REFERENCES trip.trip_trip (trip_id),
    status     TEXT        NOT NULL DEFAULT 'open'
                           CHECK (status IN ('open', 'submitted', 'abandoned', 'converted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE commerce.commerce_cart IS
    'Shopping cart for accumulating bookable travel items before checkout. Optionally linked to a trip.';

-- Primary query: "show the user their open cart(s)"
CREATE INDEX idx_commerce_cart_user_status
    ON commerce.commerce_cart (user_id, status);

-- ============================================================================
-- commerce.commerce_cart_item
-- ----------------------------------------------------------------------------
-- Individual line items inside a cart. Each references a Travel Graph product
-- and optionally a specific inventory slot (date/time/capacity). Price is
-- captured at add-to-cart time so the UI can show price-change warnings if
-- the underlying product price drifts before checkout.
-- ============================================================================
CREATE TABLE commerce.commerce_cart_item (
    cart_item_id UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id      UUID         NOT NULL
                              REFERENCES commerce.commerce_cart (cart_id) ON DELETE CASCADE,
    product_id   UUID         NOT NULL,  -- FK to tg.tg_product; enforced at app layer
    slot_id      UUID,                   -- FK to tg.tg_inventory_slot; enforced at app layer
    quantity     INT          NOT NULL DEFAULT 1
                              CHECK (quantity > 0),
    price        NUMERIC(12,2) NOT NULL
                              CHECK (price >= 0),
    currency     CHAR(3)      NOT NULL DEFAULT 'USD',
    metadata     JSONB        NOT NULL DEFAULT '{}'::jsonb,

    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Prevent the same product+slot from appearing twice in a cart
-- (Uses a unique index with COALESCE since UNIQUE constraints can't contain expressions)
CREATE UNIQUE INDEX uq_cart_item_product_slot
    ON commerce.commerce_cart_item (cart_id, product_id, COALESCE(slot_id, '00000000-0000-0000-0000-000000000000'::uuid));

COMMENT ON TABLE commerce.commerce_cart_item IS
    'Line items in a shopping cart. Price captured at add-time enables drift detection before checkout.';

CREATE INDEX idx_commerce_cart_item_cart
    ON commerce.commerce_cart_item (cart_id);

-- ============================================================================
-- commerce.commerce_order
-- ----------------------------------------------------------------------------
-- Represents a completed checkout attempt. An order groups one or more
-- reservations under a single payment intent. The order_status tracks the
-- payment lifecycle independently from individual reservation statuses so
-- partial refunds and split payments work cleanly.
-- ============================================================================
CREATE TABLE commerce.commerce_order (
    order_id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID          NOT NULL
                                    REFERENCES identity.identity_user (user_id),
    trip_id           UUID          REFERENCES trip.trip_trip (trip_id),
    order_status      TEXT          NOT NULL DEFAULT 'pending_payment'
                                    CHECK (order_status IN (
                                        'pending_payment', 'paid', 'partially_refunded',
                                        'refunded', 'failed', 'cancelled'
                                    )),
    total_amount      NUMERIC(12,2) NOT NULL
                                    CHECK (total_amount >= 0),
    currency          CHAR(3)       NOT NULL DEFAULT 'USD',
    payment_intent_id TEXT,         -- Stripe / PSP payment intent reference
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE commerce.commerce_order IS
    'Checkout-level aggregate grouping reservations under a single payment intent. Tracks payment lifecycle.';

-- Primary query: "show this user their recent orders by status"
CREATE INDEX idx_commerce_order_user_status
    ON commerce.commerce_order (user_id, order_status);

-- ============================================================================
-- commerce.commerce_reservation
-- ----------------------------------------------------------------------------
-- The core booking record. Every confirmed (or pending) reservation lives
-- here regardless of type -- dining, experience, stay, rental, cruise,
-- flight, insurance, or ancillary. Links back to the Travel Graph for
-- supplier, venue, product, slot, and cancellation policy. The risk JSONB
-- column stores AI-computed risk signals (supplier reliability, weather
-- exposure, rebooking difficulty) that feed into trip health scoring.
-- ============================================================================
CREATE TABLE commerce.commerce_reservation (
    reservation_id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id                  UUID          REFERENCES commerce.commerce_order (order_id),
    user_id                   UUID          NOT NULL
                                            REFERENCES identity.identity_user (user_id),
    trip_id                   UUID          REFERENCES trip.trip_trip (trip_id),
    reservation_type          TEXT          NOT NULL
                                            CHECK (reservation_type IN (
                                                'dining', 'experience', 'stay', 'rental',
                                                'cruise', 'flight', 'insurance', 'ancillary'
                                            )),
    supplier_id               UUID,         -- FK to tg.tg_supplier; enforced at app layer
    venue_id                  UUID,         -- FK to tg.tg_venue; enforced at app layer
    product_id                UUID,         -- FK to tg.tg_product; enforced at app layer
    slot_id                   UUID,         -- FK to tg.tg_inventory_slot; enforced at app layer
    start_at                  TIMESTAMPTZ,
    end_at                    TIMESTAMPTZ,
    party_size                INT           CHECK (party_size IS NULL OR party_size > 0),
    status                    TEXT          NOT NULL DEFAULT 'requested'
                                            CHECK (status IN (
                                                'requested', 'confirmed', 'cancelled',
                                                'completed', 'failed', 'modified'
                                            )),
    policy_id                 UUID,         -- FK to tg.tg_policy; enforced at app layer
    external_confirmation_code TEXT,        -- Supplier-facing confirmation code
    external_provider         TEXT,         -- Name/ID of upstream provider (e.g., 'resy', 'sabre')
    external_reservation_id   TEXT,         -- Provider's internal reservation ID
    price_paid                NUMERIC(12,2) CHECK (price_paid IS NULL OR price_paid >= 0),
    currency                  CHAR(3),
    risk                      JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- Guard against end preceding start when both are set
    CONSTRAINT commerce_reservation_time_range_check
        CHECK (start_at IS NULL OR end_at IS NULL OR end_at >= start_at)
);

COMMENT ON TABLE commerce.commerce_reservation IS
    'Core booking record for all reservation types. Links to Travel Graph entities and carries AI risk signals.';

-- Primary query: "show this user their upcoming confirmed reservations"
CREATE INDEX idx_commerce_reservation_user_status_start
    ON commerce.commerce_reservation (user_id, status, start_at);

-- Trip-scoped lookups for itinerary rendering
CREATE INDEX idx_commerce_reservation_trip
    ON commerce.commerce_reservation (trip_id);

-- Type + status for analytics and batch operations (e.g., "all pending dining")
CREATE INDEX idx_commerce_reservation_type_status
    ON commerce.commerce_reservation (reservation_type, status);

-- ============================================================================
-- commerce.commerce_refund
-- ----------------------------------------------------------------------------
-- Tracks refund requests and their processing lifecycle. Each refund is tied
-- to a specific reservation (and optionally to the parent order for ledger
-- reconciliation). The provider_refund_id stores the PSP's refund reference
-- for audit trails.
-- ============================================================================
CREATE TABLE commerce.commerce_refund (
    refund_id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id     UUID          NOT NULL
                                     REFERENCES commerce.commerce_reservation (reservation_id),
    order_id           UUID          REFERENCES commerce.commerce_order (order_id),
    amount             NUMERIC(12,2) NOT NULL
                                     CHECK (amount > 0),
    currency           CHAR(3)       NOT NULL,
    reason             TEXT,
    status             TEXT          NOT NULL DEFAULT 'requested'
                                     CHECK (status IN ('requested', 'approved', 'processed', 'failed')),
    provider_refund_id TEXT,         -- PSP refund reference for audit
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE commerce.commerce_refund IS
    'Refund lifecycle tracking per reservation. Stores PSP refund reference for audit reconciliation.';

CREATE INDEX idx_commerce_refund_reservation
    ON commerce.commerce_refund (reservation_id);

-- ============================================================================
-- commerce.commerce_protection_addon
-- ----------------------------------------------------------------------------
-- Value-added protection products attached to a reservation. These are the
-- monetised trust layer: price freeze, cancel-for-any-reason, change-for-
-- any-reason, disruption credit, and refund speed guarantee. The terms JSONB
-- column stores the specific contractual terms (coverage window, max payout,
-- conditions) so the AI agent can evaluate eligibility at claim time.
-- ============================================================================
CREATE TABLE commerce.commerce_protection_addon (
    addon_id       UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID          NOT NULL
                                 REFERENCES commerce.commerce_reservation (reservation_id),
    addon_type     TEXT          NOT NULL
                                 CHECK (addon_type IN (
                                     'price_freeze', 'cancel_any_reason',
                                     'change_any_reason', 'disruption_credit',
                                     'refund_speed_guarantee'
                                 )),
    terms          JSONB         NOT NULL DEFAULT '{}'::jsonb,
    price          NUMERIC(12,2) NOT NULL
                                 CHECK (price >= 0),
    currency       CHAR(3)       NOT NULL DEFAULT 'USD',
    status         TEXT          NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE commerce.commerce_protection_addon IS
    'Protection products (price freeze, CFAR, etc.) attached to reservations. Terms JSONB drives AI claim eligibility.';

CREATE INDEX idx_commerce_protection_addon_reservation_type
    ON commerce.commerce_protection_addon (reservation_id, addon_type);

-- ============================================================================
-- Now that commerce.commerce_reservation exists, add the deferred FK from
-- trip.trip_itinerary_item.reservation_id back to it.
-- ============================================================================
ALTER TABLE trip.trip_itinerary_item
    ADD CONSTRAINT fk_itinerary_item_reservation
    FOREIGN KEY (reservation_id) REFERENCES commerce.commerce_reservation (reservation_id);

-- ============================================================================
-- Updated-at trigger function (schema-local copy for independence)
-- ============================================================================
CREATE OR REPLACE FUNCTION commerce.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at on commerce_cart
CREATE TRIGGER trg_commerce_cart_updated_at
    BEFORE UPDATE ON commerce.commerce_cart
    FOR EACH ROW EXECUTE FUNCTION commerce.set_updated_at();

-- Auto-update updated_at on commerce_order
CREATE TRIGGER trg_commerce_order_updated_at
    BEFORE UPDATE ON commerce.commerce_order
    FOR EACH ROW EXECUTE FUNCTION commerce.set_updated_at();

-- Auto-update updated_at on commerce_reservation
CREATE TRIGGER trg_commerce_reservation_updated_at
    BEFORE UPDATE ON commerce.commerce_reservation
    FOR EACH ROW EXECUTE FUNCTION commerce.set_updated_at();

-- Auto-update updated_at on commerce_refund
CREATE TRIGGER trg_commerce_refund_updated_at
    BEFORE UPDATE ON commerce.commerce_refund
    FOR EACH ROW EXECUTE FUNCTION commerce.set_updated_at();

-- Auto-update updated_at on commerce_protection_addon
CREATE TRIGGER trg_commerce_protection_addon_updated_at
    BEFORE UPDATE ON commerce.commerce_protection_addon
    FOR EACH ROW EXECUTE FUNCTION commerce.set_updated_at();

COMMIT;
