-- ============================================================================
-- Migration 007: Stay Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Accommodation domain covering properties, room types, rate plans,
--          nightly inventory, host profiles, mutual reviews, damage claims,
--          property intelligence scoring, and guest-host messaging.
--
-- Dependencies:
--   - 001 (assumed): uuid-ossp extension
--   - 002 (assumed): identity schema (identity.identity_user)
--   - 004: commerce schema (commerce.commerce_reservation)
--   - Travel Graph schema: tg.tg_venue, tg.tg_supplier, tg.tg_product,
--     tg.tg_policy
--   - Finance schema: finance.fin_escrow (optional, for damage claims)
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS stay;

-- ============================================================================
-- stay.stay_property
-- ----------------------------------------------------------------------------
-- The root entity for every accommodation listing. Each property maps 1:1 to
-- a Travel Graph venue and belongs to a single supplier. The rules JSONB
-- stores structured house-rule data (pets, smoking, events, quiet hours)
-- consumed by the AI planner and search filters.
-- ============================================================================
CREATE TABLE stay.stay_property (
    property_id   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id      UUID        NOT NULL UNIQUE,    -- FK to tg.tg_venue
    supplier_id   UUID        NOT NULL,           -- FK to tg.tg_supplier
    property_type TEXT        NOT NULL
                              CHECK (property_type IN (
                                  'hotel', 'rental', 'villa', 'hostel', 'resort',
                                  'apartment', 'entire_home', 'hosted_room',
                                  'boutique', 'luxury_estate', 'long_term'
                              )),
    check_in_time  TIME       DEFAULT '15:00',
    check_out_time TIME       DEFAULT '11:00',
    max_guests     INT,
    bedrooms       INT,
    bathrooms      NUMERIC(3,1),
    rules          JSONB      NOT NULL DEFAULT '{}'::jsonb,
    amenities      JSONB      NOT NULL DEFAULT '[]'::jsonb,
    house_rules    TEXT,
    instant_book   BOOLEAN    NOT NULL DEFAULT FALSE,
    min_nights     INT        NOT NULL DEFAULT 1,
    max_nights     INT        NOT NULL DEFAULT 365,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Guard against min exceeding max
    CONSTRAINT stay_property_night_range_check
        CHECK (min_nights <= max_nights)
);

COMMENT ON TABLE stay.stay_property IS
    'Root accommodation entity. Maps 1:1 to a Travel Graph venue. Stores property metadata, house rules, and booking constraints.';

-- Primary query: filter by property type within a supplier portfolio
CREATE INDEX idx_stay_property_type_supplier
    ON stay.stay_property (property_type, supplier_id);

