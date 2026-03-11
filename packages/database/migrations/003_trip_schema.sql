-- ============================================================================
-- Migration 003: Trip Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Core trip planning domain. Manages trips, travelers, itinerary
--          items, collaboration, budgets, and real-time trip health scoring.
--
-- Dependencies:
--   - 001 (assumed): uuid-ossp extension
--   - 002 (assumed): identity schema (identity.identity_user)
--   - Travel Graph schema: tg.tg_entity
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS trip;

-- ============================================================================
-- trip.trip_trip
-- ----------------------------------------------------------------------------
-- The root aggregate for every trip a user creates. A trip is a bounded
-- planning container with date bounds, a home currency for budget rollups,
-- and a lifecycle status that gates what mutations are allowed downstream.
-- ============================================================================
CREATE TABLE trip.trip_trip (
    trip_id       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID        NOT NULL
                              REFERENCES identity.identity_user (user_id),
    title         TEXT,
    start_date    DATE,
    end_date      DATE,
    home_currency CHAR(3)     NOT NULL DEFAULT 'USD',
    status        TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Guard against end_date preceding start_date when both are set
    CONSTRAINT trip_trip_date_range_check
        CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);

COMMENT ON TABLE trip.trip_trip IS
    'Root aggregate for every user-created trip. Holds date bounds, home currency, and lifecycle status.';

-- Primary query path: "show me all active trips for this user"
CREATE INDEX idx_trip_trip_user_status
    ON trip.trip_trip (user_id, status);

-- ============================================================================
-- trip.trip_traveler
-- ----------------------------------------------------------------------------
-- People traveling on a trip. May or may not have an Atlas account (user_id
-- is nullable for companions / children added by name only). The constraints
-- column stores dietary, accessibility, and preference data as structured
-- JSONB so the AI planner can respect them during itinerary generation.
-- ============================================================================
CREATE TABLE trip.trip_traveler (
    traveler_id UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id     UUID    NOT NULL
                        REFERENCES trip.trip_trip (trip_id) ON DELETE CASCADE,
    user_id     UUID    REFERENCES identity.identity_user (user_id),
    role        TEXT    NOT NULL DEFAULT 'guest'
                        CHECK (role IN ('owner', 'guest', 'child', 'companion')),
    first_name  TEXT,
    last_name   TEXT,
    notes       TEXT,
    constraints JSONB   NOT NULL DEFAULT '{}'::jsonb
);

COMMENT ON TABLE trip.trip_traveler IS
    'People traveling on a trip. Nullable user_id supports non-registered companions and children.';

CREATE INDEX idx_trip_traveler_trip
    ON trip.trip_traveler (trip_id);

-- ============================================================================
-- trip.trip_itinerary_item
-- ----------------------------------------------------------------------------
-- Ordered list of things happening on a trip. Each item can optionally link
-- to a Travel Graph entity (a place, venue, etc.) or a commerce reservation.
-- The position column drives drag-and-drop ordering in the UI. The details
-- JSONB column carries type-specific payload (transport mode, booking ref,
-- buffer reason, etc.) without schema sprawl.
-- ============================================================================
CREATE TABLE trip.trip_itinerary_item (
    item_id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id        UUID        NOT NULL
                               REFERENCES trip.trip_trip (trip_id) ON DELETE CASCADE,
    item_type      TEXT        NOT NULL
                               CHECK (item_type IN ('place', 'venue', 'reservation', 'note', 'transport', 'buffer')),
    entity_id      UUID,       -- Nullable FK to tg.tg_entity; enforced at app layer
                               -- until Travel Graph migration is applied
    reservation_id UUID,       -- Nullable FK to commerce.commerce_reservation;
                               -- enforced after commerce migration (004)
    start_at       TIMESTAMPTZ,
    end_at         TIMESTAMPTZ,
    title          TEXT,
    details        JSONB       NOT NULL DEFAULT '{}'::jsonb,
    position       INT         NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Guard against end preceding start when both are set
    CONSTRAINT trip_itinerary_item_time_range_check
        CHECK (start_at IS NULL OR end_at IS NULL OR end_at >= start_at)
);

