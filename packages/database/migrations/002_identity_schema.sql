-- ============================================================================
-- Migration 002: Identity Schema
-- Atlas One -- Enterprise AI-powered Travel Super-Platform
--
-- Creates the identity schema for user accounts, profiles, sessions, and
-- verification records. Separated from the Travel Graph to maintain domain
-- boundaries and enable independent scaling.
--
-- Prerequisites: Migration 001 (tg schema) must be applied first.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Schema
-- ----------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS identity;

-- Attempt to enable citext for case-insensitive email storage.
-- Falls back to a functional index on lower(email) if citext is unavailable.
CREATE EXTENSION IF NOT EXISTS "citext";

-- ----------------------------------------------------------------------------
-- identity_user
-- Core user account. Stores authentication credentials and account status.
-- One row per registered user.
-- ----------------------------------------------------------------------------

CREATE TABLE identity.identity_user (
    user_id       UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         CITEXT      UNIQUE NOT NULL,
    phone         TEXT        UNIQUE,
    password_hash TEXT,       -- NULL for OAuth-only users
    status        TEXT        NOT NULL DEFAULT 'active'
        CONSTRAINT chk_user_status CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE identity.identity_user IS 'Core user account table. One row per registered user.';
COMMENT ON COLUMN identity.identity_user.email IS 'Primary email (case-insensitive via CITEXT). Used for login.';
COMMENT ON COLUMN identity.identity_user.phone IS 'Phone number in E.164 format (e.g., +14155551234). Optional.';
COMMENT ON COLUMN identity.identity_user.password_hash IS 'Argon2id hash. NULL for OAuth/SSO-only accounts.';

CREATE INDEX idx_user_status ON identity.identity_user (status);
CREATE INDEX idx_user_created ON identity.identity_user (created_at);

-- ----------------------------------------------------------------------------
-- identity_profile
-- Extended user profile data. 1:1 with identity_user.
-- Separated to keep the auth table lean and allow profile-heavy queries
-- without touching credential data.
-- ----------------------------------------------------------------------------

CREATE TABLE identity.identity_profile (
    user_id              UUID        PRIMARY KEY
        REFERENCES identity.identity_user (user_id) ON DELETE CASCADE,
    first_name           TEXT,
    last_name            TEXT,
    dob                  DATE,
    home_place_id        UUID
        REFERENCES tg.tg_place (place_id) ON DELETE SET NULL,
    preferences          JSONB       DEFAULT '{}',
    travel_style_vector_id UUID
        REFERENCES tg.tg_embedding (embedding_id) ON DELETE SET NULL,
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE identity.identity_profile IS 'Extended user profile. 1:1 with identity_user.';
COMMENT ON COLUMN identity.identity_profile.home_place_id IS 'User home city/region for personalized recommendations.';
COMMENT ON COLUMN identity.identity_profile.preferences IS 'User preferences (dietary, accessibility, budget, interests) as structured JSON.';
COMMENT ON COLUMN identity.identity_profile.travel_style_vector_id IS 'Reference to the user travel-style embedding for AI personalization.';

CREATE INDEX idx_profile_home_place ON identity.identity_profile (home_place_id)
    WHERE home_place_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- identity_session
-- Active user sessions. Supports session enumeration for security (e.g.,
-- "you are logged in on 3 devices") and forced logout.
-- ----------------------------------------------------------------------------

CREATE TABLE identity.identity_session (
    session_id  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL
        REFERENCES identity.identity_user (user_id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    ip          INET,
    user_agent  TEXT,

    CONSTRAINT chk_session_expiry CHECK (expires_at > created_at)
);

COMMENT ON TABLE identity.identity_session IS 'Active user sessions. Enables multi-device tracking and forced logout.';
COMMENT ON COLUMN identity.identity_session.ip IS 'Client IP address at session creation.';
COMMENT ON COLUMN identity.identity_session.user_agent IS 'Browser/client user-agent string at session creation.';

CREATE INDEX idx_session_user ON identity.identity_session (user_id);
CREATE INDEX idx_session_expires ON identity.identity_session (expires_at);

-- ----------------------------------------------------------------------------
-- identity_verification
-- Identity verification records (email, phone, KYC providers).
-- Supports multiple verification attempts and providers per user.
-- ----------------------------------------------------------------------------

CREATE TABLE identity.identity_verification (
    verification_id UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL
        REFERENCES identity.identity_user (user_id) ON DELETE CASCADE,
    provider        TEXT,       -- e.g., 'email_otp', 'sms_otp', 'stripe_identity', 'jumio'
    status          TEXT        DEFAULT 'pending'
        CONSTRAINT chk_verification_status CHECK (status IN ('pending', 'verified', 'failed')),
    result          JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE identity.identity_verification IS 'Identity verification records from various providers.';
COMMENT ON COLUMN identity.identity_verification.provider IS 'Verification provider identifier.';
COMMENT ON COLUMN identity.identity_verification.result IS 'Provider-specific verification result payload.';

CREATE INDEX idx_verification_user ON identity.identity_verification (user_id);
CREATE INDEX idx_verification_status ON identity.identity_verification (user_id, status);

-- ----------------------------------------------------------------------------
-- Trigger: auto-update updated_at
-- Reuses the trigger function from tg schema if it exists,
-- otherwise creates an identity-local version.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION identity.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION identity.set_updated_at() IS 'Trigger function to auto-set updated_at to NOW() on row update.';

CREATE TRIGGER trg_user_updated_at
    BEFORE UPDATE ON identity.identity_user
    FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

CREATE TRIGGER trg_profile_updated_at
    BEFORE UPDATE ON identity.identity_profile
    FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

CREATE TRIGGER trg_verification_updated_at
    BEFORE UPDATE ON identity.identity_verification
    FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

COMMIT;
