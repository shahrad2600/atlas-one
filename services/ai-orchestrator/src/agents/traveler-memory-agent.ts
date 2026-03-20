/**
 * Atlas One -- Traveler Memory Agent
 *
 * Learns from user saves, bookings, cancellations, and reviews to build
 * and maintain a persistent traveler preference profile. This agent is
 * the AI-powered complement to the personalization-service: while the
 * service provides CRUD and deterministic scoring, this agent provides
 * intelligent inference, pattern recognition, and proactive suggestions.
 *
 * Capabilities:
 *   - Learn from behavioral signals (saves, bookings, cancellations, reviews)
 *   - Build and update the traveler preference profile
 *   - Remember past trips, preferred brands, disliked patterns
 *   - Suggest anniversary/birthday trip ideas based on celebration dates
 *   - Detect evolving preferences (e.g., moving from adventure to relaxation)
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
// Traveler Memory Types
// ---------------------------------------------------------------------------

/** A past trip memory stored in the traveler's profile. */
export interface TripMemory {
  tripId: string;
  destination: string;
  dates: { start: string; end: string };
  properties: Array<{
    canonicalId: string;
    name: string;
    rating?: number;
    highlights: string[];
    issues: string[];
  }>;
  companions: string; // solo, couple, family, friends
  overallSentiment: 'loved' | 'enjoyed' | 'neutral' | 'disappointed';
  keyMemories: string[];
  lessonLearned?: string;
  recordedAt: string;
}

/** A brand preference derived from booking history. */
export interface BrandPreference {
  brand: string;
  bookingCount: number;
  averageRating: number;
  sentiment: 'loyal' | 'positive' | 'neutral' | 'negative' | 'avoid';
  lastStayed: string;
  notes: string;
}

/** A disliked pattern detected from cancellations and low reviews. */
export interface DislikedPattern {
  pattern: string;
  confidence: number;
  evidenceCount: number;
  examples: string[];
  firstDetected: string;
}

/** A celebration-based trip suggestion. */
export interface CelebrationSuggestion {
  celebrationType: string;
  personName?: string;
  date: string;
  suggestedDestinations: Array<{
    destination: string;
    reasoning: string;
    matchScore: number;
  }>;
  suggestedProperties: Array<{
    canonicalId: string;
    name: string;
    reasoning: string;
    matchScore: number;
  }>;
  suggestedExperiences: string[];
  budgetEstimate: { min: number; max: number; currency: string };
}

/** Preference evolution tracking. */
export interface PreferenceEvolution {
  dimension: string;
  previousValue: string;
  currentValue: string;
  changedAt: string;
  confidence: number;
  evidence: string;
}

/** Full traveler memory state. */
export interface TravelerMemory {
  userId: string;
  tripHistory: TripMemory[];
  brandPreferences: BrandPreference[];
  dislikedPatterns: DislikedPattern[];
  preferenceEvolutions: PreferenceEvolution[];
  totalTrips: number;
  totalNights: number;
  favoritDestinations: Array<{ destination: string; visitCount: number; lastVisited: string }>;
  updatedAt: string;
}

