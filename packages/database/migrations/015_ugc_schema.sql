-- ============================================================================
-- Migration 015: User-Generated Content (UGC) Pipeline
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Full UGC pipeline to close the biggest feature gap versus
--          TripAdvisor. Adds photo/media enhancements, Q&A system,
--          community forums, review sub-ratings & owner responses,
--          and destination expert profiles.
--
-- Dependencies:
--   - 001_tg_schema.sql (tg schema, tg_entity, tg_media, tg_review, tg_place)
--   - 010_trust_schema.sql (trust schema)
--
-- Notes:
--   - tg.tg_media already exists from 001. This migration adds columns
--     to extend it for UGC (thumbnail_url, caption, dimensions, helpful/report
--     counts, entity_type discriminator).
--   - All new tables use schema-qualified tg.* names.
--   - Cross-schema FKs to identity.identity_user are enforced at app layer.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Extend existing tg.tg_media for UGC photo pipeline
-- ============================================================================

-- Add UGC-specific columns to the existing tg_media table
ALTER TABLE tg.tg_media
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS width INT,
  ADD COLUMN IF NOT EXISTS height INT,
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS helpful_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS report_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS moderation_notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add index for entity_type + entity_id lookups (entity_id index exists from 001)
CREATE INDEX IF NOT EXISTS idx_media_entity_type ON tg.tg_media(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_media_user ON tg.tg_media(user_id);
CREATE INDEX IF NOT EXISTS idx_media_moderation_status ON tg.tg_media(moderation_status);

-- ============================================================================
-- PART 2: Q&A System
-- ============================================================================

-- Questions about any entity (venue, place, product, etc.)
CREATE TABLE tg.tg_question (
  question_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'answered', 'closed', 'removed')),
  answer_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  helpful_count INT DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_question IS 'User question about a Travel Graph entity (venue, place, product, etc.).';

CREATE INDEX idx_question_entity ON tg.tg_question(entity_id, entity_type);
CREATE INDEX idx_question_user ON tg.tg_question(user_id);
CREATE INDEX idx_question_status ON tg.tg_question(status);

