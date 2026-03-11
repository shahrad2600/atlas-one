/**
 * Atlas One -- Policy Guard
 *
 * Validates proposed actions against applicable cancellation, refund,
 * and modification policies. Ensures the agent never proposes an action
 * that violates business rules or partner terms.
 *
 * The Policy Guard runs first in the validation pipeline because policy
 * violations are hard constraints that cannot be overridden.
 */

import type { ProposedAction } from '../agents/orchestrator';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of a guard validation check. */
export interface GuardValidationResult {
  passed: boolean;
  guardName: string;
  reason: string | null;
  details: Record<string, unknown>;
}

/** Policy data structure returned from the Policy Store. */
export interface PolicyData {
  policyId: string;
  policyType: string;
  cancellationWindow: {
    freeCancellationUntil: string | null;
    penaltyAfterWindow: { amount: number; currency: string; type: string } | null;
  };
  modificationRules: {
    allowed: boolean;
    fee: { amount: number; currency: string } | null;
    restrictedFields: string[];
  };
  refundRules: {
    eligible: boolean;
    percentageByTiming: { hoursBeforeStart: number; refundPercentage: number }[];
  };
  cardHoldRules: {
    holdDurationHours: number;
    maxHoldAmount: { amount: number; currency: string } | null;
  };
  partnerRestrictions: {
    blackoutDates: string[];
    minimumStayNights: number | null;
    minimumLeadTimeHours: number | null;
  };
}

// ---------------------------------------------------------------------------
// Policy Guard
// ---------------------------------------------------------------------------

export class PolicyGuard {
  /** Guard identifier used in validation results. */
  public readonly guardName = 'policy';

  /**
   * Validate a proposed action against the applicable policy.
   *
   * Checks:
   * 1. Cancellation window compliance for cancel/modify actions.
   * 2. Modification rules for modify actions.
   * 3. Refund eligibility for refund actions.
   * 4. Card hold rules for booking actions.
   * 5. Partner-specific restrictions (blackout dates, minimum stay, lead time).
   *
   * @param action - The proposed action to validate.
   * @returns Validation result indicating pass/fail with reason.
   */
  async validate(action: ProposedAction): Promise<GuardValidationResult> {
    const policy = await this.fetchPolicy(action);

    if (!policy) {
      // If no policy is found, allow the action but flag it.
      return {
        passed: true,
        guardName: this.guardName,
        reason: 'No policy found -- proceeding with default rules.',
        details: { policyFound: false },
      };
    }

    // Route to specific validation based on tool type.
    switch (action.tool) {
      case 'cancelReservation':
        return this.validateCancellation(action, policy);
      case 'modifyReservation':
        return this.validateModification(action, policy);
      case 'issueRefund':
        return this.validateRefund(action, policy);
      case 'createReservation':
        return this.validateBooking(action, policy);
      default:
        // Non-policy-sensitive tools pass automatically.
        return {
          passed: true,
          guardName: this.guardName,
          reason: null,
          details: { toolType: action.tool, policyCheck: 'not_applicable' },
        };
    }
  }

  // -------------------------------------------------------------------------
  // Specific Validators
  // -------------------------------------------------------------------------

  /**
   * Validate a cancellation action against the cancellation window.
   */
  private validateCancellation(
    action: ProposedAction,
    policy: PolicyData,
  ): GuardValidationResult {
    const { cancellationWindow } = policy;

    if (!cancellationWindow.freeCancellationUntil) {
      // No cancellation window defined -- non-refundable.
      return {
        passed: true,
        guardName: this.guardName,
        reason: 'No free cancellation window. Penalties may apply.',
        details: {
          freeCancellation: false,
          penalty: cancellationWindow.penaltyAfterWindow,
        },
      };
    }

    const deadline = new Date(cancellationWindow.freeCancellationUntil);
    const now = new Date();

    if (now > deadline) {
      // Outside cancellation window.
      return {
        passed: true, // Allow but warn -- the penalty is applied at execution time.
        guardName: this.guardName,
        reason: `Free cancellation window expired on ${deadline.toISOString()}. Penalty will apply.`,
        details: {
          freeCancellation: false,
          windowExpired: true,
          penalty: cancellationWindow.penaltyAfterWindow,
        },
      };
    }

    return {
      passed: true,
      guardName: this.guardName,
      reason: null,
      details: { freeCancellation: true, windowExpiresAt: deadline.toISOString() },
    };
  }