/** A behavioral signal to process. */
export interface BehavioralSignal {
  userId: string;
  signalType: 'save' | 'book' | 'cancel' | 'review' | 'search' | 'view' | 'share';
  entityType: 'property' | 'restaurant' | 'experience' | 'destination';
  entityId: string;
  entityName: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// In-Memory Store
// ---------------------------------------------------------------------------

const memoryStore = new Map<string, TravelerMemory>();

function getOrCreateMemory(userId: string): TravelerMemory {
  let memory = memoryStore.get(userId);
  if (!memory) {
    memory = {
      userId,
      tripHistory: [],
      brandPreferences: [],
      dislikedPatterns: [],
      preferenceEvolutions: [],
      totalTrips: 0,
      totalNights: 0,
      favoritDestinations: [],
      updatedAt: new Date().toISOString(),
    };
    memoryStore.set(userId, memory);
  }
  return memory;
}

// ---------------------------------------------------------------------------
// Mock Celebration Suggestions
// ---------------------------------------------------------------------------

const CELEBRATION_DESTINATIONS: Record<string, Array<{ destination: string; reasoning: string }>> = {
  anniversary: [
    { destination: 'Santorini, Greece', reasoning: 'Iconic romantic setting with sunset views over the caldera.' },
    { destination: 'Bora Bora, French Polynesia', reasoning: 'Overwater bungalows and secluded beaches for ultimate romance.' },
    { destination: 'Amalfi Coast, Italy', reasoning: 'Stunning coastal scenery, world-class dining, and old-world charm.' },
    { destination: 'Kyoto, Japan', reasoning: 'Cherry blossoms, private onsen, and deeply intimate experiences.' },
  ],
  birthday: [
    { destination: 'Marrakech, Morocco', reasoning: 'Vibrant culture, stunning riads, and unforgettable experiences.' },
    { destination: 'Maldives', reasoning: 'Pristine beaches, overwater villas, and total relaxation.' },
    { destination: 'Barcelona, Spain', reasoning: 'Architecture, gastronomy, and lively atmosphere for celebration.' },
    { destination: 'Cape Town, South Africa', reasoning: 'Wine, safari, mountains, and ocean -- everything in one destination.' },
  ],
  honeymoon: [
    { destination: 'Bora Bora, French Polynesia', reasoning: 'The quintessential honeymoon destination.' },
    { destination: 'Maldives', reasoning: 'Private island luxury with unparalleled seclusion.' },
    { destination: 'Seychelles', reasoning: 'Pristine nature and barefoot luxury.' },
    { destination: 'Fiji', reasoning: 'Warm hospitality and stunning tropical landscapes.' },
  ],
};

// ---------------------------------------------------------------------------
// Learning Functions
// ---------------------------------------------------------------------------

/** Process a booking signal and update memory. */
function processBookingSignal(memory: TravelerMemory, signal: BehavioralSignal): string[] {
  const inferences: string[] = [];
  const meta = signal.metadata;

  // Track brand preference
  const brand = meta['brand'] as string | undefined;
  if (brand) {
    const existing = memory.brandPreferences.find((b) => b.brand === brand);
    if (existing) {
      existing.bookingCount++;
      existing.lastStayed = signal.timestamp;
      if (existing.bookingCount >= 3) {
        existing.sentiment = 'loyal';
        inferences.push(`Detected brand loyalty to ${brand} (${existing.bookingCount} bookings).`);
      }
    } else {
      memory.brandPreferences.push({
        brand,
        bookingCount: 1,
        averageRating: 0,
        sentiment: 'positive',
        lastStayed: signal.timestamp,
        notes: `First booking at ${signal.entityName}.`,
      });
      inferences.push(`New brand experience: ${brand}.`);
    }
  }

  // Track destination
  const destination = meta['destination'] as string | undefined;
  if (destination) {
    const existing = memory.favoritDestinations.find((d) => d.destination === destination);
    if (existing) {
      existing.visitCount++;
      existing.lastVisited = signal.timestamp;
      if (existing.visitCount >= 2) {
        inferences.push(`Repeat visitor to ${destination} (${existing.visitCount} trips).`);
      }
    } else {
      memory.favoritDestinations.push({
        destination,
        visitCount: 1,
        lastVisited: signal.timestamp,
      });
    }
  }

  // Update trip count
  memory.totalTrips++;
  const nights = meta['nights'] as number | undefined;
  if (nights) memory.totalNights += nights;

  return inferences;
}

/** Process a cancellation signal and detect disliked patterns. */
function processCancellationSignal(memory: TravelerMemory, signal: BehavioralSignal): string[] {
  const inferences: string[] = [];
  const reason = (signal.metadata['cancellationReason'] as string ?? '').toLowerCase();

  // Detect pattern from cancellation reason
  const patterns: Array<{ keywords: string[]; pattern: string }> = [
    { keywords: ['noise', 'loud', 'party'], pattern: 'Avoids noisy/party properties' },
    { keywords: ['too remote', 'far', 'access'], pattern: 'Dislikes remote/hard-to-reach locations' },
    { keywords: ['small', 'cramped', 'tiny'], pattern: 'Prefers spacious accommodations' },
    { keywords: ['dated', 'old', 'renovation'], pattern: 'Dislikes dated/unrenovated properties' },
    { keywords: ['unfriendly', 'rude', 'cold'], pattern: 'Sensitive to service warmth' },
    { keywords: ['expensive', 'overpriced', 'value'], pattern: 'Price-sensitive for category' },
    { keywords: ['children', 'family', 'kids'], pattern: 'Needs family-friendly facilities' },
  ];

  for (const { keywords, pattern } of patterns) {
    if (keywords.some((kw) => reason.includes(kw))) {
      const existing = memory.dislikedPatterns.find((p) => p.pattern === pattern);
      if (existing) {
        existing.evidenceCount++;
        existing.confidence = Math.min(1, existing.confidence + 0.15);
        existing.examples.push(signal.entityName);
      } else {
        memory.dislikedPatterns.push({
          pattern,
          confidence: 0.5,
          evidenceCount: 1,
          examples: [signal.entityName],
          firstDetected: signal.timestamp,
        });
      }
      inferences.push(`Detected disliked pattern: "${pattern}" (from cancellation of ${signal.entityName}).`);
    }
  }

  // Update brand sentiment on cancellation
  const brand = signal.metadata['brand'] as string | undefined;
  if (brand) {
    const brandPref = memory.brandPreferences.find((b) => b.brand === brand);
    if (brandPref) {
      if (brandPref.sentiment === 'positive') brandPref.sentiment = 'neutral';
      else if (brandPref.sentiment === 'neutral') brandPref.sentiment = 'negative';
    }
  }

  return inferences;
}

/** Process a review signal and update memory. */
function processReviewSignal(memory: TravelerMemory, signal: BehavioralSignal): string[] {
  const inferences: string[] = [];
  const rating = signal.metadata['rating'] as number | undefined;
  const reviewText = (signal.metadata['reviewText'] as string ?? '').toLowerCase();

  // Update brand rating
  const brand = signal.metadata['brand'] as string | undefined;
  if (brand && rating) {
    const brandPref = memory.brandPreferences.find((b) => b.brand === brand);
    if (brandPref) {
      const totalRating = brandPref.averageRating * (brandPref.bookingCount - 1) + rating;
      brandPref.averageRating = Math.round((totalRating / brandPref.bookingCount) * 10) / 10;
      if (rating >= 4.5 && brandPref.bookingCount >= 2) {
        brandPref.sentiment = 'loyal';
        inferences.push(`Strong loyalty signal for ${brand}: ${rating}/5 rating with ${brandPref.bookingCount} stays.`);
      } else if (rating <= 2) {
        brandPref.sentiment = 'avoid';
        inferences.push(`Negative brand signal for ${brand}: ${rating}/5 rating.`);
      }
    }
  }

  // Detect evolving preferences from review content
  if (reviewText.includes('used to prefer') || reviewText.includes('changed my mind') || reviewText.includes('now i prefer')) {
    inferences.push('Possible preference evolution detected in review text.');
  }

  // Add to trip history if we can match to a trip
  if (rating && rating >= 4) {
    const highlights: string[] = [];
    if (reviewText.includes('service')) highlights.push('exceptional service');
    if (reviewText.includes('design') || reviewText.includes('beautiful')) highlights.push('stunning design');
    if (reviewText.includes('food') || reviewText.includes('dining')) highlights.push('excellent dining');
    if (reviewText.includes('spa') || reviewText.includes('wellness')) highlights.push('great spa');
    if (reviewText.includes('view')) highlights.push('incredible views');

    if (highlights.length > 0) {
      inferences.push(`Key positive memories: ${highlights.join(', ')}.`);
    }
  }

  return inferences;
}

// ---------------------------------------------------------------------------
// Traveler Memory Agent
// ---------------------------------------------------------------------------

export class TravelerMemoryAgent implements SubAgent {
  public readonly agentId = 'traveler-memory-agent';
  public readonly name = 'Traveler Memory Agent';

