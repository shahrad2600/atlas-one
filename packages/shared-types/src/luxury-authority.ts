// ─── Luxury Authority Types ─────────────────────────────────────────

// Enums
export enum PropertyUniverse {
  HotelsResorts = 'hotels_resorts',
  VillasResidences = 'villas_residences',
  SpecialtyStays = 'specialty_stays',
}

export enum LuxuryTaxonomy {
  DiscreetClassical = 'discreet_classical',
  DesignLed = 'design_led',
  Barefoot = 'barefoot',
  FamilyPolished = 'family_polished',
  SocialGlamour = 'social_glamour',
  WellnessFirst = 'wellness_first',
  HeritageGrand = 'heritage_grand',
  ExpeditionAdventure = 'expedition_adventure',
  SafariLodge = 'safari_lodge',
  SkiService = 'ski_service',
}

export enum QualificationStatus {
  TrulyLuxury = 'truly_luxury',
  Borderline = 'borderline',
  PremiumNotLuxury = 'premium_not_luxury',
  Pending = 'pending',
  Disqualified = 'disqualified',
}

export enum LuxuryTruthLabel {
  TrulyLuxurious = 'truly_luxurious',
  DesignLuxuryNotService = 'design_luxury_not_service',
  EliteForFamilies = 'elite_for_families',
  BeautifulButInconsistent = 'beautiful_but_inconsistent',
  BestBookedAsSuites = 'best_booked_as_suites',
  BetterInShoulderSeason = 'better_in_shoulder_season',
  LegendaryServiceDatedRooms = 'legendary_service_dated_rooms',
  NotWorthPremium = 'not_worth_premium',
  ServiceLedLuxury = 'service_led_luxury',
  WarmButInconsistent = 'warm_but_inconsistent',
  PolishedButCold = 'polished_but_cold',
}

export enum VerificationType {
  VerifiedStay = 'verified_stay',
  PartnerVerified = 'partner_verified',
  InspectorReview = 'inspector_review',
  AdvisorReview = 'advisor_review',
  EliteRepeatGuest = 'elite_repeat_guest',
  EditorReview = 'editor_review',
  LocalExpert = 'local_expert',
}

export enum TripPurpose {
  Romance = 'romance',
  Honeymoon = 'honeymoon',
  Family = 'family',
  Celebration = 'celebration',
  Wellness = 'wellness',
  Business = 'business',
  GirlsTrip = 'girls_trip',
  MultiGenerational = 'multi_generational',
  Solo = 'solo',
  Adventure = 'adventure',
}

export enum PartyComposition {
  Couple = 'couple',
  FamilyYoungKids = 'family_young_kids',
  FamilyTeens = 'family_teens',
  Friends = 'friends',
  Solo = 'solo',
  MultiGenerational = 'multi_generational',
  BusinessGroup = 'business_group',
}

export enum RankingScope {
  City = 'city',
  Region = 'region',
  Country = 'country',
  Continent = 'continent',
  Worldwide = 'worldwide',
}

export enum RankingCategory {
  AllLuxury = 'all_luxury',
  CityHotels = 'city_hotels',
  BeachResorts = 'beach_resorts',
  WellnessRetreats = 'wellness_retreats',
  FamilyLuxury = 'family_luxury',
  Villas = 'villas',
  SpecialtyStays = 'specialty_stays',
  SafariLodges = 'safari_lodges',
  SkiResorts = 'ski_resorts',
  DesignHotels = 'design_hotels',
  NewOpenings = 'new_openings',
}

export enum RankingTimeHorizon {
  Live = 'live',
  TwelveMonth = '12_month',
  ThreeYear = '3_year',
}

export enum ReviewStatus {
  Pending = 'pending',
  Published = 'published',
  Hidden = 'hidden',
  Removed = 'removed',
  Flagged = 'flagged',
}

export enum Season {
  Peak = 'peak',
  Shoulder = 'shoulder',
  OffPeak = 'off_peak',
  Festive = 'festive',
}

export enum ChannelName {
  AirbnbLuxe = 'airbnb_luxe',
  PlumGuide = 'plum_guide',
  Onefinestay = 'onefinestay',
  MarriottHomesVillas = 'marriott_homes_villas',
  Inspirato = 'inspirato',
  Vrbo = 'vrbo',
  Direct = 'direct',
  BookingCom = 'booking_com',
  Expedia = 'expedia',
  LeadingHotels = 'leading_hotels',
  TabletHotels = 'tablet_hotels',
  MrMrsSmith = 'mr_mrs_smith',
  Platform = 'platform',
}

export enum PerkType {
  Upgrade = 'upgrade',
  Breakfast = 'breakfast',
  Credit = 'credit',
  LateCheckout = 'late_checkout',
  EarlyCheckin = 'early_checkin',
  SpaCredit = 'spa_credit',
  WelcomeAmenity = 'welcome_amenity',
  AirportTransfer = 'airport_transfer',
  RoomCategoryUpgrade = 'room_category_upgrade',
  VipStatus = 'vip_status',
  Custom = 'custom',
}

