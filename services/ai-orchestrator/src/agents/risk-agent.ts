/**
 * Atlas One -- Risk Agent
 *
 * Monitors disruption signals (weather, airline ops, venue closures, strikes),
 * evaluates overall trip health as a composite resilience score, and triggers
 * re-planning when disruption probability exceeds thresholds.
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
// Risk-Specific Types
// ---------------------------------------------------------------------------

/** A real-time disruption signal. */
export interface DisruptionSignal {
  signalId: string;
  type: 'weather' | 'airline_ops' | 'venue_closure' | 'strike' | 'natural_disaster' | 'political' | 'health_advisory';
  severity: 'advisory' | 'watch' | 'warning' | 'emergency';
  affectedArea: {
    location: string;
    radius: number;
    unit: 'km' | 'mi';
  };
  affectedBookings: string[];
  startTime: string;
  endTime: string | null;
  description: string;
  source: string;
  confidence: number;
  updatedAt: string;
}

/** Trip resilience score with dimensional breakdown. */
export interface TripResilienceScore {
  tripId: string;
  overallScore: number;
  dimensions: {
    flightResilience: number;
    stayResilience: number;
    activityResilience: number;
    diningResilience: number;
    weatherResilience: number;
  };
  riskFactors: RiskFactor[];
  recommendations: ResilienceRecommendation[];
  assessedAt: string;
}

/** An individual risk factor affecting trip resilience. */
export interface RiskFactor {
  category: string;
  description: string;
  impact: 'low' | 'moderate' | 'high' | 'critical';
  probability: number;
  affectedBookings: string[];
  mitigationAvailable: boolean;
}

/** A recommendation to improve trip resilience. */
export interface ResilienceRecommendation {
  type: 'insurance' | 'alternative_booking' | 'schedule_buffer' | 'backup_plan';
  description: string;
  estimatedCost: { amount: number; currency: string } | null;
  resilienceImprovement: number;
  priority: 'low' | 'medium' | 'high';
}

/** Insurance recommendation based on risk profile. */
export interface InsuranceRecommendation {
  quoteId: string;
  provider: string;
  planName: string;
  coverage: InsuranceCoverage[];
  premium: { amount: number; currency: string };
  deductible: { amount: number; currency: string };
  maxPayout: { amount: number; currency: string };
  riskMatchScore: number;
  recommendation: 'strongly_recommended' | 'recommended' | 'optional';
  reasoning: string;
}

/** Individual insurance coverage item. */
export interface InsuranceCoverage {
  type: 'trip_cancellation' | 'medical' | 'baggage' | 'delay' | 'interruption' | 'evacuation';
  limit: { amount: number; currency: string };
  deductible: { amount: number; currency: string };
  description: string;
}

/** Re-plan trigger event. */
export interface RePlanTrigger {
  triggerId: string;
  reason: string;
  signals: DisruptionSignal[];
  affectedBookings: string[];
  urgency: 'low' | 'medium' | 'high' | 'immediate';
  suggestedActions: ProposedAction[];
}

// ---------------------------------------------------------------------------
// Risk Agent
// ---------------------------------------------------------------------------

export class RiskAgent implements SubAgent {
  public readonly agentId = 'risk-agent';
  public readonly name = 'Risk Agent';

  /** Disruption probability threshold to trigger re-planning. */
  private static readonly REPLAN_THRESHOLD = 0.6;

  /** Minimum resilience score before recommending improvements. */
  private static readonly MIN_RESILIENCE_SCORE = 60;

