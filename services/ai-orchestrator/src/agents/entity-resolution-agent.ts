/**
 * Atlas One -- Entity Resolution Agent
 *
 * Deduplicates property identities across distribution channels. The same
 * luxury villa may appear on Airbnb Luxe, Plum Guide, onefinestay, Marriott
 * Homes & Villas, and direct booking sites under slightly different names,
 * photos, and descriptions.
 *
 * This agent resolves those duplicates into a single canonical entity in the
 * Travel Graph, enabling accurate ranking, review aggregation, and pricing
 * comparison.
 *
 * Matching strategy:
 *   1. Name fuzzy matching (Levenshtein + token overlap)
 *   2. Geo proximity (Haversine distance < 200m)
 *   3. Room count matching (within +/- 1)
 *   4. Amenity overlap scoring
 *   5. Photo perceptual hash comparison (future)
 *
 * Design invariant: All mutations flow through the Tool Registry.
 */

import type {
  SubAgent,
  Intent,
  TripContext,
  AgentResponse,
  ProposedAction,
} from './orchestrator';

// ---------------------------------------------------------------------------
// Entity Resolution Types
// ---------------------------------------------------------------------------

/** A property listing from a distribution channel. */
export interface ChannelListing {
  channelId: string;
  channelName: string; // e.g., "airbnb_luxe", "plum_guide", "onefinestay"
  externalId: string;
  name: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
    country: string;
  };
  roomCount: number;
  bedroomCount: number;
  bathroomCount: number;
  maxGuests: number;
  amenities: string[];
  propertyType: string;
  pricePerNight: { amount: number; currency: string };
  rating: number;
  reviewCount: number;
  photos: string[];
  hostName?: string;
  lastScrapedAt: string;
}

/** A canonical property entity in the Travel Graph. */
export interface CanonicalProperty {
  canonicalId: string;
  primaryName: string;
  alternateNames: string[];
  location: {
    lat: number;
    lng: number;
    address: string;
    city: string;
    country: string;
  };
  roomCount: number;
  bedroomCount: number;
  bathroomCount: number;
  maxGuests: number;
  amenities: string[];
  propertyType: string;
  /** Channel listings that have been matched to this canonical entity. */
  linkedChannels: LinkedChannel[];
  createdAt: string;
  updatedAt: string;
}

/** A link between a canonical property and a channel listing. */
export interface LinkedChannel {
  channelName: string;
  externalId: string;
  listingName: string;
  pricePerNight: { amount: number; currency: string };
  rating: number;
  reviewCount: number;
  matchConfidence: number;
  matchMethod: string;
  linkedAt: string;
}

/** Result of a match attempt between two listings. */
export interface MatchResult {
  listing1Id: string;
  listing2Id: string;
  isMatch: boolean;
  confidence: number;
  matchFactors: MatchFactor[];
  suggestedCanonicalId?: string;
}

/** An individual factor contributing to a match decision. */
export interface MatchFactor {
  factor: string;
  score: number;
  weight: number;
  detail: string;
}

/** Result of a batch resolution run. */
export interface ResolutionBatchResult {
  batchId: string;
  listingsProcessed: number;
  newCanonicals: number;
  mergedIntoExisting: number;
  ambiguousMatches: number;
  noMatchFound: number;
  processingTimeMs: number;
}

// ---------------------------------------------------------------------------
// String Similarity
// ---------------------------------------------------------------------------

/** Compute Levenshtein distance between two strings. */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/** Compute normalized string similarity (0-1). */
function stringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

/** Compute token overlap between two strings (Jaccard index). */
function tokenOverlap(a: string, b: string): number {
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 1);

  const tokensA = new Set(normalize(a));
  const tokensB = new Set(normalize(b));

  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }

  return intersection / (tokensA.size + tokensB.size - intersection);
}

// ---------------------------------------------------------------------------
// Geo Distance
// ---------------------------------------------------------------------------

/** Haversine distance between two points in meters. */
function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ---------------------------------------------------------------------------
// Matching Engine
// ---------------------------------------------------------------------------

/**
 * Compare two channel listings and determine if they represent the same property.
 *
 * Uses a weighted multi-factor scoring approach:
 *   - Name similarity: 30%
 *   - Geo proximity: 30%
 *   - Room count match: 15%
 *   - Amenity overlap: 15%
 *   - Property type match: 10%
 */
