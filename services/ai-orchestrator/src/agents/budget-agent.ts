/**
 * Atlas One -- Budget Agent
 *
 * Optimizes total trip cost and monitors spend against the budget envelope.
 * Suggests cost-saving swaps, tracks per-category utilization, and alerts
 * when projected spend approaches or exceeds thresholds.
 *
 * Design invariant: All mutations flow through the Tool Registry.
 */

import type {
  SubAgent,
  Intent,
  TripContext,
  AgentResponse,
  ProposedAction,
  Budget,
  BudgetBreakdown,
} from './orchestrator';

// ---------------------------------------------------------------------------
// Budget-Specific Types
// ---------------------------------------------------------------------------

/** Spend analysis for the current trip. */
export interface SpendAnalysis {
  tripId: string;
  currency: string;
  totalBudget: number;
  totalSpent: number;
  totalCommitted: number;
  totalRemaining: number;
  utilizationPct: number;
  byCategory: CategorySpend[];
  projectedTotal: number;
  projectedOverage: number | null;
  healthStatus: 'on_track' | 'at_risk' | 'over_budget';
}

/** Per-category spend breakdown. */
export interface CategorySpend {
  category: keyof BudgetBreakdown;
  budgeted: number;
  spent: number;
  committed: number;
  remaining: number;
  utilizationPct: number;
}

/** A cost-saving swap suggestion. */
export interface SwapSuggestion {
  swapId: string;
  category: keyof BudgetBreakdown;
  currentItem: {
    reservationId: string;
    name: string;
    cost: { amount: number; currency: string };
  };
  alternativeItem: {
    itemId: string;
    name: string;
    cost: { amount: number; currency: string };
  };
  savings: { amount: number; currency: string };
  savingsPercent: number;
  qualityImpact: 'none' | 'minimal' | 'moderate' | 'significant';
  tradeoffs: string[];
  actions: ProposedAction[];
}

/** Budget alert when thresholds are approached. */
export interface BudgetAlert {
  alertId: string;
  tripId: string;
  type: 'approaching_limit' | 'over_budget' | 'category_exceeded' | 'price_increase';
  severity: 'info' | 'warning' | 'critical';
  category: keyof BudgetBreakdown | 'total';
  message: string;
  currentUtilization: number;
  threshold: number;
  suggestedAction: string | null;
}

/** Loyalty points opportunity. */
export interface LoyaltyOpportunity {
  programName: string;
  pointsAvailable: number;
  pointsValue: { amount: number; currency: string };
  applicableTo: string;
  redemptionRate: number;
  worthRedeeming: boolean;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Budget Agent
// ---------------------------------------------------------------------------

export class BudgetAgent implements SubAgent {
  public readonly agentId = 'budget-agent';
  public readonly name = 'Budget Agent';

  /** Threshold percentages for budget alerts. */
  private static readonly ALERT_THRESHOLDS = {
    info: 70,
    warning: 85,
    critical: 95,
  };

  /**
   * Handle a budget-related intent delegated by the Orchestrator.
   */
  async handleTask(intent: Intent, context: TripContext): Promise<AgentResponse> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    switch (intent.type) {
      case 'budget.analyze':
        return this.handleAnalyze(context, traceId, startTime);
      case 'budget.suggest_swaps':
        return this.handleSuggestSwaps(context, traceId, startTime);
      case 'budget.check_loyalty':
        return this.handleLoyaltyCheck(intent, context, traceId, startTime);
      case 'budget.alert':
        return this.handleAlertCheck(context, traceId, startTime);
      default:
        return this.buildResponse(
          `Budget Agent does not handle intent type "${intent.type}".`,
          traceId,
          startTime,
        );
    }
  }

  // -------------------------------------------------------------------------
  // Core Capabilities
  // -------------------------------------------------------------------------

