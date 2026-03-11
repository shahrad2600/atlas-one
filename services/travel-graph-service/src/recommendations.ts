// ─── Recommendation Engine ──────────────────────────────────────────
// Provides AI-driven recommendation logic for the travel graph. In
// production, these methods would query the DB for user interaction
// history, preference vectors, and embedding similarity. The current
// implementation returns curated mock data so the API contract can be
// validated end-to-end without requiring seeded data or ML pipelines.
// ─────────────────────────────────────────────────────────────────────

// ── Types ───────────────────────────────────────────────────────────

export interface RecommendationItem {
  entity_id: string;
  entity_type: string;
  name: string;
  description: string;
  score: number;
  reason: string;
  image_url: string | null;
  location: { lat: number; lng: number } | null;
  metadata: Record<string, unknown>;
}

export interface TrendingItem extends RecommendationItem {
  popularity_score: number;
  trend_direction: 'up' | 'down' | 'stable';
  recent_bookings: number;
}

// ── Deterministic UUID generator ────────────────────────────────────

function mockUuid(seed: number): string {
  const hex = (n: number, len: number) =>
    ((n * 2654435761) >>> 0).toString(16).padStart(len, '0').slice(0, len);
  return `${hex(seed, 8)}-${hex(seed + 1, 4)}-4${hex(seed + 2, 3)}-a${hex(seed + 3, 3)}-${hex(seed + 4, 12)}`;
}

// ── Mock Data ───────────────────────────────────────────────────────

const PERSONALIZED_ITEMS: RecommendationItem[] = [
  {
    entity_id: mockUuid(1001),
    entity_type: 'venue',
    name: 'The Grand Palazzo Hotel',
    description: 'Luxury waterfront hotel with world-class spa and Michelin-starred dining.',
    score: 0.95,
    reason: 'Because you liked luxury hotels in coastal destinations',
    image_url: null,
    location: { lat: 45.4408, lng: 12.3155 },
    metadata: { venue_type: 'hotel', price_tier: 4, rating_avg: 4.8, country_code: 'IT' },
  },
  {
    entity_id: mockUuid(1002),
    entity_type: 'venue',
    name: 'Sakura Omakase',
    description: 'Intimate 12-seat omakase counter serving seasonal Edomae-style sushi.',
    score: 0.91,
    reason: 'Because you liked fine dining experiences in Tokyo',
    image_url: null,
    location: { lat: 35.6762, lng: 139.6503 },
    metadata: { venue_type: 'restaurant', price_tier: 4, rating_avg: 4.9, country_code: 'JP' },
  },
  {
    entity_id: mockUuid(1003),
    entity_type: 'product',
    name: 'Amalfi Coast Sunset Sailing Tour',
    description: 'Private catamaran cruise along the Amalfi coastline with aperitivo and swimming stops.',
    score: 0.88,
    reason: 'Because you saved similar coastal experiences in Italy',
    image_url: null,
    location: { lat: 40.6333, lng: 14.6029 },
    metadata: { product_type: 'tour', base_price: 189, currency: 'EUR', country_code: 'IT' },
  },
  {
    entity_id: mockUuid(1004),
    entity_type: 'venue',
    name: 'Riad Jardin Secret',
    description: 'Boutique riad in the heart of the medina with rooftop terrace and traditional hammam.',
    score: 0.85,
    reason: 'Because you viewed boutique stays in historic cities',
    image_url: null,
    location: { lat: 31.6295, lng: -7.9811 },
    metadata: { venue_type: 'hotel', price_tier: 3, rating_avg: 4.7, country_code: 'MA' },
  },
  {
    entity_id: mockUuid(1005),
    entity_type: 'product',
    name: 'Kyoto Temple Gardens Walking Tour',
    description: 'Guided morning walk through hidden temple gardens with a local historian.',
    score: 0.82,
    reason: 'Because you booked cultural walking tours before',
    image_url: null,
    location: { lat: 35.0116, lng: 135.7681 },
    metadata: { product_type: 'tour', base_price: 75, currency: 'USD', country_code: 'JP' },
  },
  {
    entity_id: mockUuid(1006),
    entity_type: 'venue',
    name: 'Nobu Malibu',
    description: 'Iconic oceanfront restaurant blending Japanese cuisine with California ingredients.',
    score: 0.79,
    reason: 'Because you liked Japanese fusion restaurants',
    image_url: null,
    location: { lat: 34.0376, lng: -118.6781 },
    metadata: { venue_type: 'restaurant', price_tier: 4, rating_avg: 4.6, country_code: 'US' },
  },
  {
    entity_id: mockUuid(1007),
    entity_type: 'product',
    name: 'Northern Lights Photography Workshop',
    description: 'Three-night aurora viewing expedition with professional photography instruction.',
    score: 0.76,
    reason: 'Because you saved nature photography experiences',
    image_url: null,
    location: { lat: 69.6496, lng: 18.9560 },
    metadata: { product_type: 'tour', base_price: 1250, currency: 'EUR', country_code: 'NO' },
  },
  {
    entity_id: mockUuid(1008),
    entity_type: 'venue',
    name: 'Aman Tokyo',
    description: 'Minimalist luxury hotel with panoramic city views and traditional onsen-inspired spa.',
    score: 0.73,
    reason: 'Because you liked luxury hotels in Tokyo',
    image_url: null,
    location: { lat: 35.6866, lng: 139.7641 },
    metadata: { venue_type: 'hotel', price_tier: 4, rating_avg: 4.9, country_code: 'JP' },
  },
];

