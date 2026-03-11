-- ============================================================================
-- Migration 001: Travel Graph (tg) Schema
-- Atlas One -- Enterprise AI-powered Travel Super-Platform
--
-- Creates the core Travel Graph schema containing entities, relationships,
-- places, venues, suppliers, products, inventory, reviews, media, embeddings,
-- and policies.
--
-- Prerequisites: PostgreSQL 16+, pgvector extension, pg_trgm extension
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Schema & Extensions
-- ----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS tg;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ----------------------------------------------------------------------------
-- tg_entity
-- Central node table for the Travel Graph. Every domain object (place, venue,
-- supplier, product, etc.) is registered here to enable uniform aliasing,
-- external refs, reviews, media, and embeddings via a single FK.
-- ----------------------------------------------------------------------------

CREATE TABLE tg.tg_entity (
    entity_id    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type  TEXT        NOT NULL
        CONSTRAINT chk_entity_type CHECK (entity_type IN (
            'place', 'venue', 'supplier', 'product', 'inventory_slot',
            'brand', 'category', 'tag', 'event', 'transport_node',
            'aircraft', 'route', 'policy', 'media'
        )),
    canonical_name    TEXT,
    status            TEXT        NOT NULL DEFAULT 'active'
        CONSTRAINT chk_entity_status CHECK (status IN ('active', 'inactive', 'deleted', 'pending')),
    source_of_truth   TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_entity IS 'Central node in the Travel Graph. Every domain object registers here.';
COMMENT ON COLUMN tg.tg_entity.entity_type IS 'Discriminator for the entity subtype table.';
COMMENT ON COLUMN tg.tg_entity.source_of_truth IS 'Identifier of the authoritative system for this entity (e.g., supplier API, manual).';

CREATE INDEX idx_entity_type_status ON tg.tg_entity (entity_type, status);
CREATE INDEX idx_entity_canonical_name_trgm ON tg.tg_entity
    USING gin (canonical_name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- tg_entity_alias
-- Alternate names, translations, and fuzzy-match surface for entities.
-- ----------------------------------------------------------------------------

CREATE TABLE tg.tg_entity_alias (
    alias_id    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id   UUID        NOT NULL
        REFERENCES tg.tg_entity (entity_id) ON DELETE CASCADE,
    alias       TEXT        NOT NULL,
    lang        TEXT,           -- BCP 47 language tag (e.g., 'en', 'fr-CA', 'ja')
    source      TEXT        NOT NULL,
    confidence  NUMERIC(5,4)   DEFAULT 1.0
        CONSTRAINT chk_alias_confidence CHECK (confidence >= 0 AND confidence <= 1),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_entity_alias IS 'Alternate names and translations for entities.';
COMMENT ON COLUMN tg.tg_entity_alias.lang IS 'BCP 47 language tag.';
COMMENT ON COLUMN tg.tg_entity_alias.confidence IS 'Confidence score for this alias (0.0 to 1.0).';

CREATE INDEX idx_alias_text ON tg.tg_entity_alias (alias);
CREATE INDEX idx_alias_entity_id ON tg.tg_entity_alias (entity_id);

-- ----------------------------------------------------------------------------
-- tg_entity_external_ref
-- Links entities to external system identifiers (Google Places, Yelp, IATA, etc.)
-- ----------------------------------------------------------------------------

CREATE TABLE tg.tg_entity_external_ref (
    ref_id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id        UUID        NOT NULL
        REFERENCES tg.tg_entity (entity_id) ON DELETE CASCADE,
    system           TEXT        NOT NULL,
    external_id      TEXT        NOT NULL,
    external_url     TEXT,
    last_verified_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_external_ref UNIQUE (system, external_id)
);

COMMENT ON TABLE tg.tg_entity_external_ref IS 'Maps entities to external system identifiers.';
COMMENT ON COLUMN tg.tg_entity_external_ref.system IS 'External system name (e.g., google_places, yelp, iata, amadeus).';

CREATE INDEX idx_external_ref_entity_id ON tg.tg_entity_external_ref (entity_id);

-- ----------------------------------------------------------------------------
-- tg_relationship
-- Directed edges in the Travel Graph connecting any two entities.
-- ----------------------------------------------------------------------------

CREATE TABLE tg.tg_relationship (
    rel_id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_entity_id  UUID        NOT NULL
        REFERENCES tg.tg_entity (entity_id) ON DELETE CASCADE,
    to_entity_id    UUID        NOT NULL
        REFERENCES tg.tg_entity (entity_id) ON DELETE CASCADE,
    rel_type        TEXT        NOT NULL
        CONSTRAINT chk_rel_type CHECK (rel_type IN (
            'located_in', 'belongs_to_brand', 'offers_product',
            'has_category', 'nearby', 'operates_route', 'uses_aircraft'
        )),
    weight          NUMERIC(8,5)   DEFAULT 1.0,
    valid_from      TIMESTAMPTZ,
    valid_to        TIMESTAMPTZ,
    metadata        JSONB          DEFAULT '{}',
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_no_self_ref CHECK (from_entity_id <> to_entity_id)
);

COMMENT ON TABLE tg.tg_relationship IS 'Directed edge between two entities in the Travel Graph.';
COMMENT ON COLUMN tg.tg_relationship.weight IS 'Edge weight/strength (default 1.0). Used for ranking and traversal.';
COMMENT ON COLUMN tg.tg_relationship.valid_from IS 'Start of the temporal validity window (NULL = always valid).';
COMMENT ON COLUMN tg.tg_relationship.valid_to IS 'End of the temporal validity window (NULL = no expiry).';

CREATE INDEX idx_rel_from_type ON tg.tg_relationship (from_entity_id, rel_type);
CREATE INDEX idx_rel_to_type ON tg.tg_relationship (to_entity_id, rel_type);
CREATE INDEX idx_rel_metadata ON tg.tg_relationship USING gin (metadata);

-- ----------------------------------------------------------------------------
-- tg_policy
-- Cancellation, refund, rebooking, and other business rules.
-- Defined before tg_product because products reference policies.
-- ----------------------------------------------------------------------------

CREATE TABLE tg.tg_policy (
    policy_id    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- FK to tg_entity so policies are first-class graph nodes
    CONSTRAINT fk_policy_entity FOREIGN KEY (policy_id)
        REFERENCES tg.tg_entity (entity_id) ON DELETE CASCADE,
    policy_type  TEXT        NOT NULL
        CONSTRAINT chk_policy_type CHECK (policy_type IN (
            'cancellation', 'no_show', 'refund', 'rebooking',
            'insurance_terms', 'chargeback', 'deposit'
        )),
    name         TEXT,
    rules        JSONB       NOT NULL,
    jurisdiction TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_policy IS 'Business rule definitions (cancellation, refund, etc.).';
COMMENT ON COLUMN tg.tg_policy.rules IS 'Machine-readable rule definitions evaluated by the policy engine.';
COMMENT ON COLUMN tg.tg_policy.jurisdiction IS 'Jurisdiction code where this policy applies (e.g., US, EU, GB).';

-- ----------------------------------------------------------------------------
-- tg_place
-- Geographic locations forming the spatial backbone of the Travel Graph.
-- ----------------------------------------------------------------------------

CREATE TABLE tg.tg_place (
    place_id         UUID        PRIMARY KEY,
    CONSTRAINT fk_place_entity FOREIGN KEY (place_id)
        REFERENCES tg.tg_entity (entity_id) ON DELETE CASCADE,
    place_type       TEXT        NOT NULL
        CONSTRAINT chk_place_type CHECK (place_type IN (
            'country', 'region', 'state', 'city', 'neighborhood',
            'poi_area', 'airport_city'
        )),
    country_code     CHAR(2),
    admin1           TEXT,
    admin2           TEXT,
    timezone         TEXT,
    lat              NUMERIC(10,7),
    lng              NUMERIC(10,7),
    bbox             JSONB,
    popularity_score NUMERIC(10,6) DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_place IS 'Geographic location node in the Travel Graph.';
COMMENT ON COLUMN tg.tg_place.bbox IS 'Bounding box as GeoJSON or {sw_lat, sw_lng, ne_lat, ne_lng}.';
COMMENT ON COLUMN tg.tg_place.popularity_score IS 'Normalized score for search ranking and recommendations.';

CREATE INDEX idx_place_coords ON tg.tg_place (lat, lng);
CREATE INDEX idx_place_type_country ON tg.tg_place (place_type, country_code);

-- ----------------------------------------------------------------------------
-- tg_address
-- Physical street addresses, shared across venues and other addressable entities.
-- ----------------------------------------------------------------------------

CREATE TABLE tg.tg_address (
    address_id   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    line1        TEXT,
    line2        TEXT,
    city         TEXT,
    region       TEXT,
    postal_code  TEXT,
    country_code CHAR(2),
    lat          NUMERIC(10,7),
    lng          NUMERIC(10,7),
    geohash      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_address IS 'Physical street address. Shared across venues and other addressable entities.';
COMMENT ON COLUMN tg.tg_address.geohash IS 'Geohash string for proximity searches and spatial bucketing.';

CREATE INDEX idx_address_country_city ON tg.tg_address (country_code, city);
CREATE INDEX idx_address_geohash ON tg.tg_address (geohash);

-- ----------------------------------------------------------------------------
-- tg_venue
-- Physical locations where experiences happen (restaurants, hotels, etc.).
-- ----------------------------------------------------------------------------

CREATE TABLE tg.tg_venue (
    venue_id     UUID        PRIMARY KEY,
    CONSTRAINT fk_venue_entity FOREIGN KEY (venue_id)
        REFERENCES tg.tg_entity (entity_id) ON DELETE CASCADE,
    venue_type   TEXT        NOT NULL
        CONSTRAINT chk_venue_type CHECK (venue_type IN (
            'restaurant', 'hotel', 'attraction', 'rental_property',
            'cruise_terminal', 'museum', 'spa'
        )),
    place_id     UUID
        REFERENCES tg.tg_place (place_id) ON DELETE SET NULL,
    address_id   UUID
        REFERENCES tg.tg_address (address_id) ON DELETE SET NULL,
    phone        TEXT,
    website      TEXT,
    price_tier   SMALLINT
        CONSTRAINT chk_price_tier CHECK (price_tier >= 1 AND price_tier <= 4),
    rating_avg   NUMERIC(3,2),
    rating_count INT         DEFAULT 0,
    hours        JSONB,
    amenities    JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_venue IS 'Physical location where a travel experience takes place.';
COMMENT ON COLUMN tg.tg_venue.price_tier IS 'Price tier 1-4 (1 = budget, 4 = luxury).';
COMMENT ON COLUMN tg.tg_venue.hours IS 'Operating hours as structured JSON keyed by day of week.';
COMMENT ON COLUMN tg.tg_venue.amenities IS 'Amenity tags and attributes as structured JSON.';

CREATE INDEX idx_venue_type_place ON tg.tg_venue (venue_type, place_id);
CREATE INDEX idx_venue_amenities ON tg.tg_venue USING gin (amenities);

-- ----------------------------------------------------------------------------
-- tg_supplier
-- Business entities that provide products and services on the platform.
-- ----------------------------------------------------------------------------

CREATE TABLE tg.tg_supplier (
    supplier_id    UUID        PRIMARY KEY,
    CONSTRAINT fk_supplier_entity FOREIGN KEY (supplier_id)
        REFERENCES tg.tg_entity (entity_id) ON DELETE CASCADE,
    supplier_type  TEXT        NOT NULL
        CONSTRAINT chk_supplier_type CHECK (supplier_type IN (
            'restaurant', 'tour_operator', 'hotel_chain', 'rental_host',
            'cruise_line', 'airline', 'insurer', 'fintech_provider'
        )),
    legal_name      TEXT,
    support_email   TEXT,
    support_phone   TEXT,
    billing_profile JSONB,
    risk_tier       TEXT       DEFAULT 'standard'
        CONSTRAINT chk_risk_tier CHECK (risk_tier IN ('low', 'standard', 'elevated', 'high')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_supplier IS 'Business entity that provides products/services on the platform.';
COMMENT ON COLUMN tg.tg_supplier.risk_tier IS 'Risk classification for payment holds and review thresholds.';

CREATE INDEX idx_supplier_type ON tg.tg_supplier (supplier_type);

-- ----------------------------------------------------------------------------
-- tg_product
-- Bookable offerings: dining reservations, tours, hotel rooms, flights, etc.
-- ----------------------------------------------------------------------------

CREATE TABLE tg.tg_product (
    product_id   UUID        PRIMARY KEY,
    CONSTRAINT fk_product_entity FOREIGN KEY (product_id)
        REFERENCES tg.tg_entity (entity_id) ON DELETE CASCADE,
    product_type TEXT        NOT NULL
        CONSTRAINT chk_product_type CHECK (product_type IN (
            'dining_reservation', 'dining_experience', 'tour', 'ticket',
            'hotel_room', 'rental_night', 'cruise_cabin', 'flight',
            'insurance', 'ancillary'
        )),
    supplier_id  UUID        NOT NULL
        REFERENCES tg.tg_supplier (supplier_id) ON DELETE RESTRICT,
    venue_id     UUID
        REFERENCES tg.tg_venue (venue_id) ON DELETE SET NULL,
    title        TEXT        NOT NULL,
    description  TEXT,
    currency     CHAR(3),
    base_price   NUMERIC(12,2),
    policy_id    UUID
        REFERENCES tg.tg_policy (policy_id) ON DELETE SET NULL,
    attributes   JSONB       DEFAULT '{}',
    active       BOOLEAN     DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_product IS 'Bookable offering on the platform.';
COMMENT ON COLUMN tg.tg_product.currency IS 'ISO 4217 currency code for base_price.';
COMMENT ON COLUMN tg.tg_product.attributes IS 'Product-type-specific attributes (e.g., cuisine type, star rating, cabin class).';

CREATE INDEX idx_product_type_supplier ON tg.tg_product (product_type, supplier_id);
CREATE INDEX idx_product_attributes ON tg.tg_product USING gin (attributes);
CREATE INDEX idx_product_active ON tg.tg_product (active) WHERE active = TRUE;

-- ----------------------------------------------------------------------------
-- tg_inventory_slot
-- Time-bounded availability for a product. The atomic unit of booking.
-- ----------------------------------------------------------------------------

CREATE TABLE tg.tg_inventory_slot (
    slot_id              UUID        PRIMARY KEY,
    CONSTRAINT fk_slot_entity FOREIGN KEY (slot_id)
        REFERENCES tg.tg_entity (entity_id) ON DELETE CASCADE,
    product_id           UUID        NOT NULL
        REFERENCES tg.tg_product (product_id) ON DELETE CASCADE,
    start_at             TIMESTAMPTZ NOT NULL,
    end_at               TIMESTAMPTZ NOT NULL,
    capacity_total       INT,
    capacity_available   INT,
    availability_status  TEXT        NOT NULL DEFAULT 'open'
        CONSTRAINT chk_availability_status CHECK (availability_status IN (
            'open', 'hold', 'closed', 'sold_out'
        )),
    price_override       NUMERIC(12,2),
    constraints          JSONB       DEFAULT '{}',
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_slot_time_range CHECK (end_at > start_at),
    CONSTRAINT chk_capacity CHECK (
        capacity_available IS NULL
        OR capacity_total IS NULL
        OR capacity_available <= capacity_total
    )
);

COMMENT ON TABLE tg.tg_inventory_slot IS 'Time-bounded availability slot for a product. The atomic unit of booking.';
COMMENT ON COLUMN tg.tg_inventory_slot.price_override IS 'Overrides the product base_price for this specific slot (dynamic pricing).';
COMMENT ON COLUMN tg.tg_inventory_slot.constraints IS 'Booking constraints (min pax, max pax, advance notice, etc.).';

CREATE INDEX idx_slot_product_start ON tg.tg_inventory_slot (product_id, start_at);
CREATE INDEX idx_slot_status_start ON tg.tg_inventory_slot (availability_status, start_at);
CREATE INDEX idx_slot_constraints ON tg.tg_inventory_slot USING gin (constraints);

-- ----------------------------------------------------------------------------
-- tg_review
-- User-generated reviews for any entity in the Travel Graph.
-- ----------------------------------------------------------------------------

CREATE TABLE tg.tg_review (
    review_id   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id   UUID        NOT NULL
        REFERENCES tg.tg_entity (entity_id) ON DELETE CASCADE,
    user_id     UUID,           -- FK to identity.identity_user (cross-schema, enforced at app layer)
    rating      SMALLINT    NOT NULL
        CONSTRAINT chk_review_rating CHECK (rating >= 1 AND rating <= 5),
    title       TEXT,
    body        TEXT,
    lang        TEXT,           -- BCP 47 language tag
    visit_date  DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trust_score NUMERIC(6,4)   DEFAULT 1.0
        CONSTRAINT chk_trust_score CHECK (trust_score >= 0 AND trust_score <= 1),
    fraud_score NUMERIC(6,4)   DEFAULT 0
        CONSTRAINT chk_fraud_score CHECK (fraud_score >= 0 AND fraud_score <= 1),
    status      TEXT        NOT NULL DEFAULT 'published'
        CONSTRAINT chk_review_status CHECK (status IN (
            'published', 'hidden', 'removed', 'pending'
        ))
);

COMMENT ON TABLE tg.tg_review IS 'User-generated review for any entity in the Travel Graph.';
COMMENT ON COLUMN tg.tg_review.trust_score IS 'Trust score assigned by the trust service (0.0 to 1.0).';
COMMENT ON COLUMN tg.tg_review.fraud_score IS 'Fraud probability score (0.0 = legit, 1.0 = fraud).';

CREATE INDEX idx_review_entity_created ON tg.tg_review (entity_id, created_at DESC);
CREATE INDEX idx_review_status ON tg.tg_review (status);
CREATE INDEX idx_review_user ON tg.tg_review (user_id) WHERE user_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- tg_media
-- Images and videos attached to entities (venues, products, reviews, etc.).
-- ----------------------------------------------------------------------------

CREATE TABLE tg.tg_media (
    media_id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id         UUID        NOT NULL
        REFERENCES tg.tg_entity (entity_id) ON DELETE CASCADE,
    user_id           UUID,       -- FK to identity.identity_user (cross-schema, enforced at app layer)
    media_type        TEXT
        CONSTRAINT chk_media_type CHECK (media_type IN ('image', 'video')),
    url               TEXT        NOT NULL,
    hash              TEXT,
    metadata          JSONB,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    moderation_status TEXT        DEFAULT 'approved'
        CONSTRAINT chk_moderation_status CHECK (moderation_status IN (
            'pending', 'approved', 'rejected'
        ))
);

COMMENT ON TABLE tg.tg_media IS 'Images and videos attached to Travel Graph entities.';
COMMENT ON COLUMN tg.tg_media.hash IS 'Content hash (e.g., SHA-256) for deduplication.';
COMMENT ON COLUMN tg.tg_media.metadata IS 'Media metadata (dimensions, duration, EXIF data, alt text).';

CREATE INDEX idx_media_entity ON tg.tg_media (entity_id);
CREATE INDEX idx_media_moderation ON tg.tg_media (moderation_status) WHERE moderation_status = 'pending';

-- ----------------------------------------------------------------------------
-- tg_embedding
-- Vector embeddings for semantic search and AI-powered recommendations.
-- Uses pgvector VECTOR(1536) for OpenAI text-embedding-3-small compatibility.
-- ----------------------------------------------------------------------------

CREATE TABLE tg.tg_embedding (
    embedding_id   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id      UUID        NOT NULL
        REFERENCES tg.tg_entity (entity_id) ON DELETE CASCADE,
    embedding_type TEXT        NOT NULL
        CONSTRAINT chk_embedding_type CHECK (embedding_type IN (
            'name', 'description', 'review_summary', 'image_caption',
            'itinerary_snippet'
        )),
    vector         VECTOR(1536),
    model          TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_embedding IS 'Vector embeddings for semantic search and AI recommendations.';
COMMENT ON COLUMN tg.tg_embedding.vector IS '1536-dim vector (OpenAI text-embedding-3-small).';
COMMENT ON COLUMN tg.tg_embedding.model IS 'Model identifier that produced this embedding (for versioning).';

-- HNSW index for approximate nearest neighbor search.
-- m=16 and ef_construction=64 are reasonable defaults for < 10M vectors.
CREATE INDEX idx_embedding_vector_hnsw ON tg.tg_embedding
    USING hnsw (vector vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_embedding_entity_type ON tg.tg_embedding (entity_id, embedding_type);

-- ----------------------------------------------------------------------------
-- Trigger: auto-update updated_at on tables that have it
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION tg.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION tg.set_updated_at() IS 'Trigger function to auto-set updated_at to NOW() on row update.';

-- Apply updated_at trigger to all tables with an updated_at column
CREATE TRIGGER trg_entity_updated_at
    BEFORE UPDATE ON tg.tg_entity
    FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

CREATE TRIGGER trg_place_updated_at
    BEFORE UPDATE ON tg.tg_place
    FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

CREATE TRIGGER trg_venue_updated_at
    BEFORE UPDATE ON tg.tg_venue
    FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

CREATE TRIGGER trg_supplier_updated_at
    BEFORE UPDATE ON tg.tg_supplier
    FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

CREATE TRIGGER trg_product_updated_at
    BEFORE UPDATE ON tg.tg_product
    FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

CREATE TRIGGER trg_policy_updated_at
    BEFORE UPDATE ON tg.tg_policy
    FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

COMMIT;