-- Answers to questions
CREATE TABLE tg.tg_answer (
  answer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES tg.tg_question(question_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  is_accepted BOOLEAN DEFAULT FALSE,
  is_owner_response BOOLEAN DEFAULT FALSE,
  helpful_count INT DEFAULT 0,
  report_count INT DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'removed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_answer IS 'Answer to a user question. Can be marked as accepted by the question author.';

CREATE INDEX idx_answer_question ON tg.tg_answer(question_id);
CREATE INDEX idx_answer_user ON tg.tg_answer(user_id);

-- ============================================================================
-- PART 3: Community Forums
-- ============================================================================

-- Forum categories (e.g., "Paris", "Backpacking", "General Travel Tips")
CREATE TABLE tg.tg_forum (
  forum_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50) NOT NULL
    CHECK (category IN ('destination', 'theme', 'general')),
  destination_id UUID,  -- links to tg_place for destination forums
  icon_url TEXT,
  post_count INT DEFAULT 0,
  subscriber_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_forum IS 'Community forum. Destination forums link to tg_place; theme forums cover topics like backpacking, luxury travel.';

CREATE INDEX idx_forum_category ON tg.tg_forum(category);
CREATE INDEX idx_forum_destination ON tg.tg_forum(destination_id) WHERE destination_id IS NOT NULL;
CREATE INDEX idx_forum_slug ON tg.tg_forum(slug);

-- Forum topics (threads)
CREATE TABLE tg.tg_forum_topic (
  topic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id UUID NOT NULL REFERENCES tg.tg_forum(forum_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title VARCHAR(300) NOT NULL,
  body TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'removed')),
  view_count INT DEFAULT 0,
  reply_count INT DEFAULT 0,
  last_reply_at TIMESTAMPTZ,
  last_reply_user_id UUID,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_forum_topic IS 'Discussion thread within a forum.';

CREATE INDEX idx_topic_forum ON tg.tg_forum_topic(forum_id);
CREATE INDEX idx_topic_user ON tg.tg_forum_topic(user_id);
CREATE INDEX idx_topic_last_reply ON tg.tg_forum_topic(last_reply_at DESC);
CREATE INDEX idx_topic_pinned ON tg.tg_forum_topic(forum_id, is_pinned DESC, last_reply_at DESC);

-- Forum replies (posts within a topic)
CREATE TABLE tg.tg_forum_reply (
  reply_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES tg.tg_forum_topic(topic_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  parent_reply_id UUID REFERENCES tg.tg_forum_reply(reply_id) ON DELETE SET NULL,
  helpful_count INT DEFAULT 0,
  report_count INT DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'removed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_forum_reply IS 'Reply within a forum topic. Supports threaded replies via parent_reply_id.';

CREATE INDEX idx_reply_topic ON tg.tg_forum_reply(topic_id);
CREATE INDEX idx_reply_user ON tg.tg_forum_reply(user_id);
CREATE INDEX idx_reply_parent ON tg.tg_forum_reply(parent_reply_id) WHERE parent_reply_id IS NOT NULL;

-- Forum subscriptions (email/push notifications)
CREATE TABLE tg.tg_forum_subscription (
  subscription_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  forum_id UUID REFERENCES tg.tg_forum(forum_id) ON DELETE CASCADE,
  topic_id UUID REFERENCES tg.tg_forum_topic(topic_id) ON DELETE CASCADE,
  notify_email BOOLEAN DEFAULT TRUE,
  notify_push BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_forum_sub UNIQUE(user_id, forum_id),
  CONSTRAINT uq_topic_sub UNIQUE(user_id, topic_id),
  CONSTRAINT chk_forum_or_topic CHECK (
    (forum_id IS NOT NULL AND topic_id IS NULL) OR
    (forum_id IS NULL AND topic_id IS NOT NULL)
  )
);

COMMENT ON TABLE tg.tg_forum_subscription IS 'User subscription to a forum or topic for email/push notifications.';

CREATE INDEX idx_forum_sub_user ON tg.tg_forum_subscription(user_id);

-- ============================================================================
-- PART 4: Review Enhancements
-- ============================================================================

-- Review votes (helpful / not helpful)
CREATE TABLE tg.tg_review_vote (
  vote_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES tg.tg_review(review_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote_type VARCHAR(20) NOT NULL DEFAULT 'helpful'
    CHECK (vote_type IN ('helpful', 'not_helpful')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_review_vote UNIQUE(review_id, user_id)
);

COMMENT ON TABLE tg.tg_review_vote IS 'User vote on whether a review was helpful.';

CREATE INDEX idx_review_vote_review ON tg.tg_review_vote(review_id);
CREATE INDEX idx_review_vote_user ON tg.tg_review_vote(user_id);

-- Review sub-ratings (cleanliness, service, value, etc.)
CREATE TABLE tg.tg_review_subrating (
  subrating_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES tg.tg_review(review_id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL
    CHECK (category IN (
      'cleanliness', 'service', 'value', 'location',
      'food', 'atmosphere', 'rooms', 'sleep_quality'
    )),
  rating NUMERIC(2,1) NOT NULL
    CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT uq_review_subrating UNIQUE(review_id, category)
);

COMMENT ON TABLE tg.tg_review_subrating IS 'Granular sub-ratings for a review (cleanliness, service, value, etc.).';

CREATE INDEX idx_subrating_review ON tg.tg_review_subrating(review_id);

-- Review responses by business owners
CREATE TABLE tg.tg_review_response (
  response_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL UNIQUE REFERENCES tg.tg_review(review_id) ON DELETE CASCADE,
  user_id UUID NOT NULL,  -- business owner user_id
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'published'
    CHECK (status IN ('published', 'removed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_review_response IS 'Business owner response to a user review. One response per review.';

-- ============================================================================
-- PART 5: Destination Experts
-- ============================================================================

CREATE TABLE tg.tg_destination_expert (
  expert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  place_id UUID NOT NULL,  -- links to tg_place
  title VARCHAR(100),
  bio TEXT,
  expertise_areas TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  answers_count INT DEFAULT 0,
  forum_posts_count INT DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  appointed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_destination_expert IS 'Recognized destination expert. Provides authoritative Q&A answers and forum guidance for a specific place.';

CREATE INDEX idx_expert_user ON tg.tg_destination_expert(user_id);
CREATE INDEX idx_expert_place ON tg.tg_destination_expert(place_id);
CREATE INDEX idx_expert_active ON tg.tg_destination_expert(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- PART 6: Updated-at triggers for new tables
-- ============================================================================

CREATE TRIGGER trg_question_updated_at
    BEFORE UPDATE ON tg.tg_question
    FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

CREATE TRIGGER trg_answer_updated_at
    BEFORE UPDATE ON tg.tg_answer
    FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

CREATE TRIGGER trg_forum_topic_updated_at
    BEFORE UPDATE ON tg.tg_forum_topic
    FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

CREATE TRIGGER trg_forum_reply_updated_at
    BEFORE UPDATE ON tg.tg_forum_reply
    FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

CREATE TRIGGER trg_review_response_updated_at
    BEFORE UPDATE ON tg.tg_review_response
    FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

COMMIT;