const TRENDING_ITEMS: TrendingItem[] = [
  {
    entity_id: mockUuid(2001),
    entity_type: 'place',
    name: 'Tulum, Mexico',
    description: 'Bohemian beach town with ancient Mayan ruins and cenote swimming.',
    score: 0.98,
    reason: 'Trending destination with 340% booking increase this month',
    image_url: null,
    location: { lat: 20.2114, lng: -87.4654 },
    metadata: { place_type: 'city', country_code: 'MX' },
    popularity_score: 0.98,
    trend_direction: 'up',
    recent_bookings: 12450,
  },
  {
    entity_id: mockUuid(2002),
    entity_type: 'place',
    name: 'Kyoto, Japan',
    description: 'Ancient capital with thousands of temples, traditional tea houses, and geisha districts.',
    score: 0.96,
    reason: 'Cherry blossom season driving surge in interest',
    image_url: null,
    location: { lat: 35.0116, lng: 135.7681 },
    metadata: { place_type: 'city', country_code: 'JP' },
    popularity_score: 0.96,
    trend_direction: 'up',
    recent_bookings: 18200,
  },
  {
    entity_id: mockUuid(2003),
    entity_type: 'product',
    name: 'Greek Island Hopping Package',
    description: 'Seven-day ferry pass covering Santorini, Mykonos, Naxos, and Paros.',
    score: 0.93,
    reason: 'Most saved experience this week',
    image_url: null,
    location: { lat: 36.3932, lng: 25.4615 },
    metadata: { product_type: 'tour', base_price: 899, currency: 'EUR', country_code: 'GR' },
    popularity_score: 0.93,
    trend_direction: 'up',
    recent_bookings: 5670,
  },
  {
    entity_id: mockUuid(2004),
    entity_type: 'venue',
    name: 'Soneva Fushi',
    description: 'Barefoot luxury resort in the Maldives with private villas and underwater restaurant.',
    score: 0.91,
    reason: 'Featured in top travel publications',
    image_url: null,
    location: { lat: 5.1096, lng: 73.0700 },
    metadata: { venue_type: 'hotel', price_tier: 4, rating_avg: 4.9, country_code: 'MV' },
    popularity_score: 0.91,
    trend_direction: 'stable',
    recent_bookings: 890,
  },
  {
    entity_id: mockUuid(2005),
    entity_type: 'place',
    name: 'Lisbon, Portugal',
    description: 'Vibrant hilltop capital with pastel buildings, world-famous pasteis, and tram rides.',
    score: 0.89,
    reason: 'Fastest-growing European destination for digital nomads',
    image_url: null,
    location: { lat: 38.7223, lng: -9.1393 },
    metadata: { place_type: 'city', country_code: 'PT' },
    popularity_score: 0.89,
    trend_direction: 'up',
    recent_bookings: 9340,
  },
  {
    entity_id: mockUuid(2006),
    entity_type: 'product',
    name: 'Cappadocia Hot Air Balloon Ride',
    description: 'Sunrise balloon flight over fairy chimneys and ancient cave dwellings.',
    score: 0.87,
    reason: 'Top-rated experience with 2000+ five-star reviews',
    image_url: null,
    location: { lat: 38.6431, lng: 34.8287 },
    metadata: { product_type: 'tour', base_price: 220, currency: 'EUR', country_code: 'TR' },
    popularity_score: 0.87,
    trend_direction: 'up',
    recent_bookings: 4210,
  },
  {
    entity_id: mockUuid(2007),
    entity_type: 'venue',
    name: 'Noma Copenhagen',
    description: 'Pioneering New Nordic restaurant redefining seasonal foraging-based cuisine.',
    score: 0.85,
    reason: 'Recently reopened with new tasting menu format',
    image_url: null,
    location: { lat: 55.6837, lng: 12.6104 },
    metadata: { venue_type: 'restaurant', price_tier: 4, rating_avg: 4.8, country_code: 'DK' },
    popularity_score: 0.85,
    trend_direction: 'stable',
    recent_bookings: 1560,
  },
  {
    entity_id: mockUuid(2008),
    entity_type: 'place',
    name: 'Queenstown, New Zealand',
    description: 'Adventure capital surrounded by mountains, lakes, and world-class hiking trails.',
    score: 0.83,
    reason: 'Peak adventure season with new bungee and skydive packages',
    image_url: null,
    location: { lat: -45.0312, lng: 168.6626 },
    metadata: { place_type: 'city', country_code: 'NZ' },
    popularity_score: 0.83,
    trend_direction: 'up',
    recent_bookings: 6780,
  },
  {
    entity_id: mockUuid(2009),
    entity_type: 'product',
    name: 'Morocco Desert Glamping Experience',
    description: 'Two-night luxury camp under the stars in the Sahara with camel trek and local feasts.',
    score: 0.81,
    reason: 'Trending on social media with 500K+ shares',
    image_url: null,
    location: { lat: 31.0492, lng: -4.0131 },
    metadata: { product_type: 'tour', base_price: 450, currency: 'EUR', country_code: 'MA' },
    popularity_score: 0.81,
    trend_direction: 'up',
    recent_bookings: 3450,
  },
  {
    entity_id: mockUuid(2010),
    entity_type: 'venue',
    name: 'Four Seasons Bora Bora',
    description: 'Overwater bungalows with glass-floor viewing of tropical marine life.',
    score: 0.79,
    reason: 'Consistent five-star honeymoon destination',
    image_url: null,
    location: { lat: -16.5004, lng: -151.7415 },
    metadata: { venue_type: 'hotel', price_tier: 4, rating_avg: 4.9, country_code: 'PF' },
    popularity_score: 0.79,
    trend_direction: 'stable',
    recent_bookings: 720,
  },
];

