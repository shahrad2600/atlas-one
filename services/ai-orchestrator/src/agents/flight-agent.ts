/**
 * Atlas One -- Flight Agent
 *
 * Searches flights, evaluates disruption risk per route/carrier, handles
 * rebooking on disruptions, and matches seat preferences. Coordinates
 * with the Risk Agent for proactive rebooking and with the Budget Agent
 * for fare-drop monitoring.
 *
 * Design invariant: All mutations flow through the Tool Registry.
 */

import type {
  SubAgent,
  Intent,
  TripContext,
  AgentResponse,
  ProposedAction,
  Citation,
} from './orchestrator';

// ---------------------------------------------------------------------------
// Flight-Specific Types
// ---------------------------------------------------------------------------

/** Parameters for a flight search. */
export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  cabinClass: 'economy' | 'premium_economy' | 'business' | 'first';
  directOnly?: boolean;
  maxStops?: number;
  preferredCarriers?: string[];
  excludeCarriers?: string[];
  maxPrice?: { amount: number; currency: string };
  flexibleDates?: boolean;
  flexDaysRange?: number;
}

/** A flight offer returned by search. */
export interface FlightOffer {
  offerId: string;
  segments: FlightSegment[];
  totalPrice: { amount: number; currency: string };
  cabinClass: string;
  baggageAllowance: { checkedBags: number; carryOn: number; weightKg: number };
  refundable: boolean;
  changeFee: { amount: number; currency: string } | null;
  bookingClass: string;
  seatsRemaining: number;
  validUntil: string;
  disruption: DisruptionRiskAssessment;
}

/** A single flight segment within an offer. */
export interface FlightSegment {
  segmentId: string;
  carrier: string;
  flightNumber: string;
  aircraft: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  stopover: boolean;
  operatingCarrier: string | null;
}

/** Disruption risk assessment for a flight. */
export interface DisruptionRiskAssessment {
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  delayProbability: number;
  cancellationProbability: number;
  diversionProbability: number;
  factors: DisruptionFactor[];
  historicalOnTimeRate: number;
  alternativeCount: number;
}

/** An individual factor contributing to disruption risk. */
export interface DisruptionFactor {
  type: 'weather' | 'carrier_operations' | 'airport_congestion' | 'aircraft_type' | 'time_of_day' | 'seasonal';
  severity: 'low' | 'moderate' | 'high';
  description: string;
  confidence: number;
}

/** Seat preference for a passenger. */
export interface SeatPreference {
  passengerId: string;
  position: 'window' | 'aisle' | 'middle';
  section: 'front' | 'middle' | 'rear' | 'any';
  extraLegroom: boolean;
  nearExit: boolean;
  groupProximity: boolean;
  accessibility: boolean;
}

/** Seat assignment result. */
export interface SeatAssignment {
  passengerId: string;
  segmentId: string;
  seat: string;
  matchScore: number;
  matchedPreferences: string[];
  unmatchedPreferences: string[];
}

/** Rebooking option when a flight is disrupted. */
export interface RebookingOption {
  offer: FlightOffer;
  costDifference: { amount: number; currency: string };
  arrivalDelay: number;
  reason: string;
  autoRebookEligible: boolean;
}

// ---------------------------------------------------------------------------
// Flight Agent
// ---------------------------------------------------------------------------

export class FlightAgent implements SubAgent {
  public readonly agentId = 'flight-agent';
  public readonly name = 'Flight Agent';