COMMENT ON TABLE trip.trip_itinerary_item IS
    'Ordered items on a trip itinerary. Supports places, venues, reservations, notes, transport legs, and buffer blocks.';

-- Primary query: render itinerary in order for a trip
CREATE INDEX idx_trip_itinerary_item_trip_pos
    ON trip.trip_itinerary_item (trip_id, position);

-- ============================================================================
-- trip.trip_collaborator
-- ----------------------------------------------------------------------------
-- Shared access grants on a trip. The composite PK (trip_id, user_id)
-- naturally prevents duplicate grants. Permission levels are hierarchical:
-- read < comment < edit < admin.
-- ============================================================================
CREATE TABLE trip.trip_collaborator (
    trip_id    UUID        NOT NULL
                           REFERENCES trip.trip_trip (trip_id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL
                           REFERENCES identity.identity_user (user_id),
    permission TEXT        NOT NULL DEFAULT 'read'
                           CHECK (permission IN ('read', 'comment', 'edit', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (trip_id, user_id)
);

COMMENT ON TABLE trip.trip_collaborator IS
    'Shared access grants for collaborative trip planning. Composite PK prevents duplicate invitations.';

-- ============================================================================
-- trip.trip_budget
-- ----------------------------------------------------------------------------
-- One budget envelope per trip (1:1 via UNIQUE on trip_id). The categories
-- JSONB column stores per-category allocations (dining, stays, experiences,
-- transport, shopping, etc.) so the AI can warn when a category is at risk
-- of overspend before the user commits to a booking.
-- ============================================================================
CREATE TABLE trip.trip_budget (
    budget_id    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id      UUID         NOT NULL UNIQUE
                              REFERENCES trip.trip_trip (trip_id) ON DELETE CASCADE,
    total_budget NUMERIC(12,2),
    currency     CHAR(3)      NOT NULL DEFAULT 'USD',
    categories   JSONB        NOT NULL DEFAULT '{}'::jsonb,
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE trip.trip_budget IS
    'Per-trip budget envelope with category-level allocations (dining, stays, experiences, transport, etc.).';

-- ============================================================================
-- trip.trip_trip_health
-- ----------------------------------------------------------------------------
-- Real-time health score for a trip, computed by background workers and the
-- AI planner. The score (0-100) summarises overall trip risk; the signals
-- JSONB column carries individual risk dimensions: disruption_risk,
-- tight_connections, overbooked_days, weather_alerts, and more. The UI
-- renders a traffic-light badge derived from this score.
-- ============================================================================
CREATE TABLE trip.trip_trip_health (
    trip_id    UUID         PRIMARY KEY
                            REFERENCES trip.trip_trip (trip_id) ON DELETE CASCADE,
    score      NUMERIC(5,2) NOT NULL DEFAULT 100.00
                            CHECK (score >= 0 AND score <= 100),
    signals    JSONB        NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE trip.trip_trip_health IS
    'Real-time trip health score (0-100) with structured risk signals for the AI planner and UI badge.';

-- ============================================================================
-- Updated-at trigger function (reusable across schemas)
-- Creates the function only if it does not already exist.
-- ============================================================================
CREATE OR REPLACE FUNCTION trip.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at on trip_trip
CREATE TRIGGER trg_trip_trip_updated_at
    BEFORE UPDATE ON trip.trip_trip
    FOR EACH ROW EXECUTE FUNCTION trip.set_updated_at();

-- Auto-update updated_at on trip_budget
CREATE TRIGGER trg_trip_budget_updated_at
    BEFORE UPDATE ON trip.trip_budget
    FOR EACH ROW EXECUTE FUNCTION trip.set_updated_at();

-- Auto-update updated_at on trip_trip_health
CREATE TRIGGER trg_trip_trip_health_updated_at
    BEFORE UPDATE ON trip.trip_trip_health
    FOR EACH ROW EXECUTE FUNCTION trip.set_updated_at();

COMMIT;
