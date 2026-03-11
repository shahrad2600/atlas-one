-- ============================================================================
-- Migration 008: Luxury Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Premium membership tiers (Black, Reserve, Signature), concierge
--          case management with SLA tracking, inventory holds for priority
--          access, and exclusive experience gating. Powers the high-touch
--          luxury service layer that differentiates Atlas One.
--
-- Dependencies:
--   - 001 (assumed): uuid-ossp extension
--   - 002 (assumed): identity schema (identity.identity_user)
--   - Travel Graph schema: tg.tg_inventory_slot, tg.tg_product
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS lux;

-- ============================================================================
-- lux.lux_membership
-- ----------------------------------------------------------------------------
-- Premium membership record for a user. Tiers are hierarchical:
-- black (highest) > reserve > signature (entry). Each tier unlocks a set of
-- entitlements stored as structured JSONB: priority notifications, 24/7
-- concierge access, table acquisition, villa sourcing, and guaranteed replan
-- SLA windows. Status lifecycle supports pause/resume for seasonal members.
-- ============================================================================
CREATE TABLE lux.lux_membership (
    membership_id     UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID          NOT NULL UNIQUE,    -- FK to identity.identity_user
    tier              TEXT          NOT NULL DEFAULT 'signature'
                                    CHECK (tier IN ('black', 'reserve', 'signature')),
    status            TEXT          NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
    started_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    ends_at           TIMESTAMPTZ,
    renewal_date      TIMESTAMPTZ,
    entitlements      JSONB         NOT NULL DEFAULT '{}'::jsonb,
    payment_method_id TEXT,
    monthly_fee       NUMERIC(12,2),
    currency          CHAR(3)       NOT NULL DEFAULT 'USD',
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE lux.lux_membership IS
    'Premium membership with tiered entitlements (Black/Reserve/Signature). Drives concierge SLAs, priority access, and luxury gating.';

-- ============================================================================
-- lux.lux_concierge_case
-- ----------------------------------------------------------------------------
-- Every concierge interaction is tracked as a case with full SLA
-- observability. Cases can be general (special requests, complaints) or tied
-- to specific high-value workflows (table acquisition at sold-out restaurants,
-- villa sourcing, disruption recovery). The assigned_agent_id enables
-- workload balancing across the concierge team. SLA tracking (sla_due_at,
-- sla_met) powers operational dashboards and tier-level guarantees.
-- ============================================================================
CREATE TABLE lux.lux_concierge_case (
    case_id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID        NOT NULL,
    membership_id     UUID        REFERENCES lux.lux_membership (membership_id),
    trip_id           UUID,
    assigned_agent_id UUID,
    priority          TEXT        NOT NULL DEFAULT 'normal'
                                  CHECK (priority IN ('low', 'normal', 'high', 'critical')),
    category          TEXT        CHECK (category IS NULL OR category IN (
                                      'table_acquisition', 'villa_sourcing', 'disruption',
                                      'transfer', 'special_request', 'complaint'
                                  )),
    status            TEXT        NOT NULL DEFAULT 'open'
                                  CHECK (status IN (
                                      'open', 'in_progress', 'waiting_partner',
                                      'waiting_user', 'resolved', 'closed', 'escalated'
                                  )),
    sla_due_at        TIMESTAMPTZ,
    sla_met           BOOLEAN,
    summary           TEXT        NOT NULL,
    resolution        TEXT,
    internal_notes    TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE lux.lux_concierge_case IS
    'Concierge case with SLA tracking. Covers table acquisition, villa sourcing, disruption recovery, and special requests.';

-- Primary query: open/in-progress cases for a user
CREATE INDEX idx_lux_concierge_case_user_status
    ON lux.lux_concierge_case (user_id, status);

-- Agent workload view: cases assigned to an agent by status
CREATE INDEX idx_lux_concierge_case_agent_status
    ON lux.lux_concierge_case (assigned_agent_id, status);

-- SLA monitoring: find cases approaching or past their due time
CREATE INDEX idx_lux_concierge_case_sla_due
    ON lux.lux_concierge_case (sla_due_at);

-- ============================================================================
-- lux.lux_inventory_hold
-- ----------------------------------------------------------------------------
-- Temporary inventory reservations for premium members. When a concierge
-- sources availability (e.g., a last-minute restaurant table or a villa for
-- a specific weekend), the slot is held for a limited time so the member can
-- decide without losing it. Holds expire automatically; the status lifecycle
-- tracks conversion to a real booking.
-- ============================================================================
CREATE TABLE lux.lux_inventory_hold (
    hold_id       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_id       UUID        NOT NULL,           -- FK to tg.tg_inventory_slot
    user_id       UUID        NOT NULL,
    membership_id UUID        REFERENCES lux.lux_membership (membership_id),
    case_id       UUID        REFERENCES lux.lux_concierge_case (case_id),
    expires_at    TIMESTAMPTZ NOT NULL,
    status        TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'converted', 'expired', 'cancelled')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE lux.lux_inventory_hold IS
    'Temporary inventory holds for premium members. Auto-expires; tracks conversion to confirmed bookings.';

-- Lookup active holds on a specific inventory slot
CREATE INDEX idx_lux_inventory_hold_slot_status
    ON lux.lux_inventory_hold (slot_id, status);

-- Lookup holds for a user by status
CREATE INDEX idx_lux_inventory_hold_user_status
    ON lux.lux_inventory_hold (user_id, status);

-- Expiration sweep: find holds that need to be expired
CREATE INDEX idx_lux_inventory_hold_expires
    ON lux.lux_inventory_hold (expires_at);

-- ============================================================================
-- lux.lux_exclusive_experience
-- ----------------------------------------------------------------------------
-- Experiences gated by membership tier. Links to a Travel Graph product but
-- adds tier-required gating and optional capacity limits. The AI planner uses
-- these records to surface tier-exclusive options during itinerary generation.
-- ============================================================================
CREATE TABLE lux.lux_exclusive_experience (
    experience_id UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id    UUID        NOT NULL,           -- FK to tg.tg_product
    tier_required TEXT        NOT NULL DEFAULT 'black'
                              CHECK (tier_required IN ('black', 'reserve', 'signature')),
    max_capacity  INT,
    description   TEXT,
    active        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE lux.lux_exclusive_experience IS
    'Tier-gated exclusive experiences linked to Travel Graph products. Used by the AI planner for premium itinerary generation.';

-- Primary query: active experiences for a given tier
CREATE INDEX idx_lux_exclusive_experience_tier_active
    ON lux.lux_exclusive_experience (tier_required, active);

-- ============================================================================
-- Updated-at trigger function (schema-local copy for independence)
-- ============================================================================
CREATE OR REPLACE FUNCTION lux.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at triggers
CREATE TRIGGER trg_lux_membership_updated_at
    BEFORE UPDATE ON lux.lux_membership
    FOR EACH ROW EXECUTE FUNCTION lux.set_updated_at();

CREATE TRIGGER trg_lux_concierge_case_updated_at
    BEFORE UPDATE ON lux.lux_concierge_case
    FOR EACH ROW EXECUTE FUNCTION lux.set_updated_at();

CREATE TRIGGER trg_lux_inventory_hold_updated_at
    BEFORE UPDATE ON lux.lux_inventory_hold
    FOR EACH ROW EXECUTE FUNCTION lux.set_updated_at();

COMMIT;
