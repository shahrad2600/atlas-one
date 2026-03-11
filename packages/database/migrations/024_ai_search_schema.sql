-- ============================================================================
-- Migration 024: AI Search & Recommendations Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Extends the travel graph and identity schemas with tables for
--          AI-powered semantic search, personalized recommendations,
--          user preference vectors, and precomputed similarity caching.
--          Enables vector-based nearest neighbor queries via pgvector
--          for content-based filtering and collaborative recommendations.
--
-- Dependencies:
--   - 001_tg_schema.sql (tg schema, tg_entity, tg_embedding, set_updated_at)
--   - 002_identity_schema.sql (identity schema)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Add embedding references to tg_entity for fast joins
-- ----------------------------------------------------------------------------

ALTER TABLE tg.tg_entity ADD COLUMN IF NOT EXISTS name_embedding_id UUID REFERENCES tg.tg_embedding(embedding_id);
ALTER TABLE tg.tg_entity ADD COLUMN IF NOT EXISTS description_embedding_id UUID REFERENCES tg.tg_embedding(embedding_id);

-- ----------------------------------------------------------------------------
-- tg_recommendation_log
-- Tracks AI-generated recommendations shown to users for feedback loop
-- analysis, A/B testing, and recommendation quality measurement.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tg.tg_recommendation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_id UUID NOT NULL REFERENCES tg.tg_entity(entity_id) ON DELETE CASCADE,
  score REAL NOT NULL,
  reason TEXT NOT NULL,
  algorithm TEXT NOT NULL DEFAULT 'content_similarity',
  clicked BOOLEAN DEFAULT FALSE,
  booked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_recommendation_log IS 'Tracks AI recommendations shown to users for feedback loop and quality measurement.';
COMMENT ON COLUMN tg.tg_recommendation_log.score IS 'Relevance score assigned by the recommendation algorithm (0.0 to 1.0).';
COMMENT ON COLUMN tg.tg_recommendation_log.algorithm IS 'Name of the algorithm that produced this recommendation.';

CREATE INDEX idx_rec_log_user ON tg.tg_recommendation_log(user_id, created_at DESC);
CREATE INDEX idx_rec_log_entity ON tg.tg_recommendation_log(entity_id);

-- ----------------------------------------------------------------------------
-- identity_preference_vector
-- Stores a computed vector representing each user's travel preferences,
-- derived from their interactions (views, saves, bookings, reviews).
-- Used for personalized recommendation via cosine similarity.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS identity.identity_preference_vector (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  preference_vector vector(1536),
  interaction_count INT DEFAULT 0,
  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE identity.identity_preference_vector IS 'User preference vector computed from behavioral interactions for personalized recommendations.';
COMMENT ON COLUMN identity.identity_preference_vector.preference_vector IS '1536-dim preference vector (same dimensionality as entity embeddings).';
COMMENT ON COLUMN identity.identity_preference_vector.interaction_count IS 'Number of interactions used to compute this vector.';

CREATE INDEX idx_pref_vector ON identity.identity_preference_vector
  USING hnsw (preference_vector vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ----------------------------------------------------------------------------
-- tg_similarity_cache
-- Precomputed pairwise similarity scores between entities for fast
-- "similar to" queries without on-the-fly vector computation.
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS tg.tg_similarity_cache (
  entity_a UUID NOT NULL REFERENCES tg.tg_entity(entity_id) ON DELETE CASCADE,
  entity_b UUID NOT NULL REFERENCES tg.tg_entity(entity_id) ON DELETE CASCADE,
  similarity REAL NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (entity_a, entity_b)
);

COMMENT ON TABLE tg.tg_similarity_cache IS 'Precomputed pairwise entity similarity for fast similar-to queries.';
COMMENT ON COLUMN tg.tg_similarity_cache.similarity IS 'Cosine similarity score between entity_a and entity_b (0.0 to 1.0).';

CREATE INDEX idx_sim_cache_a ON tg.tg_similarity_cache(entity_a, similarity DESC);
CREATE INDEX idx_sim_cache_b ON tg.tg_similarity_cache(entity_b, similarity DESC);

-- Triggers
CREATE TRIGGER set_pref_vector_updated_at BEFORE UPDATE ON identity.identity_preference_vector FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

COMMIT;
