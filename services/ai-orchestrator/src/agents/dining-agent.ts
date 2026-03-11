/**
 * Atlas One -- Dining Agent
 *
 * Discovers, recommends, and secures dining experiences. Handles restaurant
 * search, availability checking, notify-me strategies for fully booked venues,
 * table preferences, and auto-rebooking on cancellations.
 *
 * Design invariant: All mutations flow through the Tool Registry. The Dining
 * Agent proposes actions but never executes bookings directly.
 */

import type {
  SubAgent,
  Intent,
  TripContext,
  AgentResponse,
  ProposedAction,
  GroundingResult,
  Citation,
} from './orchestrator';

// ---------------------------------------------------------------------------
// Dining-Specific Types
// ---------------------------------------------------------------------------

/** Parameters for a dining availability search. */
export interface DiningSearchParams {
  destination: string;
  date: string;
  time: string;
  partySize: number;
  cuisineTypes?: string[];
  priceRange?: { min: number; max: number; currency: string };
  dietaryRequirements?: string[];
  accessibilityRequired?: boolean;
  radius?: { value: number; unit: 'km' | 'mi' };
}

/** A single available dining slot returned by the search. */
export interface DiningSlot {
  venueId: string;
  venueName: string;
  date: string;
  time: string;
  partySize: number;
  tableType: string;
  estimatedCost: { amount: number; currency: string };
  availableUntil: string;
  metadata: {
    cuisineType: string;
    rating: number;
    priceLevel: number;
    dietaryOptions: string[];
    accessibilityFeatures: string[];
  };
}

/** User's dining preferences profile. */
export interface DiningPreferences {
  cuisinePreferences: string[];
  priceRange: { min: number; max: number; currency: string };
  ambiance: ('fine_dining' | 'casual' | 'romantic' | 'family' | 'trendy' | 'local')[];
  dietaryRequirements: string[];
  tablePreferences: ('indoor' | 'outdoor' | 'window' | 'quiet' | 'bar' | 'private')[];
  avoidChains: boolean;
  prioritizeLocalCuisine: boolean;
}

/** A restaurant recommendation with grounding evidence. */
export interface RecommendedRestaurant {
  venueId: string;
  venueName: string;
  cuisineType: string;
  rating: number;
  priceLevel: number;
  matchScore: number;
  matchReasons: string[];
  availableSlots: DiningSlot[];
  citations: Citation[];
  credibilityScore: number;
  scarcityIndex: 'available' | 'limited' | 'scarce' | 'unavailable';
}

/** Parameters for a notify-me (cancellation watch) request. */
export interface NotifyParams {
  venueId: string;
  date: string;
  preferredTimes: string[];
  partySize: number;
  userId: string;
  tripId: string;
  expiresAt: string;
  priority: 'normal' | 'high';
}

/** A registered notify request. */
export interface NotifyRequest {
  notifyId: string;
  venueId: string;
  date: string;
  preferredTimes: string[];
  partySize: number;
  status: 'active' | 'matched' | 'expired' | 'cancelled';
  createdAt: string;
  expiresAt: string;
}

/** Table preference recommendation. */
export interface TablePreference {
  preferred: string;
  alternatives: string[];
  reasoning: string;
  basedOn: ('user_history' | 'group_composition' | 'weather' | 'occasion' | 'accessibility')[];
}

/** An existing reservation (for rebook scenarios). */
export interface Reservation {
  reservationId: string;
  venueId: string;
  venueName: string;
  date: string;
  time: string;
  partySize: number;
  tablePreference: string;
  status: 'confirmed' | 'cancelled' | 'modified' | 'completed' | 'no_show';
  cost: { amount: number; currency: string };
}

// ---------------------------------------------------------------------------
// Dining Agent
// ---------------------------------------------------------------------------

export class DiningAgent implements SubAgent {
  public readonly agentId = 'dining-agent';
  public readonly name = 'Dining Agent';