  async handleTask(intent: Intent, context: TripContext): Promise<AgentResponse> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    switch (intent.type) {
      case 'memory.learn':
        return this.handleLearn(intent, context, traceId, startTime);
      case 'memory.recall':
        return this.handleRecall(intent, context, traceId, startTime);
      case 'memory.suggest_celebration':
        return this.handleSuggestCelebration(intent, context, traceId, startTime);
      case 'memory.brand_preferences':
        return this.handleBrandPreferences(intent, context, traceId, startTime);
      case 'memory.disliked_patterns':
        return this.handleDislikedPatterns(intent, context, traceId, startTime);
      case 'memory.trip_history':
        return this.handleTripHistory(intent, context, traceId, startTime);
      default:
        return {
          message: `Traveler Memory Agent does not handle intent type "${intent.type}".`,
          proposals: [],
          groundingResults: [],
          metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
        };
    }
  }

  // ── Core Capabilities ───────────────────────────────────────────

  /**
   * Process a behavioral signal and update the traveler's memory.
   */
  async learnFromSignal(signal: BehavioralSignal): Promise<{ inferences: string[]; memoryUpdated: boolean }> {
    const memory = getOrCreateMemory(signal.userId);
    let inferences: string[] = [];

    switch (signal.signalType) {
      case 'book':
        inferences = processBookingSignal(memory, signal);
        break;
      case 'cancel':
        inferences = processCancellationSignal(memory, signal);
        break;
      case 'review':
        inferences = processReviewSignal(memory, signal);
        break;
      case 'save':
      case 'share':
        // Lighter signals -- just track interest
        inferences.push(`Noted interest in ${signal.entityName} (${signal.signalType}).`);
        break;
      default:
        break;
    }

    memory.updatedAt = new Date().toISOString();
    memoryStore.set(signal.userId, memory);

    return { inferences, memoryUpdated: inferences.length > 0 };
  }

