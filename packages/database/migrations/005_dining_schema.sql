-- ============================================================================
-- Migration 005: Dining Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Full dining domain covering restaurant configuration, floor plans,
--          tables, service periods, shifts, reservation slots, waitlists,
--          notification requests, policies, experiences, messaging, and
--          loyalty points.
--
-- Dependencies:
--   - 001 (assumed): uuid-ossp extension
--   - Travel Graph schema: tg.tg_venue, tg.tg_supplier, tg.tg_policy,
--                          tg.tg_product
--   - Commerce schema: commerce.commerce_reservation
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS dining;

-- ============================================================================
-- dining.dining_restaurant
-- ----------------------------------------------------------------------------
-- Root aggregate for every restaurant integrated with Atlas One. Links to the
-- Travel Graph venue and supplier records. Controls global reservation
-- settings such as maximum party size and default turn times. The settings
-- JSONB column holds operator-configurable overrides (timezone, locale,
-- notification preferences, etc.).
-- ============================================================================
CREATE TABLE dining.dining_restaurant (
    restaurant_id       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id            UUID        NOT NULL UNIQUE,
                                    -- FK -> tg.tg_venue (venue_id)
    supplier_id         UUID        NOT NULL,
                                    -- FK -> tg.tg_supplier (supplier_id)
    reservation_enabled BOOLEAN     NOT NULL DEFAULT TRUE,
    max_party_size      INT         NOT NULL DEFAULT 20,
    default_turn_time_min INT       NOT NULL DEFAULT 90,
    settings            JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dining.dining_restaurant IS
    'Root aggregate for an integrated restaurant. Links to Travel Graph venue/supplier and holds global reservation configuration.';

-- ============================================================================
-- dining.dining_floorplan
-- ----------------------------------------------------------------------------
-- Visual floor-plan definition for a restaurant. The layout JSONB column
-- stores table positions, coordinates, section boundaries, and rendering
-- metadata consumed by the front-end drag-and-drop editor. Multiple floor
-- plans can exist (e.g. "Main Floor", "Rooftop"), but only active ones are
-- presented during host seating.
-- ============================================================================
CREATE TABLE dining.dining_floorplan (
    floorplan_id  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID        NOT NULL
                              REFERENCES dining.dining_restaurant (restaurant_id)
                              ON DELETE CASCADE,
    name          TEXT        NOT NULL,
    layout        JSONB       NOT NULL DEFAULT '{}'::jsonb,
    active        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dining.dining_floorplan IS
    'Visual floor-plan layout for a restaurant. Stores table positions, section boundaries, and rendering metadata.';

CREATE INDEX idx_dining_floorplan_restaurant
    ON dining.dining_floorplan (restaurant_id);

-- ============================================================================
-- dining.dining_table
-- ----------------------------------------------------------------------------
-- Physical or logical table within a restaurant. Each table has capacity
-- bounds and an optional section classification. The attributes JSONB column
-- captures qualitative properties (quiet, window, accessible, romantic, view,
-- stroller_friendly) used by the AI seat-assignment engine. A table may
-- optionally be linked to a specific floor plan for visual placement.
-- ============================================================================
CREATE TABLE dining.dining_table (
    table_id      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID        NOT NULL
                              REFERENCES dining.dining_restaurant (restaurant_id)
                              ON DELETE CASCADE,
    floorplan_id  UUID        REFERENCES dining.dining_floorplan (floorplan_id),
    label         TEXT        NOT NULL,
    min_party     INT         NOT NULL DEFAULT 1,
    max_party     INT         NOT NULL DEFAULT 4,
    section       TEXT        CHECK (section IN ('main', 'patio', 'bar', 'private', 'window', 'terrace')),
    attributes    JSONB       NOT NULL DEFAULT '{}'::jsonb,
    active        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT dining_table_party_range_check
        CHECK (min_party >= 1 AND max_party >= min_party)
);

COMMENT ON TABLE dining.dining_table IS
    'Physical or logical table with capacity bounds, section classification, and qualitative attributes for AI seat assignment.';

-- Primary query: "show all tables in a section for this restaurant"
CREATE INDEX idx_dining_table_restaurant_section
    ON dining.dining_table (restaurant_id, section);

-- ============================================================================
-- dining.dining_service_period
-- ----------------------------------------------------------------------------
-- Named recurring service window for a restaurant (breakfast, brunch, lunch,
-- dinner, late_night). Defines the time range, applicable days of the week,
-- default turn time, and pacing controls. Pacing governs how many covers the
-- host stand accepts per interval to avoid kitchen overload.
-- ============================================================================
CREATE TABLE dining.dining_service_period (
    service_period_id   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id       UUID        NOT NULL
                                    REFERENCES dining.dining_restaurant (restaurant_id)
                                    ON DELETE CASCADE,
    name                TEXT        NOT NULL
                                    CHECK (name IN ('breakfast', 'brunch', 'lunch', 'dinner', 'late_night')),
    start_time          TIME        NOT NULL,
    end_time            TIME        NOT NULL,
    days_of_week        INT[]       NOT NULL,
                                    -- 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    default_turn_time_min INT      NOT NULL DEFAULT 90,
    default_pacing      INT         NOT NULL DEFAULT 4,
                                    -- covers per interval
    pacing_interval_min INT         NOT NULL DEFAULT 15,
    active              BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dining.dining_service_period IS
    'Named recurring service window (breakfast, lunch, dinner, etc.) with time range, day-of-week schedule, and pacing controls.';

CREATE INDEX idx_dining_service_period_restaurant_name
    ON dining.dining_service_period (restaurant_id, name);

-- ============================================================================
-- dining.dining_shift
-- ----------------------------------------------------------------------------
-- A concrete instance of a service period on a specific date. Shifts are
-- generated from service periods and can carry per-timeslot pacing overrides
-- (e.g. reduce covers during a private event). Status controls whether the
-- shift accepts new reservations.
-- ============================================================================
CREATE TABLE dining.dining_shift (
    shift_id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id     UUID        NOT NULL
                                  REFERENCES dining.dining_restaurant (restaurant_id)
                                  ON DELETE CASCADE,
    service_period_id UUID        NOT NULL
                                  REFERENCES dining.dining_service_period (service_period_id),
    date              DATE        NOT NULL,
    start_at          TIMESTAMPTZ NOT NULL,
    end_at            TIMESTAMPTZ NOT NULL,
    pacing_override   JSONB,
                                  -- per-timeslot pacing overrides
    notes             TEXT,
    status            TEXT        NOT NULL DEFAULT 'open'
                                  CHECK (status IN ('open', 'closed', 'special')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Only one shift per service period per date per restaurant
    CONSTRAINT uq_dining_shift_restaurant_period_date
        UNIQUE (restaurant_id, service_period_id, date)
);

COMMENT ON TABLE dining.dining_shift IS
    'Concrete instance of a service period on a specific date. Carries pacing overrides and controls reservation acceptance.';

CREATE INDEX idx_dining_shift_restaurant_date
    ON dining.dining_shift (restaurant_id, date);

-- ============================================================================
-- dining.dining_slot
-- ----------------------------------------------------------------------------
-- An individual bookable time slot within a shift. Slots are the atomic unit
-- of availability that the reservation engine presents to guests. Each slot
-- tracks party-size range, availability status, which tables are assignable,
-- and an optional price tier for dynamic pricing (e.g. premium Saturday 8pm
-- vs. off-peak Tuesday 5pm).
-- ============================================================================
CREATE TABLE dining.dining_slot (
    dining_slot_id      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id       UUID        NOT NULL
                                    REFERENCES dining.dining_restaurant (restaurant_id),
    shift_id            UUID        REFERENCES dining.dining_shift (shift_id),
    start_at            TIMESTAMPTZ NOT NULL,
    duration_min        INT         NOT NULL DEFAULT 90,
    party_size_min      INT         NOT NULL DEFAULT 1,
    party_size_max      INT         NOT NULL DEFAULT 10,
    availability_status TEXT        NOT NULL DEFAULT 'open'
                                    CHECK (availability_status IN ('open', 'hold', 'closed', 'sold_out')),
    tables_available    JSONB       NOT NULL DEFAULT '[]'::jsonb,
                                    -- array of table_id UUIDs
    price_tier          TEXT        CHECK (price_tier IN ('standard', 'premium', 'off_peak')),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dining.dining_slot IS
    'Atomic bookable time slot within a shift. Tracks availability, assignable tables, party-size range, and price tier.';

-- Primary query: "find open slots at this restaurant starting after X"
CREATE INDEX idx_dining_slot_restaurant_start_status
    ON dining.dining_slot (restaurant_id, start_at, availability_status);

-- ============================================================================
-- dining.dining_waitlist
-- ----------------------------------------------------------------------------
-- Walk-in waitlist for a restaurant. Tracks party details, quoted and actual
-- wait times, and lifecycle status. Supports both registered users (user_id)
-- and anonymous walk-ins (name + phone/email). The status progression is:
-- waiting -> notified -> seated (happy path), with cancelled/no_show/expired
-- as terminal states.
-- ============================================================================
CREATE TABLE dining.dining_waitlist (
    waitlist_id     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id   UUID        NOT NULL
                                REFERENCES dining.dining_restaurant (restaurant_id),
    user_id         UUID,
                                -- Nullable: anonymous walk-ins have no account
    name            TEXT        NOT NULL,
    phone           TEXT,
    email           TEXT,
    party_size      INT         NOT NULL,
    quoted_wait_min INT,
    actual_wait_min INT,
    status          TEXT        NOT NULL DEFAULT 'waiting'
                                CHECK (status IN ('waiting', 'notified', 'seated', 'cancelled', 'no_show', 'expired')),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dining.dining_waitlist IS
    'Walk-in waitlist tracking party details, wait times, and lifecycle status. Supports both registered and anonymous guests.';

-- Primary query: "show current waitlist for this restaurant ordered by arrival"
CREATE INDEX idx_dining_waitlist_restaurant_status_created
    ON dining.dining_waitlist (restaurant_id, status, created_at);

-- ============================================================================
-- dining.dining_notify_request
-- ----------------------------------------------------------------------------
-- "Notify me when a table opens" request. Luxury-tier users can be given
-- priority_level = 'luxury_priority' so the matching engine surfaces them
-- first when a cancellation frees a slot. The preferences JSONB stores
-- seating, vibe, and dietary requirements for intelligent matching.
-- ============================================================================
CREATE TABLE dining.dining_notify_request (
    notify_id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id     UUID        NOT NULL
                                  REFERENCES dining.dining_restaurant (restaurant_id),
    user_id           UUID        NOT NULL,
    party_size        INT         NOT NULL,
    target_date       DATE        NOT NULL,
    time_window_start TIME        NOT NULL,
    time_window_end   TIME        NOT NULL,
    preferences       JSONB       NOT NULL DEFAULT '{}'::jsonb,
                                  -- seating, vibe, dietary
    priority_level    TEXT        NOT NULL DEFAULT 'standard'
                                  CHECK (priority_level IN ('standard', 'luxury_priority')),
    status            TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active', 'fulfilled', 'expired', 'cancelled')),
    fulfilled_slot_id UUID        REFERENCES dining.dining_slot (dining_slot_id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dining.dining_notify_request IS
    'Table availability notification request with party preferences and priority level for intelligent cancellation matching.';

-- Primary query: "find active requests for this restaurant on a given date"
CREATE INDEX idx_dining_notify_request_restaurant_date_status
    ON dining.dining_notify_request (restaurant_id, target_date, status);

-- Secondary query: "show all active notification requests for a user"
CREATE INDEX idx_dining_notify_request_user_status
    ON dining.dining_notify_request (user_id, status);

-- ============================================================================
-- dining.dining_policy
-- ----------------------------------------------------------------------------
-- Reservation policy configuration for a restaurant, linked to a Travel
-- Graph policy record for canonical policy text. The applies_to JSONB
-- controls scope (party sizes, days, service periods, time ranges). Supports
-- card-hold and no-show fee enforcement to reduce no-shows at high-demand
-- restaurants.
-- ============================================================================
CREATE TABLE dining.dining_policy (
    dining_policy_id        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id           UUID          NOT NULL
                                          REFERENCES dining.dining_restaurant (restaurant_id),
    policy_id               UUID          NOT NULL,
                                          -- FK -> tg.tg_policy (policy_id)
    applies_to              JSONB         NOT NULL DEFAULT '{}'::jsonb,
                                          -- party_sizes, days, service_periods, time_ranges
    card_hold_amount        NUMERIC(12,2),
                                          -- per-person hold for no-show
    card_hold_currency      CHAR(3)       NOT NULL DEFAULT 'USD',
    cancellation_window_hours INT         NOT NULL DEFAULT 24,
    no_show_fee             NUMERIC(12,2),
    active                  BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dining.dining_policy IS
    'Reservation policy with scope rules, card-hold enforcement, cancellation windows, and no-show fees.';

CREATE INDEX idx_dining_policy_restaurant_active
    ON dining.dining_policy (restaurant_id, active);

-- ============================================================================
-- dining.dining_experience
-- ----------------------------------------------------------------------------
-- Premium dining experience offered by a restaurant (tasting menu, chef's
-- table, wine pairing, cooking class, etc.). Linked to a Travel Graph
-- product for catalog integration. Supports prepaid or deposit-based pricing,
-- refund windows, and rules (fixed menu, dress code, age restriction).
-- ============================================================================
CREATE TABLE dining.dining_experience (
    experience_id     UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id     UUID          NOT NULL
                                    REFERENCES dining.dining_restaurant (restaurant_id),
    product_id        UUID          NOT NULL,
                                    -- FK -> tg.tg_product (product_id)
    name              TEXT          NOT NULL,
    description       TEXT,
    price_per_person  NUMERIC(12,2),
    currency          CHAR(3)       NOT NULL DEFAULT 'USD',
    min_party         INT           NOT NULL DEFAULT 1,
    max_party         INT           NOT NULL DEFAULT 20,
    prepaid           BOOLEAN       NOT NULL DEFAULT TRUE,
    deposit_amount    NUMERIC(12,2),
    refund_window_hours INT         NOT NULL DEFAULT 48,
    rules             JSONB         NOT NULL DEFAULT '{}'::jsonb,
                                    -- fixed_menu, dress_code, age_restriction
    active            BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dining.dining_experience IS
    'Premium dining experience (tasting menu, chef''s table, etc.) with pricing, deposit, refund, and rule configuration.';

CREATE INDEX idx_dining_experience_restaurant_active
    ON dining.dining_experience (restaurant_id, active);

-- ============================================================================
-- dining.dining_message_thread
-- ----------------------------------------------------------------------------
-- Messaging thread between a guest and a restaurant, optionally linked to
-- a specific reservation. Enables concierge-mediated communication for
-- special requests, dietary needs, and day-of coordination.
-- ============================================================================
CREATE TABLE dining.dining_message_thread (
    thread_id      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id  UUID        NOT NULL
                               REFERENCES dining.dining_restaurant (restaurant_id),
    user_id        UUID        NOT NULL,
    reservation_id UUID,
                               -- Nullable FK -> commerce.commerce_reservation
    status         TEXT        NOT NULL DEFAULT 'open'
                               CHECK (status IN ('open', 'closed', 'archived')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dining.dining_message_thread IS
    'Guest-to-restaurant messaging thread, optionally linked to a reservation for contextual communication.';

CREATE INDEX idx_dining_message_thread_restaurant_user
    ON dining.dining_message_thread (restaurant_id, user_id);

-- ============================================================================
-- dining.dining_message
-- ----------------------------------------------------------------------------
-- Individual message within a thread. The sender_type discriminator identifies
-- whether the message came from the guest, the restaurant host, the Atlas
-- concierge, or the system (automated notifications). Metadata JSONB stores
-- attachments, translation data, or system event context.
-- ============================================================================
CREATE TABLE dining.dining_message (
    message_id  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id   UUID        NOT NULL
                            REFERENCES dining.dining_message_thread (thread_id)
                            ON DELETE CASCADE,
    sender_type TEXT        NOT NULL
                            CHECK (sender_type IN ('user', 'restaurant', 'concierge', 'system')),
    sender_id   UUID,
    body        TEXT        NOT NULL,
    metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dining.dining_message IS
    'Individual message in a dining thread. Supports user, restaurant, concierge, and system sender types.';

-- Primary query: "load messages in a thread in chronological order"
CREATE INDEX idx_dining_message_thread_created
    ON dining.dining_message (thread_id, created_at);

-- ============================================================================
-- dining.dining_loyalty_points
-- ----------------------------------------------------------------------------
-- Ledger of loyalty point transactions for dining. Points can be scoped to
-- a specific restaurant or platform-wide (restaurant_id = NULL). Each row
-- is an immutable ledger entry; balances are computed by summing over
-- user_id with type-aware signage (earned/adjusted = credit, redeemed/expired
-- = debit).
-- ============================================================================
CREATE TABLE dining.dining_loyalty_points (
    points_id      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID        NOT NULL,
    restaurant_id  UUID        REFERENCES dining.dining_restaurant (restaurant_id),
                               -- Nullable: NULL = platform-wide points
    reservation_id UUID,
                               -- Nullable FK -> commerce.commerce_reservation
    points         INT         NOT NULL,
    type           TEXT        NOT NULL
                               CHECK (type IN ('earned', 'redeemed', 'expired', 'adjusted')),
    description    TEXT,
    expires_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE dining.dining_loyalty_points IS
    'Immutable ledger of dining loyalty point transactions. Platform-wide when restaurant_id is NULL.';

-- Primary query: "show a user's point history by type"
CREATE INDEX idx_dining_loyalty_points_user_type
    ON dining.dining_loyalty_points (user_id, type);

-- ============================================================================
-- Updated-at trigger function (schema-local, reusable)
-- ============================================================================
CREATE OR REPLACE FUNCTION dining.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at triggers for all tables that have the column
CREATE TRIGGER trg_dining_restaurant_updated_at
    BEFORE UPDATE ON dining.dining_restaurant
    FOR EACH ROW EXECUTE FUNCTION dining.set_updated_at();

CREATE TRIGGER trg_dining_floorplan_updated_at
    BEFORE UPDATE ON dining.dining_floorplan
    FOR EACH ROW EXECUTE FUNCTION dining.set_updated_at();

CREATE TRIGGER trg_dining_shift_updated_at
    BEFORE UPDATE ON dining.dining_shift
    FOR EACH ROW EXECUTE FUNCTION dining.set_updated_at();

CREATE TRIGGER trg_dining_slot_updated_at
    BEFORE UPDATE ON dining.dining_slot
    FOR EACH ROW EXECUTE FUNCTION dining.set_updated_at();

CREATE TRIGGER trg_dining_waitlist_updated_at
    BEFORE UPDATE ON dining.dining_waitlist
    FOR EACH ROW EXECUTE FUNCTION dining.set_updated_at();

CREATE TRIGGER trg_dining_notify_request_updated_at
    BEFORE UPDATE ON dining.dining_notify_request
    FOR EACH ROW EXECUTE FUNCTION dining.set_updated_at();

CREATE TRIGGER trg_dining_policy_updated_at
    BEFORE UPDATE ON dining.dining_policy
    FOR EACH ROW EXECUTE FUNCTION dining.set_updated_at();

CREATE TRIGGER trg_dining_experience_updated_at
    BEFORE UPDATE ON dining.dining_experience
    FOR EACH ROW EXECUTE FUNCTION dining.set_updated_at();

CREATE TRIGGER trg_dining_message_thread_updated_at
    BEFORE UPDATE ON dining.dining_message_thread
    FOR EACH ROW EXECUTE FUNCTION dining.set_updated_at();

COMMIT;
