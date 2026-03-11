-- ============================================================================
-- Migration 019: Content & Editorial Schema
-- Atlas One -- Enterprise AI-powered Travel Super-Platform
--
-- Creates the content schema for destination pages, travel guides, best-of
-- lists, neighborhood guides, themed collections, awards, and trending data.
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS content;

-- ── Destination Pages ──────────────────────────────────────────────────────

CREATE TABLE content.content_destination (
  destination_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID NOT NULL, -- links to tg.tg_place
  slug VARCHAR(300) NOT NULL UNIQUE,
  name VARCHAR(300) NOT NULL,
  tagline TEXT,
  description TEXT,
  hero_image_url TEXT,
  gallery_urls TEXT[] DEFAULT '{}',
  overview_html TEXT,
  best_time_to_visit TEXT,
  getting_there TEXT,
  local_tips TEXT,
  weather_info JSONB DEFAULT '{}', -- {jan: {high: 75, low: 55, rain: 2.1}, ...}
  quick_facts JSONB DEFAULT '{}', -- {currency, language, timezone, population, area}
  coordinates JSONB, -- {lat, lng}
  country_code VARCHAR(3),
  region VARCHAR(100),
  is_featured BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, published, archived
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_destination_place ON content.content_destination(place_id);
CREATE INDEX idx_destination_country ON content.content_destination(country_code);
CREATE INDEX idx_destination_status ON content.content_destination(status);

-- ── Neighborhoods ──────────────────────────────────────────────────────────

CREATE TABLE content.content_neighborhood (
  neighborhood_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID NOT NULL REFERENCES content.content_destination(destination_id),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL,
  description TEXT,
  hero_image_url TEXT,
  vibe TEXT, -- "trendy", "historic", "family-friendly", "nightlife"
  highlights TEXT[] DEFAULT '{}',
  coordinates JSONB, -- {lat, lng, radius}
  boundaries JSONB, -- GeoJSON polygon
  top_restaurant_ids UUID[] DEFAULT '{}',
  top_hotel_ids UUID[] DEFAULT '{}',
  top_attraction_ids UUID[] DEFAULT '{}',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(destination_id, slug)
);

CREATE INDEX idx_neighborhood_destination ON content.content_neighborhood(destination_id);

-- ── Travel Guides ──────────────────────────────────────────────────────────

CREATE TABLE content.content_guide (
  guide_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) NOT NULL UNIQUE,
  subtitle TEXT,
  author_id UUID,
  author_name VARCHAR(200),
  destination_id UUID REFERENCES content.content_destination(destination_id),
  category VARCHAR(50) NOT NULL, -- destination, theme, how_to, tips, seasonal, food, adventure, budget, luxury
  subcategory VARCHAR(50),
  hero_image_url TEXT,
  content_html TEXT NOT NULL,
  excerpt TEXT,
  reading_time_minutes INT DEFAULT 5,
  tags TEXT[] DEFAULT '{}',
  related_entity_ids UUID[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  view_count INT DEFAULT 0,
  share_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guide_destination ON content.content_guide(destination_id);
CREATE INDEX idx_guide_category ON content.content_guide(category);
CREATE INDEX idx_guide_status ON content.content_guide(status);
CREATE INDEX idx_guide_tags ON content.content_guide USING GIN(tags);

-- ── Best-Of Lists ──────────────────────────────────────────────────────────

CREATE TABLE content.content_best_of (
  best_of_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) NOT NULL UNIQUE,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- restaurants, hotels, attractions, experiences, beaches, museums, nightlife, shopping, spas
  subcategory VARCHAR(50),
  destination_id UUID REFERENCES content.content_destination(destination_id),
  hero_image_url TEXT,
  methodology TEXT, -- how the list was compiled
  year INT,
  season VARCHAR(20), -- spring, summer, fall, winter
  is_featured BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  view_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_best_of_category ON content.content_best_of(category);
CREATE INDEX idx_best_of_destination ON content.content_best_of(destination_id);

-- ── Best-Of List Items ─────────────────────────────────────────────────────

CREATE TABLE content.content_best_of_item (
  item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  best_of_id UUID NOT NULL REFERENCES content.content_best_of(best_of_id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  rank INT NOT NULL,
  title VARCHAR(300),
  blurb TEXT,
  image_url TEXT,
  metadata JSONB DEFAULT '{}',
  UNIQUE(best_of_id, rank)
);

CREATE INDEX idx_best_of_item_list ON content.content_best_of_item(best_of_id);

-- ── Travelers' Choice Awards ───────────────────────────────────────────────

CREATE TABLE content.content_award (
  award_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,
  slug VARCHAR(300) NOT NULL,
  description TEXT,
  badge_image_url TEXT,
  category VARCHAR(50) NOT NULL, -- destination, hotel, restaurant, attraction, experience
  subcategory VARCHAR(50), -- luxury, family, budget, romance, adventure, food, nature, cultural
  tier VARCHAR(20) NOT NULL DEFAULT 'standard', -- standard, best_of_best
  year INT NOT NULL,
  methodology TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(slug, year)
);

CREATE INDEX idx_award_category ON content.content_award(category);
CREATE INDEX idx_award_year ON content.content_award(year);

-- ── Award Winners ──────────────────────────────────────────────────────────

CREATE TABLE content.content_award_winner (
  winner_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id UUID NOT NULL REFERENCES content.content_award(award_id),
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  rank INT,
  region VARCHAR(100),
  country_code VARCHAR(3),
  blurb TEXT,
  review_count INT DEFAULT 0,
  average_rating NUMERIC(3,2),
  metadata JSONB DEFAULT '{}',
  UNIQUE(award_id, entity_id)
);

CREATE INDEX idx_winner_award ON content.content_award_winner(award_id);
CREATE INDEX idx_winner_entity ON content.content_award_winner(entity_id);

-- ── Themed Collections ─────────────────────────────────────────────────────

CREATE TABLE content.content_collection (
  collection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(300) NOT NULL,
  slug VARCHAR(300) NOT NULL UNIQUE,
  description TEXT,
  theme VARCHAR(50) NOT NULL, -- solo_travel, honeymoon, family, business, road_trip, luxury, budget, food, adventure, wellness, cultural, beach, winter, summer
  hero_image_url TEXT,
  destination_ids UUID[] DEFAULT '{}',
  entity_ids UUID[] DEFAULT '{}',
  guide_ids UUID[] DEFAULT '{}',
  best_of_ids UUID[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collection_theme ON content.content_collection(theme);
CREATE INDEX idx_collection_status ON content.content_collection(status);

-- ── Trendcast / Trending Destinations ──────────────────────────────────────

CREATE TABLE content.content_trending (
  trending_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES content.content_destination(destination_id),
  entity_id UUID,
  entity_type VARCHAR(50),
  trend_type VARCHAR(30) NOT NULL, -- destination, category, experience_type
  trend_score NUMERIC(8,2) DEFAULT 0,
  growth_percent NUMERIC(8,2) DEFAULT 0,
  period VARCHAR(20) NOT NULL, -- weekly, monthly, quarterly, yearly
  data_source VARCHAR(50), -- search_volume, booking_volume, review_volume
  metadata JSONB DEFAULT '{}',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trending_type ON content.content_trending(trend_type);
CREATE INDEX idx_trending_period ON content.content_trending(period_start, period_end);

-- ── Update Triggers ────────────────────────────────────────────────────────

CREATE TRIGGER set_content_destination_updated_at
  BEFORE UPDATE ON content.content_destination
  FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

CREATE TRIGGER set_content_neighborhood_updated_at
  BEFORE UPDATE ON content.content_neighborhood
  FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

CREATE TRIGGER set_content_guide_updated_at
  BEFORE UPDATE ON content.content_guide
  FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

CREATE TRIGGER set_content_best_of_updated_at
  BEFORE UPDATE ON content.content_best_of
  FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

CREATE TRIGGER set_content_collection_updated_at
  BEFORE UPDATE ON content.content_collection
  FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

COMMIT;
