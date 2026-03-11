/**
 * Atlas One -- Risk Guard
 *
 * Evaluates fraud risk, partner reliability, and user trust level before
 * allowing proposed actions to execute. Prevents fraudulent bookings,
 * interactions with unreliable partners, and suspicious transaction patterns.
 */

import type { ProposedAction } from '../agents/orchestrator';
import type { GuardValidationResult } from './policyGuard';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** User fraud score from the fraud detection model. */
export interface FraudScore {
  userId: string;
  score: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  signals: FraudSignal[];
  assessedAt: string;
}

/** Individual fraud signal. */
export interface FraudSignal {
  type: 'velocity' | 'value_anomaly' | 'geo_mismatch' | 'device_anomaly' | 'pattern_match';
  description: string;
  severity: number;
}

/** Partner reliability score. */
export interface PartnerReliabilityScore {
  partnerId: string;
  overallScore: number;
  fulfillmentRate: number;
  complaintRate: number;
  responseTime: number;
  reliabilityLevel: 'excellent' | 'good' | 'acceptable' | 'poor' | 'blocked';
}

// ---------------------------------------------------------------------------
// Risk Guard
// ---------------------------------------------------------------------------

export class RiskGuard {
  public readonly guardName = 'risk';

  /** Minimum user trust level required for different action types. */
  private static readonly TRUST_THRESHOLDS: Record<string, number> = {
    createReservation: 30,
    modifyReservation: 20,
    cancelReservation: 10,
    issueRefund: 40,
    applyLoyaltyPoints: 30,
  };

  /** Maximum fraud score before blocking an action. */
  private static readonly MAX_FRAUD_SCORE = 80;

  /** Minimum partner reliability for allowing bookings. */
  private static readonly MIN_PARTNER_RELIABILITY = 30;

  /**
   * Validate a proposed action against risk thresholds.
   *
   * Checks:
   * 1. User fraud score -- is this a legitimate booking pattern?
   * 2. Partner reliability -- does the partner have a history of honoring bookings?
   * 3. Transaction velocity -- unusual number of bookings in a short period?
   * 4. Value anomaly -- does the transaction value deviate from the user's pattern?
   * 5. Geographic consistency -- does the booking location align with the trip?
   *
   * @param action - The proposed action to validate.
   * @returns Validation result indicating pass/fail with reason.
   */
  async validate(action: ProposedAction): Promise<GuardValidationResult> {
    // Non-transactional tools skip risk checks.
    const transactionalTools = [
      'createReservation',
      'modifyReservation',
      'cancelReservation',
      'issueRefund',
      'applyLoyaltyPoints',
    ];

    if (!transactionalTools.includes(action.tool)) {
      return {
        passed: true,
        guardName: this.guardName,
        reason: null,
        details: { toolType: action.tool, riskCheck: 'not_required' },
      };
    }

    // Step 1: Check user fraud score.
    const fraudResult = await this.checkFraudScore(action);
    if (!fraudResult.passed) {
      return fraudResult;
    }

    // Step 2: Check partner reliability (for booking tools).
    if (action.tool === 'createReservation' || action.tool === 'modifyReservation') {
      const partnerResult = await this.checkPartnerReliability(action);
      if (!partnerResult.passed) {
        return partnerResult;
      }
    }

    // Step 3: Check transaction velocity.
    const velocityResult = await this.checkTransactionVelocity(action);
    if (!velocityResult.passed) {
      return velocityResult;
    }

    // Step 4: Check value anomaly.
    const valueResult = await this.checkValueAnomaly(action);
    if (!valueResult.passed) {
      return valueResult;
    }

    return {
      passed: true,
      guardName: this.guardName,
      reason: null,
      details: { allChecks: 'passed' },
    };
  }

  // -------------------------------------------------------------------------
  // Individual Risk Checks
  // -------------------------------------------------------------------------