export enum PrivacyPreference {
  VeryPrivate = 'very_private',
  Private = 'private',
  Social = 'social',
  VerySocial = 'very_social',
}

export enum PacePreference {
  SlowRestorative = 'slow_restorative',
  Balanced = 'balanced',
  ActivePacked = 'active_packed',
}

export enum BudgetTier {
  Ultra = 'ultra',
  Premium = 'premium',
  Aspirational = 'aspirational',
}

export enum InspectionType {
  AnonymousStay = 'anonymous_stay',
  SiteVisit = 'site_visit',
  Virtual = 'virtual',
  AdvisorStay = 'advisor_stay',
}

// Interfaces

export interface QualificationSource {
  source: string; // 'forbes', 'michelin_keys', 'lhw', 'tablet', 'mr_mrs_smith', 'aaa_diamond'
  rating?: string;
  keys?: number;
  verified_at?: string;
}

export interface PropertyQualification {
  qualification_id: string;
  property_id: string;
  qualification_status: QualificationStatus;
  external_prestige_score: number;
  hard_product_score: number;
  service_potential_score: number;
  review_trust_score: number;
  consistency_score: number;
  luxury_taxonomy_fit_score: number;
  overall_qualification_score: number;
  qualification_sources: QualificationSource[];
  inspector_notes?: string;
  qualified_at?: string;
  disqualified_reason?: string;
  review_due_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CanonicalProperty {
  canonical_id: string;
  property_id?: string;
  canonical_name: string;
  property_universe: PropertyUniverse;
  luxury_taxonomy: LuxuryTaxonomy[];
  luxury_truth_label?: LuxuryTruthLabel;
  brand?: string;
  chain?: string;
  city?: string;
  region?: string;
  country: string;
  continent?: string;
  latitude?: number;
  longitude?: number;
  year_opened?: number;
  last_renovated?: number;
  total_rooms?: number;
  total_suites?: number;
  property_description?: string;
  editorial_summary?: string;
  ai_luxury_profile?: Record<string, boolean>;
  ai_best_for?: string[];
  ai_not_ideal_for?: string[];
  created_at: string;
  updated_at: string;
}

export interface ChannelListing {
  listing_id: string;
  canonical_id: string;
  channel_name: ChannelName;
  channel_listing_url?: string;
  channel_property_id?: string;
  channel_rating?: number;
  channel_review_count: number;
  channel_price_range?: { min: number; max: number; currency: string };
  perks: { type: PerkType; description: string }[];
  verified: boolean;
  last_synced_at?: string;
}

export interface LuxuryReviewScores {
  service_intelligence: number;
  privacy_calm: number;
  design_sense_of_place: number;
  room_suite_quality: number;
  dining_seriousness: number;
  wellness: number;
  consistency: number;
  value_at_luxury_level: number;
  sleep_quality: number;
  arrival_departure: number;
}

export interface LuxuryReview {
  review_id: string;
  canonical_id: string;
  user_id: string;
  verification_type: VerificationType;
  booking_source?: string;
  stay_dates_start?: string;
  stay_dates_end?: string;
  room_category?: string;
  room_unit_id?: string;
  trip_purpose?: TripPurpose;
  party_composition?: PartyComposition;
  season?: Season;
  full_paying_guest: boolean;
  repeat_guest: boolean;
  scores: LuxuryReviewScores;
  would_return_at_same_rate?: boolean;
  best_traveler_fit: string[];
  title?: string;
  what_felt_truly_luxurious?: string;
  what_looked_luxurious_but_didnt_execute?: string;
  which_room_would_book_again?: string;
  who_should_avoid?: string;
  recovery_experience?: string;
  free_text?: string;
  photo_urls: string[];
  trust_score: number;
  fraud_score: number;
  status: ReviewStatus;
  helpful_count: number;
  created_at: string;
  updated_at: string;
}

export interface PropertyScoreSnapshot {
  snapshot_id: string;
  canonical_id: string;
  computed_at: string;
  // Component scores (0-100)
  service_execution_score?: number;
  consistency_score?: number;
  room_quality_score?: number;
  design_score?: number;
  privacy_score?: number;
  dining_score?: number;
  location_context_score?: number;
  wellness_score?: number;
  recovery_score?: number;
  value_within_set_score?: number;
  // Villa-specific
  management_serviceability_score?: number;
  staffing_potential_score?: number;
  amenity_seriousness_score?: number;
  exclusivity_score?: number;
  // Multipliers
  confidence_multiplier: number;
  recency_multiplier: number;
  integrity_multiplier: number;
  // Final
  luxury_rank_score: number;
  luxury_standard_score: number;
  luxury_fit_score?: number;
  review_count: number;
  verified_review_count: number;
  inspector_confirmed: boolean;
  scoring_version: string;
  is_current: boolean;
}

export interface Ranking {
  ranking_id: string;
  canonical_id: string;
  ranking_scope: RankingScope;
  ranking_geography: string;
  ranking_category: RankingCategory;
  ranking_time_horizon: RankingTimeHorizon;
  rank_position: number;
  luxury_rank_score: number;
  previous_rank_position?: number;
  rank_movement: number;
  ranking_explanation: RankingExplanation;
  badges: string[];
  computed_at: string;
  is_current: boolean;
}

export interface RankingExplanation {
  beats_peers_on: string[];
  trails_peers_on: string[];
  best_for: string[];
  not_ideal_for: string[];
  key_strengths: string[];
  key_weaknesses: string[];
}

export interface PersonalizedRanking {
  user_id: string;
  canonical_id: string;
  ranking_scope: RankingScope;
  ranking_geography: string;
  ranking_category: RankingCategory;
  official_rank: number;
  personal_rank: number;
  personal_fit_score: number;
  fit_reasons: Record<string, number>;
}

export interface TravelerProfile {
  profile_id: string;
  user_id: string;
  privacy_preference?: PrivacyPreference;
  pace_preference?: PacePreference;
  design_taste: string[];
  dining_importance?: string;
  wellness_importance?: string;
  service_style_preference?: string;
  family_stage?: string;
  preferred_brands: string[];
  disliked_brands: string[];
  favorite_destinations: string[];
  bucket_list_destinations: string[];
  room_preferences: Record<string, unknown>;
  dietary_preferences: string[];
  sleep_preferences: Record<string, unknown>;
  budget_tier?: BudgetTier;
  anniversary_date?: string;
  birthdays: { name: string; date: string }[];
}

export interface InspectorReport {
  report_id: string;
  canonical_id: string;
  inspector_id: string;
  inspection_type: InspectionType;
  stay_dates_start?: string;
  stay_dates_end?: string;
  nights_stayed?: number;
  rooms_inspected: string[];
  scores: Record<string, number>;
  executive_summary: string;
  strengths?: string;
  weaknesses?: string;
  recommended_rooms?: string;
  rooms_to_avoid?: string;
  best_for_traveler_types: string[];
  comparison_to_peers?: string;
  luxury_verdict: 'truly_luxury' | 'borderline' | 'not_luxury';
  recommendation: 'highly_recommend' | 'recommend' | 'recommend_with_caveats' | 'do_not_recommend';
  published: boolean;
}

export interface SupplierPerk {
  perk_id: string;
  canonical_id: string;
  perk_type: PerkType;
  description: string;
  value_amount?: number;
  value_currency: string;
  conditions?: string;
  active: boolean;
  valid_from?: string;
  valid_until?: string;
}

// Scoring formula weights
export const HOTEL_SCORING_WEIGHTS = {
  service_execution: 0.25,
  consistency: 0.15,
  room_quality: 0.15,
  design_sense_of_place: 0.10,
  privacy_calm: 0.10,
  dining: 0.10,
  location_context: 0.05,
  wellness: 0.05,
  recovery: 0.03,
  value_within_set: 0.02,
} as const;

export const VILLA_SCORING_WEIGHTS = {
  management_serviceability: 0.25,
  privacy_exclusivity: 0.15,
  unit_quality_design: 0.15,
  location: 0.10,
  staffing_concierge_potential: 0.10,
  amenity_seriousness: 0.10,
  consistency: 0.10,
  recovery_support: 0.05,
} as const;

export const SPECIALTY_SCORING_WEIGHTS = {
  authenticity_category_execution: 0.20,
  service: 0.20,
  accommodation_quality: 0.15,
  sense_of_place: 0.15,
  consistency: 0.10,
  privacy_calm: 0.10,
  recovery: 0.05,
  value_in_set: 0.05,
} as const;

// API request/response types
export interface GetRankingsRequest {
  scope: RankingScope;
  geography: string;
  category?: RankingCategory;
  time_horizon?: RankingTimeHorizon;
  limit?: number;
  offset?: number;
}

export interface GetRankingsResponse {
  rankings: (Ranking & { property: CanonicalProperty })[];
  total: number;
  geography: string;
  scope: RankingScope;
  category: RankingCategory;
  last_computed: string;
}

export interface SubmitLuxuryReviewRequest {
  canonical_id: string;
  verification_type: VerificationType;
  booking_source?: string;
  stay_dates_start?: string;
  stay_dates_end?: string;
  room_category?: string;
  trip_purpose?: TripPurpose;
  party_composition?: PartyComposition;
  season?: Season;
  full_paying_guest: boolean;
  repeat_guest: boolean;
  scores: LuxuryReviewScores;
  would_return_at_same_rate?: boolean;
  best_traveler_fit: string[];
  title?: string;
  what_felt_truly_luxurious?: string;
  what_looked_luxurious_but_didnt_execute?: string;
  which_room_would_book_again?: string;
  who_should_avoid?: string;
  recovery_experience?: string;
  free_text?: string;
  photo_urls?: string[];
}

export interface PropertyPageData {
  property: CanonicalProperty;
  qualification: PropertyQualification;
  scores: PropertyScoreSnapshot;
  rankings: Ranking[];
  channels: ChannelListing[];
  reviews: LuxuryReview[];
  inspector_reports: InspectorReport[];
  perks: SupplierPerk[];
  personal_ranking?: PersonalizedRanking;
}