  /**
   * Handle a dining-related intent delegated by the Orchestrator.
   *
   * @param intent - The classified dining intent.
   * @param context - Read-only trip context snapshot.
   * @returns Agent response with recommendations and/or proposals.
   */
  async handleTask(intent: Intent, context: TripContext): Promise<AgentResponse> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    switch (intent.type) {
      case 'dining.search':
        return this.handleDiningSearch(intent, context, traceId, startTime);
      case 'dining.recommend':
        return this.handleDiningRecommend(intent, context, traceId, startTime);
      case 'dining.notify':
        return this.handleDiningNotify(intent, context, traceId, startTime);
      case 'dining.rebook':
        return this.handleDiningRebook(intent, context, traceId, startTime);
      default:
        return {
          message: `Dining Agent does not handle intent type "${intent.type}".`,
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

  // -------------------------------------------------------------------------
  // Core Capabilities
  // -------------------------------------------------------------------------

  /**
   * Search dining availability across restaurants for the given parameters.
   *
   * Calls the `searchAvailability` tool with dining-specific filters. Results
   * are never fabricated -- they come directly from the inventory service.
   *
   * @param params - Dining search parameters.
   * @returns Available dining slots.
   */
  async searchAvailability(params: DiningSearchParams): Promise<DiningSlot[]> {
    // TODO: Call toolRegistry.getTool('searchAvailability').execute(...)
    // The tool will query the inventory service and return verified slots.
    const _params = params;
    return [];
  }

  /**
   * Recommend restaurants grounded in Travel Graph data and the review corpus.
   *
   * Every recommendation includes:
   * - Match score based on user preferences
   * - Citations from the Travel Graph and UGC corpus
   * - Credibility score from the Trust Agent
   * - Scarcity index from the demand forecasting model
   *
   * @param context - Trip context with destination, dates, and group info.
   * @param preferences - User's dining preference profile.
   * @returns Ranked restaurant recommendations with evidence.
   */
  async recommendRestaurants(
    context: TripContext,
    preferences: DiningPreferences,
  ): Promise<RecommendedRestaurant[]> {
    // Step 1: Ground recommendations in internal data.
    const groundingResults = await this.groundDiningQuery(context, preferences);

    // Step 2: Search availability for top candidates.
    const searchParams: DiningSearchParams = {
      destination: context.destination,
      date: context.startDate,
      time: '19:00',
      partySize: context.groupComposition.totalTravelers,
      cuisineTypes: preferences.cuisinePreferences,
      priceRange: preferences.priceRange,
      dietaryRequirements: preferences.dietaryRequirements,
      accessibilityRequired:
        context.accessibility.mobility ||
        context.accessibility.visual ||
        context.accessibility.auditory,
    };

    const slots = await this.searchAvailability(searchParams);

    // Step 3: Score and rank based on preference matching.
    const recommendations = this.rankAndScore(slots, preferences, groundingResults);

    return recommendations;
  }

  /**
   * Create a notify-me request for a fully booked restaurant.
   *
   * When the restaurant has no available slots, this registers the user
   * for cancellation watch. When a slot opens, the system can auto-propose
   * a booking.
   *
   * @param params - Notify request parameters.
   * @returns The registered notify request.
   */
  async createNotifyRequest(params: NotifyParams): Promise<NotifyRequest> {
    // TODO: Call the notify service to register a cancellation watch.
    const _params = params;

    return {
      notifyId: this.generateId('ntf'),
      venueId: params.venueId,
      date: params.date,
      preferredTimes: params.preferredTimes,
      partySize: params.partySize,
      status: 'active',
      createdAt: new Date().toISOString(),
      expiresAt: params.expiresAt,
    };
  }

  /**
   * Suggest an optimal table preference based on context signals.
   *
   * Considers: user history, group composition (children, elderly), weather
   * forecast, special occasion flags, and accessibility requirements.
   *
   * @param context - Trip context snapshot.
   * @returns Table preference recommendation with reasoning.
   */
  async suggestTablePreference(context: TripContext): Promise<TablePreference> {
    const basedOn: TablePreference['basedOn'] = [];
    let preferred = 'indoor';
    const alternatives: string[] = [];
    const reasons: string[] = [];

    // Accessibility takes priority.
    if (context.accessibility.mobility) {
      preferred = 'indoor';
      reasons.push('Indoor seating recommended for wheelchair accessibility.');
      basedOn.push('accessibility');
    }

    // Group composition adjustments.
    if (context.groupComposition.children > 0) {
      preferred = 'indoor';
      alternatives.push('quiet');
      reasons.push('Indoor seating preferred for families with children.');
      basedOn.push('group_composition');
    }

    // Default fallback.
    if (reasons.length === 0) {
      alternatives.push('outdoor', 'window');
      reasons.push('No specific constraints -- defaulting to indoor with outdoor and window as alternatives.');
      basedOn.push('user_history');
    }

    return {
      preferred,
      alternatives,
      reasoning: reasons.join(' '),
      basedOn,
    };
  }

  /**
   * Handle auto-rebooking when a dining reservation is cancelled by the venue.
   *
   * Generates a set of proposed actions to rebook at a similar or alternative
   * restaurant. The proposals are returned to the Orchestrator for user approval.
   *
   * @param cancelledReservation - The reservation that was cancelled.
   * @returns Proposed actions for rebooking.
   */
  async handleAutoRebook(cancelledReservation: Reservation): Promise<ProposedAction[]> {
    // Step 1: Search for alternative availability at the same venue.
    const sameVenueSlots = await this.searchAvailability({
      destination: '', // Will be resolved from venue location.
      date: cancelledReservation.date,
      time: cancelledReservation.time,
      partySize: cancelledReservation.partySize,
    });

    const actions: ProposedAction[] = [];

    if (sameVenueSlots.length > 0) {
      // Prefer rebooking at the same venue with a different time.
      const bestSlot = sameVenueSlots[0];
      actions.push({
        sequence: 1,
        tool: 'createReservation',
        params: {
          venueId: bestSlot.venueId,
          date: bestSlot.date,
          time: bestSlot.time,
          partySize: bestSlot.partySize,
          tablePreference: cancelledReservation.tablePreference,
          rebookingOf: cancelledReservation.reservationId,
        },
        estimatedCost: bestSlot.estimatedCost,
        rollbackTool: 'cancelReservation',
        description: `Rebook at ${bestSlot.venueName} for ${bestSlot.time} on ${bestSlot.date}.`,
      });
    } else {
      // Step 2: Search for alternatives at similar restaurants.
      // TODO: Use grounding layer to find similar venues and search their availability.
      actions.push({
        sequence: 1,
        tool: 'searchAvailability',
        params: {
          category: 'dining',
          date: cancelledReservation.date,
          time: cancelledReservation.time,
          partySize: cancelledReservation.partySize,
          similarTo: cancelledReservation.venueId,
        },
        estimatedCost: null,
        rollbackTool: null,
        description: `Search for alternative restaurants similar to ${cancelledReservation.venueName}.`,
      });
    }

    return actions;
  }

  // -------------------------------------------------------------------------
  // Intent Handlers
  // -------------------------------------------------------------------------

  private async handleDiningSearch(
    intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const params: DiningSearchParams = {
      destination: context.destination,
      date: (intent.entities['date'] as string) ?? context.startDate,
      time: (intent.entities['time'] as string) ?? '19:00',
      partySize: (intent.entities['partySize'] as number) ?? context.groupComposition.totalTravelers,
      cuisineTypes: intent.entities['cuisineTypes'] as string[] | undefined,
      dietaryRequirements: context.dietary.restrictions,
    };

    const slots = await this.searchAvailability(params);

    return {
      message: slots.length > 0
        ? `I found ${slots.length} available dining options for ${params.date} at ${params.time}.`
        : `No dining availability found for ${params.date} at ${params.time}. I can set up a notify request to watch for openings.`,
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

  private async handleDiningRecommend(
    intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const preferences: DiningPreferences = {
      cuisinePreferences: (intent.entities['cuisineTypes'] as string[]) ?? [],
      priceRange: (intent.entities['priceRange'] as DiningPreferences['priceRange']) ?? {
        min: 0,
        max: context.budget.breakdown.dining / context.groupComposition.totalTravelers,
        currency: context.budget.currency,
      },
      ambiance: [],
      dietaryRequirements: context.dietary.restrictions,
      tablePreferences: [],
      avoidChains: true,
      prioritizeLocalCuisine: true,
    };

    const recommendations = await this.recommendRestaurants(context, preferences);

    const unverified = recommendations
      .filter((r) => r.credibilityScore < 0.7)
      .map((r) => `Rating for ${r.venueName} has low credibility (${r.credibilityScore}).`);

    return {
      message: recommendations.length > 0
        ? `Here are my top ${recommendations.length} restaurant recommendations for your trip.`
        : 'I could not find restaurants matching your preferences. Would you like to adjust your criteria?',
      proposals: [],
      groundingResults: [],
      metadata: {
        agentId: this.agentId,
        traceId,
        modelTier: 'strong',
        latencyMs: Date.now() - startTime,
        unverifiedClaims: unverified,
      },
    };
  }

  private async handleDiningNotify(
    intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const venueId = intent.entities['venueId'] as string;
    if (!venueId) {
      return {
        message: 'Which restaurant would you like me to watch for cancellations?',
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

    const notifyRequest = await this.createNotifyRequest({
      venueId,
      date: (intent.entities['date'] as string) ?? context.startDate,
      preferredTimes: (intent.entities['times'] as string[]) ?? ['19:00', '20:00', '21:00'],
      partySize: context.groupComposition.totalTravelers,
      userId: context.userId,
      tripId: context.tripId,
      expiresAt: context.startDate,
      priority: context.isLuxuryTier ? 'high' : 'normal',
    });

    return {
      message: `I have set up a cancellation watch for this restaurant. I will notify you if a table opens up. Watch ID: ${notifyRequest.notifyId}.`,
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

  private async handleDiningRebook(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const reservation = intent.entities['reservation'] as Reservation | undefined;
    if (!reservation) {
      return {
        message: 'I need the cancelled reservation details to suggest alternatives.',
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

    const rebookActions = await this.handleAutoRebook(reservation);

    return {
      message: `Your reservation at ${reservation.venueName} was cancelled. I have found ${rebookActions.length} rebooking option(s).`,
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

  // -------------------------------------------------------------------------
  // Grounding
  // -------------------------------------------------------------------------

  /**
   * Query the grounding layer for dining-specific evidence.
   */
  private async groundDiningQuery(
    _context: TripContext,
    _preferences: DiningPreferences,
  ): Promise<GroundingResult[]> {
    // TODO: Query Travel Graph for venue data and UGC corpus for reviews.
    return [];
  }

  // -------------------------------------------------------------------------
  // Scoring
  // -------------------------------------------------------------------------

  /**
   * Rank and score available slots against user preferences.
   */
  private rankAndScore(
    _slots: DiningSlot[],
    _preferences: DiningPreferences,
    _groundingResults: GroundingResult[],
  ): RecommendedRestaurant[] {
    // TODO: Implement multi-factor scoring:
    // - Cuisine match
    // - Price range fit
    // - Dietary compatibility
    // - Ambiance match
    // - Review credibility weighted rating
    // - Scarcity index
    return [];
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private generateTraceId(): string {
    return `trc_din_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