  /**
   * Analyze current trip spend vs. budget.
   *
   * Provides a comprehensive breakdown by category, projections for remaining
   * spend, and an overall health status.
   *
   * @param context - Trip context with budget and booking data.
   * @returns Detailed spend analysis.
   */
  async analyzeSpend(context: TripContext): Promise<SpendAnalysis> {
    const { budget } = context;
    const categories: (keyof BudgetBreakdown)[] = ['flights', 'stays', 'dining', 'experiences', 'other'];

    const byCategory: CategorySpend[] = categories.map((cat) => {
      const budgeted = budget.breakdown[cat];
      const spent = budget.spent[cat];
      const committed = 0; // TODO: Fetch from reservation service.
      const remaining = Math.max(0, budgeted - spent - committed);
      const utilizationPct = budgeted > 0 ? Math.round(((spent + committed) / budgeted) * 100) : 0;

      return { category: cat, budgeted, spent, committed, remaining, utilizationPct };
    });

    const totalSpent = Object.values(budget.spent).reduce((s, v) => s + v, 0);
    const totalCommitted = 0; // TODO: Aggregate committed amounts.
    const totalRemaining = Math.max(0, budget.total - totalSpent - totalCommitted);
    const utilizationPct = budget.total > 0 ? Math.round(((totalSpent + totalCommitted) / budget.total) * 100) : 0;

    // Simple projection: assume remaining categories will spend at current rate.
    const projectedTotal = this.projectTotalSpend(context, totalSpent);
    const projectedOverage = projectedTotal > budget.total ? projectedTotal - budget.total : null;

    let healthStatus: SpendAnalysis['healthStatus'] = 'on_track';
    if (projectedOverage !== null) {
      healthStatus = 'over_budget';
    } else if (utilizationPct >= BudgetAgent.ALERT_THRESHOLDS.warning) {
      healthStatus = 'at_risk';
    }

    return {
      tripId: context.tripId,
      currency: budget.currency,
      totalBudget: budget.total,
      totalSpent,
      totalCommitted,
      totalRemaining,
      utilizationPct,
      byCategory,
      projectedTotal,
      projectedOverage,
      healthStatus,
    };
  }

  /**
   * Suggest cost-saving swaps to bring spend back within budget.
   *
   * Analyzes each booked item and searches for alternatives that save money
   * with minimal quality impact. Each suggestion includes explicit tradeoffs.
   *
   * @param context - Trip context with bookings and budget.
   * @returns Ranked swap suggestions.
   */
  async suggestSwaps(context: TripContext): Promise<SwapSuggestion[]> {
    const analysis = await this.analyzeSpend(context);
    const suggestions: SwapSuggestion[] = [];

    // Identify over-budget categories first.
    const overBudgetCategories = analysis.byCategory
      .filter((c) => c.utilizationPct > 90)
      .sort((a, b) => b.utilizationPct - a.utilizationPct);

    for (const cat of overBudgetCategories) {
      // TODO: For each booking in this category:
      // 1. Search for cheaper alternatives via searchAvailability / searchFlights.
      // 2. Calculate savings and quality impact.
      // 3. Build swap suggestion with actions.
    }

    // Sort by savings (highest first), then by quality impact (lowest first).
    suggestions.sort((a, b) => {
      if (a.savings.amount !== b.savings.amount) return b.savings.amount - a.savings.amount;
      const impactOrder = { none: 0, minimal: 1, moderate: 2, significant: 3 };
      return impactOrder[a.qualityImpact] - impactOrder[b.qualityImpact];
    });

    return suggestions;
  }

  /**
   * Monitor budget utilization and generate alerts.
   *
   * Checks total and per-category utilization against thresholds and
   * returns any triggered alerts.
   *
   * @param context - Trip context with budget data.
   * @returns Active budget alerts.
   */
  async monitorBudget(context: TripContext): Promise<BudgetAlert[]> {
    const analysis = await this.analyzeSpend(context);
    const alerts: BudgetAlert[] = [];

    // Check total budget.
    if (analysis.utilizationPct >= BudgetAgent.ALERT_THRESHOLDS.critical) {
      alerts.push({
        alertId: this.generateId('balt'),
        tripId: context.tripId,
        type: 'approaching_limit',
        severity: 'critical',
        category: 'total',
        message: `Total budget utilization at ${analysis.utilizationPct}% -- critically close to limit.`,
        currentUtilization: analysis.utilizationPct,
        threshold: BudgetAgent.ALERT_THRESHOLDS.critical,
        suggestedAction: 'Review swap suggestions to reduce spend.',
      });
    } else if (analysis.utilizationPct >= BudgetAgent.ALERT_THRESHOLDS.warning) {
      alerts.push({
        alertId: this.generateId('balt'),
        tripId: context.tripId,
        type: 'approaching_limit',
        severity: 'warning',
        category: 'total',
        message: `Total budget utilization at ${analysis.utilizationPct}%.`,
        currentUtilization: analysis.utilizationPct,
        threshold: BudgetAgent.ALERT_THRESHOLDS.warning,
        suggestedAction: 'Consider adjusting remaining plans to stay within budget.',
      });
    }

    // Check per-category budgets.
    for (const cat of analysis.byCategory) {
      if (cat.budgeted === 0) continue;

      if (cat.utilizationPct > 100) {
        alerts.push({
          alertId: this.generateId('balt'),
          tripId: context.tripId,
          type: 'category_exceeded',
          severity: 'critical',
          category: cat.category,
          message: `${cat.category} budget exceeded at ${cat.utilizationPct}% utilization.`,
          currentUtilization: cat.utilizationPct,
          threshold: 100,
          suggestedAction: `Look for ${cat.category} alternatives to recover savings.`,
        });
      } else if (cat.utilizationPct >= BudgetAgent.ALERT_THRESHOLDS.warning) {
        alerts.push({
          alertId: this.generateId('balt'),
          tripId: context.tripId,
          type: 'approaching_limit',
          severity: 'warning',
          category: cat.category,
          message: `${cat.category} budget at ${cat.utilizationPct}%.`,
          currentUtilization: cat.utilizationPct,
          threshold: BudgetAgent.ALERT_THRESHOLDS.warning,
          suggestedAction: null,
        });
      }
    }

    return alerts;
  }