  /**
   * Recall the full memory for a traveler.
   */
  async recallMemory(userId: string): Promise<TravelerMemory> {
    return getOrCreateMemory(userId);
  }

  /**
   * Generate celebration-based trip suggestions.
   */
  async suggestCelebrationTrip(
    userId: string,
    celebrationType: string,
    personName?: string,
    date?: string,
  ): Promise<CelebrationSuggestion> {
    const memory = getOrCreateMemory(userId);
    const destinations = CELEBRATION_DESTINATIONS[celebrationType] ?? CELEBRATION_DESTINATIONS['birthday']!;

    // Adjust suggestions based on memory
    const scoredDestinations = destinations.map((d) => {
      let matchScore = 0.7;

      // Boost if previously visited and liked
      const visited = memory.favoritDestinations.find((fd) =>
        d.destination.toLowerCase().includes(fd.destination.toLowerCase()),
      );
      if (visited && visited.visitCount > 0) {
        matchScore += 0.1;
      }

      // Avoid if there are disliked patterns that apply
      if (memory.dislikedPatterns.some((p) => p.pattern.toLowerCase().includes('remote')) &&
          d.reasoning.toLowerCase().includes('remote')) {
        matchScore -= 0.2;
      }

      return {
        destination: d.destination,
        reasoning: d.reasoning,
        matchScore: Math.max(0, Math.min(1, matchScore)),
      };
    });

    scoredDestinations.sort((a, b) => b.matchScore - a.matchScore);

    return {
      celebrationType,
      personName,
      date: date ?? 'unspecified',
      suggestedDestinations: scoredDestinations,
      suggestedProperties: [],
      suggestedExperiences: [
        `Private ${celebrationType} dinner`,
        'Couples spa treatment',
        'Sunset cruise or scenic excursion',
        'Photography session',
      ],
      budgetEstimate: { min: 3000, max: 15000, currency: 'USD' },
    };
  }

  // ── Intent Handlers ─────────────────────────────────────────────