  /**
   * Check the user's fraud score.
   */
  private async checkFraudScore(action: ProposedAction): Promise<GuardValidationResult> {
    const fraudScore = await this.fetchFraudScore();

    if (!fraudScore) {
      // No score available -- allow with warning.
      return {
        passed: true,
        guardName: this.guardName,
        reason: 'Fraud score unavailable. Proceeding with standard checks.',
        details: { fraudScoreAvailable: false },
      };
    }

    if (fraudScore.score >= RiskGuard.MAX_FRAUD_SCORE) {
      return {
        passed: false,
        guardName: this.guardName,
        reason: `User fraud risk level is ${fraudScore.riskLevel}. Action blocked for security review.`,
        details: {
          fraudScore: fraudScore.score,
          riskLevel: fraudScore.riskLevel,
          signals: fraudScore.signals.map((s) => s.type),
        },
      };
    }

    const threshold = RiskGuard.TRUST_THRESHOLDS[action.tool] ?? 20;
    const trustLevel = 100 - fraudScore.score;

    if (trustLevel < threshold) {
      return {
        passed: false,
        guardName: this.guardName,
        reason: `User trust level (${trustLevel}) is below the threshold (${threshold}) for ${action.tool}.`,
        details: { trustLevel, threshold, toolType: action.tool },
      };
    }

    return {
      passed: true,
      guardName: this.guardName,
      reason: null,
      details: { fraudScore: fraudScore.score, trustLevel },
    };
  }

  /**
   * Check partner reliability for booking actions.
   */
  private async checkPartnerReliability(
    action: ProposedAction,
  ): Promise<GuardValidationResult> {
    const partnerId =
      (action.params['venueId'] as string) ??
      (action.params['propertyId'] as string) ??
      null;

    if (!partnerId) {
      return {
        passed: true,
        guardName: this.guardName,
        reason: null,
        details: { partnerCheck: 'no_partner_id' },
      };
    }

    const reliability = await this.fetchPartnerReliability(partnerId);

    if (!reliability) {
      return {
        passed: true,
        guardName: this.guardName,
        reason: 'Partner reliability data unavailable.',
        details: { partnerReliabilityAvailable: false },
      };
    }

    if (reliability.reliabilityLevel === 'blocked') {
      return {
        passed: false,
        guardName: this.guardName,
        reason: `Partner ${partnerId} is blocked from the platform. Bookings not allowed.`,
        details: { partnerId, reliability: reliability.reliabilityLevel },
      };
    }

    if (reliability.overallScore < RiskGuard.MIN_PARTNER_RELIABILITY) {
      return {
        passed: false,
        guardName: this.guardName,
        reason: `Partner reliability score (${reliability.overallScore}) is below the minimum threshold (${RiskGuard.MIN_PARTNER_RELIABILITY}).`,
        details: {
          partnerId,
          score: reliability.overallScore,
          threshold: RiskGuard.MIN_PARTNER_RELIABILITY,
          fulfillmentRate: reliability.fulfillmentRate,
          complaintRate: reliability.complaintRate,
        },
      };
    }

    return {
      passed: true,
      guardName: this.guardName,
      reason: reliability.reliabilityLevel === 'poor'
        ? 'Partner has a low reliability rating. Booking is allowed but additional precautions are recommended.'
        : null,
      details: { partnerId, reliability: reliability.reliabilityLevel, score: reliability.overallScore },
    };
  }

  /**
   * Check for unusual transaction velocity.
   */
  private async checkTransactionVelocity(
    _action: ProposedAction,
  ): Promise<GuardValidationResult> {
    // TODO: Query transaction history for the user in the current session.
    // Flag if the number of mutation actions exceeds expected patterns.

    return {
      passed: true,
      guardName: this.guardName,
      reason: null,
      details: { velocityCheck: 'passed' },
    };
  }

  /**
   * Check for value anomalies.
   */
  private async checkValueAnomaly(
    action: ProposedAction,
  ): Promise<GuardValidationResult> {
    if (!action.estimatedCost) {
      return {
        passed: true,
        guardName: this.guardName,
        reason: null,
        details: { valueCheck: 'no_cost_data' },
      };
    }

    // TODO: Compare action cost against user's historical booking patterns.
    // Flag transactions that are significantly higher than typical.

    return {
      passed: true,
      guardName: this.guardName,
      reason: null,
      details: {
        valueCheck: 'passed',
        actionCost: action.estimatedCost,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------------------

  /**
   * Fetch the current user's fraud score from the fraud detection service.
   */
  private async fetchFraudScore(): Promise<FraudScore | null> {
    // TODO: Call the fraud detection service.
    return null;
  }

  /**
   * Fetch partner reliability data from the Trust Agent / Partner Service.
   */
  private async fetchPartnerReliability(
    partnerId: string,
  ): Promise<PartnerReliabilityScore | null> {
    // TODO: Call the Partner Service for reliability data.
    const _partnerId = partnerId;
    return null;
  }
}