function compareListings(a: ChannelListing, b: ChannelListing): MatchResult {
  const factors: MatchFactor[] = [];

  // Factor 1: Name similarity (combined fuzzy + token overlap)
  const fuzzyScore = stringSimilarity(a.name, b.name);
  const tokenScore = tokenOverlap(a.name, b.name);
  const nameScore = fuzzyScore * 0.6 + tokenScore * 0.4;
  factors.push({
    factor: 'name_similarity',
    score: nameScore,
    weight: 0.30,
    detail: `Fuzzy: ${(fuzzyScore * 100).toFixed(1)}%, Token overlap: ${(tokenScore * 100).toFixed(1)}%`,
  });

  // Factor 2: Geo proximity
  const distance = haversineDistance(
    a.location.lat, a.location.lng,
    b.location.lat, b.location.lng,
  );
  let geoScore: number;
  if (distance < 50) geoScore = 1.0;
  else if (distance < 100) geoScore = 0.9;
  else if (distance < 200) geoScore = 0.7;
  else if (distance < 500) geoScore = 0.3;
  else geoScore = 0.0;
  factors.push({
    factor: 'geo_proximity',
    score: geoScore,
    weight: 0.30,
    detail: `Distance: ${distance.toFixed(0)}m`,
  });

  // Factor 3: Room count match
  const roomDiff = Math.abs(a.roomCount - b.roomCount);
  let roomScore: number;
  if (roomDiff === 0) roomScore = 1.0;
  else if (roomDiff === 1) roomScore = 0.8;
  else if (roomDiff === 2) roomScore = 0.4;
  else roomScore = 0.0;
  factors.push({
    factor: 'room_count',
    score: roomScore,
    weight: 0.15,
    detail: `Room diff: ${roomDiff} (${a.roomCount} vs ${b.roomCount})`,
  });

  // Factor 4: Amenity overlap
  const amenitiesA = new Set(a.amenities.map((am) => am.toLowerCase()));
  const amenitiesB = new Set(b.amenities.map((am) => am.toLowerCase()));
  let amenityIntersection = 0;
  for (const am of amenitiesA) {
    if (amenitiesB.has(am)) amenityIntersection++;
  }
  const amenityUnion = amenitiesA.size + amenitiesB.size - amenityIntersection;
  const amenityScore = amenityUnion > 0 ? amenityIntersection / amenityUnion : 0;
  factors.push({
    factor: 'amenity_overlap',
    score: amenityScore,
    weight: 0.15,
    detail: `Overlap: ${amenityIntersection}/${amenityUnion} amenities`,
  });

  // Factor 5: Property type match
  const typeScore = a.propertyType.toLowerCase() === b.propertyType.toLowerCase() ? 1.0 : 0.2;
  factors.push({
    factor: 'property_type',
    score: typeScore,
    weight: 0.10,
    detail: `${a.propertyType} vs ${b.propertyType}`,
  });

  // Compute weighted confidence
  const confidence = factors.reduce((sum, f) => sum + f.score * f.weight, 0);
  const isMatch = confidence >= 0.70;

  return {
    listing1Id: `${a.channelName}:${a.externalId}`,
    listing2Id: `${b.channelName}:${b.externalId}`,
    isMatch,
    confidence: Math.round(confidence * 1000) / 1000,
    matchFactors: factors,
  };
}

/**
 * Create a canonical property from a channel listing.
 */
