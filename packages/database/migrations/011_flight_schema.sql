-- ============================================================================
-- Migration 011: Flight Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Full flight domain covering airports, airlines, aircraft, routes,
--          offers, tickets, seat preferences, seat maps, servicing cases,
--          and disruption tracking. Supports multi-provider search (Amadeus,
--          Sabre, Duffel, Kiwi, direct), PNR-based ticketing, proactive
--          disruption management, and AI-driven seat recommendations.
--
-- Dependencies:
--   - 001 (assumed): uuid-ossp extension
--   - Travel Graph schema: tg.tg_entity, tg.tg_place, tg.tg_supplier
--   - Commerce schema: commerce.commerce_reservation
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS flight;

-- ============================================================================
-- flight.flight_airport
-- ----------------------------------------------------------------------------
-- Reference table for airports integrated with Atlas One. Each airport is a
-- Travel Graph entity and optionally linked to a place record for geographic
-- context. IATA and ICAO codes are unique identifiers used across the aviation
-- industry. The timezone column enables accurate local-time display for
-- departure and arrival rendering.
-- ============================================================================
CREATE TABLE flight.flight_airport (
    airport_id     UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id      UUID          NOT NULL UNIQUE,
                                 -- FK -> tg.tg_entity (entity_id)
    iata           CHAR(3)       UNIQUE NOT NULL,
    icao           CHAR(4)       UNIQUE,
    name           TEXT          NOT NULL,
    place_id       UUID,         -- FK -> tg.tg_place (place_id)
    lat            NUMERIC(10,7),
    lng            NUMERIC(10,7),
    timezone       TEXT,
    terminal_count INT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE flight.flight_airport IS
    'Reference table for airports. Links to Travel Graph entity and place for geographic context. IATA/ICAO codes are industry-standard identifiers.';

-- Fast lookup by IATA code (most common search path)
CREATE INDEX idx_flight_airport_iata
    ON flight.flight_airport (iata);

-- ============================================================================
-- flight.flight_airline
-- ----------------------------------------------------------------------------
-- Reference table for airlines. Each airline maps to a Travel Graph supplier
-- for commercial integration. The alliance column classifies membership in
-- global alliances which affects codeshare routing and loyalty accrual.
-- ============================================================================
CREATE TABLE flight.flight_airline (
    airline_id UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID       NOT NULL UNIQUE,
                            -- FK -> tg.tg_supplier (supplier_id)
    iata       CHAR(2)     UNIQUE NOT NULL,
    icao       CHAR(3)     UNIQUE,
    name       TEXT         NOT NULL,
    logo_url   TEXT,
    alliance   TEXT         CHECK (alliance IN ('star_alliance', 'oneworld', 'skyteam', 'none')),
    active     BOOLEAN      DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE flight.flight_airline IS
    'Reference table for airlines. Maps to Travel Graph supplier. Alliance membership drives codeshare routing and loyalty accrual.';

-- ============================================================================
-- flight.flight_aircraft
-- ----------------------------------------------------------------------------
-- Aircraft type catalog. Stores configuration data including seat layout and
-- comfort scores per cabin class. The seat_map JSONB holds a canonical layout
-- template; airline-specific overrides live in flight_seat_map. Comfort scores
-- power the AI seat recommendation engine.
-- ============================================================================
CREATE TABLE flight.flight_aircraft (
    aircraft_id    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id      UUID,       -- FK -> tg.tg_entity (entity_id)
    iata_code      TEXT,
    name           TEXT         NOT NULL,
                                -- e.g. "Boeing 737-800"
    manufacturer   TEXT,
    model          TEXT,
    seat_count     INT,
    seat_map       JSONB        DEFAULT '{}'::jsonb,
                                -- canonical layout: rows, seat types, classes
    comfort_scores JSONB        DEFAULT '{}'::jsonb,
                                -- legroom, width, recline per cabin class
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE flight.flight_aircraft IS
    'Aircraft type catalog with canonical seat layout and per-class comfort scores for the AI seat recommendation engine.';

-- ============================================================================
-- flight.flight_route
-- ----------------------------------------------------------------------------
-- Known airline routes between airport pairs. Tracks typical duration,
-- distance, and weekly frequency for schedule intelligence. The unique
-- constraint on (origin, destination, airline) prevents duplicate route
-- records. Active flag controls whether the route appears in search results.
-- ============================================================================
CREATE TABLE flight.flight_route (
    route_id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_id           UUID,       -- FK -> tg.tg_entity (entity_id)
    origin_airport_id   UUID        NOT NULL
                                    REFERENCES flight.flight_airport (airport_id),
    dest_airport_id     UUID        NOT NULL
                                    REFERENCES flight.flight_airport (airport_id),
    airline_id          UUID        NOT NULL
                                    REFERENCES flight.flight_airline (airline_id),
    typical_duration_min INT,
    distance_km         INT,
    frequency_per_week  INT,
    active              BOOLEAN     DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One route record per origin-destination-airline combination
    CONSTRAINT uq_flight_route_origin_dest_airline
        UNIQUE (origin_airport_id, dest_airport_id, airline_id)
);

COMMENT ON TABLE flight.flight_route IS
    'Known airline routes between airport pairs with duration, distance, and frequency for schedule intelligence.';

-- Primary query: "show all routes between two airports"
CREATE INDEX idx_flight_route_origin_dest
    ON flight.flight_route (origin_airport_id, dest_airport_id);

-- ============================================================================
-- flight.flight_offer
-- ----------------------------------------------------------------------------
-- Ephemeral search result from flight providers (Amadeus, Sabre, Duffel, Kiwi,
-- or direct airline API). Each offer captures the full pricing, segment
-- details, baggage allowance, and fare rules at search time. Offers expire
-- (typically 15-30 minutes) and must be re-priced before booking. The segments
-- JSONB array holds the ordered list of legs with flight numbers, times,
-- aircraft, and cabin class per leg.
-- ============================================================================
CREATE TABLE flight.flight_offer (
    offer_id         UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID          NOT NULL,
    trip_id          UUID,
    search_params    JSONB         NOT NULL,
                                   -- origin, destination, dates, passengers, cabin_class, one_way
    total_price      NUMERIC(12,2) NOT NULL,
    currency         CHAR(3)       NOT NULL DEFAULT 'USD',
    segments         JSONB         NOT NULL,
                                   -- array of legs: flight_number, departure, arrival,
                                   -- airline, aircraft, cabin, duration, stops
    baggage          JSONB         DEFAULT '{}'::jsonb,
                                   -- carry_on, checked, weight_limits
    fare_rules       JSONB         DEFAULT '{}'::jsonb,
                                   -- change_fee, cancel_fee, refundable, fare_brand
    fare_class       TEXT,
    booking_class    TEXT,
    provider         TEXT          NOT NULL
                                   CHECK (provider IN ('amadeus', 'sabre', 'duffel', 'kiwi', 'direct')),
    provider_offer_id TEXT,
    expires_at       TIMESTAMPTZ   NOT NULL,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE flight.flight_offer IS
    'Ephemeral flight search result from providers. Captures pricing, segments, baggage, and fare rules. Expires after provider TTL.';

-- Primary query: "show recent offers for this user"
CREATE INDEX idx_flight_offer_user_created
    ON flight.flight_offer (user_id, created_at);

-- Cleanup: purge expired offers
CREATE INDEX idx_flight_offer_expires
    ON flight.flight_offer (expires_at);

-- ============================================================================
-- flight.flight_ticket
-- ----------------------------------------------------------------------------
-- Issued ticket linked to a commerce reservation. Contains PNR (Passenger
-- Name Record), ticket number, passenger details (including passport and
-- frequent flyer data), and segment-level seat assignments. The status tracks
-- the full ticket lifecycle from issuance through potential changes, cancellations,
-- and refunds. The fare_paid may differ from the original offer price if
-- price changes occurred during booking.
-- ============================================================================
CREATE TABLE flight.flight_ticket (
    ticket_id      UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    reservation_id UUID          NOT NULL UNIQUE
                                 REFERENCES commerce.commerce_reservation (reservation_id),
    offer_id       UUID          REFERENCES flight.flight_offer (offer_id),
    airline_id     UUID          NOT NULL
                                 REFERENCES flight.flight_airline (airline_id),
    pnr            TEXT          NOT NULL,
    ticket_number  TEXT,
    passengers     JSONB         NOT NULL,
                                 -- array of {name, dob, passport, frequent_flyer}
    segments       JSONB         NOT NULL,
                                 -- matched to offer segments + seat assignments
    fare_paid      NUMERIC(12,2) NOT NULL,
    currency       CHAR(3)       NOT NULL,
    status         TEXT          NOT NULL DEFAULT 'issued'
                                 CHECK (status IN ('issued', 'confirmed', 'changed', 'cancelled', 'refunded', 'void')),
    e_ticket_url   TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE flight.flight_ticket IS
    'Issued flight ticket with PNR, passengers, segment seat assignments, and lifecycle status. 1:1 with commerce reservation.';

-- Lookup by PNR (airline customer service, disruption handling)
CREATE INDEX idx_flight_ticket_pnr
    ON flight.flight_ticket (pnr);

-- Lookup by reservation (commerce layer join)
CREATE INDEX idx_flight_ticket_reservation
    ON flight.flight_ticket (reservation_id);

-- ============================================================================
-- flight.flight_seat_preference
-- ----------------------------------------------------------------------------
-- User-level seat preferences that persist across bookings. The AI seat
-- recommendation engine reads these to auto-select optimal seats during
-- booking or check-in. Preferences include positional (window/aisle),
-- comfort (legroom, exit row), and avoidance (last row, middle seat) criteria.
-- ============================================================================
CREATE TABLE flight.flight_seat_preference (
    preference_id    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID        NOT NULL,
    position         TEXT        CHECK (position IN ('window', 'aisle', 'middle')),
    extra_legroom    BOOLEAN     DEFAULT FALSE,
    near_exit        BOOLEAN     DEFAULT FALSE,
    front_of_cabin   BOOLEAN     DEFAULT FALSE,
    avoid_last_row   BOOLEAN     DEFAULT TRUE,
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE flight.flight_seat_preference IS
    'Persistent per-user seat preferences for AI seat recommendation. Covers position, comfort, and avoidance criteria.';

-- Primary query: "load seat prefs for this user"
CREATE INDEX idx_flight_seat_preference_user
    ON flight.flight_seat_preference (user_id);

-- ============================================================================
-- flight.flight_seat_map
-- ----------------------------------------------------------------------------
-- Airline-specific seat map for an aircraft type. Overrides the canonical
-- seat_map on flight_aircraft with airline-customised configurations (different
-- cabin classes, extra-legroom rows, blocked seats, etc.). The comfort_ratings
-- JSONB provides per-seat comfort scores factoring pitch, width, recline, and
-- proximity to lavatories and galleys. The unique constraint ensures one map
-- per aircraft-airline combination.
-- ============================================================================
CREATE TABLE flight.flight_seat_map (
    seat_map_id     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    aircraft_id     UUID        NOT NULL
                                REFERENCES flight.flight_aircraft (aircraft_id),
    airline_id      UUID        REFERENCES flight.flight_airline (airline_id),
    layout          JSONB       NOT NULL,
                                -- rows with seats, classes, features per seat
    comfort_ratings JSONB       DEFAULT '{}'::jsonb,
                                -- per-seat comfort score: pitch, width, recline,
                                -- proximity to lavatory/galley
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One seat map per aircraft-airline combination
    CONSTRAINT uq_flight_seat_map_aircraft_airline
        UNIQUE (aircraft_id, airline_id)
);

COMMENT ON TABLE flight.flight_seat_map IS
    'Airline-specific seat map overriding canonical aircraft layout. Per-seat comfort ratings power AI seat selection.';

-- ============================================================================
-- flight.flight_servicing_case
-- ----------------------------------------------------------------------------
-- Post-ticketing servicing request. Covers voluntary changes (date/route),
-- cancellations, reissues, upgrades, and involuntary disruption handling.
-- Tracks the original and new segment details, price difference, and any
-- penalty applied. Status progression: open -> in_progress -> pending_airline
-- -> resolved (happy path), with failed/closed as terminal states.
-- ============================================================================
CREATE TABLE flight.flight_servicing_case (
    case_id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id         UUID          NOT NULL
                                    REFERENCES flight.flight_ticket (ticket_id),
    case_type         TEXT          NOT NULL
                                    CHECK (case_type IN (
                                        'change', 'cancel', 'reissue', 'upgrade',
                                        'disruption', 'voluntary_change', 'involuntary_change'
                                    )),
    status            TEXT          NOT NULL DEFAULT 'open'
                                    CHECK (status IN (
                                        'open', 'in_progress', 'pending_airline',
                                        'resolved', 'failed', 'closed'
                                    )),
    original_segments JSONB,
    new_segments      JSONB,
    price_difference  NUMERIC(12,2),
    currency          CHAR(3),
    penalty           NUMERIC(12,2),
    notes             TEXT,
    resolved_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE flight.flight_servicing_case IS
    'Post-ticketing servicing case for changes, cancellations, upgrades, and disruption handling with penalty tracking.';

-- Primary query: "show open/in-progress cases for this ticket"
CREATE INDEX idx_flight_servicing_case_ticket_status
    ON flight.flight_servicing_case (ticket_id, status);

-- ============================================================================
-- flight.flight_disruption
-- ----------------------------------------------------------------------------
-- Real-time flight disruption events. Sourced from airlines, airports, weather
-- services, and internal monitoring. Severity drives alerting thresholds:
-- low = informational, medium = heads-up, high = action recommended, critical
-- = immediate intervention. The recommended_actions JSONB array suggests
-- concrete remediation steps (rebook, refund, hotel, meal_voucher) that the
-- AI agent can auto-execute when authorised.
-- ============================================================================
CREATE TABLE flight.flight_disruption (
    disruption_id       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id           UUID        REFERENCES flight.flight_ticket (ticket_id),
    flight_number       TEXT,
    disruption_type     TEXT        NOT NULL
                                    CHECK (disruption_type IN (
                                        'delay', 'cancellation', 'diversion',
                                        'gate_change', 'equipment_change'
                                    )),
    severity            TEXT        NOT NULL DEFAULT 'low'
                                    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    delay_minutes       INT,
    description         TEXT,
    source              TEXT        CHECK (source IN ('airline', 'airport', 'weather_service', 'internal')),
    recommended_actions JSONB       DEFAULT '[]'::jsonb,
                                    -- array of actions: rebook, refund, hotel, meal_voucher
    auto_rebooked       BOOLEAN     DEFAULT FALSE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE flight.flight_disruption IS
    'Real-time flight disruption events with severity, source, and AI-actionable remediation recommendations.';

-- Primary query: "show disruptions for this ticket"
CREATE INDEX idx_flight_disruption_ticket
    ON flight.flight_disruption (ticket_id);

-- Secondary query: "find recent disruptions for a flight number"
CREATE INDEX idx_flight_disruption_flight_created
    ON flight.flight_disruption (flight_number, created_at);

-- ============================================================================
-- Updated-at trigger function (schema-local)
-- ============================================================================
CREATE OR REPLACE FUNCTION flight.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at triggers for all tables that have the column
CREATE TRIGGER trg_flight_airport_updated_at
    BEFORE UPDATE ON flight.flight_airport
    FOR EACH ROW EXECUTE FUNCTION flight.set_updated_at();

CREATE TRIGGER trg_flight_airline_updated_at
    BEFORE UPDATE ON flight.flight_airline
    FOR EACH ROW EXECUTE FUNCTION flight.set_updated_at();

CREATE TRIGGER trg_flight_aircraft_updated_at
    BEFORE UPDATE ON flight.flight_aircraft
    FOR EACH ROW EXECUTE FUNCTION flight.set_updated_at();

CREATE TRIGGER trg_flight_ticket_updated_at
    BEFORE UPDATE ON flight.flight_ticket
    FOR EACH ROW EXECUTE FUNCTION flight.set_updated_at();

CREATE TRIGGER trg_flight_seat_map_updated_at
    BEFORE UPDATE ON flight.flight_seat_map
    FOR EACH ROW EXECUTE FUNCTION flight.set_updated_at();

CREATE TRIGGER trg_flight_servicing_case_updated_at
    BEFORE UPDATE ON flight.flight_servicing_case
    FOR EACH ROW EXECUTE FUNCTION flight.set_updated_at();

COMMIT;
