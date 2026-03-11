-- ============================================================================
-- Migration 012: Insurance Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Full travel insurance domain covering quote requests, quote options
--          from multiple insurers, bound policies, claims lifecycle, and
--          benefit usage tracking. Supports comprehensive coverage types
--          including trip cancellation, medical, baggage, rental, adventure,
--          cruise, and supplier insolvency protection.
--
-- Dependencies:
--   - 001 (assumed): uuid-ossp extension
--   - Travel Graph schema: tg.tg_supplier
--   - Commerce schema: commerce.commerce_reservation
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS ins;

-- ============================================================================
-- ins.ins_quote_request
-- ----------------------------------------------------------------------------
-- Initiates the insurance quoting flow. Captures traveler details, trip cost,
-- destination countries, and the type of coverage the user is seeking. The
-- coverage_intent drives which insurer APIs are queried and which plan types
-- are returned. Status tracks the request from submission through quoting
-- to binding or expiry.
-- ============================================================================
CREATE TABLE ins.ins_quote_request (
    quote_request_id    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID          NOT NULL,
    trip_id             UUID,
    reservation_ids     UUID[]        DEFAULT '{}',
    coverage_intent     TEXT          NOT NULL
                                      CHECK (coverage_intent IN (
                                          'trip', 'flight', 'rental', 'medical', 'cancel',
                                          'comprehensive', 'adventure', 'cruise'
                                      )),
    travelers           JSONB         NOT NULL,
                                      -- array of {age, citizenship, pre_existing_conditions}
    trip_cost           NUMERIC(12,2),
    currency            CHAR(3)       DEFAULT 'USD',
    destination_countries TEXT[]      DEFAULT '{}',
    trip_start          DATE,
    trip_end            DATE,
    inputs              JSONB         DEFAULT '{}'::jsonb,
    status              TEXT          DEFAULT 'pending'
                                      CHECK (status IN ('pending', 'quoted', 'expired', 'bound')),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ins.ins_quote_request IS
    'Insurance quote request capturing traveler profiles, trip details, and coverage intent. Drives insurer API queries.';

-- Primary query: "show this user's pending/quoted requests"
CREATE INDEX idx_ins_quote_request_user_status
    ON ins.ins_quote_request (user_id, status);

-- ============================================================================
-- ins.ins_quote_option
-- ----------------------------------------------------------------------------
-- A specific insurance plan option returned by an insurer in response to a
-- quote request. Each option details the plan name, premium, and a structured
-- array of coverage types with limits and deductibles. The coverages JSONB
-- supports the full spectrum of travel insurance benefits from trip
-- cancellation and medical to adventure sports and cruise-specific covers.
-- The rating column stores an AI-computed value score (0-5) factoring
-- coverage breadth, limits, exclusions, and price competitiveness.
-- ============================================================================
CREATE TABLE ins.ins_quote_option (
    quote_option_id     UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_request_id    UUID          NOT NULL
                                      REFERENCES ins.ins_quote_request (quote_request_id),
    insurer_supplier_id UUID          NOT NULL,
                                      -- FK -> tg.tg_supplier (supplier_id)
    plan_name           TEXT          NOT NULL,
    plan_code           TEXT          NOT NULL,
    premium             NUMERIC(12,2) NOT NULL,
    currency            CHAR(3)       NOT NULL DEFAULT 'USD',
    coverages           JSONB         NOT NULL,
                                      -- array of {type, limit, deductible, description}
                                      -- Coverage types include:
                                      --   trip_cancellation, trip_interruption,
                                      --   cancel_any_reason, interrupt_any_reason,
                                      --   emergency_medical, emergency_dental,
                                      --   medical_evacuation, repatriation,
                                      --   telemedicine_access,
                                      --   trip_delay, missed_connection,
                                      --   flight_delay, flight_cancellation,
                                      --   alt_transport, accommodation_delay,
                                      --   baggage_delay, baggage_loss,
                                      --   personal_items_theft, electronics_rider,
                                      --   rental_car_cdw, rental_damage,
                                      --   personal_liability,
                                      --   adventure_sports, high_altitude,
                                      --   cruise_missed_port, cruise_medical,
                                      --   supplier_insolvency, pre_existing_waiver
    terms               JSONB         DEFAULT '{}'::jsonb,
                                      -- purchase_window, effective_period, exclusions
    highlights          JSONB         DEFAULT '[]'::jsonb,
    rating              NUMERIC(3,2),
    expires_at          TIMESTAMPTZ   NOT NULL,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ins.ins_quote_option IS
    'Insurer-returned plan option with premium, structured coverages, terms, and AI-computed value rating.';

-- Primary query: "show all options for this quote request"
CREATE INDEX idx_ins_quote_option_request
    ON ins.ins_quote_option (quote_request_id);

-- ============================================================================
-- ins.ins_policy
-- ----------------------------------------------------------------------------
-- A bound insurance policy. Created when a user selects a quote option and
-- completes purchase (via commerce reservation). Stores the full coverage
-- snapshot at bind-time (coverages may differ from the quote if the insurer
-- adjusted terms). The covered_reservations array links the policy to
-- specific travel bookings for claim eligibility determination. Documents
-- JSONB holds URLs to the policy document, certificate, and claim form.
-- ============================================================================
CREATE TABLE ins.ins_policy (
    policy_id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id      UUID,
                                      -- FK -> commerce.commerce_reservation
                                      -- (reservation_type = 'insurance')
    quote_option_id     UUID          REFERENCES ins.ins_quote_option (quote_option_id),
    user_id             UUID          NOT NULL,
    insurer_supplier_id UUID          NOT NULL,
                                      -- FK -> tg.tg_supplier (supplier_id)
    plan_name           TEXT          NOT NULL,
    plan_code           TEXT          NOT NULL,
    policy_number       TEXT          UNIQUE,
    status              TEXT          NOT NULL DEFAULT 'active'
                                      CHECK (status IN ('active', 'cancelled', 'expired', 'void', 'suspended')),
    effective_at        TIMESTAMPTZ   NOT NULL,
    expires_at          TIMESTAMPTZ   NOT NULL,
    premium             NUMERIC(12,2) NOT NULL,
    currency            CHAR(3)       NOT NULL,
    coverages           JSONB         NOT NULL,
                                      -- same structure as quote option coverages
    covered_travelers   JSONB         NOT NULL,
    covered_reservations UUID[]       DEFAULT '{}',
    documents           JSONB         DEFAULT '[]'::jsonb,
                                      -- policy_doc_url, certificate_url, claim_form_url
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ins.ins_policy IS
    'Bound insurance policy with coverage snapshot, covered travelers/reservations, and document URLs.';

-- Primary query: "show active policies for this user"
CREATE INDEX idx_ins_policy_user_status
    ON ins.ins_policy (user_id, status);

-- Lookup by policy number (customer service, claim intake)
CREATE INDEX idx_ins_policy_number
    ON ins.ins_policy (policy_number);

-- Expiry monitoring (background worker: notify before expiry)
CREATE INDEX idx_ins_policy_expires
    ON ins.ins_policy (expires_at);

-- ============================================================================
-- ins.ins_claim
-- ----------------------------------------------------------------------------
-- Insurance claim filed against a policy. Supports the full range of claim
-- types from trip cancellation and medical emergencies to baggage loss and
-- adventure injuries. The status lifecycle progresses from submission through
-- document collection, review, approval/denial, payment, and closure. The
-- evidence JSONB array stores references to supporting documents (receipts,
-- medical records, police reports, boarding passes, photos). Partial
-- approvals are supported via separate amount_approved and amount_paid fields.
-- ============================================================================
CREATE TABLE ins.ins_claim (
    claim_id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id         UUID          NOT NULL
                                    REFERENCES ins.ins_policy (policy_id),
    user_id           UUID          NOT NULL,
    claim_type        TEXT          NOT NULL
                                    CHECK (claim_type IN (
                                        'trip_cancel', 'trip_interrupt', 'medical', 'dental',
                                        'evacuation', 'delay', 'missed_connection',
                                        'baggage_delay', 'baggage_loss', 'theft',
                                        'rental_damage', 'liability', 'adventure_injury',
                                        'cruise_medical', 'cruise_missed_port',
                                        'supplier_insolvency', 'other'
                                    )),
    claim_number      TEXT          UNIQUE,
    status            TEXT          NOT NULL DEFAULT 'submitted'
                                    CHECK (status IN (
                                        'submitted', 'documents_requested', 'under_review',
                                        'approved', 'partially_approved', 'denied',
                                        'paid', 'closed', 'appealed'
                                    )),
    incident_date     TIMESTAMPTZ   NOT NULL,
    incident_location TEXT,
    description       TEXT          NOT NULL,
    amount_claimed    NUMERIC(12,2) NOT NULL,
    amount_approved   NUMERIC(12,2),
    amount_paid       NUMERIC(12,2),
    currency          CHAR(3)       NOT NULL,
    evidence          JSONB         DEFAULT '[]'::jsonb,
                                    -- receipts, medical_records, police_reports,
                                    -- boarding_passes, photos
    denial_reason     TEXT,
    adjuster_notes    TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ins.ins_claim IS
    'Insurance claim with full lifecycle tracking, evidence references, and partial approval support.';

-- Primary query: "show claims for this policy"
CREATE INDEX idx_ins_claim_policy
    ON ins.ins_claim (policy_id);

-- User dashboard: "show my claims by status"
CREATE INDEX idx_ins_claim_user_status
    ON ins.ins_claim (user_id, status);

-- Analytics: claim type distribution and status breakdown
CREATE INDEX idx_ins_claim_type_status
    ON ins.ins_claim (claim_type, status);

-- ============================================================================
-- ins.ins_benefit_usage
-- ----------------------------------------------------------------------------
-- Tracks consumption of coverage limits within a policy. Each row records
-- a draw-down against a specific coverage type, linking back to the claim
-- that triggered the usage. The amount_remaining column is maintained by
-- the application layer to enable fast eligibility checks without summing
-- historical usage.
-- ============================================================================
CREATE TABLE ins.ins_benefit_usage (
    usage_id       UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id      UUID          NOT NULL
                                 REFERENCES ins.ins_policy (policy_id),
    coverage_type  TEXT          NOT NULL,
    amount_used    NUMERIC(12,2) NOT NULL,
    amount_remaining NUMERIC(12,2) NOT NULL,
    claim_id       UUID          REFERENCES ins.ins_claim (claim_id),
    description    TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ins.ins_benefit_usage IS
    'Coverage limit consumption ledger per policy. Tracks draw-downs by coverage type for fast eligibility checks.';

-- Primary query: "show usage for this policy by coverage type"
CREATE INDEX idx_ins_benefit_usage_policy_coverage
    ON ins.ins_benefit_usage (policy_id, coverage_type);

-- ============================================================================
-- Updated-at trigger function (schema-local)
-- ============================================================================
CREATE OR REPLACE FUNCTION ins.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at triggers for tables that have the column
CREATE TRIGGER trg_ins_policy_updated_at
    BEFORE UPDATE ON ins.ins_policy
    FOR EACH ROW EXECUTE FUNCTION ins.set_updated_at();

CREATE TRIGGER trg_ins_claim_updated_at
    BEFORE UPDATE ON ins.ins_claim
    FOR EACH ROW EXECUTE FUNCTION ins.set_updated_at();

COMMIT;