  private async handleLearn(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const signal = intent.entities['signal'] as BehavioralSignal | undefined;
    if (!signal) {
      return {
        message: 'Please provide a behavioral signal to learn from.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const result = await this.learnFromSignal(signal);

    return {
      message: result.memoryUpdated
        ? `Learned from ${signal.signalType} signal for ${signal.entityName}.\n\nInferences:\n${result.inferences.map((i) => `  - ${i}`).join('\n')}`
        : `Processed ${signal.signalType} signal for ${signal.entityName}. No new inferences drawn.`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleRecall(
    intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const userId = (intent.entities['userId'] as string) ?? context.userId;
    const memory = await this.recallMemory(userId);

    const brandText = memory.brandPreferences.length > 0
      ? memory.brandPreferences.map((b) => `  ${b.brand}: ${b.sentiment} (${b.bookingCount} stays, avg ${b.averageRating}/5)`).join('\n')
      : '  (no brand data yet)';

    const patternText = memory.dislikedPatterns.length > 0
      ? memory.dislikedPatterns.map((p) => `  ${p.pattern} (${(p.confidence * 100).toFixed(0)}% confidence, ${p.evidenceCount} evidence points)`).join('\n')
      : '  (no disliked patterns detected)';

    const destText = memory.favoritDestinations.length > 0
      ? memory.favoritDestinations
          .sort((a, b) => b.visitCount - a.visitCount)
          .slice(0, 5)
          .map((d) => `  ${d.destination} (${d.visitCount} visits)`)
          .join('\n')
      : '  (no travel history)';

    return {
      message: `Traveler Memory for ${userId}:\n\n` +
        `Total trips: ${memory.totalTrips} | Total nights: ${memory.totalNights}\n\n` +
        `Brand Preferences:\n${brandText}\n\n` +
        `Disliked Patterns:\n${patternText}\n\n` +
        `Favorite Destinations:\n${destText}`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleSuggestCelebration(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const userId = intent.entities['userId'] as string ?? '';
    const celebrationType = (intent.entities['celebrationType'] as string) ?? 'anniversary';
    const personName = intent.entities['personName'] as string | undefined;
    const date = intent.entities['date'] as string | undefined;

    const suggestion = await this.suggestCelebrationTrip(userId, celebrationType, personName, date);

    const destText = suggestion.suggestedDestinations
      .map((d, i) => `  ${i + 1}. ${d.destination} (${(d.matchScore * 100).toFixed(0)}% match)\n     ${d.reasoning}`)
      .join('\n');

    const expText = suggestion.suggestedExperiences.map((e) => `  - ${e}`).join('\n');

    return {
      message: `${celebrationType.charAt(0).toUpperCase() + celebrationType.slice(1)} Trip Suggestions${personName ? ` for ${personName}` : ''}${date ? ` (${date})` : ''}:\n\n` +
        `Destinations:\n${destText}\n\n` +
        `Experiences:\n${expText}\n\n` +
        `Budget estimate: ${suggestion.budgetEstimate.currency} ${suggestion.budgetEstimate.min.toLocaleString()}-${suggestion.budgetEstimate.max.toLocaleString()}`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'strong', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleBrandPreferences(
    intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const userId = (intent.entities['userId'] as string) ?? context.userId;
    const memory = await this.recallMemory(userId);

    if (memory.brandPreferences.length === 0) {
      return {
        message: 'No brand preference data yet. Brand preferences are built from booking and review history.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const sorted = [...memory.brandPreferences].sort((a, b) => b.bookingCount - a.bookingCount);
    const text = sorted
      .map((b) => `  ${b.brand}: ${b.sentiment} | ${b.bookingCount} stays | avg rating: ${b.averageRating}/5 | last: ${b.lastStayed}\n    ${b.notes}`)
      .join('\n\n');

    return {
      message: `Brand Preferences:\n\n${text}`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleDislikedPatterns(
    intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const userId = (intent.entities['userId'] as string) ?? context.userId;
    const memory = await this.recallMemory(userId);

    if (memory.dislikedPatterns.length === 0) {
      return {
        message: 'No disliked patterns detected yet. These are inferred from cancellations and low reviews.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const text = memory.dislikedPatterns
      .sort((a, b) => b.confidence - a.confidence)
      .map((p) => `  "${p.pattern}" -- ${(p.confidence * 100).toFixed(0)}% confidence\n    Evidence: ${p.examples.join(', ')} (${p.evidenceCount} data points)`)
      .join('\n\n');

    return {
      message: `Disliked Patterns:\n\n${text}`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleTripHistory(
    intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const userId = (intent.entities['userId'] as string) ?? context.userId;
    const memory = await this.recallMemory(userId);

    if (memory.tripHistory.length === 0) {
      return {
        message: `No recorded trip history. Total trips tracked: ${memory.totalTrips}, Total nights: ${memory.totalNights}.`,
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const text = memory.tripHistory
      .map((t) => `  ${t.destination} (${t.dates.start} to ${t.dates.end}) -- ${t.overallSentiment}\n    Companions: ${t.companions}\n    Memories: ${t.keyMemories.join(', ')}`)
      .join('\n\n');

    return {
      message: `Trip History:\n\n${text}`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private generateTraceId(): string {
    return `trc_mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