function createCanonicalFromListing(listing: ChannelListing): CanonicalProperty {
  const now = new Date().toISOString();
  return {
    canonicalId: `canon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    primaryName: listing.name,
    alternateNames: [],
    location: listing.location,
    roomCount: listing.roomCount,
    bedroomCount: listing.bedroomCount,
    bathroomCount: listing.bathroomCount,
    maxGuests: listing.maxGuests,
    amenities: listing.amenities,
    propertyType: listing.propertyType,
    linkedChannels: [
      {
        channelName: listing.channelName,
        externalId: listing.externalId,
        listingName: listing.name,
        pricePerNight: listing.pricePerNight,
        rating: listing.rating,
        reviewCount: listing.reviewCount,
        matchConfidence: 1.0,
        matchMethod: 'source_listing',
        linkedAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Merge a channel listing into an existing canonical property.
 */
function mergeListingIntoCanonical(
  canonical: CanonicalProperty,
  listing: ChannelListing,
  confidence: number,
  matchMethod: string,
): CanonicalProperty {
  const now = new Date().toISOString();

  // Add alternate name if different
  if (listing.name !== canonical.primaryName && !canonical.alternateNames.includes(listing.name)) {
    canonical.alternateNames.push(listing.name);
  }

  // Merge amenities (union)
  const existingAmenities = new Set(canonical.amenities.map((a) => a.toLowerCase()));
  for (const amenity of listing.amenities) {
    if (!existingAmenities.has(amenity.toLowerCase())) {
      canonical.amenities.push(amenity);
    }
  }

  // Add linked channel
  canonical.linkedChannels.push({
    channelName: listing.channelName,
    externalId: listing.externalId,
    listingName: listing.name,
    pricePerNight: listing.pricePerNight,
    rating: listing.rating,
    reviewCount: listing.reviewCount,
    matchConfidence: confidence,
    matchMethod,
    linkedAt: now,
  });

  canonical.updatedAt = now;
  return canonical;
}

// ---------------------------------------------------------------------------
// In-Memory Store
// ---------------------------------------------------------------------------

const canonicalStore = new Map<string, CanonicalProperty>();

// ---------------------------------------------------------------------------
// Entity Resolution Agent
// ---------------------------------------------------------------------------

export class EntityResolutionAgent implements SubAgent {
  public readonly agentId = 'entity-resolution-agent';
  public readonly name = 'Entity Resolution Agent';

  async handleTask(intent: Intent, context: TripContext): Promise<AgentResponse> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    switch (intent.type) {
      case 'entity.resolve':
        return this.handleResolve(intent, context, traceId, startTime);
      case 'entity.match':
        return this.handleMatch(intent, context, traceId, startTime);
      case 'entity.batch_resolve':
        return this.handleBatchResolve(intent, context, traceId, startTime);
      case 'entity.get_canonical':
        return this.handleGetCanonical(intent, traceId, startTime);
      default:
        return {
          message: `Entity Resolution Agent does not handle intent type "${intent.type}".`,
          proposals: [],
          groundingResults: [],
          metadata: {
            agentId: this.agentId,
            traceId,
            modelTier: 'fast',
            latencyMs: Date.now() - startTime,
            unverifiedClaims: [],
          },
        };
    }
  }

  // ── Core Capabilities ───────────────────────────────────────────

  /**
   * Resolve a single listing against the canonical store.
   */
  async resolveListing(listing: ChannelListing): Promise<{
    canonical: CanonicalProperty;
    isNew: boolean;
    matchConfidence: number;
  }> {
    let bestMatch: CanonicalProperty | null = null;
    let bestConfidence = 0;

    for (const canonical of canonicalStore.values()) {
      // Quick geo filter: skip if more than 1km away
      const distance = haversineDistance(
        listing.location.lat, listing.location.lng,
        canonical.location.lat, canonical.location.lng,
      );
      if (distance > 1000) continue;

      // Create a synthetic listing from the canonical for comparison
      const syntheticListing: ChannelListing = {
        channelId: 'canonical',
        channelName: 'canonical',
        externalId: canonical.canonicalId,
        name: canonical.primaryName,
        description: '',
        location: canonical.location,
        roomCount: canonical.roomCount,
        bedroomCount: canonical.bedroomCount,
        bathroomCount: canonical.bathroomCount,
        maxGuests: canonical.maxGuests,
        amenities: canonical.amenities,
        propertyType: canonical.propertyType,
        pricePerNight: { amount: 0, currency: 'USD' },
        rating: 0,
        reviewCount: 0,
        photos: [],
        lastScrapedAt: '',
      };

      const result = compareListings(listing, syntheticListing);
      if (result.isMatch && result.confidence > bestConfidence) {
        bestMatch = canonical;
        bestConfidence = result.confidence;
      }
    }

    if (bestMatch) {
      const merged = mergeListingIntoCanonical(bestMatch, listing, bestConfidence, 'multi_factor');
      canonicalStore.set(merged.canonicalId, merged);
      return { canonical: merged, isNew: false, matchConfidence: bestConfidence };
    }

    // No match found -- create new canonical
    const newCanonical = createCanonicalFromListing(listing);
    canonicalStore.set(newCanonical.canonicalId, newCanonical);
    return { canonical: newCanonical, isNew: true, matchConfidence: 1.0 };
  }

  /**
   * Compare two specific listings for potential match.
   */
  async matchListings(a: ChannelListing, b: ChannelListing): Promise<MatchResult> {
    return compareListings(a, b);
  }

  /**
   * Batch resolve multiple listings.
   */
  async batchResolve(listings: ChannelListing[]): Promise<ResolutionBatchResult> {
    const batchId = `batch_${Date.now().toString(36)}`;
    const startTime = Date.now();
    let newCanonicals = 0;
    let mergedIntoExisting = 0;
    let ambiguousMatches = 0;

    for (const listing of listings) {
      const result = await this.resolveListing(listing);
      if (result.isNew) {
        newCanonicals++;
      } else if (result.matchConfidence >= 0.85) {
        mergedIntoExisting++;
      } else {
        ambiguousMatches++;
      }
    }

    return {
      batchId,
      listingsProcessed: listings.length,
      newCanonicals,
      mergedIntoExisting,
      ambiguousMatches,
      noMatchFound: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }

  // ── Intent Handlers ─────────────────────────────────────────────

  private async handleResolve(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const listing = intent.entities['listing'] as ChannelListing | undefined;
    if (!listing) {
      return {
        message: 'Please provide a channel listing to resolve.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const result = await this.resolveListing(listing);

    return {
      message: result.isNew
        ? `Created new canonical entity: ${result.canonical.primaryName} (${result.canonical.canonicalId}).`
        : `Matched to existing canonical: ${result.canonical.primaryName} with ${(result.matchConfidence * 100).toFixed(1)}% confidence. Now linked across ${result.canonical.linkedChannels.length} channels.`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleMatch(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const listingA = intent.entities['listingA'] as ChannelListing | undefined;
    const listingB = intent.entities['listingB'] as ChannelListing | undefined;

    if (!listingA || !listingB) {
      return {
        message: 'Please provide two listings to compare.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const result = await this.matchListings(listingA, listingB);
    const factorSummary = result.matchFactors
      .map((f) => `  ${f.factor}: ${(f.score * 100).toFixed(1)}% (weight: ${(f.weight * 100).toFixed(0)}%) -- ${f.detail}`)
      .join('\n');

    return {
      message: `Match result: ${result.isMatch ? 'MATCH' : 'NO MATCH'} (confidence: ${(result.confidence * 100).toFixed(1)}%)\n\nFactor breakdown:\n${factorSummary}`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleBatchResolve(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const listings = intent.entities['listings'] as ChannelListing[] | undefined;
    if (!listings || listings.length === 0) {
      return {
        message: 'Please provide an array of listings to batch resolve.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const result = await this.batchResolve(listings);

    return {
      message: `Batch resolution complete (${result.batchId}):\n` +
        `  Processed: ${result.listingsProcessed}\n` +
        `  New canonicals: ${result.newCanonicals}\n` +
        `  Merged into existing: ${result.mergedIntoExisting}\n` +
        `  Ambiguous: ${result.ambiguousMatches}\n` +
        `  Time: ${result.processingTimeMs}ms`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleGetCanonical(
    intent: Intent,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const canonicalId = intent.entities['canonicalId'] as string | undefined;
    if (!canonicalId) {
      return {
        message: 'Please provide a canonical ID.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const canonical = canonicalStore.get(canonicalId);
    if (!canonical) {
      return {
        message: `Canonical entity ${canonicalId} not found.`,
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const channelSummary = canonical.linkedChannels
      .map((ch) => `  ${ch.channelName}: ${ch.listingName} (${ch.pricePerNight.currency} ${ch.pricePerNight.amount}/night, ${ch.rating} stars, ${ch.reviewCount} reviews)`)
      .join('\n');

    return {
      message: `Canonical: ${canonical.primaryName} (${canonical.canonicalId})\n` +
        `Alternate names: ${canonical.alternateNames.join(', ') || 'none'}\n` +
        `Location: ${canonical.location.city}, ${canonical.location.country}\n` +
        `Rooms: ${canonical.roomCount} | Type: ${canonical.propertyType}\n\n` +
        `Linked channels (${canonical.linkedChannels.length}):\n${channelSummary}`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private generateTraceId(): string {
    return `trc_ent_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