  /**
   * Identify loyalty point redemption opportunities.
   *
   * Evaluates available points across loyalty programs, calculates the
   * effective redemption rate, and recommends whether redemption is worthwhile.
   *
   * @param context - Trip context with user loyalty data.
   * @returns Loyalty point opportunities.
   */
  async findLoyaltyOpportunities(context: TripContext): Promise<LoyaltyOpportunity[]> {
    // TODO: Query loyalty service for user's points balances.
    // Evaluate redemption rates against cash prices.
    const _context = context;
    return [];
  }

  // -------------------------------------------------------------------------
  // Intent Handlers
  // -------------------------------------------------------------------------

  private async handleAnalyze(
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const analysis = await this.analyzeSpend(context);

    const categoryBreakdown = analysis.byCategory
      .filter((c) => c.budgeted > 0)
      .map((c) => `${c.category}: ${c.utilizationPct}% used (${c.spent} of ${c.budgeted} ${analysis.currency})`)
      .join('; ');

    let message = `Budget health: ${analysis.healthStatus.replace('_', ' ')}. ` +
      `Total: ${analysis.totalSpent} of ${analysis.totalBudget} ${analysis.currency} ` +
      `(${analysis.utilizationPct}%). ${categoryBreakdown}.`;

    if (analysis.projectedOverage !== null) {
      message += ` Projected overage: ${analysis.projectedOverage} ${analysis.currency}.`;
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

  private async handleSuggestSwaps(
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const swaps = await this.suggestSwaps(context);

    const message = swaps.length > 0
      ? `I found ${swaps.length} potential cost-saving swaps. ` +
        `Top swap saves ${swaps[0].savings.amount} ${swaps[0].savings.currency} ` +
        `(${swaps[0].savingsPercent}%) with ${swaps[0].qualityImpact} quality impact.`
      : 'No cost-saving swaps found. Your current bookings are well-optimized.';

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

  private async handleLoyaltyCheck(
    _intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const opportunities = await this.findLoyaltyOpportunities(context);

    const worthwhile = opportunities.filter((o) => o.worthRedeeming);

    const message = worthwhile.length > 0
      ? `I found ${worthwhile.length} loyalty point redemption opportunities ` +
        `worth a total of ${worthwhile.reduce((s, o) => s + o.pointsValue.amount, 0)} ${context.budget.currency}.`
      : 'No valuable loyalty point redemption opportunities found for this trip.';

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

  private async handleAlertCheck(
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const alerts = await this.monitorBudget(context);

    const message = alerts.length > 0
      ? `${alerts.length} budget alert(s): ` +
        alerts.map((a) => `[${a.severity.toUpperCase()}] ${a.message}`).join(' ')
      : 'No budget alerts. All categories are within acceptable thresholds.';

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

  // -------------------------------------------------------------------------
  // Projection
  // -------------------------------------------------------------------------

  /**
   * Project total spend based on current booking patterns.
   */
  private projectTotalSpend(context: TripContext, currentSpent: number): number {
    // Simple projection: remaining categories at average spend rate.
    // TODO: Use demand forecasting model for better projections.
    const tripDays = this.calculateTripDays(context.startDate, context.endDate);
    if (tripDays <= 0) return currentSpent;

    const elapsed = this.calculateTripDays(context.startDate, new Date().toISOString().split('T')[0]);
    if (elapsed <= 0) return currentSpent;

    const dailyRate = currentSpent / elapsed;
    return Math.round(dailyRate * tripDays);
  }

  private calculateTripDays(start: string, end: string): number {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
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
    return `trc_bgt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