-- ============================================================================
-- stay.stay_room_type
-- ----------------------------------------------------------------------------
-- Distinct room configurations within a property. Each room type defines
-- occupancy, bed configuration, size, and amenities. A property with a single
-- listing (e.g., an entire home) will have exactly one room type. Hotels will
-- have many. Photos JSONB stores ordered image references for the gallery.
-- ============================================================================
CREATE TABLE stay.stay_room_type (
    room_type_id      UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id       UUID         NOT NULL
                                   REFERENCES stay.stay_property (property_id) ON DELETE CASCADE,
    name              TEXT         NOT NULL,
    description       TEXT,
    max_occupancy     INT          NOT NULL DEFAULT 2,
    bed_configuration JSONB        NOT NULL DEFAULT '[]'::jsonb,
    room_size_sqm     NUMERIC(8,2),
    amenities         JSONB        NOT NULL DEFAULT '[]'::jsonb,
    photos            JSONB        NOT NULL DEFAULT '[]'::jsonb,
    active            BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stay.stay_room_type IS
    'Distinct room configurations within a property. Defines occupancy, beds, size, and amenities for search and display.';

-- Primary query: fetch all room types for a property
CREATE INDEX idx_stay_room_type_property
    ON stay.stay_room_type (property_id);

-- ============================================================================
-- stay.stay_rate_plan
-- ----------------------------------------------------------------------------
-- Pricing / policy combinations for a property. A rate plan binds a property
-- (and optionally a specific room type) to a Travel Graph product, enabling
-- the commerce pipeline to price and book it. Meal plan and refundability
-- differentiate otherwise identical room offerings.
-- ============================================================================
CREATE TABLE stay.stay_rate_plan (
    rate_plan_id UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id  UUID        NOT NULL
                              REFERENCES stay.stay_property (property_id),
    room_type_id UUID        REFERENCES stay.stay_room_type (room_type_id),
    product_id   UUID        NOT NULL UNIQUE,    -- FK to tg.tg_product
    name         TEXT        NOT NULL,
    refundable   BOOLEAN     NOT NULL DEFAULT TRUE,
    meal_plan    TEXT        CHECK (meal_plan IS NULL OR meal_plan IN (
                                 'none', 'breakfast', 'half_board',
                                 'full_board', 'all_inclusive'
                             )),
    policy_id    UUID,                           -- FK to tg.tg_policy
    min_nights   INT         NOT NULL DEFAULT 1,
    active       BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stay.stay_rate_plan IS
    'Pricing/policy combinations for a property. Links to a Travel Graph product for commerce integration.';

-- Primary query: active rate plans for a property
CREATE INDEX idx_stay_rate_plan_property_active
    ON stay.stay_rate_plan (property_id, active);

-- ============================================================================
-- stay.stay_inventory_night
-- ----------------------------------------------------------------------------
-- Per-night availability and pricing for a rate plan. This is the atomic
-- inventory unit for stays: one row per rate-plan-per-date. The closed flag
-- allows revenue managers to block dates without deleting rows. The
-- min_stay_override lets a single date impose a higher minimum (e.g., New
-- Year's Eve requires 3-night minimum).
-- ============================================================================
CREATE TABLE stay.stay_inventory_night (
    night_id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    rate_plan_id       UUID          NOT NULL
                                     REFERENCES stay.stay_rate_plan (rate_plan_id),
    date               DATE          NOT NULL,
    available          INT           NOT NULL DEFAULT 0
                                     CHECK (available >= 0),
    price              NUMERIC(12,2) NOT NULL
                                     CHECK (price >= 0),
    currency           CHAR(3)       NOT NULL DEFAULT 'USD',
    min_stay_override  INT,
    closed             BOOLEAN       NOT NULL DEFAULT FALSE,
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- One row per rate plan per date
    CONSTRAINT uq_stay_inventory_night_plan_date
        UNIQUE (rate_plan_id, date)
);

COMMENT ON TABLE stay.stay_inventory_night IS
    'Per-night inventory and pricing for a rate plan. Atomic availability unit supporting closures and min-stay overrides.';

-- Primary query: availability search for a date range on a rate plan
CREATE INDEX idx_stay_inventory_night_plan_date_closed
    ON stay.stay_inventory_night (rate_plan_id, date, closed);

-- ============================================================================
-- stay.stay_host_profile
-- ----------------------------------------------------------------------------
-- Enriched host profile layered on top of a Travel Graph supplier. Stores
-- reputation metrics (response rate, cancellation rate, superhost score),
-- trust signals (verification status, risk score), and display data (bio,
-- photo). The luxury_verified flag gates access to high-end property tiers.
-- ============================================================================
CREATE TABLE stay.stay_host_profile (
    host_id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id          UUID          NOT NULL UNIQUE,    -- FK to tg.tg_supplier
    user_id              UUID,                             -- FK to identity.identity_user (nullable)
    bio                  TEXT,
    photo_url            TEXT,
    response_rate        NUMERIC(5,2)  NOT NULL DEFAULT 100.00,
    response_time_avg_min INT,
    cancellation_rate    NUMERIC(5,2)  NOT NULL DEFAULT 0,
    superhost_score      NUMERIC(5,2)  NOT NULL DEFAULT 0,
    risk_score           NUMERIC(5,2)  NOT NULL DEFAULT 0,
    verification_status  TEXT          NOT NULL DEFAULT 'unverified'
                                       CHECK (verification_status IN (
                                           'unverified', 'verified', 'premium_verified'
                                       )),
    luxury_verified      BOOLEAN       NOT NULL DEFAULT FALSE,
    total_listings       INT           NOT NULL DEFAULT 0,
    total_reviews        INT           NOT NULL DEFAULT 0,
    member_since         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stay.stay_host_profile IS
    'Host reputation and trust profile layered on a Travel Graph supplier. Drives superhost badges, luxury gates, and risk scoring.';

-- ============================================================================
-- stay.stay_mutual_review
-- ----------------------------------------------------------------------------
-- Double-blind mutual review system. Both guest and host submit reviews
-- independently; reviews become visible only after both parties have reviewed
-- or 14 days have elapsed (whichever comes first), controlled by the
-- visible_after timestamp. The dispute_flag enables moderation escalation.
-- ============================================================================
CREATE TABLE stay.stay_mutual_review (
    review_id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id   UUID        NOT NULL,       -- FK to commerce.commerce_reservation
    guest_user_id    UUID        NOT NULL,
    host_id          UUID        NOT NULL
                                 REFERENCES stay.stay_host_profile (host_id),
    guest_rating     SMALLINT    CHECK (guest_rating IS NULL OR (guest_rating >= 1 AND guest_rating <= 5)),
    host_rating      SMALLINT    CHECK (host_rating IS NULL OR (host_rating >= 1 AND host_rating <= 5)),
    guest_review     TEXT,
    host_review      TEXT,
    guest_reviewed_at TIMESTAMPTZ,
    host_reviewed_at  TIMESTAMPTZ,
    visible_after    TIMESTAMPTZ,
    dispute_flag     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stay.stay_mutual_review IS
    'Double-blind mutual review system. Reviews surface after both parties submit or 14-day window expires.';

-- Lookup by reservation (one review record per reservation)
CREATE INDEX idx_stay_mutual_review_reservation
    ON stay.stay_mutual_review (reservation_id);

-- Lookup all reviews for a host
CREATE INDEX idx_stay_mutual_review_host
    ON stay.stay_mutual_review (host_id);

-- ============================================================================
-- stay.stay_damage_claim
-- ----------------------------------------------------------------------------
-- Post-stay damage claims filed by hosts. Tracks the claim lifecycle from
-- submission through review to resolution/payment. Evidence JSONB stores
-- photos, descriptions, and receipts. Optionally links to the finance escrow
-- system and external insurance claims.
-- ============================================================================
CREATE TABLE stay.stay_damage_claim (
    claim_id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id     UUID          NOT NULL,       -- FK to commerce.commerce_reservation
    property_id        UUID          NOT NULL
                                     REFERENCES stay.stay_property (property_id),
    host_id            UUID          NOT NULL
                                     REFERENCES stay.stay_host_profile (host_id),
    claim_amount       NUMERIC(12,2) NOT NULL
                                     CHECK (claim_amount > 0),
    currency           CHAR(3)       NOT NULL DEFAULT 'USD',
    evidence           JSONB         NOT NULL DEFAULT '[]'::jsonb,
    status             TEXT          NOT NULL DEFAULT 'submitted'
                                     CHECK (status IN (
                                         'submitted', 'under_review', 'approved',
                                         'denied', 'paid', 'disputed'
                                     )),
    resolution_notes   TEXT,
    escrow_id          UUID,                         -- FK to finance.fin_escrow (nullable)
    insurance_claim_id UUID,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stay.stay_damage_claim IS
    'Post-stay damage claims with evidence, escrow linkage, and insurance integration. Full lifecycle from submission to payout.';

-- Lookup claims by reservation
CREATE INDEX idx_stay_damage_claim_reservation
    ON stay.stay_damage_claim (reservation_id);

-- Operational view: claims for a property filtered by status
CREATE INDEX idx_stay_damage_claim_property_status
    ON stay.stay_damage_claim (property_id, status);

-- ============================================================================
-- stay.stay_property_intelligence
-- ----------------------------------------------------------------------------
-- AI-computed intelligence layer per property. Demand scoring, cancellation
-- risk, neighbourhood quality signals (safety, noise, walkability), luxury
-- fit, trip-context fit, and financial performance metrics. Updated
-- asynchronously by background workers and ML pipelines.
-- ============================================================================
CREATE TABLE stay.stay_property_intelligence (
    property_id              UUID          PRIMARY KEY
                                           REFERENCES stay.stay_property (property_id) ON DELETE CASCADE,
    demand_score             NUMERIC(5,2)  NOT NULL DEFAULT 0,
    cancellation_risk        NUMERIC(5,4)  NOT NULL DEFAULT 0,
    neighborhood_safety_score NUMERIC(5,2),
    noise_risk_score         NUMERIC(5,2),
    walkability_score        NUMERIC(5,2),
    luxury_fit_score         NUMERIC(5,2),
    trip_fit_score           NUMERIC(5,2),
    avg_nightly_rate         NUMERIC(12,2),
    occupancy_rate_30d       NUMERIC(5,2),
    updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stay.stay_property_intelligence IS
    'AI-computed property intelligence: demand, risk, neighbourhood quality, luxury fit, and financial performance metrics.';

-- ============================================================================
-- stay.stay_message_thread
-- ----------------------------------------------------------------------------
-- Conversation thread between a guest and a property (host). Optionally
-- linked to a reservation for contextual messaging. Status lifecycle allows
-- archiving old threads without deletion.
-- ============================================================================
CREATE TABLE stay.stay_message_thread (
    thread_id      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id    UUID        NOT NULL
                               REFERENCES stay.stay_property (property_id),
    user_id        UUID        NOT NULL,
    reservation_id UUID,
    status         TEXT        NOT NULL DEFAULT 'open'
                               CHECK (status IN ('open', 'closed', 'archived')),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stay.stay_message_thread IS
    'Guest-host conversation thread scoped to a property. Optionally linked to a reservation for contextual messaging.';

-- Primary query: threads for a property+user pair
CREATE INDEX idx_stay_message_thread_property_user
    ON stay.stay_message_thread (property_id, user_id);

-- ============================================================================
-- stay.stay_message
-- ----------------------------------------------------------------------------
-- Individual messages within a guest-host thread. Supports guest, host,
-- system, and concierge sender types. The metadata JSONB carries
-- type-specific payloads (auto-translated text, booking action buttons,
-- system event details).
-- ============================================================================
CREATE TABLE stay.stay_message (
    message_id  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id   UUID        NOT NULL
                             REFERENCES stay.stay_message_thread (thread_id) ON DELETE CASCADE,
    sender_type TEXT        NOT NULL
                             CHECK (sender_type IN ('guest', 'host', 'system', 'concierge')),
    sender_id   UUID,
    body        TEXT        NOT NULL,
    metadata    JSONB       NOT NULL DEFAULT '{}'::jsonb,
    read_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE stay.stay_message IS
    'Individual messages in a guest-host thread. Supports multiple sender types and structured metadata payloads.';

-- Primary query: render messages in chronological order for a thread
CREATE INDEX idx_stay_message_thread_created
    ON stay.stay_message (thread_id, created_at);

-- ============================================================================
-- Updated-at trigger function (schema-local copy for independence)
-- ============================================================================
CREATE OR REPLACE FUNCTION stay.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at triggers
CREATE TRIGGER trg_stay_property_updated_at
    BEFORE UPDATE ON stay.stay_property
    FOR EACH ROW EXECUTE FUNCTION stay.set_updated_at();

CREATE TRIGGER trg_stay_room_type_updated_at
    BEFORE UPDATE ON stay.stay_room_type
    FOR EACH ROW EXECUTE FUNCTION stay.set_updated_at();

CREATE TRIGGER trg_stay_rate_plan_updated_at
    BEFORE UPDATE ON stay.stay_rate_plan
    FOR EACH ROW EXECUTE FUNCTION stay.set_updated_at();

CREATE TRIGGER trg_stay_inventory_night_updated_at
    BEFORE UPDATE ON stay.stay_inventory_night
    FOR EACH ROW EXECUTE FUNCTION stay.set_updated_at();

CREATE TRIGGER trg_stay_host_profile_updated_at
    BEFORE UPDATE ON stay.stay_host_profile
    FOR EACH ROW EXECUTE FUNCTION stay.set_updated_at();

CREATE TRIGGER trg_stay_damage_claim_updated_at
    BEFORE UPDATE ON stay.stay_damage_claim
    FOR EACH ROW EXECUTE FUNCTION stay.set_updated_at();

CREATE TRIGGER trg_stay_property_intelligence_updated_at
    BEFORE UPDATE ON stay.stay_property_intelligence
    FOR EACH ROW EXECUTE FUNCTION stay.set_updated_at();

CREATE TRIGGER trg_stay_message_thread_updated_at
    BEFORE UPDATE ON stay.stay_message_thread
    FOR EACH ROW EXECUTE FUNCTION stay.set_updated_at();

COMMIT;
