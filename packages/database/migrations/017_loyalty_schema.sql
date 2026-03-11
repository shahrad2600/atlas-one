BEGIN;
CREATE SCHEMA IF NOT EXISTS loyalty;

-- Trip Cash Wallet
CREATE TABLE loyalty.loyalty_wallet (
  wallet_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance_cents INT NOT NULL DEFAULT 0,
  lifetime_earned_cents INT NOT NULL DEFAULT 0,
  lifetime_redeemed_cents INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trip Cash Transactions
CREATE TABLE loyalty.loyalty_transaction (
  transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES loyalty.loyalty_wallet(wallet_id),
  type VARCHAR(20) NOT NULL, -- earn, redeem, expire, bonus, adjustment
  amount_cents INT NOT NULL, -- positive for earn, negative for redeem
  source VARCHAR(50) NOT NULL, -- booking, review, photo, trip_plan, referral, challenge, promo
  reference_id UUID, -- the booking/review/etc that triggered this
  description TEXT,
  expires_at TIMESTAMPTZ, -- for earned Trip Cash
  is_expired BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_loyalty_tx_wallet ON loyalty.loyalty_transaction(wallet_id);
CREATE INDEX idx_loyalty_tx_created ON loyalty.loyalty_transaction(created_at DESC);
CREATE INDEX idx_loyalty_tx_expires ON loyalty.loyalty_transaction(expires_at) WHERE is_expired = FALSE;

-- Contributor Levels (1-6)
CREATE TABLE loyalty.loyalty_contributor_level (
  level_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  level INT NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 6), -- 1=First-timer, 2=Reviewer, 3=Senior, 4=Expert, 5=Master, 6=Superstar
  review_count INT DEFAULT 0,
  photo_count INT DEFAULT 0,
  helpful_vote_count INT DEFAULT 0,
  forum_post_count INT DEFAULT 0,
  qa_answer_count INT DEFAULT 0,
  total_contribution_points INT DEFAULT 0,
  level_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Category Expertise (beyond level 6)
CREATE TABLE loyalty.loyalty_category_expertise (
  expertise_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category VARCHAR(50) NOT NULL, -- restaurants, luxury_hotels, budget_hotels, attractions, experiences, flights, nightlife, shopping, spas, outdoor
  review_count INT DEFAULT 0,
  expertise_level INT DEFAULT 0, -- 0=none, 1=beginner, 2=intermediate, 3=expert, 4=top_contributor
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);
CREATE INDEX idx_expertise_user ON loyalty.loyalty_category_expertise(user_id);

-- Badges
CREATE TABLE loyalty.loyalty_badge_definition (
  badge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  icon_url TEXT,
  category VARCHAR(50) NOT NULL, -- contribution, exploration, expertise, special, seasonal
  tier VARCHAR(20) DEFAULT 'standard', -- standard, silver, gold, platinum
  requirement_type VARCHAR(50) NOT NULL, -- review_count, photo_count, countries_visited, cities_visited, forum_posts, helpful_votes, consecutive_reviews, first_review, category_expert
  requirement_value INT NOT NULL DEFAULT 1,
  requirement_metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Badges (earned)
CREATE TABLE loyalty.loyalty_user_badge (
  user_badge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES loyalty.loyalty_badge_definition(badge_id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  is_featured BOOLEAN DEFAULT FALSE, -- user can feature up to 5 badges on profile
  progress_value INT DEFAULT 0, -- current progress toward next tier
  UNIQUE(user_id, badge_id)
);
CREATE INDEX idx_user_badge_user ON loyalty.loyalty_user_badge(user_id);

-- Badge Progress (tracking partial progress)
CREATE TABLE loyalty.loyalty_badge_progress (
  progress_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES loyalty.loyalty_badge_definition(badge_id),
  current_value INT DEFAULT 0,
  target_value INT NOT NULL,
  percentage NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);
CREATE INDEX idx_badge_progress_user ON loyalty.loyalty_badge_progress(user_id);

-- Achievements / Milestones
CREATE TABLE loyalty.loyalty_achievement (
  achievement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  icon_url TEXT,
  category VARCHAR(50) NOT NULL, -- milestone, streak, seasonal, special
  points INT DEFAULT 0, -- contribution points awarded
  trip_cash_cents INT DEFAULT 0, -- Trip Cash bonus awarded
  requirement JSONB NOT NULL, -- {type: 'review_count', value: 10} or complex conditions
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Achievements (unlocked)
CREATE TABLE loyalty.loyalty_user_achievement (
  user_achievement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES loyalty.loyalty_achievement(achievement_id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);
CREATE INDEX idx_user_achievement_user ON loyalty.loyalty_user_achievement(user_id);

-- Challenges (time-limited earning opportunities)
CREATE TABLE loyalty.loyalty_challenge (
  challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT,
  icon_url TEXT,
  challenge_type VARCHAR(50) NOT NULL, -- review, photo, explore, booking, community
  requirement JSONB NOT NULL, -- {type: 'reviews_in_period', value: 5, entity_type: 'restaurant'}
  reward_trip_cash_cents INT DEFAULT 0,
  reward_badge_id UUID REFERENCES loyalty.loyalty_badge_definition(badge_id),
  reward_points INT DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  max_participants INT,
  current_participants INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Challenge Participation
CREATE TABLE loyalty.loyalty_user_challenge (
  user_challenge_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES loyalty.loyalty_challenge(challenge_id),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, completed, expired
  progress_value INT DEFAULT 0,
  target_value INT NOT NULL,
  completed_at TIMESTAMPTZ,
  reward_claimed BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);
CREATE INDEX idx_user_challenge_user ON loyalty.loyalty_user_challenge(user_id);
CREATE INDEX idx_user_challenge_status ON loyalty.loyalty_user_challenge(status);

-- Referral Program
CREATE TABLE loyalty.loyalty_referral (
  referral_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_id UUID NOT NULL,
  referral_code VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, qualified, rewarded, expired
  referrer_reward_cents INT DEFAULT 0,
  referred_reward_cents INT DEFAULT 0,
  qualified_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(referred_id)
);
CREATE INDEX idx_referral_referrer ON loyalty.loyalty_referral(referrer_id);
CREATE INDEX idx_referral_code ON loyalty.loyalty_referral(referral_code);

-- Triggers
CREATE TRIGGER set_loyalty_wallet_updated_at BEFORE UPDATE ON loyalty.loyalty_wallet FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();
CREATE TRIGGER set_loyalty_badge_progress_updated_at BEFORE UPDATE ON loyalty.loyalty_badge_progress FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

-- Seed badge definitions
INSERT INTO loyalty.loyalty_badge_definition (slug, name, description, category, tier, requirement_type, requirement_value, sort_order) VALUES
('first-review', 'First Review', 'Write your first review', 'contribution', 'standard', 'review_count', 1, 1),
('reviewer-5', 'Frequent Reviewer', 'Write 5 reviews', 'contribution', 'silver', 'review_count', 5, 2),
('reviewer-25', 'Expert Reviewer', 'Write 25 reviews', 'contribution', 'gold', 'review_count', 25, 3),
('reviewer-100', 'Superstar Reviewer', 'Write 100 reviews', 'contribution', 'platinum', 'review_count', 100, 4),
('photographer-5', 'Shutterbug', 'Upload 5 photos', 'contribution', 'standard', 'photo_count', 5, 10),
('photographer-50', 'Photojournalist', 'Upload 50 photos', 'contribution', 'gold', 'photo_count', 50, 11),
('helpful-10', 'Helpful Traveler', 'Get 10 helpful votes', 'contribution', 'standard', 'helpful_votes', 10, 20),
('helpful-100', 'Travel Guru', 'Get 100 helpful votes', 'contribution', 'gold', 'helpful_votes', 100, 21),
('globe-trotter-5', 'Globe Trotter', 'Visit 5 countries', 'exploration', 'standard', 'countries_visited', 5, 30),
('globe-trotter-20', 'World Traveler', 'Visit 20 countries', 'exploration', 'gold', 'countries_visited', 20, 31),
('globe-trotter-50', 'World Explorer', 'Visit 50 countries', 'exploration', 'platinum', 'countries_visited', 50, 32),
('city-explorer-10', 'City Explorer', 'Visit 10 cities', 'exploration', 'standard', 'cities_visited', 10, 40),
('city-explorer-50', 'Urban Nomad', 'Visit 50 cities', 'exploration', 'gold', 'cities_visited', 50, 41),
('forum-contributor-10', 'Forum Regular', 'Post 10 forum posts', 'contribution', 'standard', 'forum_posts', 10, 50),
('forum-contributor-100', 'Community Pillar', 'Post 100 forum posts', 'contribution', 'gold', 'forum_posts', 100, 51),
('restaurant-expert', 'Restaurant Expert', 'Review 20 restaurants', 'expertise', 'gold', 'category_expert', 20, 60),
('hotel-expert', 'Hotel Expert', 'Review 20 hotels', 'expertise', 'gold', 'category_expert', 20, 61),
('luxury-seeker', 'Luxury Seeker', 'Review 10 luxury properties', 'expertise', 'gold', 'category_expert', 10, 62),
('nature-guide', 'Nature Guide', 'Review 10 outdoor experiences', 'expertise', 'gold', 'category_expert', 10, 63),
('streak-7', 'Weekly Streak', 'Review 7 days in a row', 'contribution', 'standard', 'consecutive_reviews', 7, 70);

-- Seed achievements
INSERT INTO loyalty.loyalty_achievement (slug, name, description, category, points, trip_cash_cents, requirement, sort_order) VALUES
('first-contribution', 'Welcome Aboard', 'Make your first contribution', 'milestone', 10, 0, '{"type": "total_contributions", "value": 1}', 1),
('contributor-10', 'Getting Started', '10 total contributions', 'milestone', 50, 100, '{"type": "total_contributions", "value": 10}', 2),
('contributor-50', 'Regular Contributor', '50 total contributions', 'milestone', 200, 500, '{"type": "total_contributions", "value": 50}', 3),
('contributor-100', 'Top Contributor', '100 total contributions', 'milestone', 500, 1000, '{"type": "total_contributions", "value": 100}', 4),
('first-trip', 'First Trip Planned', 'Plan your first trip', 'milestone', 25, 0, '{"type": "trips_planned", "value": 1}', 10),
('first-booking', 'First Booking', 'Make your first booking', 'milestone', 50, 250, '{"type": "bookings_made", "value": 1}', 11),
('explorer-3', 'Explorer', 'Visit 3 countries', 'milestone', 100, 200, '{"type": "countries_visited", "value": 3}', 20),
('explorer-10', 'Seasoned Traveler', 'Visit 10 countries', 'milestone', 300, 500, '{"type": "countries_visited", "value": 10}', 21);

COMMIT;
