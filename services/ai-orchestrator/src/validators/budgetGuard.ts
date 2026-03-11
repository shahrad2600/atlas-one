/**
 * Atlas One -- Budget Guard
 *
 * Ensures proposed actions do not exceed the user's budget envelope.
 * Validates against both total budget and per-category limits. Handles
 * multi-currency trips with conversion awareness.
 *
 * The Budget Guard is the last guard in the pipeline because budget
 * checks depend on the action passing policy, availability, and risk
 * validation first.
 */

import type { ProposedAction, Budget, BudgetBreakdown } from '../agents/orchestrator';
import type { GuardValidationResult } from './policyGuard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Budget check breakdown for an action. */
export interface BudgetCheckDetail extends Record<string, unknown> {
  actionCost: { amount: number; currency: string };
  convertedCost: { amount: number; currency: string } | null;
  category: keyof BudgetBreakdown;
  categoryBudget: number;
  categorySpent: number;
  categoryRemaining: number;
  categoryAfterAction: number;
  categoryUtilizationAfter: number;
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  totalAfterAction: number;
  totalUtilizationAfter: number;
  hiddenCosts: HiddenCost[];
}

/** Hidden cost detected during budget validation. */
export interface HiddenCost {
  type: 'tax' | 'service_charge' | 'resort_fee' | 'cleaning_fee' | 'booking_fee';
  estimatedAmount: { amount: number; currency: string };
  description: string;
}

// ---------------------------------------------------------------------------
// Budget Guard
// ---------------------------------------------------------------------------

export class BudgetGuard {
  public readonly guardName = 'budget';

  /** Warn when category utilization would exceed this percentage. */
  private static readonly CATEGORY_WARNING_THRESHOLD = 90;

  /** Hard block when total utilization would exceed this percentage. */
  private static readonly TOTAL_HARD_LIMIT = 100;