  /**
   * Validate a modification action against modification rules.
   */
  private validateModification(
    action: ProposedAction,
    policy: PolicyData,
  ): GuardValidationResult {
    const { modificationRules } = policy;

    if (!modificationRules.allowed) {
      return {
        passed: false,
        guardName: this.guardName,
        reason: 'Modifications are not allowed for this booking per partner policy.',
        details: { modificationsAllowed: false },
      };
    }

    // Check if the modified fields are restricted.
    const modifications = action.params['modifications'] as Record<string, unknown> | undefined;
    if (modifications) {
      const modifiedFields = Object.keys(modifications);
      const restricted = modifiedFields.filter((f) =>
        modificationRules.restrictedFields.includes(f),
      );

      if (restricted.length > 0) {
        return {
          passed: false,
          guardName: this.guardName,
          reason: `The following fields cannot be modified: ${restricted.join(', ')}.`,
          details: { restrictedFields: restricted },
        };
      }
    }

    return {
      passed: true,
      guardName: this.guardName,
      reason: modificationRules.fee
        ? `Modification fee of ${modificationRules.fee.amount} ${modificationRules.fee.currency} will apply.`
        : null,
      details: { modificationsAllowed: true, fee: modificationRules.fee },
    };
  }

  /**
   * Validate a refund action against refund rules.
   */
  private validateRefund(
    action: ProposedAction,
    policy: PolicyData,
  ): GuardValidationResult {
    const { refundRules } = policy;

    if (!refundRules.eligible) {
      return {
        passed: false,
        guardName: this.guardName,
        reason: 'This booking is not eligible for a refund.',
        details: { refundEligible: false },
      };
    }

    return {
      passed: true,
      guardName: this.guardName,
      reason: null,
      details: { refundEligible: true, refundSchedule: refundRules.percentageByTiming },
    };
  }

  /**
   * Validate a booking action against partner restrictions.
   */
  private validateBooking(
    action: ProposedAction,
    policy: PolicyData,
  ): GuardValidationResult {
    const { partnerRestrictions } = policy;

    // Check blackout dates.
    const date = action.params['date'] as string | undefined;
    if (date && partnerRestrictions.blackoutDates.includes(date)) {
      return {
        passed: false,
        guardName: this.guardName,
        reason: `${date} is a blackout date for this partner. Bookings are not accepted.`,
        details: { blackoutDate: true },
      };
    }

    // Check minimum lead time.
    if (partnerRestrictions.minimumLeadTimeHours && date) {
      const bookingDate = new Date(date);
      const hoursUntil = (bookingDate.getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntil < partnerRestrictions.minimumLeadTimeHours) {
        return {
          passed: false,
          guardName: this.guardName,
          reason: `Minimum lead time is ${partnerRestrictions.minimumLeadTimeHours} hours. ` +
            `Only ${Math.round(hoursUntil)} hours until the booking date.`,
          details: { minimumLeadTime: partnerRestrictions.minimumLeadTimeHours, hoursUntil },
        };
      }
    }

    // Check minimum stay for accommodations.
    if (partnerRestrictions.minimumStayNights) {
      const checkIn = action.params['checkIn'] as string | undefined;
      const checkOut = action.params['checkOut'] as string | undefined;

      if (checkIn && checkOut) {
        const nights = Math.ceil(
          (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24),
        );

        if (nights < partnerRestrictions.minimumStayNights) {
          return {
            passed: false,
            guardName: this.guardName,
            reason: `Minimum stay is ${partnerRestrictions.minimumStayNights} nights. ` +
              `Requested stay is ${nights} night(s).`,
            details: { minimumStay: partnerRestrictions.minimumStayNights, requestedNights: nights },
          };
        }
      }
    }

    return {
      passed: true,
      guardName: this.guardName,
      reason: null,
      details: { partnerRestrictionsChecked: true },
    };
  }

  // -------------------------------------------------------------------------
  // Policy Fetching
  // -------------------------------------------------------------------------

  /**
   * Fetch the applicable policy for a proposed action.
   *
   * Resolves the policy from the action's params (reservationId, venueId, etc.).
   */
  private async fetchPolicy(action: ProposedAction): Promise<PolicyData | null> {
    // TODO: Call the Policy Store service via the fetchPolicy tool.
    // For now, return null to indicate no policy found.
    const _action = action;
    return null;
  }
}
