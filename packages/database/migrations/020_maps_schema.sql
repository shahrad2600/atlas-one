-- ============================================================================
-- Migration 020: Maps & Geo Features
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Interactive map data endpoints, location scoring, map pin data,
--          and walking tour support. Extends the tg schema with geo/maps
--          specific tables.
--
-- Dependencies:
--   - 001_tg_schema.sql (tg schema, tg.set_updated_at function)
--   - 016_social_schema.sql (social.social_favorite for favorites map view)
--
-- Notes:
--   - All tables use schema-qualified tg.* names.
--   - Map pins link to entities via entity_id + entity_type.
--   - Walking tours link to places via place_id.
--   - Favorites map view joins social.social_favorite with tg.tg_map_pin.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Map Pins / Points of Interest
-- ============================================================================

CREATE TABLE tg.tg_map_pin (
  pin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- restaurant, hotel, attraction, experience
  place_id UUID, -- links to tg_place
  name VARCHAR(300) NOT NULL,
  category VARCHAR(50), -- fine_dining, casual, luxury_hotel, budget_hotel, museum, park, beach, nightlife, shopping, spa
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  bubble_rating NUMERIC(3,2), -- average rating 1.0-5.0
  review_count INT DEFAULT 0,
  price_level INT, -- 1-4 ($-$$$$)
  has_award BOOLEAN DEFAULT FALSE,
  award_name VARCHAR(200),
  thumbnail_url TEXT,
  is_open_now BOOLEAN,
  hours_today VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_map_pin IS 'Map pins / points of interest with ratings, coordinates, and display metadata for map rendering.';

CREATE INDEX idx_map_pin_location ON tg.tg_map_pin(latitude, longitude);
CREATE INDEX idx_map_pin_entity ON tg.tg_map_pin(entity_id);
CREATE INDEX idx_map_pin_place ON tg.tg_map_pin(place_id);
CREATE INDEX idx_map_pin_category ON tg.tg_map_pin(category);

-- ============================================================================
-- PART 2: Location Scoring
-- ============================================================================

CREATE TABLE tg.tg_location_score (
  score_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL UNIQUE,
  entity_type VARCHAR(50) NOT NULL,
  overall_score NUMERIC(3,1) NOT NULL, -- 1.0-10.0
  walkability_score NUMERIC(3,1),
  transit_score NUMERIC(3,1),
  dining_score NUMERIC(3,1), -- proximity to restaurants
  attractions_score NUMERIC(3,1), -- proximity to attractions
  nightlife_score NUMERIC(3,1),
  shopping_score NUMERIC(3,1),
  safety_score NUMERIC(3,1),
  nearby_restaurants INT DEFAULT 0,
  nearby_attractions INT DEFAULT 0,
  nearby_transit_stops INT DEFAULT 0,
  nearest_airport_km NUMERIC(6,1),
  nearest_beach_km NUMERIC(6,1),
  nearest_city_center_km NUMERIC(6,1),
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_location_score IS 'Computed location quality scores for entities (hotels, venues). Includes walkability, transit, dining proximity, etc.';

CREATE INDEX idx_location_score_entity ON tg.tg_location_score(entity_id);

-- ============================================================================
-- PART 3: Walking Tours
-- ============================================================================

CREATE TABLE tg.tg_walking_tour (
  tour_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL,
  name VARCHAR(300) NOT NULL,
  slug VARCHAR(300) NOT NULL UNIQUE,
  description TEXT,
  tour_type VARCHAR(30) NOT NULL, -- self_guided, guided, audio
  duration_minutes INT,
  distance_km NUMERIC(5,2),
  difficulty VARCHAR(20) DEFAULT 'easy', -- easy, moderate, challenging
  hero_image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  review_count INT DEFAULT 0,
  average_rating NUMERIC(3,2),
  is_featured BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE tg.tg_walking_tour IS 'Walking tours with metadata. Linked to places via place_id. Stops stored in tg_walking_tour_stop.';

CREATE INDEX idx_walking_tour_place ON tg.tg_walking_tour(place_id);

-- ============================================================================
-- PART 4: Walking Tour Stops (ordered waypoints)
-- ============================================================================

CREATE TABLE tg.tg_walking_tour_stop (
  stop_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID NOT NULL REFERENCES tg.tg_walking_tour(tour_id) ON DELETE CASCADE,
  position INT NOT NULL,
  name VARCHAR(300) NOT NULL,
  description TEXT,
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  entity_id UUID, -- optional link to an entity
  image_url TEXT,
  audio_url TEXT,
  duration_minutes INT DEFAULT 5,
  tips TEXT,
  UNIQUE(tour_id, position)
);

COMMENT ON TABLE tg.tg_walking_tour_stop IS 'Ordered waypoints for walking tours. Each stop has coordinates and optional entity link.';

CREATE INDEX idx_tour_stop_tour ON tg.tg_walking_tour_stop(tour_id);

-- ============================================================================
-- PART 5: Favorites Map View
-- ============================================================================

-- Joins social favorites with map pin coordinates for spatial planning
CREATE VIEW tg.v_favorites_map AS
SELECT
  sf.favorite_id,
  sf.user_id,
  sf.entity_id,
  sf.entity_type,
  mp.name,
  mp.latitude,
  mp.longitude,
  mp.category,
  mp.bubble_rating,
  mp.thumbnail_url,
  sf.created_at
FROM social.social_favorite sf
LEFT JOIN tg.tg_map_pin mp ON mp.entity_id = sf.entity_id;

COMMENT ON VIEW tg.v_favorites_map IS 'User favorites joined with map pin coordinates for the spatial planning view.';

-- ============================================================================
-- PART 6: Triggers
-- ============================================================================

CREATE TRIGGER set_map_pin_updated_at
  BEFORE UPDATE ON tg.tg_map_pin
  FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

CREATE TRIGGER set_walking_tour_updated_at
  BEFORE UPDATE ON tg.tg_walking_tour
  FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

COMMIT;