  /**
   * Handle a flight-related intent delegated by the Orchestrator.
   */
  async handleTask(intent: Intent, context: TripContext): Promise<AgentResponse> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    switch (intent.type) {
      case 'flight.search':
        return this.handleFlightSearch(intent, context, traceId, startTime);
      case 'flight.disruption_check':
        return this.handleDisruptionCheck(intent, context, traceId, startTime);
      case 'flight.rebook':
        return this.handleRebook(intent, context, traceId, startTime);
      case 'flight.seat_preference':
        return this.handleSeatPreference(intent, context, traceId, startTime);
      default:
        return this.buildResponse(
          `Flight Agent does not handle intent type "${intent.type}".`,
          traceId,
          startTime,
        );
    }
  }

  // -------------------------------------------------------------------------
  // Core Capabilities
  // -------------------------------------------------------------------------

  /**
   * Search flight offers using the `searchFlights` tool.
   *
   * Results come directly from the GDS/airline APIs via the tool -- never
   * fabricated. Each offer includes a disruption risk assessment.
   *
   * @param params - Flight search parameters.
   * @returns Available flight offers with disruption risk.
   */
  async searchFlights(params: FlightSearchParams): Promise<FlightOffer[]> {
    // TODO: Call toolRegistry.getTool('searchFlights').execute(...)
    const _params = params;
    return [];
  }

  /**
   * Evaluate disruption risk for a specific flight or route.
   *
   * Aggregates: historical on-time data, weather forecasts, carrier operational
   * status, airport congestion levels, and aircraft reliability metrics.
   *
   * @param flightNumber - The flight to evaluate.
   * @param date - The date of travel.
   * @returns Disruption risk assessment.
   */
  async evaluateDisruptionRisk(
    flightNumber: string,
    date: string,
  ): Promise<DisruptionRiskAssessment> {
    // TODO: Call toolRegistry.getTool('getDisruptionSignals').execute(...)
    // and run the disruption risk model.
    const _flightNumber = flightNumber;
    const _date = date;

    return {
      overallRisk: 'low',
      delayProbability: 0,
      cancellationProbability: 0,
      diversionProbability: 0,
      factors: [],
      historicalOnTimeRate: 0,
      alternativeCount: 0,
    };
  }

  /**
   * Handle rebooking when a flight is disrupted.
   *
   * Searches for alternative flights, ranks them by arrival delay and cost,
   * and proposes rebooking actions to the Orchestrator.
   *
   * @param disruptedSegmentId - The segment that was disrupted.
   * @param originalOffer - The original flight offer.
   * @param context - Trip context for budget and preference constraints.
   * @returns Rebooking options ranked by desirability.
   */
  async handleRebooking(
    disruptedSegmentId: string,
    originalOffer: FlightOffer,
    context: TripContext,
  ): Promise<RebookingOption[]> {
    // Find the disrupted segment to get route info.
    const disrupted = originalOffer.segments.find((s) => s.segmentId === disruptedSegmentId);
    if (!disrupted) {
      return [];
    }

    // Search for alternative flights on the same route.
    const alternatives = await this.searchFlights({
      origin: disrupted.origin,
      destination: disrupted.destination,
      departureDate: disrupted.departureTime.split('T')[0],
      passengers: {
        adults: context.groupComposition.adults,
        children: context.groupComposition.children,
        infants: context.groupComposition.infants,
      },
      cabinClass: originalOffer.cabinClass as FlightSearchParams['cabinClass'],
    });

    // Rank alternatives by arrival delay and cost difference.
    const options: RebookingOption[] = alternatives.map((alt) => {
      const costDiff = alt.totalPrice.amount - originalOffer.totalPrice.amount;
      const originalArrival = new Date(disrupted.arrivalTime).getTime();
      const newArrival = alt.segments.length > 0
        ? new Date(alt.segments[alt.segments.length - 1].arrivalTime).getTime()
        : originalArrival;
      const delayMinutes = Math.round((newArrival - originalArrival) / 60000);

      return {
        offer: alt,
        costDifference: { amount: costDiff, currency: alt.totalPrice.currency },
        arrivalDelay: delayMinutes,
        reason: `Alternative flight arriving ${delayMinutes > 0 ? delayMinutes + ' minutes later' : 'on time'}.`,
        autoRebookEligible: costDiff <= 0 && delayMinutes < 120,
      };
    });

    // Sort by arrival delay (minimize wait) then by cost (minimize spend).
    options.sort((a, b) => {
      if (a.arrivalDelay !== b.arrivalDelay) return a.arrivalDelay - b.arrivalDelay;
      return a.costDifference.amount - b.costDifference.amount;
    });

    return options;
  }

  /**
   * Match seat preferences for a group of passengers.
   *
   * Considers: individual preferences, group proximity, accessibility needs,
   * and available seat map.
   *
   * @param offerId - The flight offer to select seats for.
   * @param preferences - Seat preferences per passenger.
   * @returns Seat assignments with match scores.
   */
  async matchSeatPreferences(
    offerId: string,
    preferences: SeatPreference[],
  ): Promise<SeatAssignment[]> {
    // TODO: Fetch seat map from airline API and run matching algorithm.
    const _offerId = offerId;
    const _preferences = preferences;
    return [];
  }

  /**
   * Generate rebooking proposal actions for Orchestrator approval.
   *
   * @param option - The selected rebooking option.
   * @param originalReservationId - The reservation being replaced.
   * @returns Proposed actions: cancel original, book alternative.
   */
  async createRebookingProposal(
    option: RebookingOption,
    originalReservationId: string,
  ): Promise<ProposedAction[]> {
    return [
      {
        sequence: 1,
        tool: 'cancelReservation',
        params: {
          reservationId: originalReservationId,
          reason: 'disruption_rebook',
        },
        estimatedCost: null,
        rollbackTool: null,
        description: `Cancel disrupted flight reservation ${originalReservationId}.`,
      },
      {
        sequence: 2,
        tool: 'createReservation',
        params: {
          offerId: option.offer.offerId,
          type: 'flight',
          rebookingOf: originalReservationId,
        },
        estimatedCost: option.offer.totalPrice,
        rollbackTool: 'cancelReservation',
        description: `Book alternative flight ${option.offer.segments.map((s) => s.flightNumber).join(' -> ')}.`,
      },
    ];
  }

  // -------------------------------------------------------------------------
  // Intent Handlers
  // -------------------------------------------------------------------------

  private async handleFlightSearch(
    intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const params: FlightSearchParams = {
      origin: (intent.entities['origin'] as string) ?? '',
      destination: (intent.entities['destination'] as string) ?? context.destination,
      departureDate: (intent.entities['departureDate'] as string) ?? context.startDate,
      returnDate: (intent.entities['returnDate'] as string) ?? context.endDate,
      passengers: {
        adults: context.groupComposition.adults,
        children: context.groupComposition.children,
        infants: context.groupComposition.infants,
      },
      cabinClass: (intent.entities['cabinClass'] as FlightSearchParams['cabinClass']) ?? 'economy',
      directOnly: intent.entities['directOnly'] as boolean | undefined,
      preferredCarriers: intent.entities['preferredCarriers'] as string[] | undefined,
      maxPrice: context.budget.breakdown.flights > 0
        ? { amount: context.budget.breakdown.flights, currency: context.budget.currency }
        : undefined,
    };

    const offers = await this.searchFlights(params);

    // Categorize offers by disruption risk.
    const lowRisk = offers.filter((o) => o.disruption.overallRisk === 'low');
    const highRisk = offers.filter(
      (o) => o.disruption.overallRisk === 'high' || o.disruption.overallRisk === 'critical',
    );

    let message = `I found ${offers.length} flight options.`;
    if (highRisk.length > 0) {
      message += ` ${highRisk.length} have elevated disruption risk -- I recommend reviewing alternatives.`;
    }

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

  private async handleDisruptionCheck(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const flightNumber = intent.entities['flightNumber'] as string;
    const date = intent.entities['date'] as string;

    if (!flightNumber || !date) {
      return this.buildResponse(
        'Please provide the flight number and date to check disruption risk.',
        traceId,
        startTime,
      );
    }

    const risk = await this.evaluateDisruptionRisk(flightNumber, date);

    return {
      message: `Disruption risk for ${flightNumber} on ${date}: ${risk.overallRisk}. ` +
        `On-time rate: ${risk.historicalOnTimeRate}%. ` +
        `Delay probability: ${(risk.delayProbability * 100).toFixed(0)}%. ` +
        `Cancellation probability: ${(risk.cancellationProbability * 100).toFixed(0)}%.`,
      proposals: [],
      groundingResults: [],
      metadata: {
        agentId: this.agentId,
        traceId,
        modelTier: 'strong',
        latencyMs: Date.now() - startTime,
        unverifiedClaims: risk.factors.length === 0
          ? ['Disruption risk assessment is based on limited data.']
          : [],
      },
    };
  }

  private async handleRebook(
    intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const segmentId = intent.entities['segmentId'] as string;
    const originalOffer = intent.entities['originalOffer'] as FlightOffer | undefined;

    if (!segmentId || !originalOffer) {
      return this.buildResponse(
        'I need the disrupted flight details to find rebooking options.',
        traceId,
        startTime,
      );
    }

    const options = await this.handleRebooking(segmentId, originalOffer, context);

    return {
      message: options.length > 0
        ? `I found ${options.length} rebooking options. The best option ` +
          `arrives ${options[0].arrivalDelay} minutes later with a cost ` +
          `difference of ${options[0].costDifference.amount} ${options[0].costDifference.currency}.`
        : 'No alternative flights are available for this route today.',
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

  private async handleSeatPreference(
    intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const offerId = intent.entities['offerId'] as string;
    if (!offerId) {
      return this.buildResponse(
        'Which flight would you like to select seats for?',
        traceId,
        startTime,
      );
    }

    // Build default preferences from context.
    const preferences: SeatPreference[] = [];
    for (let i = 0; i < context.groupComposition.totalTravelers; i++) {
      preferences.push({
        passengerId: `pax_${i}`,
        position: 'aisle',
        section: 'any',
        extraLegroom: false,
        nearExit: false,
        groupProximity: context.groupComposition.totalTravelers > 1,
        accessibility: context.accessibility.mobility,
      });
    }

    const assignments = await this.matchSeatPreferences(offerId, preferences);

    return {
      message: assignments.length > 0
        ? `Seat assignments ready for ${assignments.length} passengers.`
        : 'Unable to assign seats at this time. The seat map may not be available yet.',
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
    return `trc_flt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