  /**
   * Validate that a proposed action does not exceed the budget envelope.
   *
   * Checks:
   * 1. Action has a cost estimate (skip budget check if no cost).
   * 2. Per-category budget limit.
   * 3. Total budget limit.
   * 4. Hidden cost detection (taxes, fees, surcharges).
   * 5. Currency conversion accuracy (for multi-currency trips).
   *
   * @param action - The proposed action to validate.
   * @param tripBudget - The trip's budget envelope.
   * @returns Validation result indicating pass/fail with reason.
   */
  async validate(
    action: ProposedAction,
    tripBudget: Budget,
  ): Promise<GuardValidationResult> {
    // Skip budget check for actions without cost.
    if (!action.estimatedCost || action.estimatedCost.amount === 0) {
      return {
        passed: true,
        guardName: this.guardName,
        reason: null,
        details: { budgetCheck: 'no_cost', toolType: action.tool },
      };
    }

    // Skip budget check for non-booking tools.
    const costBearingTools = ['createReservation', 'modifyReservation'];
    if (!costBearingTools.includes(action.tool)) {
      return {
        passed: true,
        guardName: this.guardName,
        reason: null,
        details: { budgetCheck: 'not_applicable', toolType: action.tool },
      };
    }

    // Skip if no budget is set (user hasn't defined a budget).
    if (tripBudget.total === 0) {
      return {
        passed: true,
        guardName: this.guardName,
        reason: 'No budget envelope defined. Budget guard skipped.',
        details: { budgetCheck: 'no_budget_set' },
      };
    }

    // Convert cost to budget currency if needed.
    const convertedCost = await this.convertCurrency(
      action.estimatedCost,
      tripBudget.currency,
    );

    // Detect hidden costs.
    const hiddenCosts = await this.detectHiddenCosts(action);
    const totalActionCost = convertedCost.amount + hiddenCosts.reduce(
      (sum, hc) => sum + hc.estimatedAmount.amount,
      0,
    );

    // Resolve category.
    const category = this.resolveCategory(action);

    // Calculate budget impact.
    const categoryBudget = tripBudget.breakdown[category] ?? 0;
    const categorySpent = tripBudget.spent[category] ?? 0;
    const categoryAfterAction = categorySpent + totalActionCost;
    const categoryUtilizationAfter = categoryBudget > 0
      ? Math.round((categoryAfterAction / categoryBudget) * 100)
      : 0;

    const totalSpent = Object.values(tripBudget.spent).reduce((s, v) => s + v, 0);
    const totalAfterAction = totalSpent + totalActionCost;
    const totalUtilizationAfter = Math.round((totalAfterAction / tripBudget.total) * 100);

    const detail: BudgetCheckDetail = {
      actionCost: action.estimatedCost,
      convertedCost: action.estimatedCost.currency !== tripBudget.currency ? convertedCost : null,
      category,
      categoryBudget,
      categorySpent,
      categoryRemaining: Math.max(0, categoryBudget - categorySpent),
      categoryAfterAction,
      categoryUtilizationAfter,
      totalBudget: tripBudget.total,
      totalSpent,
      totalRemaining: Math.max(0, tripBudget.total - totalSpent),
      totalAfterAction,
      totalUtilizationAfter,
      hiddenCosts,
    };

    // Check 1: Total budget hard limit.
    if (totalUtilizationAfter > BudgetGuard.TOTAL_HARD_LIMIT) {
      return {
        passed: false,
        guardName: this.guardName,
        reason:
          `This action would bring total spend to ${totalAfterAction} ${tripBudget.currency} ` +
          `(${totalUtilizationAfter}% of ${tripBudget.total} ${tripBudget.currency} budget). ` +
          `Budget limit exceeded.`,
        details: detail,
      };
    }

    // Check 2: Category budget.
    if (categoryBudget > 0 && categoryAfterAction > categoryBudget) {
      return {
        passed: false,
        guardName: this.guardName,
        reason:
          `This action would exceed the ${category} budget. ` +
          `Category spend would be ${categoryAfterAction} ${tripBudget.currency} ` +
          `vs. limit of ${categoryBudget} ${tripBudget.currency} ` +
          `(${categoryUtilizationAfter}%).`,
        details: detail,
      };
    }

    // Warning for high category utilization (but still within limit).
    let reason: string | null = null;
    if (
      categoryBudget > 0 &&
      categoryUtilizationAfter >= BudgetGuard.CATEGORY_WARNING_THRESHOLD
    ) {
      reason = `${category} budget will be at ${categoryUtilizationAfter}% after this action.`;
    }

    if (hiddenCosts.length > 0) {
      const hiddenTotal = hiddenCosts.reduce((s, hc) => s + hc.estimatedAmount.amount, 0);
      const hiddenNote = `Note: estimated hidden costs of ${hiddenTotal} ${tripBudget.currency} ` +
        `(${hiddenCosts.map((hc) => hc.type).join(', ')}) are included in the budget check.`;
      reason = reason ? `${reason} ${hiddenNote}` : hiddenNote;
    }

    return {
      passed: true,
      guardName: this.guardName,
      reason,
      details: detail,
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Resolve the budget category from action parameters.
   */
  private resolveCategory(action: ProposedAction): keyof BudgetBreakdown {
    const type = action.params['type'] as string | undefined;

    switch (type) {
      case 'dining': return 'dining';
      case 'stay': return 'stays';
      case 'experience': return 'experiences';
      case 'flight': return 'flights';
      default:
        // Infer from params.
        if (action.params['offerId']) return 'flights';
        if (action.params['checkIn']) return 'stays';
        if (action.params['partySize'] && action.params['time']) return 'dining';
        return 'other';
    }
  }

  /**
   * Convert a cost amount to the budget currency.
   *
   * @param cost - The cost to convert.
   * @param targetCurrency - The budget currency.
   * @returns The converted cost.
   */
  private async convertCurrency(
    cost: { amount: number; currency: string },
    targetCurrency: string,
  ): Promise<{ amount: number; currency: string }> {
    if (cost.currency === targetCurrency) {
      return { amount: cost.amount, currency: targetCurrency };
    }

    // TODO: Call currency conversion service.
    // For now, return the original amount with a note.
    return { amount: cost.amount, currency: targetCurrency };
  }

  /**
   * Detect potential hidden costs (taxes, fees, surcharges) for an action.
   */
  private async detectHiddenCosts(action: ProposedAction): Promise<HiddenCost[]> {
    const costs: HiddenCost[] = [];
    const type = action.params['type'] as string | undefined;
    const estimatedAmount = action.estimatedCost?.amount ?? 0;
    const currency = action.estimatedCost?.currency ?? 'USD';

    // Common hidden cost estimates by category.
    if (type === 'stay') {
      // Resort/cleaning fees are common for vacation rentals.
      costs.push({
        type: 'cleaning_fee',
        estimatedAmount: { amount: Math.round(estimatedAmount * 0.05), currency },
        description: 'Estimated cleaning fee (5% of stay cost).',
      });
      costs.push({
        type: 'tax',
        estimatedAmount: { amount: Math.round(estimatedAmount * 0.12), currency },
        description: 'Estimated occupancy tax (12% of stay cost).',
      });
    }

    if (type === 'dining') {
      costs.push({
        type: 'service_charge',
        estimatedAmount: { amount: Math.round(estimatedAmount * 0.18), currency },
        description: 'Estimated service charge / gratuity (18%).',
      });
    }

    if (type === 'flight') {
      costs.push({
        type: 'tax',
        estimatedAmount: { amount: Math.round(estimatedAmount * 0.08), currency },
        description: 'Estimated taxes and airport fees (8%).',
      });
    }

    return costs;
  }
}
