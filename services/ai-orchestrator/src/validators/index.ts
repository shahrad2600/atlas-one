/**
 * Atlas One -- Validators Barrel File + ValidationPipeline
 *
 * Re-exports all guard implementations and provides the ValidationPipeline
 * class that runs all guards sequentially against a proposed action.
 */

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

export {
  PolicyGuard,
  type GuardValidationResult,
  type PolicyData,
} from './policyGuard';

export {
  AvailabilityGuard,
  type AvailabilityRecord,
} from './availabilityGuard';

export {
  RiskGuard,
  type FraudScore,
  type FraudSignal,
  type PartnerReliabilityScore,
} from './riskGuard';

export {
  BudgetGuard,
  type BudgetCheckDetail,
  type HiddenCost,
} from './budgetGuard';

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { PolicyGuard, type GuardValidationResult } from './policyGuard';
import { AvailabilityGuard } from './availabilityGuard';
import { RiskGuard } from './riskGuard';
import { BudgetGuard } from './budgetGuard';
import type { ProposedAction, Budget } from '../agents/orchestrator';

// ---------------------------------------------------------------------------
// Pipeline Result
// ---------------------------------------------------------------------------

/** Aggregated result from running all guards in the pipeline. */
export interface PipelineValidationResult {
  /** True if all guards passed. */
  passed: boolean;
  /** Name of the first guard that failed, or null if all passed. */
  failedGuard: string | null;
  /** Reason for the first failure, or null if all passed. */
  reason: string | null;
  /** Per-guard results for full visibility. */
  guardResults: GuardValidationResult[];
  /** Total validation latency in milliseconds. */
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// ValidationPipeline
// ---------------------------------------------------------------------------

/**
 * Runs all validation guards sequentially against a proposed action.
 *
 * Guard execution order (matches the architecture doc):
 * 1. Policy Guard   -- hard policy constraints
 * 2. Availability Guard -- real-time inventory verification
 * 3. Risk Guard     -- fraud, trust, and reliability checks
 * 4. Budget Guard   -- budget envelope enforcement
 *
 * Execution is short-circuiting: if any guard fails, subsequent guards
 * are skipped and the failure is returned immediately.
 *
 * Usage:
 *   const pipeline = ValidationPipeline.createDefault();
 *   const result = await pipeline.validate(action, tripBudget);
 *   if (!result.passed) {
 *     console.error(`Blocked by ${result.failedGuard}: ${result.reason}`);
 *   }
 */
export class ValidationPipeline {
  private readonly guards: {
    guard: { guardName: string; validate: (action: ProposedAction, ...args: unknown[]) => Promise<GuardValidationResult> };
    requiresBudget: boolean;
  }[];

  constructor(
    private readonly policyGuard: PolicyGuard,
    private readonly availabilityGuard: AvailabilityGuard,
    private readonly riskGuard: RiskGuard,
    private readonly budgetGuard: BudgetGuard,
  ) {
    this.guards = [
      { guard: this.policyGuard, requiresBudget: false },
      { guard: this.availabilityGuard, requiresBudget: false },
      { guard: this.riskGuard, requiresBudget: false },
      { guard: this.budgetGuard as unknown as { guardName: string; validate: (action: ProposedAction, ...args: unknown[]) => Promise<GuardValidationResult> }, requiresBudget: true },
    ];
  }

  /**
   * Validate a proposed action through all guards.
   *
   * @param action - The proposed action to validate.
   * @param tripBudget - The trip's budget envelope (required for BudgetGuard).
   * @returns Aggregated validation result.
   */
  async validate(
    action: ProposedAction,
    tripBudget: Budget,
  ): Promise<PipelineValidationResult> {
    const startTime = Date.now();
    const guardResults: GuardValidationResult[] = [];

    // Run guards sequentially with short-circuit on failure.
    for (const { guard, requiresBudget } of this.guards) {
      let result: GuardValidationResult;

      try {
        if (requiresBudget) {
          // BudgetGuard has a different signature.
          result = await this.budgetGuard.validate(action, tripBudget);
        } else {
          result = await guard.validate(action);
        }
      } catch (error) {
        // Guard execution error -- treat as failure.
        result = {
          passed: false,
          guardName: guard.guardName,
          reason: `Guard error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          details: { error: true },
        };
      }

      guardResults.push(result);

      if (!result.passed) {
        // Short-circuit: return immediately on first failure.
        return {
          passed: false,
          failedGuard: result.guardName,
          reason: result.reason,
          guardResults,
          latencyMs: Date.now() - startTime,
        };
      }
    }

    return {
      passed: true,
      failedGuard: null,
      reason: null,
      guardResults,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Validate a proposed action through a specific guard only.
   * Useful for testing or when running guards individually.
   *
   * @param guardName - The guard to run.
   * @param action - The proposed action.
   * @param tripBudget - The budget (required for budget guard).
   * @returns The guard's validation result.
   */
  async validateWith(
    guardName: string,
    action: ProposedAction,
    tripBudget?: Budget,
  ): Promise<GuardValidationResult> {
    switch (guardName) {
      case 'policy':
        return this.policyGuard.validate(action);
      case 'availability':
        return this.availabilityGuard.validate(action);
      case 'risk':
        return this.riskGuard.validate(action);
      case 'budget':
        if (!tripBudget) {
          throw new Error('tripBudget is required for the budget guard.');
        }
        return this.budgetGuard.validate(action, tripBudget);
      default:
        throw new Error(`Unknown guard: ${guardName}`);
    }
  }

  /**
   * List all guards in the pipeline in execution order.
   */
  listGuards(): string[] {
    return this.guards.map((g) => g.guard.guardName);
  }

  // -------------------------------------------------------------------------
  // Factory
  // -------------------------------------------------------------------------

  /**
   * Create a ValidationPipeline with all default guards.
   */
  static createDefault(): ValidationPipeline {
    return new ValidationPipeline(
      new PolicyGuard(),
      new AvailabilityGuard(),
      new RiskGuard(),
      new BudgetGuard(),
    );
  }
}