// ── Similar Items Factory ───────────────────────────────────────────

function generateSimilarItems(entityId: string, entityType: string): RecommendationItem[] {
  const templates: Record<string, Array<Omit<RecommendationItem, 'entity_id' | 'entity_type' | 'score'>>> = {
    venue: [
      { name: 'Mandarin Oriental Bangkok', description: 'Legendary riverside hotel with award-winning spa.', reason: 'Same category: luxury hotel', image_url: null, location: { lat: 13.7234, lng: 100.5172 }, metadata: { venue_type: 'hotel', price_tier: 4 } },
      { name: 'Park Hyatt Sydney', description: 'Harbourside hotel with Opera House views.', reason: 'Similar luxury tier and waterfront location', image_url: null, location: { lat: -33.8576, lng: 151.2100 }, metadata: { venue_type: 'hotel', price_tier: 4 } },
      { name: 'The Peninsula Hong Kong', description: 'Grand dame hotel on the Kowloon waterfront.', reason: 'Guests who stayed there also booked this', image_url: null, location: { lat: 22.2952, lng: 114.1718 }, metadata: { venue_type: 'hotel', price_tier: 4 } },
      { name: 'Le Cinq at Four Seasons Paris', description: 'Three-Michelin-star French haute cuisine.', reason: 'Popular with travellers who booked this venue', image_url: null, location: { lat: 48.8688, lng: 2.3009 }, metadata: { venue_type: 'restaurant', price_tier: 4 } },
      { name: 'Belmond Hotel Caruso', description: 'Cliffside former palace on the Amalfi Coast.', reason: 'Similar style and destination', image_url: null, location: { lat: 40.6503, lng: 14.6113 }, metadata: { venue_type: 'hotel', price_tier: 4 } },
      { name: 'Singita Sabi Sand', description: 'Ultra-luxury safari lodge in the South African bush.', reason: 'Same luxury tier: unique experiences', image_url: null, location: { lat: -24.7904, lng: 31.4878 }, metadata: { venue_type: 'hotel', price_tier: 4 } },
    ],
    product: [
      { name: 'Private Gondola Serenade', description: 'Evening gondola ride with live musician through Venice canals.', reason: 'Similar romantic experience category', image_url: null, location: { lat: 45.4408, lng: 12.3155 }, metadata: { product_type: 'tour', base_price: 150 } },
      { name: 'Champagne Balloon Flight Burgundy', description: 'Sunrise hot air balloon over vineyards with champagne toast.', reason: 'Similar outdoor luxury experience', image_url: null, location: { lat: 47.0534, lng: 4.3834 }, metadata: { product_type: 'tour', base_price: 290 } },
      { name: 'Private Cooking Class in Tuscany', description: 'Farm-to-table cooking with a local chef in a countryside villa.', reason: 'Travellers who booked this also enjoyed', image_url: null, location: { lat: 43.3188, lng: 11.3308 }, metadata: { product_type: 'tour', base_price: 120 } },
      { name: 'Helicopter Tour Over Na Pali Coast', description: 'Doors-off helicopter flight above dramatic sea cliffs.', reason: 'Top-rated aerial experience', image_url: null, location: { lat: 22.1647, lng: -159.6499 }, metadata: { product_type: 'tour', base_price: 340 } },
      { name: 'Northern Lights Snowmobile Safari', description: 'Night snowmobile expedition to chase the aurora in Finnish Lapland.', reason: 'Similar adventure experience', image_url: null, location: { lat: 69.0600, lng: 25.7813 }, metadata: { product_type: 'tour', base_price: 210 } },
      { name: 'Scuba Diving Great Barrier Reef', description: 'Guided dive on the outer reef with marine biologist.', reason: 'Same adventure tier', image_url: null, location: { lat: -18.2871, lng: 147.6992 }, metadata: { product_type: 'tour', base_price: 275 } },
    ],
    place: [
      { name: 'Barcelona, Spain', description: 'Mediterranean gem blending Gaudi architecture and beach culture.', reason: 'Similar coastal European destination', image_url: null, location: { lat: 41.3874, lng: 2.1686 }, metadata: { place_type: 'city', country_code: 'ES' } },
      { name: 'Dubrovnik, Croatia', description: 'Walled old town perched above the sparkling Adriatic.', reason: 'Travellers who visited also went here', image_url: null, location: { lat: 42.6507, lng: 18.0944 }, metadata: { place_type: 'city', country_code: 'HR' } },
      { name: 'Amalfi, Italy', description: 'Pastel cliffside village with lemon groves and sea views.', reason: 'Same coastal charm and cuisine culture', image_url: null, location: { lat: 40.6340, lng: 14.6027 }, metadata: { place_type: 'city', country_code: 'IT' } },
      { name: 'Santorini, Greece', description: 'Iconic white-washed island with dramatic caldera sunsets.', reason: 'Similar island destination', image_url: null, location: { lat: 36.3932, lng: 25.4615 }, metadata: { place_type: 'city', country_code: 'GR' } },
      { name: 'Nice, France', description: 'French Riviera hub with promenades, markets, and art museums.', reason: 'Similar Mediterranean experience', image_url: null, location: { lat: 43.7102, lng: 7.2620 }, metadata: { place_type: 'city', country_code: 'FR' } },
      { name: 'Porto, Portugal', description: 'Riverside city famed for port wine, azulejo tiles, and bridges.', reason: 'Trending alternative for European city breaks', image_url: null, location: { lat: 41.1579, lng: -8.6291 }, metadata: { place_type: 'city', country_code: 'PT' } },
    ],
  };

  const items = templates[entityType] ?? templates['venue']!;

  return items.map((item, idx) => ({
    ...item,
    entity_id: mockUuid(3000 + hashSeed(entityId) + idx),
    entity_type: item.metadata['venue_type'] ? 'venue' : item.metadata['product_type'] ? 'product' : 'place',
    score: Number((0.92 - idx * 0.04).toFixed(2)),
  }));
}

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 10000;
}

