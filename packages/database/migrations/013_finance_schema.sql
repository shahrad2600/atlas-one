-- ============================================================================
-- Migration 013: Finance Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Financial infrastructure covering user wallets, double-entry
--          ledger, escrow for supplier payments, buy-now-pay-later plans,
--          price freeze contracts, and supplier payouts. Supports
--          idempotent ledger writes, hold/release accounting, and
--          multi-provider BNPL integration.
--
-- Dependencies:
--   - 001 (assumed): uuid-ossp extension
--   - Travel Graph schema: tg.tg_supplier
--   - Commerce schema: commerce.commerce_reservation, commerce.commerce_order
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS fin;

-- ============================================================================
-- fin.fin_wallet
-- ----------------------------------------------------------------------------
-- Per-user financial wallet. Tracks available and held balances separately
-- to support reservation holds that haven't settled yet. Lifetime counters
-- (earned, spent) power analytics and loyalty tier calculations. The status
-- column allows freezing a wallet for fraud investigation or closing it on
-- account deletion. The CHECK constraints guarantee non-negative balances
-- at the database level.
-- ============================================================================
CREATE TABLE fin.fin_wallet (
    wallet_id        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID          NOT NULL UNIQUE,
    currency         CHAR(3)       NOT NULL DEFAULT 'USD',
    available_balance NUMERIC(14,2) NOT NULL DEFAULT 0
                                    CHECK (available_balance >= 0),
    held_balance     NUMERIC(14,2) NOT NULL DEFAULT 0
                                    CHECK (held_balance >= 0),
    lifetime_earned  NUMERIC(14,2) NOT NULL DEFAULT 0,
    lifetime_spent   NUMERIC(14,2) NOT NULL DEFAULT 0,
    status           TEXT          NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active', 'frozen', 'closed')),
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fin.fin_wallet IS
    'Per-user financial wallet with available/held balance separation, lifetime counters, and freeze/close support.';

-- ============================================================================
-- fin.fin_ledger_entry
-- ----------------------------------------------------------------------------
-- Immutable append-only ledger of all wallet mutations. Every balance change
-- produces exactly one row. The running_balance column stores the wallet
-- balance after this entry, enabling point-in-time reconstruction without
-- full-scan aggregation. The idempotency_key (UNIQUE) prevents duplicate
-- writes from retried operations. Reference columns link entries to their
-- business context (order, reservation, claim, dispute, reward, promotion,
-- or transfer).
-- ============================================================================
CREATE TABLE fin.fin_ledger_entry (
    entry_id        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id       UUID          NOT NULL
                                  REFERENCES fin.fin_wallet (wallet_id),
    type            TEXT          NOT NULL
                                  CHECK (type IN (
                                      'credit', 'debit', 'hold', 'release',
                                      'refund', 'chargeback', 'reward', 'expiry',
                                      'adjustment'
                                  )),
    amount          NUMERIC(14,2) NOT NULL,
    currency        CHAR(3)       NOT NULL,
    running_balance NUMERIC(14,2) NOT NULL,
    reference_type  TEXT          CHECK (reference_type IN (
                                      'order', 'reservation', 'claim', 'dispute',
                                      'reward', 'promotion', 'transfer'
                                  )),
    reference_id    UUID,
    description     TEXT,
    metadata        JSONB         DEFAULT '{}'::jsonb,
    idempotency_key TEXT          UNIQUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fin.fin_ledger_entry IS
    'Immutable append-only ledger with running balance, idempotency protection, and business context references.';

-- Primary query: "show ledger history for this wallet, newest first"
CREATE INDEX idx_fin_ledger_entry_wallet_created
    ON fin.fin_ledger_entry (wallet_id, created_at);

-- Reconciliation: "find all entries for a given order/reservation/claim"
CREATE INDEX idx_fin_ledger_entry_reference
    ON fin.fin_ledger_entry (reference_type, reference_id);

-- Idempotency check (covered by UNIQUE constraint, index is implicit)
-- CREATE INDEX idx_fin_ledger_entry_idempotency is implicit from UNIQUE

-- ============================================================================
-- fin.fin_escrow
-- ----------------------------------------------------------------------------
-- Escrow holds for supplier payments. When a user pays for a reservation,
-- funds are held in escrow until release conditions are met (e.g. after
-- checkout, after review period, or manual approval). Supports partial
-- release for split settlements and dispute integration. The release_at
-- column enables scheduled batch releases by background workers.
-- ============================================================================
CREATE TABLE fin.fin_escrow (
    escrow_id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id     UUID          NOT NULL,
                                     -- FK -> commerce.commerce_reservation (reservation_id)
    payer_user_id      UUID          NOT NULL,
    payee_supplier_id  UUID          NOT NULL,
                                     -- FK -> tg.tg_supplier (supplier_id)
    amount             NUMERIC(14,2) NOT NULL,
    currency           CHAR(3)       NOT NULL,
    status             TEXT          NOT NULL DEFAULT 'held'
                                     CHECK (status IN (
                                         'held', 'partially_released', 'released',
                                         'disputed', 'refunded', 'expired'
                                     )),
    hold_reason        TEXT,
    release_conditions JSONB         DEFAULT '{}'::jsonb,
                                     -- after_checkout, after_review_period, manual_approval
    release_at         TIMESTAMPTZ,
    released_at        TIMESTAMPTZ,
    released_amount    NUMERIC(14,2),
    dispute_id         UUID,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fin.fin_escrow IS
    'Escrow holds for supplier payments with configurable release conditions, partial release, and dispute integration.';

-- Primary query: "show escrow for this reservation"
CREATE INDEX idx_fin_escrow_reservation
    ON fin.fin_escrow (reservation_id);

-- Background worker: "find held escrows ready for release"
CREATE INDEX idx_fin_escrow_status_release
    ON fin.fin_escrow (status, release_at);

-- ============================================================================
-- fin.fin_bnpl_plan
-- ----------------------------------------------------------------------------
-- Buy-now-pay-later installment plan linked to a commerce order. Supports
-- multiple external providers (Klarna, Affirm, Afterpay) and an internal
-- Atlas installment option. The schedule JSONB array contains the payment
-- timeline with per-installment due dates, amounts, and payment statuses.
-- Interest rate defaults to 0 for standard 4-installment plans but supports
-- non-zero rates for extended financing.
-- ============================================================================
CREATE TABLE fin.fin_bnpl_plan (
    bnpl_id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id         UUID          NOT NULL,
                                   -- FK -> commerce.commerce_order (order_id)
    user_id          UUID          NOT NULL,
    provider         TEXT          NOT NULL
                                   CHECK (provider IN ('klarna', 'affirm', 'afterpay', 'internal')),
    provider_plan_id TEXT,
    total_amount     NUMERIC(14,2) NOT NULL,
    currency         CHAR(3)       NOT NULL,
    installments     INT           NOT NULL DEFAULT 4,
    schedule         JSONB         NOT NULL,
                                   -- array of {due_date, amount, status}
    interest_rate    NUMERIC(6,4)  DEFAULT 0,
    status           TEXT          NOT NULL DEFAULT 'pending'
                                   CHECK (status IN (
                                       'pending', 'approved', 'declined', 'active',
                                       'paid_off', 'defaulted', 'cancelled'
                                   )),
    approved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fin.fin_bnpl_plan IS
    'Buy-now-pay-later installment plan with multi-provider support, payment schedule, and lifecycle tracking.';

-- Primary query: "show BNPL plans for this user by status"
CREATE INDEX idx_fin_bnpl_plan_user_status
    ON fin.fin_bnpl_plan (user_id, status);

-- Order-scoped lookup
CREATE INDEX idx_fin_bnpl_plan_order
    ON fin.fin_bnpl_plan (order_id);

-- ============================================================================
-- fin.fin_price_freeze_contract
-- ----------------------------------------------------------------------------
-- Price freeze option contract. Allows a user to lock in a quoted price for
-- a flight, hotel, experience, or cruise for a fee. The frozen offer snapshot
-- captures the full offer details at lock time. If exercised before expiry,
-- the locked_price is honoured and a reservation is created. The
-- current_market_price column is updated periodically by background workers
-- to show the user how much they saved (or lost) by freezing.
-- ============================================================================
CREATE TABLE fin.fin_price_freeze_contract (
    freeze_id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                  UUID          NOT NULL,
    offer_type               TEXT          NOT NULL
                                           CHECK (offer_type IN ('flight', 'hotel', 'experience', 'cruise')),
    offer_ref_id             UUID          NOT NULL,
                                           -- references flight_offer, tg_product, or tg_inventory_slot
    offer_snapshot           JSONB         NOT NULL,
                                           -- frozen details: price, dates, product info
    fee                      NUMERIC(12,2) NOT NULL,
    currency                 CHAR(3)       NOT NULL,
    locked_price             NUMERIC(12,2) NOT NULL,
    current_market_price     NUMERIC(12,2),
    expires_at               TIMESTAMPTZ   NOT NULL,
    exercised_at             TIMESTAMPTZ,
    exercised_reservation_id UUID,
                                           -- FK -> commerce.commerce_reservation (reservation_id)
    status                   TEXT          NOT NULL DEFAULT 'active'
                                           CHECK (status IN (
                                               'active', 'exercised', 'expired', 'cancelled', 'refunded'
                                           )),
    created_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fin.fin_price_freeze_contract IS
    'Price freeze option contract. Locks a quoted price for a fee. Exercisable before expiry to create a reservation at the frozen price.';

-- Primary query: "show active freezes for this user"
CREATE INDEX idx_fin_price_freeze_user_status
    ON fin.fin_price_freeze_contract (user_id, status);

-- Background worker: "find active freezes approaching expiry"
CREATE INDEX idx_fin_price_freeze_expires_status
    ON fin.fin_price_freeze_contract (expires_at, status);

-- Offer-scoped lookup: "is there an active freeze on this offer?"
CREATE INDEX idx_fin_price_freeze_offer
    ON fin.fin_price_freeze_contract (offer_type, offer_ref_id);

-- ============================================================================
-- fin.fin_payout
-- ----------------------------------------------------------------------------
-- Supplier payout record. Aggregates one or more reservation settlements
-- into a single payout to the supplier. Supports multiple payout methods
-- (bank transfer, Stripe Connect, PayPal). The scheduled_at column enables
-- batch payout scheduling (e.g. weekly net settlement). The reservation_ids
-- array links the payout to its constituent reservations for reconciliation.
-- ============================================================================
CREATE TABLE fin.fin_payout (
    payout_id        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id      UUID          NOT NULL,
                                   -- FK -> tg.tg_supplier (supplier_id)
    amount           NUMERIC(14,2) NOT NULL,
    currency         CHAR(3)       NOT NULL,
    reservation_ids  UUID[]        DEFAULT '{}',
    payout_method    TEXT          CHECK (payout_method IN ('bank_transfer', 'stripe_connect', 'paypal')),
    payout_reference TEXT,
    status           TEXT          NOT NULL DEFAULT 'pending'
                                   CHECK (status IN (
                                       'pending', 'processing', 'completed', 'failed', 'reversed'
                                   )),
    scheduled_at     TIMESTAMPTZ,
    completed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE fin.fin_payout IS
    'Supplier payout aggregating reservation settlements. Supports batch scheduling and multiple payout methods.';

-- Primary query: "show payouts for this supplier by status"
CREATE INDEX idx_fin_payout_supplier_status
    ON fin.fin_payout (supplier_id, status);

-- Background worker: "find pending payouts ready for processing"
CREATE INDEX idx_fin_payout_scheduled
    ON fin.fin_payout (scheduled_at);

-- ============================================================================
-- Updated-at trigger function (schema-local)
-- ============================================================================
CREATE OR REPLACE FUNCTION fin.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at triggers for all tables that have the column
CREATE TRIGGER trg_fin_wallet_updated_at
    BEFORE UPDATE ON fin.fin_wallet
    FOR EACH ROW EXECUTE FUNCTION fin.set_updated_at();

CREATE TRIGGER trg_fin_escrow_updated_at
    BEFORE UPDATE ON fin.fin_escrow
    FOR EACH ROW EXECUTE FUNCTION fin.set_updated_at();

CREATE TRIGGER trg_fin_bnpl_plan_updated_at
    BEFORE UPDATE ON fin.fin_bnpl_plan
    FOR EACH ROW EXECUTE FUNCTION fin.set_updated_at();

CREATE TRIGGER trg_fin_price_freeze_updated_at
    BEFORE UPDATE ON fin.fin_price_freeze_contract
    FOR EACH ROW EXECUTE FUNCTION fin.set_updated_at();

CREATE TRIGGER trg_fin_payout_updated_at
    BEFORE UPDATE ON fin.fin_payout
    FOR EACH ROW EXECUTE FUNCTION fin.set_updated_at();

COMMIT;
