BEGIN;
CREATE SCHEMA IF NOT EXISTS biz;

-- Business Listings (claimed businesses)
CREATE TABLE biz.biz_listing (
  listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL, -- links to tg.tg_entity
  entity_type VARCHAR(50) NOT NULL, -- restaurant, hotel, experience, attraction
  owner_user_id UUID NOT NULL,
  business_name VARCHAR(300) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, verified, suspended
  verification_method VARCHAR(50), -- email, phone, document
  verified_at TIMESTAMPTZ,
  subscription_tier VARCHAR(20) DEFAULT 'free', -- free, business_advantage, enterprise
  subscription_expires_at TIMESTAMPTZ,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_listing_entity ON biz.biz_listing(entity_id);
CREATE INDEX idx_listing_owner ON biz.biz_listing(owner_user_id);
CREATE UNIQUE INDEX idx_listing_entity_unique ON biz.biz_listing(entity_id) WHERE status != 'suspended';

-- Business Team Members
CREATE TABLE biz.biz_team_member (
  member_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES biz.biz_listing(listing_id),
  user_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer', -- owner, admin, manager, viewer
  invited_by UUID,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, user_id)
);

-- Analytics Events
CREATE TABLE biz.biz_analytics_event (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES biz.biz_listing(listing_id),
  event_type VARCHAR(50) NOT NULL, -- page_view, search_impression, click, booking, review, photo_view, phone_click, website_click, direction_click
  visitor_type VARCHAR(20), -- unique, returning
  source VARCHAR(50), -- search, direct, category, competitor, ad
  metadata JSONB DEFAULT '{}',
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_analytics_listing ON biz.biz_analytics_event(listing_id);
CREATE INDEX idx_analytics_date ON biz.biz_analytics_event(event_date);
CREATE INDEX idx_analytics_type ON biz.biz_analytics_event(event_type);

-- Analytics Daily Aggregates (materialized for fast dashboards)
CREATE TABLE biz.biz_analytics_daily (
  aggregate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES biz.biz_listing(listing_id),
  event_date DATE NOT NULL,
  page_views INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  search_impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  bookings INT DEFAULT 0,
  reviews INT DEFAULT 0,
  photo_views INT DEFAULT 0,
  phone_clicks INT DEFAULT 0,
  website_clicks INT DEFAULT 0,
  direction_clicks INT DEFAULT 0,
  revenue_cents INT DEFAULT 0,
  UNIQUE(listing_id, event_date)
);

-- Competitor Sets
CREATE TABLE biz.biz_competitor (
  competitor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES biz.biz_listing(listing_id),
  competitor_entity_id UUID NOT NULL,
  added_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, competitor_entity_id)
);

-- Review Express Campaigns
CREATE TABLE biz.biz_review_campaign (
  campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES biz.biz_listing(listing_id),
  name VARCHAR(200) NOT NULL,
  template_subject VARCHAR(500),
  template_body TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, completed
  total_recipients INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  opened_count INT DEFAULT 0,
  clicked_count INT DEFAULT 0,
  reviewed_count INT DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_campaign_listing ON biz.biz_review_campaign(listing_id);

-- Review Express Recipients
CREATE TABLE biz.biz_campaign_recipient (
  recipient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES biz.biz_review_campaign(campaign_id),
  email VARCHAR(255) NOT NULL,
  name VARCHAR(200),
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, sent, opened, clicked, reviewed, bounced
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_recipient_campaign ON biz.biz_campaign_recipient(campaign_id);

-- Sponsored Placements (Advertising)
CREATE TABLE biz.biz_ad_campaign (
  ad_campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES biz.biz_listing(listing_id),
  name VARCHAR(200) NOT NULL,
  campaign_type VARCHAR(30) NOT NULL, -- sponsored_placement, display, direct_booking
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, active, paused, completed, exhausted
  budget_cents INT NOT NULL DEFAULT 0,
  spent_cents INT DEFAULT 0,
  daily_budget_cents INT,
  bid_type VARCHAR(20) NOT NULL DEFAULT 'cpc', -- cpc, cpm
  bid_amount_cents INT NOT NULL DEFAULT 0,
  targeting JSONB DEFAULT '{}', -- {check_in_date, day_of_week, season, audience_type}
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ad_listing ON biz.biz_ad_campaign(listing_id);
CREATE INDEX idx_ad_status ON biz.biz_ad_campaign(status);

-- Sponsored Placement Impressions/Clicks
CREATE TABLE biz.biz_ad_event (
  ad_event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_campaign_id UUID NOT NULL REFERENCES biz.biz_ad_campaign(ad_campaign_id),
  event_type VARCHAR(20) NOT NULL, -- impression, click, conversion
  cost_cents INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ad_event_campaign ON biz.biz_ad_event(ad_campaign_id);

-- Special Offers
CREATE TABLE biz.biz_special_offer (
  offer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES biz.biz_listing(listing_id),
  title VARCHAR(300) NOT NULL,
  description TEXT,
  offer_type VARCHAR(30) NOT NULL, -- discount, package, free_upgrade, early_booking, last_minute
  discount_percent INT,
  discount_amount_cents INT,
  conditions TEXT,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  redemption_count INT DEFAULT 0,
  max_redemptions INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_offer_listing ON biz.biz_special_offer(listing_id);

-- Storyboard / Featured Media
CREATE TABLE biz.biz_storyboard (
  storyboard_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES biz.biz_listing(listing_id),
  title VARCHAR(200),
  media_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorite Photos (Business Advantage)
CREATE TABLE biz.biz_favorite_photo (
  favorite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES biz.biz_listing(listing_id),
  media_id UUID NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, media_id)
);

-- Triggers
CREATE TRIGGER set_biz_listing_updated_at BEFORE UPDATE ON biz.biz_listing FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();
CREATE TRIGGER set_biz_campaign_updated_at BEFORE UPDATE ON biz.biz_review_campaign FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();
CREATE TRIGGER set_biz_ad_updated_at BEFORE UPDATE ON biz.biz_ad_campaign FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();
CREATE TRIGGER set_biz_offer_updated_at BEFORE UPDATE ON biz.biz_special_offer FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

COMMIT;