// ── RecommendationEngine Class ──────────────────────────────────────

export class RecommendationEngine {
  /**
   * Returns personalized recommendations for a user based on their
   * interaction history and preference vector. In production, this
   * queries the DB for the user's preference vector and performs
   * cosine similarity against entity embeddings. The mock version
   * returns 8 curated travel entities with scores and reasoning.
   */
  async getPersonalized(
    _userId: string,
    limit = 8,
  ): Promise<RecommendationItem[]> {
    return PERSONALIZED_ITEMS.slice(0, Math.min(limit, PERSONALIZED_ITEMS.length));
  }

  /**
   * Returns entities similar to the given entity. In production,
   * this uses embedding cosine similarity and/or a precomputed
   * similarity cache. The mock version returns 6 items based on
   * the entity type.
   */
  async getSimilar(
    entityId: string,
    entityType: string,
    limit = 6,
  ): Promise<RecommendationItem[]> {
    const items = generateSimilarItems(entityId, entityType);
    return items.slice(0, Math.min(limit, items.length));
  }

  /**
   * Returns trending destinations, venues, and experiences sorted
   * by popularity. Each item includes a trend direction indicator
   * (up, down, stable) and recent booking count.
   */
  async getTrending(
    limit = 10,
  ): Promise<TrendingItem[]> {
    return TRENDING_ITEMS.slice(0, Math.min(limit, TRENDING_ITEMS.length));
  }
}

/**
 * Singleton instance shared across the service.
 */
export const recommendationEngine = new RecommendationEngine();
