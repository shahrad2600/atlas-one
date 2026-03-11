-- ============================================================================
-- Migration 016: Social Features & Personalization
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Full social layer including following, wishlists, activity feed,
--          travel map, public profiles, search history, personalized
--          recommendations, and traveler type profiling.
--
-- Dependencies:
--   - 001_tg_schema.sql (tg schema, tg.set_updated_at function)
--   - 002_identity_schema.sql (identity schema)
--
-- Notes:
--   - All tables use schema-qualified social.* names.
--   - Cross-schema FKs to identity.identity_user are enforced at app layer.
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS social;

-- ============================================================================
-- PART 1: Following System
-- ============================================================================

CREATE TABLE social.social_follow (
  follow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

COMMENT ON TABLE social.social_follow IS 'User-to-user follow relationships. follower_id follows following_id.';

CREATE INDEX idx_follow_follower ON social.social_follow(follower_id);
CREATE INDEX idx_follow_following ON social.social_follow(following_id);

-- ============================================================================
-- PART 2: Saved Places / Wishlists
-- ============================================================================

CREATE TABLE social.social_list (
  list_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  slug VARCHAR(200),
  is_public BOOLEAN DEFAULT FALSE,
  cover_image_url TEXT,
  item_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE social.social_list IS 'User-created wishlist or saved-place collection.';

CREATE INDEX idx_list_user ON social.social_list(user_id);
CREATE UNIQUE INDEX idx_list_user_slug ON social.social_list(user_id, slug);

CREATE TABLE social.social_list_item (
  item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES social.social_list(list_id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  notes TEXT,
  position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, entity_id)
);

COMMENT ON TABLE social.social_list_item IS 'Item within a wishlist. entity_type discriminates the referenced object (hotel, restaurant, experience, etc.).';

CREATE INDEX idx_list_item_list ON social.social_list_item(list_id);
CREATE INDEX idx_list_item_entity ON social.social_list_item(entity_id);

-- ============================================================================
-- PART 3: Quick Favorites (save without list)
-- ============================================================================

CREATE TABLE social.social_favorite (
  favorite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entity_id)
);

COMMENT ON TABLE social.social_favorite IS 'Quick-save / heart an entity without adding to a named list.';

CREATE INDEX idx_favorite_user ON social.social_favorite(user_id);

-- ============================================================================
-- PART 4: Activity Feed
-- ============================================================================

CREATE TABLE social.social_activity (
  activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  entity_type VARCHAR(50),
  reference_id UUID,
  summary TEXT,
  metadata JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE social.social_activity IS 'Activity feed entries. activity_type: review, photo, question, answer, trip, booking, badge, follow, list.';

CREATE INDEX idx_activity_user ON social.social_activity(user_id);
CREATE INDEX idx_activity_created ON social.social_activity(created_at DESC);
CREATE INDEX idx_activity_type ON social.social_activity(activity_type);

-- ============================================================================
-- PART 5: Travel Map (places visited)
-- ============================================================================

CREATE TABLE social.social_visited_place (
  visited_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  place_id UUID NOT NULL,
  country_code VARCHAR(3),
  visited_date DATE,
  notes TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, place_id)
);

COMMENT ON TABLE social.social_visited_place IS 'Places a user has visited. Used to build the travel map and country count.';

CREATE INDEX idx_visited_user ON social.social_visited_place(user_id);
CREATE INDEX idx_visited_country ON social.social_visited_place(country_code);

-- ============================================================================
-- PART 6: Public Profile Extensions
-- ============================================================================

CREATE TABLE social.social_profile (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name VARCHAR(100),
  bio TEXT,
  avatar_url TEXT,
  cover_photo_url TEXT,
  location VARCHAR(200),
  website_url TEXT,
  traveler_type VARCHAR(50),
  travel_style JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT TRUE,
  follower_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  review_count INT DEFAULT 0,
  photo_count INT DEFAULT 0,
  places_visited_count INT DEFAULT 0,
  contribution_points INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE social.social_profile IS 'Extended public profile. traveler_type: luxury, budget, adventure, family, solo, business, foodie, cultural.';

-- ============================================================================
-- PART 7: Search History
-- ============================================================================

CREATE TABLE social.social_search_history (
  search_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  search_type VARCHAR(50),
  filters JSONB DEFAULT '{}',
  result_count INT DEFAULT 0,
  clicked_entity_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE social.social_search_history IS 'User search history for personalization. search_type: hotel, flight, restaurant, experience, general.';

CREATE INDEX idx_search_user ON social.social_search_history(user_id);
CREATE INDEX idx_search_created ON social.social_search_history(created_at DESC);

-- ============================================================================
-- PART 8: Personalized Recommendations Cache
-- ============================================================================

CREATE TABLE social.social_recommendation (
  recommendation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  score NUMERIC(5,4) NOT NULL,
  reason VARCHAR(100),
  source_data JSONB DEFAULT '{}',
  is_dismissed BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entity_id)
);

COMMENT ON TABLE social.social_recommendation IS 'Cached personalized recommendations. reason: based_on_reviews, similar_travelers, trending, recently_viewed.';

CREATE INDEX idx_recommendation_user ON social.social_recommendation(user_id);
CREATE INDEX idx_recommendation_score ON social.social_recommendation(score DESC);

-- ============================================================================
-- PART 9: Traveler Type Profiles
-- ============================================================================

CREATE TABLE social.social_traveler_profile (
  profile_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  luxury_score NUMERIC(3,2) DEFAULT 0,
  budget_score NUMERIC(3,2) DEFAULT 0,
  adventure_score NUMERIC(3,2) DEFAULT 0,
  family_score NUMERIC(3,2) DEFAULT 0,
  solo_score NUMERIC(3,2) DEFAULT 0,
  business_score NUMERIC(3,2) DEFAULT 0,
  foodie_score NUMERIC(3,2) DEFAULT 0,
  cultural_score NUMERIC(3,2) DEFAULT 0,
  nature_score NUMERIC(3,2) DEFAULT 0,
  beach_score NUMERIC(3,2) DEFAULT 0,
  primary_type VARCHAR(50),
  secondary_type VARCHAR(50),
  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE social.social_traveler_profile IS 'Computed traveler archetype scores. Used for personalization and matching.';

-- ============================================================================
-- PART 10: Updated-at triggers
-- ============================================================================

CREATE TRIGGER set_social_list_updated_at
  BEFORE UPDATE ON social.social_list
  FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

CREATE TRIGGER set_social_profile_updated_at
  BEFORE UPDATE ON social.social_profile
  FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

COMMIT;
