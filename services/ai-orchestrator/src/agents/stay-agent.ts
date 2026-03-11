/**
 * Atlas One -- Stay Agent
 *
 * Finds and evaluates accommodation options across hotels, vacation rentals,
 * and boutique stays. Evaluates host reliability, compares rental intelligence,
 * monitors price drops, and handles damage claim scenarios.
 *
 * Design invariant: All mutations flow through the Tool Registry.
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
// Stay-Specific Types
// ---------------------------------------------------------------------------

/** Parameters for an accommodation search. */
export interface StaySearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  stayType?: ('hotel' | 'vacation_rental' | 'boutique' | 'hostel' | 'resort')[];
  priceRange?: { min: number; max: number; currency: string };
  amenities?: string[];
  accessibilityRequired?: boolean;
  petFriendly?: boolean;
  radius?: { value: number; unit: 'km' | 'mi' };
  sortBy?: 'price' | 'rating' | 'distance' | 'match_score';
}

/** A single stay option returned by search. */
export interface StayOption {
  propertyId: string;
  propertyName: string;
  stayType: string;
  location: { lat: number; lng: number; address: string; neighborhood: string };
  checkIn: string;
  checkOut: string;
  nightlyRate: { amount: number; currency: string };
  totalCost: { amount: number; currency: string };
  rating: number;
  reviewCount: number;
  amenities: string[];
  accessibilityFeatures: string[];
  images: string[];
  hostInfo: HostInfo | null;
  cancellationPolicy: string;
  metadata: {
    priceLevel: number;
    neighborhoodSafety: number;
    transitProximity: number;
    walkScore: number;
  };
}

/** Host information for vacation rentals. */
export interface HostInfo {
  hostId: string;
  hostName: string;
  superHost: boolean;
  responseRate: number;
  responseTime: string;
  totalListings: number;
  memberSince: string;
}

/** Host reliability evaluation. */
export interface HostReliabilityScore {
  hostId: string;
  overallScore: number;
  dimensions: {
    responseReliability: number;
    listingAccuracy: number;
    cleanlinessConsistency: number;
    cancellationHistory: number;
    disputeRate: number;
  };
  flags: string[];
  recommendation: 'highly_recommended' | 'recommended' | 'caution' | 'avoid';
  citations: Citation[];
}

/** Rental intelligence comparison data. */
export interface RentalIntelligence {
  propertyId: string;
  pricingTrend: {
    currentRate: number;
    averageRate30d: number;
    averageRate90d: number;
    percentile: number;
    trend: 'rising' | 'stable' | 'falling';
  };
  neighborhood: {
    safetyScore: number;
    noiseLevel: 'quiet' | 'moderate' | 'noisy';
    transitScore: number;
    walkabilityScore: number;
    nearbyAttractions: number;
  };
  competitorComparison: {
    averageNightlyRate: number;
    percentileRank: number;
    betterValueAlternatives: number;
  };
  seasonalDemand: 'low' | 'moderate' | 'high' | 'peak';
}

/** Damage claim scenario. */
export interface DamageClaim {
  claimId: string;
  reservationId: string;
  propertyId: string;
  reportedBy: 'guest' | 'host';
  description: string;
  estimatedCost: { amount: number; currency: string };
  evidence: string[];
  status: 'reported' | 'under_review' | 'resolved' | 'disputed';
}

/** Price drop alert. */
export interface PriceDropAlert {
  propertyId: string;
  originalRate: { amount: number; currency: string };
  newRate: { amount: number; currency: string };
  savings: { amount: number; currency: string };
  savingsPercent: number;
  rebookRecommended: boolean;
  rebookDeadline: string;
}

// ---------------------------------------------------------------------------
// Stay Agent
// ---------------------------------------------------------------------------

export class StayAgent implements SubAgent {
  public readonly agentId = 'stay-agent';
  public readonly name = 'Stay Agent';

