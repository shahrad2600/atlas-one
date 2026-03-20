-- ============================================================================
-- Migration 025: Luxury Stay Authority Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: The "Luxury Stay Authority" system — a comprehensive engine for
--          qualifying, reviewing, ranking, and personalizing luxury properties.
--          Includes property qualification pipeline, canonical property graph
--          with multi-channel deduplication, structured luxury-specific reviews,
--          a scoring/ranking engine, traveler preference profiles, inspector/
--          editor workflows, supplier console, and governance/audit trail.
--
-- Dependencies:
--   - 001 (assumed): uuid-ossp extension, pgvector extension
--   - 002 (assumed): identity schema (identity.identity_user)
--   - 007: stay schema (stay.stay_property)
--   - 008: luxury schema (lux schema)
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS luxauth;

-- ============================================================================
--  1. QUALIFICATION ENGINE
-- ============================================================================

-- ============================================================================
-- luxauth.property_qualification
-- ----------------------------------------------------------------------------
-- Determines whether a property meets the bar for "truly luxury" status.
-- Aggregates external prestige signals (Forbes, Michelin Keys, etc.), hard
-- product scores, service potential, review trust, consistency, and taxonomy
-- fit into an overall qualification score. Properties are reviewed on a
-- periodic cadence (review_due_at) to maintain accuracy.
-- ============================================================================
CREATE TABLE luxauth.property_qualification (
    qualification_id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id               UUID          NOT NULL,       -- FK to stay.stay_property
    qualification_status      TEXT          NOT NULL DEFAULT 'pending'
                                            CHECK (qualification_status IN (
                                                'truly_luxury', 'borderline', 'premium_not_luxury',
                                                'pending', 'disqualified'
                                            )),
    external_prestige_score   NUMERIC(5,2)  DEFAULT 0,      -- 0-100
    hard_product_score        NUMERIC(5,2)  DEFAULT 0,
    service_potential_score   NUMERIC(5,2)  DEFAULT 0,
    review_trust_score        NUMERIC(5,2)  DEFAULT 0,
    consistency_score         NUMERIC(5,2)  DEFAULT 0,
    luxury_taxonomy_fit_score NUMERIC(5,2)  DEFAULT 0,
    overall_qualification_score NUMERIC(5,2) DEFAULT 0,
    qualification_sources     JSONB         NOT NULL DEFAULT '[]'::jsonb,
    inspector_notes           TEXT,
    qualified_at              TIMESTAMPTZ,
    disqualified_reason       TEXT,
    review_due_at             TIMESTAMPTZ,
    created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE luxauth.property_qualification IS
    'Property luxury qualification assessment. Aggregates external prestige, hard product, service, trust, consistency, and taxonomy scores into an overall qualification decision.';
COMMENT ON COLUMN luxauth.property_qualification.qualification_sources IS
    'Array of external signals, e.g. [{source: "forbes", rating: "5-star", verified_at: "..."}, {source: "michelin_keys", keys: 3}].';
COMMENT ON COLUMN luxauth.property_qualification.review_due_at IS
    'Next scheduled date for re-qualification review.';

-- Property lookup — one qualification per property
CREATE UNIQUE INDEX idx_luxauth_pq_property
    ON luxauth.property_qualification (property_id);

-- Filter by status for admin dashboards
CREATE INDEX idx_luxauth_pq_status
    ON luxauth.property_qualification (qualification_status);

-- Upcoming reviews due
CREATE INDEX idx_luxauth_pq_review_due
    ON luxauth.property_qualification (review_due_at)
    WHERE review_due_at IS NOT NULL;

-- ============================================================================
-- luxauth.property_qualification_history
-- ----------------------------------------------------------------------------
-- Immutable audit trail of every qualification status change. Captures who
-- made the change and why, enabling accountability and dispute resolution.
-- ============================================================================
CREATE TABLE luxauth.property_qualification_history (
    history_id        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    qualification_id  UUID          NOT NULL REFERENCES luxauth.property_qualification (qualification_id) ON DELETE CASCADE,
    previous_status   TEXT,
    new_status        TEXT          NOT NULL,
    changed_by        UUID,           -- admin/inspector user_id
    reason            TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE luxauth.property_qualification_history IS
    'Immutable audit trail of property qualification status changes. Tracks who changed what and why.';

-- History for a given qualification
CREATE INDEX idx_luxauth_pqh_qualification
    ON luxauth.property_qualification_history (qualification_id, created_at DESC);


-- ============================================================================
--  2. CANONICAL PROPERTY GRAPH
-- ============================================================================

-- ============================================================================
-- luxauth.canonical_property
-- ----------------------------------------------------------------------------
-- Single source of truth for a luxury property identity, deduplicated across
-- all channels and marketplaces. Stores geography, taxonomy, editorial content,
-- and AI-generated luxury profiles. The luxury_truth_label is a curated,
-- honest assessment that powers the platform's editorial voice.
-- ============================================================================
CREATE TABLE luxauth.canonical_property (
    canonical_id        UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id         UUID          UNIQUE,             -- FK to stay.stay_property (nullable)
    canonical_name      TEXT          NOT NULL,
    property_universe   TEXT          NOT NULL
                                      CHECK (property_universe IN (
                                          'hotels_resorts', 'villas_residences', 'specialty_stays'
                                      )),
    luxury_taxonomy     TEXT[]        NOT NULL DEFAULT '{}',
    luxury_truth_label  TEXT,
    brand               TEXT,
    chain               TEXT,
    -- Geography
    city                TEXT,
    region              TEXT,
    country             TEXT          NOT NULL,
    continent           TEXT,
    latitude            NUMERIC(10,7),
    longitude           NUMERIC(10,7),
    -- Metadata
    year_opened         INT,
    last_renovated      INT,
    total_rooms         INT,
    total_suites        INT,
    property_description TEXT,
    editorial_summary   TEXT,
    -- AI-generated fields
    ai_luxury_profile   JSONB         NOT NULL DEFAULT '{}'::jsonb,
    ai_best_for         TEXT[]        DEFAULT '{}',
    ai_not_ideal_for    TEXT[]        DEFAULT '{}',
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE luxauth.canonical_property IS
    'Single canonical identity for a luxury property across all channels. Stores taxonomy, geography, editorial truth label, and AI-generated profiles.';
COMMENT ON COLUMN luxauth.canonical_property.luxury_taxonomy IS
    'Array of taxonomy tags: discreet_classical, design_led, barefoot, family_polished, social_glamour, wellness_first, heritage_grand, expedition_adventure, safari_lodge, ski_service.';
COMMENT ON COLUMN luxauth.canonical_property.luxury_truth_label IS
    'Curated honest assessment: truly_luxurious, design_luxury_not_service, elite_for_families, beautiful_but_inconsistent, best_booked_as_suites, better_in_shoulder_season, legendary_service_dated_rooms, not_worth_premium.';
COMMENT ON COLUMN luxauth.canonical_property.editorial_summary IS
    'Editor-written 2-3 sentence luxury truth summary.';

-- Geographic queries — city/country lookups
CREATE INDEX idx_luxauth_cp_country
    ON luxauth.canonical_property (country);
CREATE INDEX idx_luxauth_cp_city_country
    ON luxauth.canonical_property (city, country);
CREATE INDEX idx_luxauth_cp_continent
    ON luxauth.canonical_property (continent);

-- Universe filter
CREATE INDEX idx_luxauth_cp_universe
    ON luxauth.canonical_property (property_universe);

-- Brand/chain lookups
CREATE INDEX idx_luxauth_cp_brand
    ON luxauth.canonical_property (brand)
    WHERE brand IS NOT NULL;
CREATE INDEX idx_luxauth_cp_chain
    ON luxauth.canonical_property (chain)
    WHERE chain IS NOT NULL;

-- GIN index on taxonomy array for @> (contains) queries
CREATE INDEX idx_luxauth_cp_taxonomy
    ON luxauth.canonical_property USING GIN (luxury_taxonomy);

-- GIN index on AI best_for / not_ideal_for
CREATE INDEX idx_luxauth_cp_ai_best_for
    ON luxauth.canonical_property USING GIN (ai_best_for);

-- ============================================================================
-- luxauth.property_channel_listing
-- ----------------------------------------------------------------------------
-- Maps the same canonical property to its representations across external
-- channels (Airbnb Luxe, Plum Guide, onefinestay, Marriott Homes & Villas,
-- direct bookings, etc.). Enables price comparison and perk aggregation.
-- ============================================================================
CREATE TABLE luxauth.property_channel_listing (
    listing_id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_id        UUID          NOT NULL REFERENCES luxauth.canonical_property (canonical_id) ON DELETE CASCADE,
    channel_name        TEXT          NOT NULL,
    channel_listing_url TEXT,
    channel_property_id TEXT,
    channel_rating      NUMERIC(3,1),
    channel_review_count INT         DEFAULT 0,
    channel_price_range JSONB,
    perks               JSONB         NOT NULL DEFAULT '[]'::jsonb,
    verified            BOOLEAN       NOT NULL DEFAULT FALSE,
    last_synced_at      TIMESTAMPTZ,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE luxauth.property_channel_listing IS
    'Maps a canonical property to its listing on external channels (Airbnb Luxe, Plum Guide, etc.) for price comparison and perk aggregation.';
COMMENT ON COLUMN luxauth.property_channel_listing.channel_price_range IS
    'Price range object, e.g. {min: 500, max: 3000, currency: "USD"}.';
COMMENT ON COLUMN luxauth.property_channel_listing.perks IS
    'Array of perks, e.g. [{type: "breakfast", description: "..."}, {type: "upgrade", description: "..."}].';

-- All listings for a canonical property
CREATE INDEX idx_luxauth_pcl_canonical
    ON luxauth.property_channel_listing (canonical_id);

-- Channel-specific lookups
CREATE INDEX idx_luxauth_pcl_channel
    ON luxauth.property_channel_listing (channel_name, canonical_id);

-- Unique constraint: one listing per property per channel
CREATE UNIQUE INDEX idx_luxauth_pcl_canonical_channel
    ON luxauth.property_channel_listing (canonical_id, channel_name);


-- ============================================================================
--  3. LUXURY REVIEW ENGINE
-- ============================================================================

-- ============================================================================
-- luxauth.luxury_review
-- ----------------------------------------------------------------------------
-- Structured luxury-specific review that goes far beyond generic star ratings.
-- Captures granular luxury dimensions (service intelligence, privacy, design,
-- dining seriousness, consistency, etc.), stay context (room category, trip
-- purpose, season, party composition), verification provenance, and trust/
-- fraud scoring. Supports multiple verification tiers from verified stays to
-- inspector and editor reviews.
-- ============================================================================
CREATE TABLE luxauth.luxury_review (
    review_id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_id        UUID          NOT NULL REFERENCES luxauth.canonical_property (canonical_id) ON DELETE CASCADE,
    user_id             UUID          NOT NULL,
    -- Verification
    verification_type   TEXT          NOT NULL
                                      CHECK (verification_type IN (
                                          'verified_stay', 'partner_verified', 'inspector_review',
                                          'advisor_review', 'elite_repeat_guest', 'editor_review',
                                          'local_expert'
                                      )),
    booking_source      TEXT,
    -- Stay details
    stay_dates_start    DATE,
    stay_dates_end      DATE,
    room_category       TEXT,
    room_unit_id        UUID,
    trip_purpose        TEXT
                         CHECK (trip_purpose IS NULL OR trip_purpose IN (
                             'romance', 'honeymoon', 'family', 'celebration', 'wellness',
                             'business', 'girls_trip', 'multi_generational', 'solo', 'adventure'
                         )),
    party_composition   TEXT
                         CHECK (party_composition IS NULL OR party_composition IN (
                             'couple', 'family_young_kids', 'family_teens', 'friends',
                             'solo', 'multi_generational', 'business_group'
                         )),
    season              TEXT
                         CHECK (season IS NULL OR season IN (
                             'peak', 'shoulder', 'off_peak', 'festive'
                         )),
    full_paying_guest   BOOLEAN       NOT NULL DEFAULT TRUE,
    repeat_guest        BOOLEAN       NOT NULL DEFAULT FALSE,
    -- Core luxury scores (1-10 scale)
    score_service_intelligence      SMALLINT CHECK (score_service_intelligence IS NULL OR (score_service_intelligence BETWEEN 1 AND 10)),
    score_privacy_calm              SMALLINT CHECK (score_privacy_calm IS NULL OR (score_privacy_calm BETWEEN 1 AND 10)),
    score_design_sense_of_place     SMALLINT CHECK (score_design_sense_of_place IS NULL OR (score_design_sense_of_place BETWEEN 1 AND 10)),
    score_room_suite_quality        SMALLINT CHECK (score_room_suite_quality IS NULL OR (score_room_suite_quality BETWEEN 1 AND 10)),
    score_dining_seriousness        SMALLINT CHECK (score_dining_seriousness IS NULL OR (score_dining_seriousness BETWEEN 1 AND 10)),
    score_wellness                  SMALLINT CHECK (score_wellness IS NULL OR (score_wellness BETWEEN 1 AND 10)),
    score_consistency               SMALLINT CHECK (score_consistency IS NULL OR (score_consistency BETWEEN 1 AND 10)),
    score_value_at_luxury_level     SMALLINT CHECK (score_value_at_luxury_level IS NULL OR (score_value_at_luxury_level BETWEEN 1 AND 10)),
    score_sleep_quality             SMALLINT CHECK (score_sleep_quality IS NULL OR (score_sleep_quality BETWEEN 1 AND 10)),
    score_arrival_departure         SMALLINT CHECK (score_arrival_departure IS NULL OR (score_arrival_departure BETWEEN 1 AND 10)),
    -- Key questions
    would_return_at_same_rate BOOLEAN,
    best_traveler_fit   TEXT[]        DEFAULT '{}',
    -- Text content
    title               TEXT,
    what_felt_truly_luxurious                TEXT,
    what_looked_luxurious_but_didnt_execute   TEXT,
    which_room_would_book_again              TEXT,
    who_should_avoid                         TEXT,
    recovery_experience                      TEXT,
    free_text           TEXT,
    -- Photos
    photo_urls          TEXT[]        DEFAULT '{}',
    -- Trust
    trust_score         NUMERIC(3,2) DEFAULT 0.50,
    fraud_score         NUMERIC(3,2) DEFAULT 0.00,
    status              TEXT          NOT NULL DEFAULT 'pending'
                                      CHECK (status IN (
                                          'pending', 'published', 'hidden', 'removed', 'flagged'
                                      )),
    moderation_notes    TEXT,
    helpful_count       INT           NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE luxauth.luxury_review IS
    'Structured luxury-specific review with granular scoring dimensions, stay context, verification provenance, and trust/fraud scoring.';
COMMENT ON COLUMN luxauth.luxury_review.score_service_intelligence IS
    'Anticipatory vs reactive service quality (1-10).';
COMMENT ON COLUMN luxauth.luxury_review.trust_score IS
    'Computed trust score (0.00-1.00) based on verification, history, and behavioral signals.';
COMMENT ON COLUMN luxauth.luxury_review.fraud_score IS
    'Computed fraud likelihood score (0.00-1.00). High values trigger moderation review.';

-- Reviews for a property by status (main listing query)
CREATE INDEX idx_luxauth_lr_canonical_status
    ON luxauth.luxury_review (canonical_id, status);

-- Reviews for a property sorted by date
CREATE INDEX idx_luxauth_lr_canonical_created
    ON luxauth.luxury_review (canonical_id, created_at DESC);

-- Published reviews only (most common query)
CREATE INDEX idx_luxauth_lr_canonical_published
    ON luxauth.luxury_review (canonical_id, created_at DESC)
    WHERE status = 'published';

-- User's review history
CREATE INDEX idx_luxauth_lr_user
    ON luxauth.luxury_review (user_id, created_at DESC);

-- Moderation queue
CREATE INDEX idx_luxauth_lr_moderation
    ON luxauth.luxury_review (status, created_at)
    WHERE status IN ('pending', 'flagged');

-- Verification type filtering
CREATE INDEX idx_luxauth_lr_verification
    ON luxauth.luxury_review (canonical_id, verification_type)
    WHERE status = 'published';

-- GIN index on best_traveler_fit array
CREATE INDEX idx_luxauth_lr_traveler_fit
    ON luxauth.luxury_review USING GIN (best_traveler_fit);

-- ============================================================================
-- luxauth.luxury_review_response
-- ----------------------------------------------------------------------------
-- Property owner or manager response to a luxury review. One response per
-- review. Captures responder role for display credibility.
-- ============================================================================
CREATE TABLE luxauth.luxury_review_response (
    response_id     UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id       UUID          NOT NULL UNIQUE REFERENCES luxauth.luxury_review (review_id) ON DELETE CASCADE,
    responder_id    UUID          NOT NULL,
    responder_role  TEXT
                     CHECK (responder_role IS NULL OR responder_role IN (
                         'owner', 'general_manager', 'guest_relations', 'management_company'
                     )),
    body            TEXT          NOT NULL,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE luxauth.luxury_review_response IS
    'Property owner/manager response to a luxury review. One response per review with responder role attribution.';


-- ============================================================================
--  4. RANKING ENGINE
-- ============================================================================

-- ============================================================================
-- luxauth.property_score_snapshot
-- ----------------------------------------------------------------------------
-- Point-in-time composite scoring for a property, recalculated periodically.
-- Decomposes luxury into component scores (service execution, consistency,
-- room quality, design, privacy, dining, etc.), applies confidence/recency/
-- integrity multipliers, and produces a final luxury_rank_score (internal)
-- and luxury_standard_score (public-facing). The is_current flag enables
-- efficient lookups of the latest snapshot without date range queries.
-- ============================================================================
CREATE TABLE luxauth.property_score_snapshot (
    snapshot_id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_id                  UUID          NOT NULL REFERENCES luxauth.canonical_property (canonical_id) ON DELETE CASCADE,
    computed_at                   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    -- Component scores (0-100)
    service_execution_score       NUMERIC(5,2),
    consistency_score             NUMERIC(5,2),
    room_quality_score            NUMERIC(5,2),
    design_score                  NUMERIC(5,2),
    privacy_score                 NUMERIC(5,2),
    dining_score                  NUMERIC(5,2),
    location_context_score        NUMERIC(5,2),
    wellness_score                NUMERIC(5,2),
    recovery_score                NUMERIC(5,2),
    value_within_set_score        NUMERIC(5,2),
    -- Villa-specific scores
    management_serviceability_score NUMERIC(5,2),
    staffing_potential_score      NUMERIC(5,2),
    amenity_seriousness_score     NUMERIC(5,2),
    exclusivity_score             NUMERIC(5,2),
    -- Multipliers
    confidence_multiplier         NUMERIC(4,3)  NOT NULL DEFAULT 1.000,
    recency_multiplier            NUMERIC(4,3)  NOT NULL DEFAULT 1.000,
    integrity_multiplier          NUMERIC(4,3)  NOT NULL DEFAULT 1.000,
    -- Final scores
    luxury_rank_score             NUMERIC(7,4)  NOT NULL,
    luxury_standard_score         NUMERIC(5,2)  NOT NULL,
    luxury_fit_score              NUMERIC(5,2),
    -- Metadata
    review_count                  INT           NOT NULL DEFAULT 0,
    verified_review_count         INT           NOT NULL DEFAULT 0,
    inspector_confirmed           BOOLEAN       NOT NULL DEFAULT FALSE,
    scoring_version               TEXT          NOT NULL DEFAULT 'v1',
    is_current                    BOOLEAN       NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE luxauth.property_score_snapshot IS
    'Point-in-time composite luxury scoring for a property. Decomposes into component scores, applies multipliers, produces internal rank score and public standard score.';
COMMENT ON COLUMN luxauth.property_score_snapshot.confidence_multiplier IS
    'Multiplier (0.700-1.100) reflecting confidence in the score based on review volume and diversity.';
COMMENT ON COLUMN luxauth.property_score_snapshot.luxury_rank_score IS
    'Internal ranking score used for position calculation. Not exposed publicly.';
COMMENT ON COLUMN luxauth.property_score_snapshot.luxury_standard_score IS
    'Public-facing luxury standard score (0-100).';

-- Current snapshot for a property (most common query)
CREATE INDEX idx_luxauth_pss_canonical_current
    ON luxauth.property_score_snapshot (canonical_id, is_current)
    WHERE is_current = TRUE;

-- Historical snapshots for trend analysis
CREATE INDEX idx_luxauth_pss_canonical_computed
    ON luxauth.property_score_snapshot (canonical_id, computed_at DESC);

-- Scoring version for batch recomputation
CREATE INDEX idx_luxauth_pss_version
    ON luxauth.property_score_snapshot (scoring_version, is_current);

-- ============================================================================
-- luxauth.ranking
-- ----------------------------------------------------------------------------
-- Public ranking positions for properties by geography and category. Supports
-- multiple scopes (city → worldwide), categories (all_luxury, beach_resorts,
-- etc.), and time horizons (live, 12-month, 3-year). Tracks rank movement
-- for trending indicators. Badges highlight specific strengths. Eligibility
-- flags enforce minimum review counts, trust thresholds, and reviewer
-- diversity before a property can appear in rankings.
-- ============================================================================
CREATE TABLE luxauth.ranking (
    ranking_id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_id          UUID          NOT NULL REFERENCES luxauth.canonical_property (canonical_id) ON DELETE CASCADE,
    ranking_scope         TEXT          NOT NULL
                                        CHECK (ranking_scope IN (
                                            'city', 'region', 'country', 'continent', 'worldwide'
                                        )),
    ranking_geography     TEXT          NOT NULL,
    ranking_category      TEXT          NOT NULL
                                        CHECK (ranking_category IN (
                                            'all_luxury', 'city_hotels', 'beach_resorts',
                                            'wellness_retreats', 'family_luxury', 'villas',
                                            'specialty_stays', 'safari_lodges', 'ski_resorts',
                                            'design_hotels', 'new_openings'
                                        )),
    ranking_time_horizon  TEXT          NOT NULL
                                        CHECK (ranking_time_horizon IN (
                                            'live', '12_month', '3_year'
                                        )),
    rank_position         INT           NOT NULL,
    luxury_rank_score     NUMERIC(7,4)  NOT NULL,
    previous_rank_position INT,
    rank_movement         INT           NOT NULL DEFAULT 0,
    -- Explanation
    ranking_explanation   JSONB         NOT NULL DEFAULT '{}'::jsonb,
    -- Badges
    badges                TEXT[]        DEFAULT '{}',
    -- Eligibility
    meets_minimum_reviews BOOLEAN       NOT NULL DEFAULT TRUE,
    meets_trust_threshold BOOLEAN       NOT NULL DEFAULT TRUE,
    meets_diversity_threshold BOOLEAN   NOT NULL DEFAULT TRUE,
    -- Timestamps
    computed_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    valid_from            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    valid_until           TIMESTAMPTZ,
    is_current            BOOLEAN       NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE luxauth.ranking IS
    'Public ranking positions by geography and category. Supports city-to-worldwide scopes, multiple categories, time horizons, movement tracking, and eligibility enforcement.';
COMMENT ON COLUMN luxauth.ranking.ranking_explanation IS
    'Structured explanation: {beats_peers_on: [...], trails_peers_on: [...], best_for: [...], not_ideal_for: [...]}.';
COMMENT ON COLUMN luxauth.ranking.badges IS
    'Array of earned badges: best_service_in_city, top_suite_program, consistency_leader, editor_verified, etc.';

-- One current rank per property per scope/geography/category/horizon
CREATE UNIQUE INDEX idx_luxauth_ranking_unique_current
    ON luxauth.ranking (canonical_id, ranking_scope, ranking_geography, ranking_category, ranking_time_horizon)
    WHERE is_current = TRUE;

-- Primary ranking query: all properties ranked in a scope/geography/category (sorted by position)
CREATE INDEX idx_luxauth_ranking_query
    ON luxauth.ranking (ranking_scope, ranking_geography, ranking_category, ranking_time_horizon, rank_position)
    WHERE is_current = TRUE;

-- Rankings for a specific property
CREATE INDEX idx_luxauth_ranking_canonical
    ON luxauth.ranking (canonical_id, is_current);

-- Badge-based queries
CREATE INDEX idx_luxauth_ranking_badges
    ON luxauth.ranking USING GIN (badges)
    WHERE is_current = TRUE;

-- Expiration sweep
CREATE INDEX idx_luxauth_ranking_valid_until
    ON luxauth.ranking (valid_until)
    WHERE valid_until IS NOT NULL AND is_current = TRUE;


-- ============================================================================
--  5. PERSONALIZATION ENGINE
-- ============================================================================

-- ============================================================================
-- luxauth.traveler_profile
-- ----------------------------------------------------------------------------
-- Luxury traveler preference and memory graph. Combines stated preferences
-- (design taste, dining importance, service style) with learned patterns
-- (preferred brands, destinations, room preferences). Stores dietary and
-- sleep preferences, celebration dates for proactive personalization, and
-- an AI taste vector for semantic similarity matching against properties.
-- ============================================================================
CREATE TABLE luxauth.traveler_profile (
    profile_id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                 UUID          NOT NULL UNIQUE,
    -- Preferences (learned + stated)
    privacy_preference      TEXT
                             CHECK (privacy_preference IS NULL OR privacy_preference IN (
                                 'very_private', 'private', 'social', 'very_social'
                             )),
    pace_preference         TEXT
                             CHECK (pace_preference IS NULL OR pace_preference IN (
                                 'slow_restorative', 'balanced', 'active_packed'
                             )),
    design_taste            TEXT[]        DEFAULT '{}',
    dining_importance       TEXT
                             CHECK (dining_importance IS NULL OR dining_importance IN (
                                 'critical', 'important', 'nice_to_have', 'indifferent'
                             )),
    wellness_importance     TEXT
                             CHECK (wellness_importance IS NULL OR wellness_importance IN (
                                 'essential', 'nice_to_have', 'indifferent'
                             )),
    service_style_preference TEXT
                             CHECK (service_style_preference IS NULL OR service_style_preference IN (
                                 'invisible_seamless', 'attentive_personal', 'formal_traditional'
                             )),
    -- Family
    family_stage            TEXT
                             CHECK (family_stage IS NULL OR family_stage IN (
                                 'no_kids', 'young_kids', 'school_age', 'teens',
                                 'adult_children', 'multi_generational'
                             )),
    -- Travel patterns
    preferred_brands        TEXT[]        DEFAULT '{}',
    disliked_brands         TEXT[]        DEFAULT '{}',
    preferred_hotel_groups  TEXT[]        DEFAULT '{}',
    favorite_destinations   TEXT[]        DEFAULT '{}',
    bucket_list_destinations TEXT[]       DEFAULT '{}',
    -- Room preferences
    room_preferences        JSONB         NOT NULL DEFAULT '{}'::jsonb,
    dietary_preferences     TEXT[]        DEFAULT '{}',
    sleep_preferences       JSONB         NOT NULL DEFAULT '{}'::jsonb,
    -- Budget
    budget_tier             TEXT
                             CHECK (budget_tier IS NULL OR budget_tier IN (
                                 'ultra', 'premium', 'aspirational'
                             )),
    -- AI learning
    ai_taste_vector         vector(1536),
    ai_inferred_preferences JSONB         NOT NULL DEFAULT '{}'::jsonb,
    -- Celebration dates
    anniversary_date        DATE,
    birthdays               JSONB         NOT NULL DEFAULT '[]'::jsonb,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE luxauth.traveler_profile IS
    'Luxury traveler preference and memory graph. Stores stated + learned preferences, room/sleep/dietary needs, celebration dates, and AI taste vector for semantic matching.';
COMMENT ON COLUMN luxauth.traveler_profile.ai_taste_vector IS
    '1536-dim embedding of traveler taste profile for cosine similarity matching against property profiles.';
COMMENT ON COLUMN luxauth.traveler_profile.room_preferences IS
    'Structured room preferences, e.g. {floor: "high", view: "ocean", bed: "king", quiet_wing: true}.';
COMMENT ON COLUMN luxauth.traveler_profile.birthdays IS
    'Array of celebration dates, e.g. [{name: "spouse", date: "03-15"}, ...].';

-- Vector similarity search on taste profiles
CREATE INDEX idx_luxauth_tp_taste_vector
    ON luxauth.traveler_profile
    USING hnsw (ai_taste_vector vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Budget tier filtering
CREATE INDEX idx_luxauth_tp_budget
    ON luxauth.traveler_profile (budget_tier)
    WHERE budget_tier IS NOT NULL;

-- GIN index on preferred brands for @> queries
CREATE INDEX idx_luxauth_tp_preferred_brands
    ON luxauth.traveler_profile USING GIN (preferred_brands);

-- GIN index on favorite destinations
CREATE INDEX idx_luxauth_tp_fav_destinations
    ON luxauth.traveler_profile USING GIN (favorite_destinations);

-- ============================================================================
-- luxauth.personalized_ranking
-- ----------------------------------------------------------------------------
-- Per-user re-ranked properties. Takes the official ranking and adjusts it
-- based on the traveler's profile to produce a personal_rank and fit_score.
-- Fit reasons decompose the match into individual dimensions (privacy_match,
-- design_match, etc.) for explainability.
-- ============================================================================
CREATE TABLE luxauth.personalized_ranking (
    personalized_id     UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID          NOT NULL,
    canonical_id        UUID          NOT NULL REFERENCES luxauth.canonical_property (canonical_id) ON DELETE CASCADE,
    ranking_scope       TEXT          NOT NULL,
    ranking_geography   TEXT          NOT NULL,
    ranking_category    TEXT          NOT NULL,
    official_rank       INT           NOT NULL,
    personal_rank       INT           NOT NULL,
    personal_fit_score  NUMERIC(5,2)  NOT NULL,
    fit_reasons         JSONB         NOT NULL DEFAULT '{}'::jsonb,
    computed_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, canonical_id, ranking_scope, ranking_geography, ranking_category)
);

COMMENT ON TABLE luxauth.personalized_ranking IS
    'Per-user re-ranked properties with personal fit scores and explainable fit reasons.';
COMMENT ON COLUMN luxauth.personalized_ranking.fit_reasons IS
    'Decomposed fit dimensions, e.g. {privacy_match: 0.95, design_match: 0.82, dining_match: 0.70}.';

-- User's personalized rankings for a given scope/geography/category
CREATE INDEX idx_luxauth_pr_user_scope
    ON luxauth.personalized_ranking (user_id, ranking_scope, ranking_geography, ranking_category, personal_rank);

-- Property's personalized rankings across users
CREATE INDEX idx_luxauth_pr_canonical
    ON luxauth.personalized_ranking (canonical_id);


-- ============================================================================
--  6. INSPECTOR / EDITOR SYSTEM
-- ============================================================================

-- ============================================================================
-- luxauth.inspector_report
-- ----------------------------------------------------------------------------
-- Detailed inspector or editor assessment of a property based on an anonymous
-- stay, site visit, or virtual inspection. Captures granular scores across
-- 17 dimensions (arrival through departure), narrative assessments,
-- room-specific recommendations, traveler-type fit, peer comparison, and a
-- final luxury verdict with recommendation level.
-- ============================================================================
CREATE TABLE luxauth.inspector_report (
    report_id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_id            UUID          NOT NULL REFERENCES luxauth.canonical_property (canonical_id) ON DELETE CASCADE,
    inspector_id            UUID          NOT NULL,
    inspection_type         TEXT
                             CHECK (inspection_type IS NULL OR inspection_type IN (
                                 'anonymous_stay', 'site_visit', 'virtual', 'advisor_stay'
                             )),
    stay_dates_start        DATE,
    stay_dates_end          DATE,
    nights_stayed           INT,
    rooms_inspected         TEXT[],
    -- Detailed scores (1-100)
    score_arrival_experience     INT CHECK (score_arrival_experience IS NULL OR (score_arrival_experience BETWEEN 1 AND 100)),
    score_lobby_public_areas     INT CHECK (score_lobby_public_areas IS NULL OR (score_lobby_public_areas BETWEEN 1 AND 100)),
    score_room_quality           INT CHECK (score_room_quality IS NULL OR (score_room_quality BETWEEN 1 AND 100)),
    score_bathroom_quality       INT CHECK (score_bathroom_quality IS NULL OR (score_bathroom_quality BETWEEN 1 AND 100)),
    score_housekeeping           INT CHECK (score_housekeeping IS NULL OR (score_housekeeping BETWEEN 1 AND 100)),
    score_concierge_quality      INT CHECK (score_concierge_quality IS NULL OR (score_concierge_quality BETWEEN 1 AND 100)),
    score_dining_breakfast       INT CHECK (score_dining_breakfast IS NULL OR (score_dining_breakfast BETWEEN 1 AND 100)),
    score_dining_main            INT CHECK (score_dining_main IS NULL OR (score_dining_main BETWEEN 1 AND 100)),
    score_bar_lounge             INT CHECK (score_bar_lounge IS NULL OR (score_bar_lounge BETWEEN 1 AND 100)),
    score_spa_wellness           INT CHECK (score_spa_wellness IS NULL OR (score_spa_wellness BETWEEN 1 AND 100)),
    score_pool_beach             INT CHECK (score_pool_beach IS NULL OR (score_pool_beach BETWEEN 1 AND 100)),
    score_staff_attitude         INT CHECK (score_staff_attitude IS NULL OR (score_staff_attitude BETWEEN 1 AND 100)),
    score_staff_knowledge        INT CHECK (score_staff_knowledge IS NULL OR (score_staff_knowledge BETWEEN 1 AND 100)),
    score_anticipatory_service   INT CHECK (score_anticipatory_service IS NULL OR (score_anticipatory_service BETWEEN 1 AND 100)),
    score_problem_resolution     INT CHECK (score_problem_resolution IS NULL OR (score_problem_resolution BETWEEN 1 AND 100)),
    score_departure              INT CHECK (score_departure IS NULL OR (score_departure BETWEEN 1 AND 100)),
    overall_luxury_assessment    INT CHECK (overall_luxury_assessment IS NULL OR (overall_luxury_assessment BETWEEN 1 AND 100)),
    -- Narrative
    executive_summary       TEXT          NOT NULL,
    strengths               TEXT,
    weaknesses              TEXT,
    recommended_rooms       TEXT,
    rooms_to_avoid          TEXT,
    best_for_traveler_types TEXT[],
    comparison_to_peers     TEXT,
    -- Verdict
    luxury_verdict          TEXT
                             CHECK (luxury_verdict IS NULL OR luxury_verdict IN (
                                 'truly_luxury', 'borderline', 'not_luxury'
                             )),
    recommendation          TEXT
                             CHECK (recommendation IS NULL OR recommendation IN (
                                 'highly_recommend', 'recommend', 'recommend_with_caveats',
                                 'do_not_recommend'
                             )),
    confidential_notes      TEXT,
    published               BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE luxauth.inspector_report IS
    'Detailed inspector/editor assessment with 17-dimension scoring, narrative strengths/weaknesses, room recommendations, peer comparison, and luxury verdict.';
COMMENT ON COLUMN luxauth.inspector_report.confidential_notes IS
    'Internal-only notes not shown to suppliers or guests.';

-- Reports for a property
CREATE INDEX idx_luxauth_ir_canonical
    ON luxauth.inspector_report (canonical_id, created_at DESC);

-- Published reports only
CREATE INDEX idx_luxauth_ir_canonical_published
    ON luxauth.inspector_report (canonical_id, created_at DESC)
    WHERE published = TRUE;

-- Inspector's report history
CREATE INDEX idx_luxauth_ir_inspector
    ON luxauth.inspector_report (inspector_id, created_at DESC);


-- ============================================================================
--  7. SUPPLIER CONSOLE
-- ============================================================================

-- ============================================================================
-- luxauth.supplier_account
-- ----------------------------------------------------------------------------
-- Grants property owners, general managers, revenue managers, marketing, and
-- guest relations staff access to the supplier console with granular
-- permission flags. Each account links a user to a canonical property with
-- a specific role.
-- ============================================================================
CREATE TABLE luxauth.supplier_account (
    account_id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_id        UUID          NOT NULL REFERENCES luxauth.canonical_property (canonical_id) ON DELETE CASCADE,
    supplier_user_id    UUID          NOT NULL,
    role                TEXT          NOT NULL
                                      CHECK (role IN (
                                          'owner', 'general_manager', 'revenue_manager',
                                          'marketing', 'guest_relations'
                                      )),
    status              TEXT          NOT NULL DEFAULT 'active'
                                      CHECK (status IN (
                                          'active', 'suspended', 'pending_verification'
                                      )),
    -- Permissions
    can_manage_profile  BOOLEAN       NOT NULL DEFAULT FALSE,
    can_respond_reviews BOOLEAN       NOT NULL DEFAULT FALSE,
    can_manage_perks    BOOLEAN       NOT NULL DEFAULT FALSE,
    can_view_analytics  BOOLEAN       NOT NULL DEFAULT FALSE,
    can_manage_inventory BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE luxauth.supplier_account IS
    'Supplier console access. Links a user to a canonical property with a role and granular permission flags.';

-- Accounts for a property
CREATE INDEX idx_luxauth_sa_canonical
    ON luxauth.supplier_account (canonical_id, status);

-- User's supplier accounts
CREATE INDEX idx_luxauth_sa_user
    ON luxauth.supplier_account (supplier_user_id, status);

-- Unique: one role per user per property
CREATE UNIQUE INDEX idx_luxauth_sa_canonical_user_role
    ON luxauth.supplier_account (canonical_id, supplier_user_id, role);

-- ============================================================================
-- luxauth.supplier_perk
-- ----------------------------------------------------------------------------
-- Perks offered by a property to attract bookings through the platform.
-- Supports various perk types (upgrade, breakfast, credits, transfers, etc.)
-- with monetary value, conditions, funding source, and validity dates.
-- ============================================================================
CREATE TABLE luxauth.supplier_perk (
    perk_id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_id        UUID          NOT NULL REFERENCES luxauth.canonical_property (canonical_id) ON DELETE CASCADE,
    perk_type           TEXT          NOT NULL
                                      CHECK (perk_type IN (
                                          'upgrade', 'breakfast', 'credit', 'late_checkout',
                                          'early_checkin', 'spa_credit', 'welcome_amenity',
                                          'airport_transfer', 'room_category_upgrade',
                                          'vip_status', 'custom'
                                      )),
    description         TEXT          NOT NULL,
    value_amount        NUMERIC(10,2),
    value_currency      CHAR(3)       NOT NULL DEFAULT 'USD',
    conditions          TEXT,
    active              BOOLEAN       NOT NULL DEFAULT TRUE,
    valid_from          DATE,
    valid_until         DATE,
    funded_by           TEXT
                         CHECK (funded_by IS NULL OR funded_by IN (
                             'property', 'platform', 'shared'
                         )),
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE luxauth.supplier_perk IS
    'Property-offered perks (upgrades, breakfast, credits, etc.) with conditions, funding source, and validity windows.';

-- Active perks for a property
CREATE INDEX idx_luxauth_sp_canonical_active
    ON luxauth.supplier_perk (canonical_id, active)
    WHERE active = TRUE;

-- Perk type filtering
CREATE INDEX idx_luxauth_sp_type
    ON luxauth.supplier_perk (perk_type, active)
    WHERE active = TRUE;

-- ============================================================================
-- luxauth.supplier_analytics_snapshot
-- ----------------------------------------------------------------------------
-- Periodic analytics for a property's performance on the platform. Tracks
-- views, saves, booking requests, conversions, ranking positions, review
-- metrics, and competitor benchmarking for the supplier dashboard.
-- ============================================================================
CREATE TABLE luxauth.supplier_analytics_snapshot (
    snapshot_id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_id          UUID          NOT NULL REFERENCES luxauth.canonical_property (canonical_id) ON DELETE CASCADE,
    period_start          DATE          NOT NULL,
    period_end            DATE          NOT NULL,
    views                 INT           NOT NULL DEFAULT 0,
    saves                 INT           NOT NULL DEFAULT 0,
    booking_requests      INT           NOT NULL DEFAULT 0,
    conversions           INT           NOT NULL DEFAULT 0,
    avg_luxury_rank_score NUMERIC(7,4),
    rank_city             INT,
    rank_country          INT,
    rank_worldwide        INT,
    review_count_period   INT           NOT NULL DEFAULT 0,
    avg_review_score      NUMERIC(3,1),
    competitor_benchmark  JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- Guard against invalid date ranges
    CONSTRAINT luxauth_sas_period_check CHECK (period_start <= period_end)
);

COMMENT ON TABLE luxauth.supplier_analytics_snapshot IS
    'Periodic supplier analytics: views, saves, conversions, ranking positions, review metrics, and competitor benchmarking.';

-- Analytics for a property by period
CREATE INDEX idx_luxauth_sas_canonical_period
    ON luxauth.supplier_analytics_snapshot (canonical_id, period_start DESC);

-- Unique: one snapshot per property per period
CREATE UNIQUE INDEX idx_luxauth_sas_canonical_period_unique
    ON luxauth.supplier_analytics_snapshot (canonical_id, period_start, period_end);


-- ============================================================================
--  8. GOVERNANCE
-- ============================================================================

-- ============================================================================
-- luxauth.ranking_override
-- ----------------------------------------------------------------------------
-- Manual overrides to the algorithmic ranking. Supports boosts, penalties,
-- exclusions, and flags. Requires an explicit reason and optionally an
-- approval chain. Overrides can have expiration dates for temporary actions.
-- ============================================================================
CREATE TABLE luxauth.ranking_override (
    override_id     UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_id    UUID          NOT NULL REFERENCES luxauth.canonical_property (canonical_id) ON DELETE CASCADE,
    override_type   TEXT          NOT NULL
                                  CHECK (override_type IN (
                                      'boost', 'penalty', 'exclude', 'flag'
                                  )),
    reason          TEXT          NOT NULL,
    applied_by      UUID          NOT NULL,
    approved_by     UUID,
    active          BOOLEAN       NOT NULL DEFAULT TRUE,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE luxauth.ranking_override IS
    'Manual ranking overrides (boost, penalty, exclude, flag) with reason, approval chain, and optional expiration.';

-- Active overrides for a property
CREATE INDEX idx_luxauth_ro_canonical_active
    ON luxauth.ranking_override (canonical_id, active)
    WHERE active = TRUE;

-- Expiration sweep
CREATE INDEX idx_luxauth_ro_expires
    ON luxauth.ranking_override (expires_at)
    WHERE expires_at IS NOT NULL AND active = TRUE;

-- Override type filter for admin views
CREATE INDEX idx_luxauth_ro_type_active
    ON luxauth.ranking_override (override_type, active)
    WHERE active = TRUE;

-- ============================================================================
-- luxauth.audit_log
-- ----------------------------------------------------------------------------
-- Comprehensive audit trail for all governance and editorial actions within
-- the luxury authority system. Captures actor, action, entity, before/after
-- state, and client IP. Immutable — no updates or deletes.
-- ============================================================================
CREATE TABLE luxauth.audit_log (
    log_id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id        UUID,
    action          TEXT          NOT NULL,
    entity_type     TEXT          NOT NULL,
    entity_id       UUID          NOT NULL,
    old_value       JSONB,
    new_value       JSONB,
    ip_address      TEXT,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE luxauth.audit_log IS
    'Immutable audit trail for all governance and editorial actions. Captures actor, action, entity, before/after state, and IP.';

-- Audit log for a specific entity
CREATE INDEX idx_luxauth_al_entity
    ON luxauth.audit_log (entity_type, entity_id, created_at DESC);

-- Audit log by actor
CREATE INDEX idx_luxauth_al_actor
    ON luxauth.audit_log (actor_id, created_at DESC)
    WHERE actor_id IS NOT NULL;

-- Action type filter
CREATE INDEX idx_luxauth_al_action
    ON luxauth.audit_log (action, created_at DESC);

-- Time-based queries for compliance reporting
CREATE INDEX idx_luxauth_al_created
    ON luxauth.audit_log (created_at DESC);


-- ============================================================================
-- Updated-at trigger function (schema-local copy for independence)
-- ============================================================================
CREATE OR REPLACE FUNCTION luxauth.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Auto-update updated_at triggers for all tables with updated_at columns
-- ============================================================================

CREATE TRIGGER trg_luxauth_property_qualification_updated_at
    BEFORE UPDATE ON luxauth.property_qualification
    FOR EACH ROW EXECUTE FUNCTION luxauth.set_updated_at();

CREATE TRIGGER trg_luxauth_canonical_property_updated_at
    BEFORE UPDATE ON luxauth.canonical_property
    FOR EACH ROW EXECUTE FUNCTION luxauth.set_updated_at();

CREATE TRIGGER trg_luxauth_property_channel_listing_updated_at
    BEFORE UPDATE ON luxauth.property_channel_listing
    FOR EACH ROW EXECUTE FUNCTION luxauth.set_updated_at();

CREATE TRIGGER trg_luxauth_luxury_review_updated_at
    BEFORE UPDATE ON luxauth.luxury_review
    FOR EACH ROW EXECUTE FUNCTION luxauth.set_updated_at();

CREATE TRIGGER trg_luxauth_luxury_review_response_updated_at
    BEFORE UPDATE ON luxauth.luxury_review_response
    FOR EACH ROW EXECUTE FUNCTION luxauth.set_updated_at();

CREATE TRIGGER trg_luxauth_inspector_report_updated_at
    BEFORE UPDATE ON luxauth.inspector_report
    FOR EACH ROW EXECUTE FUNCTION luxauth.set_updated_at();

CREATE TRIGGER trg_luxauth_supplier_account_updated_at
    BEFORE UPDATE ON luxauth.supplier_account
    FOR EACH ROW EXECUTE FUNCTION luxauth.set_updated_at();

CREATE TRIGGER trg_luxauth_supplier_perk_updated_at
    BEFORE UPDATE ON luxauth.supplier_perk
    FOR EACH ROW EXECUTE FUNCTION luxauth.set_updated_at();

CREATE TRIGGER trg_luxauth_traveler_profile_updated_at
    BEFORE UPDATE ON luxauth.traveler_profile
    FOR EACH ROW EXECUTE FUNCTION luxauth.set_updated_at();

COMMIT;
