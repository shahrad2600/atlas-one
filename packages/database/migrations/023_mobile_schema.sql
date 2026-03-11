-- ============================================================================
-- Migration 023: Mobile API Layer Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Extends the identity schema with mobile-specific tables for device
--          registration (push notifications), social sign-in providers
--          (Google/Apple), and offline data pack management for travel
--          destinations. Supports multi-device push token management,
--          social auth linking/unlinking, and versioned offline content packs.
--
-- Dependencies:
--   - 002_identity_schema.sql (identity schema)
--   - 001_tg_schema.sql (tg.set_updated_at trigger function)
-- ============================================================================

BEGIN;

-- Device Registration (for push notifications)
CREATE TABLE identity.identity_device (
  device_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform VARCHAR(20) NOT NULL, -- ios, android, web
  push_token TEXT,
  device_model VARCHAR(100),
  os_version VARCHAR(50),
  app_version VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_device_user ON identity.identity_device(user_id);
CREATE UNIQUE INDEX idx_device_push_token ON identity.identity_device(push_token) WHERE push_token IS NOT NULL;

-- Social Sign-In Providers
CREATE TABLE identity.identity_social_auth (
  social_auth_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider VARCHAR(20) NOT NULL, -- google, apple, facebook
  provider_user_id VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  display_name VARCHAR(200),
  avatar_url TEXT,
  access_token_hash VARCHAR(255), -- hashed, never store raw
  refresh_token_hash VARCHAR(255),
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_user_id)
);
CREATE INDEX idx_social_auth_user ON identity.identity_social_auth(user_id);

-- Offline Data Sync
CREATE TABLE identity.identity_offline_pack (
  pack_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  version INT NOT NULL DEFAULT 1,
  size_bytes BIGINT,
  content_hash VARCHAR(64),
  data_url TEXT, -- URL to download pack
  includes JSONB DEFAULT '{}', -- {reviews: true, photos: true, maps: true, guides: true}
  entity_count INT DEFAULT 0,
  review_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_offline_pack_destination ON identity.identity_offline_pack(destination_id);

-- User Offline Downloads
CREATE TABLE identity.identity_user_offline (
  download_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pack_id UUID NOT NULL REFERENCES identity.identity_offline_pack(pack_id),
  downloaded_version INT NOT NULL,
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, pack_id)
);
CREATE INDEX idx_user_offline_user ON identity.identity_user_offline(user_id);

-- Triggers
CREATE TRIGGER set_device_updated_at BEFORE UPDATE ON identity.identity_device FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();
CREATE TRIGGER set_social_auth_updated_at BEFORE UPDATE ON identity.identity_social_auth FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();
CREATE TRIGGER set_offline_pack_updated_at BEFORE UPDATE ON identity.identity_offline_pack FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

COMMIT;