  /**
   * Handle a stay-related intent delegated by the Orchestrator.
   */
  async handleTask(intent: Intent, context: TripContext): Promise<AgentResponse> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    switch (intent.type) {
      case 'stay.search':
        return this.handleStaySearch(intent, context, traceId, startTime);
      case 'stay.evaluate_host':
        return this.handleHostEvaluation(intent, context, traceId, startTime);
      case 'stay.compare':
        return this.handleRentalComparison(intent, context, traceId, startTime);
      case 'stay.damage_claim':
        return this.handleDamageClaim(intent, context, traceId, startTime);
      case 'stay.price_drop':
        return this.handlePriceDrop(intent, context, traceId, startTime);
      default:
        return this.buildResponse(
          `Stay Agent does not handle intent type "${intent.type}".`,
          traceId,
          startTime,
        );
    }
  }

  // -------------------------------------------------------------------------
  // Core Capabilities
  // -------------------------------------------------------------------------

  /**
   * Search accommodation availability across hotels, rentals, and boutique stays.
   *
   * Calls the `searchAvailability` tool with stay-specific filters. Results
   * come directly from the inventory service -- never fabricated.
   *
   * @param params - Stay search parameters.
   * @returns Available stay options.
   */
  async searchStays(params: StaySearchParams): Promise<StayOption[]> {
    // TODO: Call toolRegistry.getTool('searchAvailability').execute(...)
    const _params = params;
    return [];
  }

  /**
   * Evaluate host reliability for a vacation rental.
   *
   * Aggregates data from booking history, review corpus, response metrics,
   * and dispute records. The Trust Agent provides the credibility scoring.
   *
   * @param hostId - The host to evaluate.
   * @returns Host reliability score with dimensional breakdown.
   */
  async evaluateHost(hostId: string): Promise<HostReliabilityScore> {
    // TODO: Query Trust Agent for host scoring data.
    const _hostId = hostId;

    return {
      hostId,
      overallScore: 0,
      dimensions: {
        responseReliability: 0,
        listingAccuracy: 0,
        cleanlinessConsistency: 0,
        cancellationHistory: 0,
        disputeRate: 0,
      },
      flags: [],
      recommendation: 'recommended',
      citations: [],
    };
  }

  /**
   * Compare rental intelligence for a property.
   *
   * Provides pricing trend analysis, neighborhood insights, competitor
   * comparison, and seasonal demand assessment.
   *
   * @param propertyId - The property to analyze.
   * @returns Rental intelligence data.
   */
  async compareRentalIntelligence(propertyId: string): Promise<RentalIntelligence> {
    // TODO: Aggregate data from pricing service, geo service, and demand models.
    const _propertyId = propertyId;

    return {
      propertyId,
      pricingTrend: {
        currentRate: 0,
        averageRate30d: 0,
        averageRate90d: 0,
        percentile: 0,
        trend: 'stable',
      },
      neighborhood: {
        safetyScore: 0,
        noiseLevel: 'moderate',
        transitScore: 0,
        walkabilityScore: 0,
        nearbyAttractions: 0,
      },
      competitorComparison: {
        averageNightlyRate: 0,
        percentileRank: 0,
        betterValueAlternatives: 0,
      },
      seasonalDemand: 'moderate',
    };
  }

  /**
   * Handle a damage claim scenario.
   *
   * Guides the resolution process: evidence collection, policy lookup,
   * claim filing, and dispute escalation.
   *
   * @param claim - The damage claim details.
   * @returns Proposed actions for claim resolution.
   */
  async handleDamageScenario(claim: DamageClaim): Promise<ProposedAction[]> {
    const actions: ProposedAction[] = [];

    // Step 1: Fetch the applicable policy for this reservation.
    actions.push({
      sequence: 1,
      tool: 'fetchPolicy',
      params: {
        reservationId: claim.reservationId,
        policyType: 'damage_protection',
      },
      estimatedCost: null,
      rollbackTool: null,
      description: `Fetch damage protection policy for reservation ${claim.reservationId}.`,
    });

    // Step 2: If claim is below policy threshold, propose auto-resolution.
    actions.push({
      sequence: 2,
      tool: 'sendMessage',
      params: {
        recipientType: 'partner',
        recipientId: claim.propertyId,
        messageType: 'damage_claim_notification',
        claimId: claim.claimId,
        description: claim.description,
        estimatedCost: claim.estimatedCost,
      },
      estimatedCost: null,
      rollbackTool: null,
      description: `Notify the property host about the damage claim.`,
    });

    return actions;
  }

  /**
   * Check for price drops on booked stays and propose rebooking.
   *
   * Only recommends rebooking when savings exceed a meaningful threshold
   * (e.g., 10% or $50, whichever is greater) and the cancellation policy allows it.
   *
   * @param reservationId - The existing reservation to check.
   * @returns Price drop alert if savings are available, or null.
   */
  async checkPriceDrop(reservationId: string): Promise<PriceDropAlert | null> {
    // TODO: Compare current pricing with booked rate.
    // Check cancellation policy to ensure rebooking is feasible.
    const _reservationId = reservationId;
    return null;
  }

  // -------------------------------------------------------------------------
  // Intent Handlers
  // -------------------------------------------------------------------------

  private async handleStaySearch(
    intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const params: StaySearchParams = {
      destination: context.destination,
      checkIn: (intent.entities['checkIn'] as string) ?? context.startDate,
      checkOut: (intent.entities['checkOut'] as string) ?? context.endDate,
      guests: context.groupComposition.totalTravelers,
      rooms: (intent.entities['rooms'] as number) ?? 1,
      stayType: intent.entities['stayType'] as StaySearchParams['stayType'],
      amenities: intent.entities['amenities'] as string[] | undefined,
      accessibilityRequired: context.accessibility.mobility,
    };

    const options = await this.searchStays(params);

    return {
      message: options.length > 0
        ? `I found ${options.length} accommodation options in ${context.destination}.`
        : `No accommodations matching your criteria are available. Would you like to broaden the search?`,
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

  private async handleHostEvaluation(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const hostId = intent.entities['hostId'] as string;
    if (!hostId) {
      return this.buildResponse(
        'Which property host would you like me to evaluate?',
        traceId,
        startTime,
      );
    }

    const score = await this.evaluateHost(hostId);

    return {
      message: `Host reliability assessment: ${score.recommendation} (score: ${score.overallScore}/100).`,
      proposals: [],
      groundingResults: [],
      metadata: {
        agentId: this.agentId,
        traceId,
        modelTier: 'strong',
        latencyMs: Date.now() - startTime,
        unverifiedClaims: score.citations.length === 0
          ? ['Host score is based on limited data and should be considered unverified.']
          : [],
      },
    };
  }

  private async handleRentalComparison(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const propertyId = intent.entities['propertyId'] as string;
    if (!propertyId) {
      return this.buildResponse(
        'Which property would you like me to analyze?',
        traceId,
        startTime,
      );
    }

    const intel = await this.compareRentalIntelligence(propertyId);

    return {
      message: `Rental intelligence for property: pricing trend is ${intel.pricingTrend.trend}, seasonal demand is ${intel.seasonalDemand}.`,
      proposals: [],
      groundingResults: [],
      metadata: {
        agentId: this.agentId,
        traceId,
        modelTier: 'strong',
        latencyMs: Date.now() - startTime,
        unverifiedClaims: [],
      },
    };
  }

  private async handleDamageClaim(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const claim = intent.entities['claim'] as DamageClaim | undefined;
    if (!claim) {
      return this.buildResponse(
        'Please provide the damage claim details so I can assist with the resolution.',
        traceId,
        startTime,
      );
    }

    const actions = await this.handleDamageScenario(claim);

    return {
      message: `I have prepared ${actions.length} steps to resolve the damage claim.`,
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

  private async handlePriceDrop(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const reservationId = intent.entities['reservationId'] as string;
    if (!reservationId) {
      return this.buildResponse(
        'Which reservation should I check for price drops?',
        traceId,
        startTime,
      );
    }

    const alert = await this.checkPriceDrop(reservationId);

    if (!alert) {
      return this.buildResponse(
        'No price drops detected for this reservation.',
        traceId,
        startTime,
      );
    }

    return {
      message: `Price drop detected! You could save ${alert.savings.amount} ${alert.savings.currency} (${alert.savingsPercent}%) by rebooking.`,
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
  // Helpers
  // -------------------------------------------------------------------------

  private buildResponse(message: string, traceId: string, startTime: number): AgentResponse {
    return {
      message,
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

  private generateTraceId(): string {
    return `trc_stay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
