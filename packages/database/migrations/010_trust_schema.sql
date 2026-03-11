-- ============================================================================
-- Migration 010: Trust & Safety Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Platform-wide trust and safety infrastructure. Risk event logging
--          with severity scoring, partner (supplier) trust scoring, user
--          trust scoring, and content moderation queue for human review.
--          Powers fraud detection, abuse prevention, review integrity, and
--          the platform's trust tier system.
--
-- Dependencies:
--   - 001 (assumed): uuid-ossp extension
--   - Travel Graph schema: tg.tg_supplier (for partner scores)
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS trust;

-- ============================================================================
-- trust.trust_risk_event
-- ----------------------------------------------------------------------------
-- Immutable log of risk signals detected across the platform. Every fraud
-- attempt, spam report, abuse flag, bot detection, scam signal, fake review,
-- or policy violation generates a risk event. The score (0-1) quantifies
-- confidence; reason_codes and evidence JSONB provide explainability for
-- human reviewers. The action_taken field records the automated or manual
-- response. Reviewed_by / reviewed_at track human oversight.
-- ============================================================================
CREATE TABLE trust.trust_risk_event (
    event_id     UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type  TEXT          NOT NULL
                               CHECK (entity_type IN (
                                   'user', 'supplier', 'review', 'reservation', 'listing'
                               )),
    entity_id    UUID          NOT NULL,
    risk_type    TEXT          NOT NULL
                               CHECK (risk_type IN (
                                   'fraud', 'spam', 'abuse', 'bot', 'scam',
                                   'fake_review', 'policy_violation'
                               )),
    severity     TEXT          NOT NULL DEFAULT 'low'
                               CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    score        NUMERIC(6,4) NOT NULL
                               CHECK (score >= 0 AND score <= 1),
    reason_codes JSONB         NOT NULL DEFAULT '[]'::jsonb,
    evidence     JSONB         NOT NULL DEFAULT '{}'::jsonb,
    action_taken TEXT          CHECK (action_taken IS NULL OR action_taken IN (
                                   'none', 'flagged', 'hidden', 'suspended',
                                   'banned', 'queued_for_review'
                               )),
    reviewed_by  UUID,
    reviewed_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE trust.trust_risk_event IS
    'Immutable risk event log. Records fraud, spam, abuse, and policy violations with confidence scores and evidence for audit.';

-- Lookup all risk events for a specific entity
CREATE INDEX idx_trust_risk_event_entity
    ON trust.trust_risk_event (entity_type, entity_id);

-- Operational view: filter by risk type and severity for triage
CREATE INDEX idx_trust_risk_event_type_severity
    ON trust.trust_risk_event (risk_type, severity);

-- Action pipeline: find events by response action
CREATE INDEX idx_trust_risk_event_action
    ON trust.trust_risk_event (action_taken);

-- ============================================================================
-- trust.trust_partner_score
-- ----------------------------------------------------------------------------
-- Aggregate trust score for suppliers (partners). Combines reliability,
-- response quality, cancellation and dispute rates, review performance, and
-- fraud history into a single composite profile. The tier field drives
-- platform privileges: new partners start in 'new', graduate to 'standard'
-- and 'trusted' with good performance, earn 'premium' for top performers,
-- or get downgraded to 'restricted' for persistent issues.
-- ============================================================================
CREATE TABLE trust.trust_partner_score (
    supplier_id       UUID          PRIMARY KEY,    -- FK to tg.tg_supplier
    reliability_score NUMERIC(5,2)  NOT NULL DEFAULT 50.00,
    response_quality  NUMERIC(5,2)  NOT NULL DEFAULT 50.00,
    cancellation_rate NUMERIC(5,4)  NOT NULL DEFAULT 0,
    dispute_rate      NUMERIC(5,4)  NOT NULL DEFAULT 0,
    review_avg        NUMERIC(3,2),
    review_count      INT           NOT NULL DEFAULT 0,
    fraud_incidents   INT           NOT NULL DEFAULT 0,
    tier              TEXT          NOT NULL DEFAULT 'standard'
                                    CHECK (tier IN ('new', 'standard', 'trusted', 'premium', 'restricted')),
    last_audit_at     TIMESTAMPTZ,
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE trust.trust_partner_score IS
    'Aggregate supplier trust profile. Drives partner tier (new/standard/trusted/premium/restricted) and platform privileges.';

-- ============================================================================
-- trust.trust_user_score
-- ----------------------------------------------------------------------------
-- Aggregate trust score for platform users. Tracks behavioural signals
-- (no-show rate, cancellation rate, review quality) alongside identity
-- verification and fraud flags. The tier system mirrors partner tiers:
-- users progress from 'new' through 'standard' and 'trusted' to 'verified',
-- or get restricted for bad behaviour.
-- ============================================================================
CREATE TABLE trust.trust_user_score (
    user_id           UUID          PRIMARY KEY,
    trustworthiness   NUMERIC(5,2)  NOT NULL DEFAULT 50.00,
    no_show_rate      NUMERIC(5,4)  NOT NULL DEFAULT 0,
    cancellation_rate NUMERIC(5,4)  NOT NULL DEFAULT 0,
    review_quality    NUMERIC(5,2)  NOT NULL DEFAULT 50.00,
    fraud_flags       INT           NOT NULL DEFAULT 0,
    verified_identity BOOLEAN       NOT NULL DEFAULT FALSE,
    tier              TEXT          NOT NULL DEFAULT 'standard'
                                    CHECK (tier IN ('new', 'standard', 'trusted', 'verified', 'restricted')),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE trust.trust_user_score IS
    'Aggregate user trust profile. Behavioural signals, identity verification, and tier progression drive platform privileges.';

-- ============================================================================
-- trust.trust_moderation_queue
-- ----------------------------------------------------------------------------
-- Content moderation queue for human review. Any user-generated content
-- (reviews, photos, videos, messages, listings) flagged by automated systems
-- or community reports lands here. Priority and status drive the moderation
-- workflow; assigned_to enables workload distribution. The decision field
-- records the moderator's verdict for audit and appeal support.
-- ============================================================================
CREATE TABLE trust.trust_moderation_queue (
    queue_id     UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type TEXT        NOT NULL
                             CHECK (content_type IN ('review', 'photo', 'video', 'message', 'listing')),
    content_id   UUID        NOT NULL,
    entity_id    UUID        NOT NULL,
    reason       TEXT        NOT NULL,
    priority     TEXT        NOT NULL DEFAULT 'normal'
                             CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status       TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'escalated')),
    assigned_to  UUID,
    decision     TEXT,
    decided_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE trust.trust_moderation_queue IS
    'Content moderation queue for human review. Supports prioritised workflow, assignment, and audit-ready decision tracking.';

-- Primary query: moderation dashboard sorted by priority and age
CREATE INDEX idx_trust_moderation_queue_status_priority_created
    ON trust.trust_moderation_queue (status, priority, created_at);

-- ============================================================================
-- Updated-at trigger function (schema-local copy for independence)
-- ============================================================================
CREATE OR REPLACE FUNCTION trust.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at triggers
CREATE TRIGGER trg_trust_partner_score_updated_at
    BEFORE UPDATE ON trust.trust_partner_score
    FOR EACH ROW EXECUTE FUNCTION trust.set_updated_at();

CREATE TRIGGER trg_trust_user_score_updated_at
    BEFORE UPDATE ON trust.trust_user_score
    FOR EACH ROW EXECUTE FUNCTION trust.set_updated_at();

COMMIT;
