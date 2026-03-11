-- ============================================================================
-- Migration 006: Experiences Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Experiences & activities domain covering tour operators, bookable
--          experience products, departures (time-specific instances), ticket
--          options with tiered pricing, and aggregated review summaries.
--
-- Dependencies:
--   - 001 (assumed): uuid-ossp extension
--   - Travel Graph schema: tg.tg_supplier, tg.tg_product, tg.tg_entity,
--                          tg.tg_inventory_slot, tg.tg_policy
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS exp;

-- ============================================================================
-- exp.exp_operator
-- ----------------------------------------------------------------------------
-- Tour or activity operator integrated with Atlas One. Each operator maps
-- 1:1 to a Travel Graph supplier record. Tracks operational health metrics
-- (response rate, response time, cancellation rate, quality score) that feed
-- into ranking algorithms and the "Verified" badge displayed in search
-- results. The settings JSONB stores operator-level configuration such as
-- notification preferences, payout schedules, and API credentials for
-- channel-manager integrations.
-- ============================================================================
CREATE TABLE exp.exp_operator (
    operator_id        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id        UUID          NOT NULL UNIQUE,
                                     -- FK -> tg.tg_supplier (supplier_id)
    company_name       TEXT,
    description        TEXT,
    logo_url           TEXT,
    response_rate      NUMERIC(5,2)  NOT NULL DEFAULT 100.00,
    response_time_avg_min INT,
    cancellation_rate  NUMERIC(5,2)  NOT NULL DEFAULT 0,
    quality_score      NUMERIC(5,2)  NOT NULL DEFAULT 0,
    verified           BOOLEAN       NOT NULL DEFAULT FALSE,
    settings           JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE exp.exp_operator IS
    'Tour/activity operator with operational health metrics, verification status, and integration configuration.';

-- ============================================================================
-- exp.exp_product
-- ----------------------------------------------------------------------------
-- A bookable experience or activity (walking tour, cooking class, boat trip,
-- museum pass, etc.). Each product maps 1:1 to a Travel Graph product for
-- catalog integration (search, media, taxonomy). Contains operational details
-- that the booking engine and AI planner use: duration range, group sizing,
-- age restrictions, difficulty, accessibility features, and what is or isn't
-- included. The cancellation_policy_id links to the Travel Graph policy
-- governing refund/cancellation rules.
-- ============================================================================
CREATE TABLE exp.exp_product (
    exp_product_id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id             UUID        NOT NULL UNIQUE,
                                       -- FK -> tg.tg_product (product_id)
    operator_id            UUID        NOT NULL
                                       REFERENCES exp.exp_operator (operator_id),
    meeting_point_entity_id UUID,
                                       -- Nullable FK -> tg.tg_entity (entity_id)
    duration_min           INT         NOT NULL,
    duration_max_min       INT,
    max_group_size         INT,
    min_participants       INT         NOT NULL DEFAULT 1,
    age_min                INT,
    age_max                INT,
    difficulty_level       TEXT        CHECK (difficulty_level IN ('easy', 'moderate', 'challenging', 'extreme')),
    accessibility          JSONB       NOT NULL DEFAULT '{}'::jsonb,
                                       -- wheelchair, stroller, hearing, visual
    included               JSONB       NOT NULL DEFAULT '[]'::jsonb,
                                       -- what's included
    excluded               JSONB       NOT NULL DEFAULT '[]'::jsonb,
                                       -- what's excluded
    highlights             JSONB       NOT NULL DEFAULT '[]'::jsonb,
    languages              TEXT[]      NOT NULL DEFAULT '{}',
    cancellation_policy_id UUID,
                                       -- FK -> tg.tg_policy (policy_id)
    instant_confirmation   BOOLEAN     NOT NULL DEFAULT TRUE,
    mobile_ticket          BOOLEAN     NOT NULL DEFAULT TRUE,
    active                 BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE exp.exp_product IS
    'Bookable experience/activity with duration, capacity, accessibility, inclusions, and cancellation policy configuration.';

-- Primary query: "list active products for an operator"
CREATE INDEX idx_exp_product_operator_active
    ON exp.exp_product (operator_id, active);

-- ============================================================================
-- exp.exp_departure
-- ----------------------------------------------------------------------------
-- A time-specific departure instance of an experience product. Each departure
-- maps 1:1 to a Travel Graph inventory slot that governs capacity and
-- availability. Carries departure-specific details such as the guide type,
-- guide name, meeting instructions, and special instructions that override
-- or supplement the parent product defaults.
-- ============================================================================
CREATE TABLE exp.exp_departure (
    departure_id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    exp_product_id      UUID        NOT NULL
                                    REFERENCES exp.exp_product (exp_product_id),
    slot_id             UUID        NOT NULL UNIQUE,
                                    -- FK -> tg.tg_inventory_slot (slot_id)
    language            TEXT        NOT NULL DEFAULT 'en',
    guide_type          TEXT        CHECK (guide_type IN ('live_guide', 'audio_guide', 'self_guided', 'virtual')),
    guide_name          TEXT,
    meeting_notes       TEXT,
    special_instructions TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE exp.exp_departure IS
    'Time-specific departure instance of an experience. Links to an inventory slot and carries guide/meeting details.';

-- Primary query: "list departures for a product, joined with slot availability"
CREATE INDEX idx_exp_departure_product_slot
    ON exp.exp_departure (exp_product_id, slot_id);

-- ============================================================================
-- exp.exp_option
-- ----------------------------------------------------------------------------
-- Purchasable ticket option within an experience product (e.g. "Adult",
-- "Child 3-12", "Senior 65+", "VIP Upgrade", "Private Group Add-On").
-- Each option has independent pricing and quantity constraints. The booking
-- engine validates that the sum of selected option quantities falls within
-- the product's min/max participant range.
-- ============================================================================
CREATE TABLE exp.exp_option (
    option_id      UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    exp_product_id UUID          NOT NULL
                                 REFERENCES exp.exp_product (exp_product_id)
                                 ON DELETE CASCADE,
    name           TEXT          NOT NULL,
    price          NUMERIC(12,2) NOT NULL,
    currency       CHAR(3)       NOT NULL DEFAULT 'USD',
    min_quantity   INT           NOT NULL DEFAULT 0,
    max_quantity   INT           NOT NULL DEFAULT 99,
    description    TEXT,
    active         BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE exp.exp_option IS
    'Purchasable ticket option (Adult, Child, Senior, VIP, etc.) with independent pricing and quantity constraints.';

-- Primary query: "list all options for a product"
CREATE INDEX idx_exp_option_product
    ON exp.exp_option (exp_product_id);

-- ============================================================================
-- exp.exp_review_summary
-- ----------------------------------------------------------------------------
-- Pre-aggregated review statistics for an experience product. Maintained by
-- a background worker or trigger whenever a new review is submitted. Stores
-- the average rating, total count, star-distribution histogram, and top
-- mentioned keywords/phrases. This materialized summary avoids expensive
-- real-time aggregations in search and product detail pages.
-- ============================================================================
CREATE TABLE exp.exp_review_summary (
    exp_product_id      UUID          PRIMARY KEY
                                      REFERENCES exp.exp_product (exp_product_id),
    avg_rating          NUMERIC(3,2),
    review_count        INT           NOT NULL DEFAULT 0,
    rating_distribution JSONB         NOT NULL DEFAULT '{}'::jsonb,
                                      -- e.g. {"1": 5, "2": 12, "3": 45, "4": 120, "5": 318}
    top_mentions        JSONB         NOT NULL DEFAULT '[]'::jsonb,
                                      -- e.g. ["friendly guide", "beautiful scenery", "great value"]
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE exp.exp_review_summary IS
    'Pre-aggregated review statistics per experience product. Avoids real-time aggregation in search and detail pages.';

-- ============================================================================
-- Updated-at trigger function (schema-local, reusable)
-- ============================================================================
CREATE OR REPLACE FUNCTION exp.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at triggers for all tables that have the column
CREATE TRIGGER trg_exp_operator_updated_at
    BEFORE UPDATE ON exp.exp_operator
    FOR EACH ROW EXECUTE FUNCTION exp.set_updated_at();

CREATE TRIGGER trg_exp_product_updated_at
    BEFORE UPDATE ON exp.exp_product
    FOR EACH ROW EXECUTE FUNCTION exp.set_updated_at();

CREATE TRIGGER trg_exp_departure_updated_at
    BEFORE UPDATE ON exp.exp_departure
    FOR EACH ROW EXECUTE FUNCTION exp.set_updated_at();

CREATE TRIGGER trg_exp_review_summary_updated_at
    BEFORE UPDATE ON exp.exp_review_summary
    FOR EACH ROW EXECUTE FUNCTION exp.set_updated_at();

COMMIT;