  /**
   * Handle a risk-related intent delegated by the Orchestrator.
   */
  async handleTask(intent: Intent, context: TripContext): Promise<AgentResponse> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    switch (intent.type) {
      case 'risk.monitor':
        return this.handleMonitor(context, traceId, startTime);
      case 'risk.resilience':
        return this.handleResilienceCheck(context, traceId, startTime);
      case 'risk.insurance':
        return this.handleInsuranceRecommendation(context, traceId, startTime);
      case 'risk.replan':
        return this.handleRePlan(intent, context, traceId, startTime);
      default:
        return this.buildResponse(
          `Risk Agent does not handle intent type "${intent.type}".`,
          traceId,
          startTime,
        );
    }
  }

  // -------------------------------------------------------------------------
  // Core Capabilities
  // -------------------------------------------------------------------------

  /**
   * Monitor active disruption signals that affect the current trip.
   *
   * Fetches real-time disruption data from multiple sources (weather services,
   * airline operations, venue status APIs) via the `getDisruptionSignals` tool.
   *
   * @param context - Trip context with destination and booking data.
   * @returns Active disruption signals affecting the trip.
   */
  async monitorDisruptions(context: TripContext): Promise<DisruptionSignal[]> {
    // TODO: Call toolRegistry.getTool('getDisruptionSignals').execute(...)
    const _context = context;
    return [];
  }

  /**
   * Evaluate overall trip health as a composite resilience score.
   *
   * Considers:
   * - Flight disruption risk per segment
   * - Stay cancellation/reliability risk
   * - Activity weather sensitivity
   * - Dining reservation scarcity
   * - General weather forecast for the destination
   *
   * @param context - Trip context with all bookings.
   * @returns Trip resilience score with recommendations.
   */
  async evaluateTripHealth(context: TripContext): Promise<TripResilienceScore> {
    const signals = await this.monitorDisruptions(context);

    // Aggregate risk factors from disruption signals.
    const riskFactors: RiskFactor[] = signals.map((signal) => ({
      category: signal.type,
      description: signal.description,
      impact: this.severityToImpact(signal.severity),
      probability: signal.confidence,
      affectedBookings: signal.affectedBookings,
      mitigationAvailable: true,
    }));

    // Calculate dimensional resilience scores.
    const dimensions = {
      flightResilience: this.calculateDimensionResilience(riskFactors, 'airline_ops'),
      stayResilience: this.calculateDimensionResilience(riskFactors, 'venue_closure'),
      activityResilience: this.calculateDimensionResilience(riskFactors, 'weather'),
      diningResilience: 80, // Default -- dining is typically resilient.
      weatherResilience: this.calculateDimensionResilience(riskFactors, 'weather'),
    };

    const overallScore = Math.round(
      Object.values(dimensions).reduce((s, v) => s + v, 0) / Object.values(dimensions).length,
    );

    // Generate recommendations for low-scoring dimensions.
    const recommendations: ResilienceRecommendation[] = [];
    if (overallScore < RiskAgent.MIN_RESILIENCE_SCORE) {
      recommendations.push({
        type: 'insurance',
        description: 'Consider trip cancellation insurance to protect against disruptions.',
        estimatedCost: null,
        resilienceImprovement: 15,
        priority: 'high',
      });
    }

    if (dimensions.flightResilience < 50) {
      recommendations.push({
        type: 'alternative_booking',
        description: 'Book flights with better on-time records or add buffer time between connections.',
        estimatedCost: null,
        resilienceImprovement: 20,
        priority: 'high',
      });
    }

    if (dimensions.activityResilience < 50) {
      recommendations.push({
        type: 'backup_plan',
        description: 'Identify indoor alternatives for weather-sensitive activities.',
        estimatedCost: null,
        resilienceImprovement: 10,
        priority: 'medium',
      });
    }

    return {
      tripId: context.tripId,
      overallScore,
      dimensions,
      riskFactors,
      recommendations,
      assessedAt: new Date().toISOString(),
    };
  }

  /**
   * Trigger a re-plan proposal when disruption probability exceeds threshold.
   *
   * Identifies which bookings are at risk and proposes alternative arrangements
   * for Orchestrator approval.
   *
   * @param signals - Active disruption signals.
   * @param context - Trip context.
   * @returns Re-plan trigger with suggested actions, or null if no replan needed.
   */
  async triggerRePlan(
    signals: DisruptionSignal[],
    context: TripContext,
  ): Promise<RePlanTrigger | null> {
    // Filter to high-impact, high-confidence signals.
    const actionableSignals = signals.filter(
      (s) =>
        (s.severity === 'warning' || s.severity === 'emergency') &&
        s.confidence >= RiskAgent.REPLAN_THRESHOLD,
    );

    if (actionableSignals.length === 0) {
      return null;
    }

    const affectedBookings = [
      ...new Set(actionableSignals.flatMap((s) => s.affectedBookings)),
    ];

    const suggestedActions: ProposedAction[] = [];

    // For each affected booking, suggest investigation.
    for (let i = 0; i < affectedBookings.length; i++) {
      suggestedActions.push({
        sequence: i + 1,
        tool: 'searchAvailability',
        params: {
          bookingId: affectedBookings[i],
          reason: 'disruption_replan',
          tripId: context.tripId,
        },
        estimatedCost: null,
        rollbackTool: null,
        description: `Search for alternatives to disrupted booking ${affectedBookings[i]}.`,
      });
    }

    const urgency = actionableSignals.some((s) => s.severity === 'emergency')
      ? 'immediate' as const
      : 'high' as const;

    return {
      triggerId: this.generateId('rpl'),
      reason: `${actionableSignals.length} disruption signal(s) affecting ${affectedBookings.length} booking(s).`,
      signals: actionableSignals,
      affectedBookings,
      urgency,
      suggestedActions,
    };
  }

  /**
   * Recommend insurance coverage based on trip risk profile.
   *
   * Evaluates available insurance plans from the `getInsuranceQuotes` tool
   * and matches them to the trip's specific risk factors.
   *
   * @param context - Trip context.
   * @returns Ranked insurance recommendations.
   */
  async recommendInsurance(context: TripContext): Promise<InsuranceRecommendation[]> {
    // TODO: Call toolRegistry.getTool('getInsuranceQuotes').execute(...)
    const _context = context;
    return [];
  }

  // -------------------------------------------------------------------------
  // Intent Handlers
  // -------------------------------------------------------------------------

  private async handleMonitor(
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const signals = await this.monitorDisruptions(context);

    const active = signals.filter(
      (s) => s.severity === 'warning' || s.severity === 'emergency',
    );

    const message = active.length > 0
      ? `${active.length} active disruption alert(s) for your trip: ` +
        active.map((s) => `[${s.severity.toUpperCase()}] ${s.description}`).join('; ')
      : 'No active disruption alerts for your trip.';

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

  private async handleResilienceCheck(
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const health = await this.evaluateTripHealth(context);

    let message = `Trip resilience score: ${health.overallScore}/100. `;
    if (health.overallScore >= 80) {
      message += 'Your trip is well-protected against disruptions.';
    } else if (health.overallScore >= 60) {
      message += 'Some areas could benefit from additional protection.';
    } else {
      message += 'Your trip has significant vulnerability to disruptions.';
    }

    if (health.recommendations.length > 0) {
      message += ` I have ${health.recommendations.length} recommendation(s) to improve resilience.`;
    }

    return {
      message,
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

  private async handleInsuranceRecommendation(
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const recommendations = await this.recommendInsurance(context);

    const message = recommendations.length > 0
      ? `I found ${recommendations.length} insurance plan(s). ` +
        `Top recommendation: ${recommendations[0].planName} by ${recommendations[0].provider} ` +
        `at ${recommendations[0].premium.amount} ${recommendations[0].premium.currency}.`
      : 'No insurance quotes available at this time.';

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

  private async handleRePlan(
    _intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const signals = await this.monitorDisruptions(context);
    const trigger = await this.triggerRePlan(signals, context);

    if (!trigger) {
      return this.buildResponse(
        'No re-planning needed at this time. All bookings are within acceptable risk levels.',
        traceId,
        startTime,
      );
    }

    return {
      message: `Re-planning triggered: ${trigger.reason} Urgency: ${trigger.urgency}. ` +
        `${trigger.suggestedActions.length} action(s) proposed.`,
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

  // -------------------------------------------------------------------------
  // Scoring Helpers
  // -------------------------------------------------------------------------

  private severityToImpact(severity: DisruptionSignal['severity']): RiskFactor['impact'] {
    switch (severity) {
      case 'advisory': return 'low';
      case 'watch': return 'moderate';
      case 'warning': return 'high';
      case 'emergency': return 'critical';
    }
  }

  private calculateDimensionResilience(
    factors: RiskFactor[],
    category: string,
  ): number {
    const relevant = factors.filter((f) => f.category === category);
    if (relevant.length === 0) return 85; // Default resilient.

    // Deduct from 100 based on factor impact and probability.
    let score = 100;
    for (const factor of relevant) {
      const impactPenalty = { low: 5, moderate: 15, high: 25, critical: 40 }[factor.impact];
      score -= impactPenalty * factor.probability;
    }

    return Math.max(0, Math.round(score));
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
    return `trc_rsk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
