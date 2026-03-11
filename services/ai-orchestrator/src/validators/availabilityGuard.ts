/**
 * Atlas One -- Availability Guard
 *
 * Verifies that real-time inventory is still available before executing
 * a booking or modification action. Prevents booking against stale
 * availability data.
 *
 * Freshness requirements:
 * - Dining:     < 5 minutes
 * - Stays:      < 15 minutes
 * - Flights:    < 15 minutes
 * - Experiences: < 15 minutes
 */

import type { ProposedAction } from '../agents/orchestrator';
import type { GuardValidationResult } from './policyGuard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Cached availability record from a prior searchAvailability call. */
export interface AvailabilityRecord {
  cacheKey: string;
  category: string;
  result: unknown;
  checkedAt: number;
}

// ---------------------------------------------------------------------------
// Availability Guard
// ---------------------------------------------------------------------------

export class AvailabilityGuard {
  public readonly guardName = 'availability';

  /** Freshness thresholds in milliseconds, keyed by booking category. */
  private static readonly FRESHNESS_THRESHOLDS_MS: Record<string, number> = {
    dining: 5 * 60 * 1000,       // 5 minutes
    stay: 15 * 60 * 1000,        // 15 minutes
    flight: 15 * 60 * 1000,      // 15 minutes
    experience: 15 * 60 * 1000,  // 15 minutes
  };

  /** Default threshold for unknown categories. */
  private static readonly DEFAULT_THRESHOLD_MS = 5 * 60 * 1000;

  /**
   * Validate that a proposed booking or modification action has
   * fresh availability data backing it.
   *
   * Checks:
   * 1. Only applies to mutation tools that create or modify bookings.
   * 2. Verifies that a searchAvailability result exists for the action's
   *    inventory parameters.
   * 3. Checks that the availability data is within the freshness threshold.
   * 4. Confirms that the specific slot/room/seat is still in the result set.
   *
   * @param action - The proposed action to validate.
   * @returns Validation result indicating pass/fail with reason.
   */
  async validate(action: ProposedAction): Promise<GuardValidationResult> {
    // Only check mutation tools that affect inventory.
    const inventoryMutationTools = ['createReservation', 'modifyReservation'];
    if (!inventoryMutationTools.includes(action.tool)) {
      return {
        passed: true,
        guardName: this.guardName,
        reason: null,
        details: { toolType: action.tool, availabilityCheck: 'not_required' },
      };
    }

    // Determine the booking category.
    const category = this.resolveCategory(action);

    // Look up cached availability.
    const availabilityRecord = await this.lookupAvailability(action);

    if (!availabilityRecord) {
      return {
        passed: false,
        guardName: this.guardName,
        reason:
          'No availability verification found. You must call searchAvailability ' +
          'before proposing a booking.',
        details: { category, availabilityFound: false },
      };
    }

    // Check freshness.
    const thresholdMs =
      AvailabilityGuard.FRESHNESS_THRESHOLDS_MS[category] ??
      AvailabilityGuard.DEFAULT_THRESHOLD_MS;
    const ageMs = Date.now() - availabilityRecord.checkedAt;

    if (ageMs > thresholdMs) {
      return {
        passed: false,
        guardName: this.guardName,
        reason:
          `Availability data is ${Math.round(ageMs / 1000)} seconds old. ` +
          `Maximum allowed for ${category} is ${thresholdMs / 1000} seconds. ` +
          `Please re-check availability.`,
        details: {
          category,
          ageMs,
          thresholdMs,
          stale: true,
          checkedAt: new Date(availabilityRecord.checkedAt).toISOString(),
        },
      };
    }

    // Verify the specific item is in the availability result.
    const itemAvailable = this.verifyItemInResult(action, availabilityRecord);

    if (!itemAvailable) {
      return {
        passed: false,
        guardName: this.guardName,
        reason:
          'The specific item/slot is no longer in the cached availability results. ' +
          'It may have been booked by someone else. Please re-check availability.',
        details: { category, itemFound: false },
      };
    }

    return {
      passed: true,
      guardName: this.guardName,
      reason: null,
      details: {
        category,
        ageMs,
        thresholdMs,
        fresh: true,
        checkedAt: new Date(availabilityRecord.checkedAt).toISOString(),
      },
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Resolve the booking category from the action parameters.
   */
  private resolveCategory(action: ProposedAction): string {
    const type = action.params['type'] as string | undefined;
    if (type) return type;

    // Infer from tool and params.
    if (action.params['offerId']) return 'flight';
    if (action.params['checkIn'] || action.params['checkOut']) return 'stay';
    if (action.params['time'] && action.params['partySize']) return 'dining';
    return 'experience';
  }

  /**
   * Look up a cached availability record for the given action.
   *
   * In production, this would query the Orchestrator's availability cache.
   */
  private async lookupAvailability(
    action: ProposedAction,
  ): Promise<AvailabilityRecord | null> {
    // TODO: Query the Orchestrator's availability cache.
    // The cache is keyed by a deterministic hash of the search parameters.
    const _action = action;
    return null;
  }

  /**
   * Verify that the specific item being booked is present in
   * the cached availability results.
   */
  private verifyItemInResult(
    action: ProposedAction,
    record: AvailabilityRecord,
  ): boolean {
    // TODO: Check that the venueId/offerId/slot is in the result set.
    const _action = action;
    const _record = record;
    return true;
  }
}
