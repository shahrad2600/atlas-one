-- ============================================================================
-- Migration 009: Messaging & Notification Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Platform-wide messaging infrastructure (user-partner, concierge,
--          group trip chats, system threads) and multi-channel notification
--          delivery (push, SMS, email, WhatsApp, in-app) with user preference
--          management. Distinct from the stay-scoped guest-host messaging in
--          007; this schema serves all communication across the platform.
--
-- Dependencies:
--   - 001 (assumed): uuid-ossp extension
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS msg;

-- ============================================================================
-- msg.msg_thread
-- ----------------------------------------------------------------------------
-- A conversation container. Thread types span the platform: user-to-partner
-- (restaurant, operator, host), user-to-concierge, group trip planning chats,
-- and system-generated threads (booking updates, disruption alerts). Threads
-- are long-lived; the status field supports archival without deletion.
-- ============================================================================
CREATE TABLE msg.msg_thread (
    thread_id   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_type TEXT        NOT NULL
                            CHECK (thread_type IN (
                                'user_partner', 'user_concierge', 'group_trip', 'system'
                            )),
    trip_id     UUID,
    subject     TEXT,
    status      TEXT        NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'archived', 'closed')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE msg.msg_thread IS
    'Platform-wide conversation container. Supports user-partner, concierge, group trip, and system thread types.';

-- ============================================================================
-- msg.msg_participant
-- ----------------------------------------------------------------------------
-- Membership record linking an entity to a thread. Participant types are
-- polymorphic (user, restaurant, operator, host, agent, system) with
-- participant_ref_id pointing to the appropriate domain table. The composite
-- unique constraint prevents duplicate joins. last_read_at drives unread
-- badge counts; muted controls push notification suppression.
-- ============================================================================
CREATE TABLE msg.msg_participant (
    participant_id   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id        UUID        NOT NULL
                                 REFERENCES msg.msg_thread (thread_id) ON DELETE CASCADE,
    participant_type TEXT        NOT NULL
                                 CHECK (participant_type IN (
                                     'user', 'restaurant', 'operator', 'host', 'agent', 'system'
                                 )),
    participant_ref_id UUID      NOT NULL,
    display_name     TEXT,
    joined_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at     TIMESTAMPTZ,
    muted            BOOLEAN     NOT NULL DEFAULT FALSE,

    -- Prevent the same entity from joining a thread twice
    CONSTRAINT uq_msg_participant_thread_type_ref
        UNIQUE (thread_id, participant_type, participant_ref_id)
);

COMMENT ON TABLE msg.msg_participant IS
    'Thread membership with read-tracking and mute controls. Polymorphic participant types span the entire platform.';

-- Reverse lookup: find all threads a specific participant belongs to
CREATE INDEX idx_msg_participant_ref_type
    ON msg.msg_participant (participant_ref_id, participant_type);

-- ============================================================================
-- msg.msg_message
-- ----------------------------------------------------------------------------
-- Individual messages within a thread. Supports rich content types (text,
-- image, file, system events, interactive cards). The metadata JSONB carries
-- type-specific payloads: image URLs for images, file metadata for files,
-- event details for system events, action buttons for cards. Soft-delete via
-- deleted_at preserves audit trails while hiding content in the UI.
-- ============================================================================
CREATE TABLE msg.msg_message (
    message_id   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id    UUID        NOT NULL
                              REFERENCES msg.msg_thread (thread_id) ON DELETE CASCADE,
    sender_type  TEXT        NOT NULL
                              CHECK (sender_type IN (
                                  'user', 'restaurant', 'operator', 'host', 'agent', 'system'
                              )),
    sender_id    UUID,
    body         TEXT        NOT NULL,
    content_type TEXT        NOT NULL DEFAULT 'text'
                              CHECK (content_type IN ('text', 'image', 'file', 'system_event', 'card')),
    metadata     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    edited_at    TIMESTAMPTZ,
    deleted_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE msg.msg_message IS
    'Individual messages supporting rich content types (text, image, file, system events, interactive cards) with soft-delete.';

-- Primary query: render messages in chronological order for a thread
CREATE INDEX idx_msg_message_thread_created
    ON msg.msg_message (thread_id, created_at);

-- ============================================================================
-- msg.notif_notification
-- ----------------------------------------------------------------------------
-- Multi-channel notification delivery record. Each row represents a single
-- notification attempt on a specific channel (push, SMS, email, WhatsApp,
-- in-app). The template field references a notification template for
-- rendering; the payload JSONB carries template variables. Status lifecycle
-- tracks delivery from queue through send to delivery/read confirmation.
-- Scheduled_at enables future-dated notifications (e.g., trip reminders).
-- ============================================================================
CREATE TABLE msg.notif_notification (
    notification_id UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID        NOT NULL,
    channel         TEXT        NOT NULL
                                CHECK (channel IN ('push', 'sms', 'email', 'whatsapp', 'in_app')),
    template        TEXT        NOT NULL,
    subject         TEXT,
    payload         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    status          TEXT        NOT NULL DEFAULT 'queued'
                                CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'read')),
    scheduled_at    TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    read_at         TIMESTAMPTZ,
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE msg.notif_notification IS
    'Multi-channel notification delivery tracking. Supports scheduled sends, delivery confirmation, and read receipts.';

-- Primary query: user notification inbox with status filtering
CREATE INDEX idx_notif_notification_user_status_created
    ON msg.notif_notification (user_id, status, created_at);

-- Channel-level operational view: delivery pipeline monitoring
CREATE INDEX idx_notif_notification_channel_status
    ON msg.notif_notification (channel, status);

-- ============================================================================
-- msg.notif_preference
-- ----------------------------------------------------------------------------
-- Per-user, per-channel, per-category notification opt-in/out. Categories
-- span marketing, transactional, trip updates, dining alerts, deals, and
-- reminders. The composite PK naturally prevents duplicates and enables
-- efficient upsert patterns. The enabled flag defaults to TRUE; users
-- explicitly opt out of unwanted categories.
-- ============================================================================
CREATE TABLE msg.notif_preference (
    user_id  UUID    NOT NULL,
    channel  TEXT    NOT NULL
                     CHECK (channel IN ('push', 'sms', 'email', 'whatsapp', 'in_app')),
    category TEXT    NOT NULL
                     CHECK (category IN (
                         'marketing', 'transactional', 'trip_updates',
                         'dining_alerts', 'deals', 'reminders'
                     )),
    enabled  BOOLEAN NOT NULL DEFAULT TRUE,

    PRIMARY KEY (user_id, channel, category)
);

COMMENT ON TABLE msg.notif_preference IS
    'Per-user notification preferences by channel and category. Composite PK enables efficient upsert opt-in/opt-out.';

-- ============================================================================
-- Updated-at trigger function (schema-local copy for independence)
-- ============================================================================
CREATE OR REPLACE FUNCTION msg.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at triggers
CREATE TRIGGER trg_msg_thread_updated_at
    BEFORE UPDATE ON msg.msg_thread
    FOR EACH ROW EXECUTE FUNCTION msg.set_updated_at();

COMMIT;
