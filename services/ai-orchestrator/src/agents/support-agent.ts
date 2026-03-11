/**
 * Atlas One -- Support Agent
 *
 * Handles post-booking support: refund processing, rescheduling across
 * multiple bookings, insurance claim filing, and dispute resolution.
 * Coordinates with the Policy Guard for validation and the Risk Agent
 * for claim documentation.
 *
 * Design invariant: All mutations flow through the Tool Registry.
 */

import type {
  SubAgent,
  Intent,
  TripContext,
  AgentResponse,
  ProposedAction,
} from './orchestrator';

// ---------------------------------------------------------------------------
// Support-Specific Types
// ---------------------------------------------------------------------------

/** Refund request details. */
export interface RefundRequest {
  reservationId: string;
  reason: 'user_cancellation' | 'disruption' | 'quality_issue' | 'partner_cancellation' | 'medical' | 'other';
  reasonDetail: string;
  requestedAmount: { amount: number; currency: string } | null;
  evidence: string[];
}

/** Refund assessment based on policy evaluation. */
export interface RefundAssessment {
  reservationId: string;
  eligible: boolean;
  refundableAmount: { amount: number; currency: string };
  nonRefundableAmount: { amount: number; currency: string };
  refundMethod: 'original_payment' | 'credit' | 'points';
  processingTime: string;
  policyReference: string;
  conditions: string[];
  alternativeOptions: AlternativeOption[];
}

/** Alternative to a straight refund. */
export interface AlternativeOption {
  type: 'reschedule' | 'credit' | 'upgrade' | 'partial_refund';
  description: string;
  value: { amount: number; currency: string };
  expiresAt: string | null;
}

/** Reschedule request for one or more bookings. */
export interface RescheduleRequest {
  bookingIds: string[];
  newDates: { start: string; end: string };
  reason: string;
  flexibleDates: boolean;
  flexDaysRange?: number;
}

/** Reschedule plan with per-booking outcomes. */
export interface ReschedulePlan {
  requestId: string;
  bookings: RescheduleBookingResult[];
  totalCostDifference: { amount: number; currency: string };
  feasibility: 'all_available' | 'partial' | 'none_available';
  dependencies: BookingDependency[];
}

/** Result for a single booking in a reschedule plan. */
export interface RescheduleBookingResult {
  bookingId: string;
  bookingType: string;
  currentDates: { start: string; end: string };
  newDates: { start: string; end: string };
  available: boolean;
  costDifference: { amount: number; currency: string };
  policyCompliant: boolean;
  changeFee: { amount: number; currency: string };
}

/** Dependency between bookings that must be rescheduled together. */
export interface BookingDependency {
  bookingId: string;
  dependsOn: string;
  type: 'timing' | 'location' | 'transfer';
  description: string;
}

/** Insurance claim details. */
export interface InsuranceClaim {
  claimId: string;
  policyId: string;
  claimType: 'cancellation' | 'delay' | 'medical' | 'baggage' | 'interruption';
  incidentDate: string;
  description: string;
  claimedAmount: { amount: number; currency: string };
  evidence: ClaimEvidence[];
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'denied' | 'paid';
}

/** Evidence attached to an insurance claim. */
export interface ClaimEvidence {
  type: 'receipt' | 'photo' | 'document' | 'confirmation' | 'medical_record';
  description: string;
  fileUrl: string;
  uploadedAt: string;
}

/** Dispute case. */
export interface Dispute {
  disputeId: string;
  reservationId: string;
  type: 'charge' | 'quality' | 'misrepresentation' | 'no_show_by_partner' | 'damage';
  description: string;
  requestedResolution: string;
  evidence: ClaimEvidence[];
  status: 'open' | 'partner_contacted' | 'escalated' | 'resolved' | 'closed';
  resolution: DisputeResolution | null;
}

/** Resolution outcome for a dispute. */
export interface DisputeResolution {
  type: 'refund' | 'credit' | 'replacement' | 'apology' | 'no_action';
  description: string;
  value: { amount: number; currency: string } | null;
  resolvedAt: string;
  satisfactionRating: number | null;
}

// ---------------------------------------------------------------------------
// Support Agent
// ---------------------------------------------------------------------------

export class SupportAgent implements SubAgent {
  public readonly agentId = 'support-agent';
  public readonly name = 'Support Agent';

  /**
   * Handle a support-related intent delegated by the Orchestrator.
   */
  async handleTask(intent: Intent, context: TripContext): Promise<AgentResponse> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    switch (intent.type) {
      case 'support.refund':
        return this.handleRefundRequest(intent, context, traceId, startTime);
      case 'support.reschedule':
        return this.handleRescheduleRequest(intent, context, traceId, startTime);
      case 'support.insurance_claim':
        return this.handleInsuranceClaim(intent, context, traceId, startTime);
      case 'support.dispute':
        return this.handleDispute(intent, context, traceId, startTime);
      case 'support.status':
        return this.handleStatusCheck(intent, context, traceId, startTime);
      default:
        return this.buildResponse(
          `Support Agent does not handle intent type "${intent.type}".`,
          traceId,
          startTime,
        );
    }
  }

  // -------------------------------------------------------------------------
  // Core Capabilities
  // -------------------------------------------------------------------------

  /**
   * Assess refund eligibility for a reservation.
   *
   * Fetches the applicable policy via `fetchPolicy`, evaluates the
   * cancellation window, and calculates the refundable amount. Returns
   * alternative options when a full refund is not available.
   *
   * @param request - Refund request details.
   * @returns Refund assessment with policy-based calculation.
   */
  async assessRefund(request: RefundRequest): Promise<RefundAssessment> {
    // TODO: Call toolRegistry.getTool('fetchPolicy').execute(...)
    // to get cancellation policy for this reservation.
    const _request = request;

    return {
      reservationId: request.reservationId,
      eligible: false,
      refundableAmount: { amount: 0, currency: 'USD' },
      nonRefundableAmount: { amount: 0, currency: 'USD' },
      refundMethod: 'original_payment',
      processingTime: '5-7 business days',
      policyReference: '',
      conditions: [],
      alternativeOptions: [],
    };
  }

  /**
   * Process a refund request after user approval.
   *
   * Generates the tool call sequence: fetch policy, validate eligibility,
   * issue refund, send confirmation.
   *
   * @param request - Validated refund request.
   * @param assessment - The pre-computed refund assessment.
   * @returns Proposed actions for refund execution.
   */
  async processRefund(
    request: RefundRequest,
    assessment: RefundAssessment,
  ): Promise<ProposedAction[]> {
    if (!assessment.eligible) {
      return [];
    }

    return [
      {
        sequence: 1,
        tool: 'cancelReservation',
        params: {
          reservationId: request.reservationId,
          reason: request.reason,
        },
        estimatedCost: null,
        rollbackTool: null,
        description: `Cancel reservation ${request.reservationId}.`,
      },
      {
        sequence: 2,
        tool: 'issueRefund',
        params: {
          reservationId: request.reservationId,
          amount: assessment.refundableAmount,
          method: assessment.refundMethod,
          reason: request.reason,
        },
        estimatedCost: null,
        rollbackTool: null,
        description: `Issue refund of ${assessment.refundableAmount.amount} ${assessment.refundableAmount.currency}.`,
      },
      {
        sequence: 3,
        tool: 'sendMessage',
        params: {
          recipientType: 'user',
          messageType: 'refund_confirmation',
          reservationId: request.reservationId,
          refundAmount: assessment.refundableAmount,
          processingTime: assessment.processingTime,
        },
        estimatedCost: null,
        rollbackTool: null,
        description: 'Send refund confirmation to user.',
      },
    ];
  }

  /**
   * Plan a reschedule across multiple dependent bookings.
   *
   * Identifies booking dependencies (e.g., hotel check-in must follow flight
   * arrival), checks availability for new dates, and calculates cost differences.
   *
   * @param request - Reschedule request with new dates.
   * @param context - Trip context for dependency resolution.
   * @returns Reschedule plan with per-booking results.
   */
  async planReschedule(
    request: RescheduleRequest,
    context: TripContext,
  ): Promise<ReschedulePlan> {
    const bookings: RescheduleBookingResult[] = [];
    const dependencies: BookingDependency[] = [];

    // TODO: For each booking:
    // 1. Fetch current booking details.
    // 2. Check availability at new dates via searchAvailability.
    // 3. Evaluate policy compliance for the change.
    // 4. Calculate cost difference and change fees.
    // 5. Identify dependencies between bookings.

    for (const bookingId of request.bookingIds) {
      bookings.push({
        bookingId,
        bookingType: 'unknown',
        currentDates: { start: '', end: '' },
        newDates: request.newDates,
        available: false,
        costDifference: { amount: 0, currency: context.budget.currency },
        policyCompliant: false,
        changeFee: { amount: 0, currency: context.budget.currency },
      });
    }

    const availableCount = bookings.filter((b) => b.available).length;
    const feasibility: ReschedulePlan['feasibility'] =
      availableCount === bookings.length
        ? 'all_available'
        : availableCount > 0
          ? 'partial'
          : 'none_available';

    const totalCostDiff = bookings.reduce(
      (sum, b) => sum + b.costDifference.amount + b.changeFee.amount,
      0,
    );

    return {
      requestId: this.generateId('rsc'),
      bookings,
      totalCostDifference: { amount: totalCostDiff, currency: context.budget.currency },
      feasibility,
      dependencies,
    };
  }

  /**
   * File an insurance claim with required documentation.
   *
   * Gathers evidence from booking records and disruption signals, formats
   * the claim per insurer requirements, and submits via the appropriate channel.
   *
   * @param claim - Insurance claim details.
   * @returns Proposed actions for claim submission.
   */
  async fileInsuranceClaim(claim: InsuranceClaim): Promise<ProposedAction[]> {
    return [
      {
        sequence: 1,
        tool: 'fetchPolicy',
        params: {
          policyId: claim.policyId,
          policyType: 'insurance',
        },
        estimatedCost: null,
        rollbackTool: null,
        description: `Fetch insurance policy ${claim.policyId} to verify coverage.`,
      },
      {
        sequence: 2,
        tool: 'sendMessage',
        params: {
          recipientType: 'insurance_provider',
          messageType: 'claim_submission',
          claimId: claim.claimId,
          policyId: claim.policyId,
          claimType: claim.claimType,
          incidentDate: claim.incidentDate,
          description: claim.description,
          claimedAmount: claim.claimedAmount,
          evidenceCount: claim.evidence.length,
        },
        estimatedCost: null,
        rollbackTool: null,
        description: `Submit insurance claim ${claim.claimId} to provider.`,
      },
    ];
  }

  /**
   * Initiate dispute resolution.
   *
   * Contacts the partner first for direct resolution. If unresolved within
   * the SLA window, escalates to the platform dispute team.
   *
   * @param dispute - Dispute details.
   * @returns Proposed actions for dispute initiation.
   */
  async initiateDispute(dispute: Dispute): Promise<ProposedAction[]> {
    return [
      {
        sequence: 1,
        tool: 'fetchPolicy',
        params: {
          reservationId: dispute.reservationId,
          policyType: 'dispute_resolution',
        },
        estimatedCost: null,
        rollbackTool: null,
        description: 'Fetch dispute resolution policy.',
      },
      {
        sequence: 2,
        tool: 'sendMessage',
        params: {
          recipientType: 'partner',
          messageType: 'dispute_notification',
          disputeId: dispute.disputeId,
          reservationId: dispute.reservationId,
          type: dispute.type,
          description: dispute.description,
          requestedResolution: dispute.requestedResolution,
        },
        estimatedCost: null,
        rollbackTool: null,
        description: `Notify partner about dispute ${dispute.disputeId} and request resolution.`,
      },
    ];
  }

  // -------------------------------------------------------------------------
  // Intent Handlers
  // -------------------------------------------------------------------------

  private async handleRefundRequest(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const reservationId = intent.entities['reservationId'] as string;
    if (!reservationId) {
      return this.buildResponse(
        'Which reservation would you like to request a refund for?',
        traceId,
        startTime,
      );
    }

    const request: RefundRequest = {
      reservationId,
      reason: (intent.entities['reason'] as RefundRequest['reason']) ?? 'user_cancellation',
      reasonDetail: (intent.entities['reasonDetail'] as string) ?? '',
      requestedAmount: null,
      evidence: [],
    };

    const assessment = await this.assessRefund(request);

    let message: string;
    if (assessment.eligible) {
      message = `Refund eligible: ${assessment.refundableAmount.amount} ${assessment.refundableAmount.currency} ` +
        `via ${assessment.refundMethod}. Processing time: ${assessment.processingTime}.`;
      if (assessment.conditions.length > 0) {
        message += ` Conditions: ${assessment.conditions.join('; ')}.`;
      }
    } else {
      message = `Refund not available for this reservation under current policy.`;
      if (assessment.alternativeOptions.length > 0) {
        message += ` Alternative options: ` +
          assessment.alternativeOptions.map((o) => `${o.type} (${o.value.amount} ${o.value.currency})`).join(', ') + '.';
      }
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

  private async handleRescheduleRequest(
    intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const bookingIds = intent.entities['bookingIds'] as string[] | undefined;
    const newDates = intent.entities['newDates'] as { start: string; end: string } | undefined;

    if (!bookingIds || !newDates) {
      return this.buildResponse(
        'Please specify which bookings to reschedule and the new dates.',
        traceId,
        startTime,
      );
    }

    const plan = await this.planReschedule(
      {
        bookingIds,
        newDates,
        reason: (intent.entities['reason'] as string) ?? '',
        flexibleDates: (intent.entities['flexibleDates'] as boolean) ?? false,
      },
      context,
    );

    let message: string;
    switch (plan.feasibility) {
      case 'all_available':
        message = `All ${plan.bookings.length} bookings can be rescheduled. ` +
          `Total cost difference: ${plan.totalCostDifference.amount} ${plan.totalCostDifference.currency}.`;
        break;
      case 'partial':
        const available = plan.bookings.filter((b) => b.available).length;
        message = `${available} of ${plan.bookings.length} bookings can be rescheduled. ` +
          `Some bookings are not available at the requested dates.`;
        break;
      case 'none_available':
        message = 'None of the bookings are available at the requested dates. Would you like to try different dates?';
        break;
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

  private async handleInsuranceClaim(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const claim = intent.entities['claim'] as InsuranceClaim | undefined;
    if (!claim) {
      return this.buildResponse(
        'Please provide the insurance claim details including policy ID, claim type, and incident description.',
        traceId,
        startTime,
      );
    }

    const actions = await this.fileInsuranceClaim(claim);

    return {
      message: `Insurance claim prepared. ${actions.length} step(s) to file the claim. ` +
        `Claimed amount: ${claim.claimedAmount.amount} ${claim.claimedAmount.currency}.`,
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

  private async handleDispute(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const dispute = intent.entities['dispute'] as Dispute | undefined;
    if (!dispute) {
      return this.buildResponse(
        'Please provide the dispute details including the reservation, issue type, and your requested resolution.',
        traceId,
        startTime,
      );
    }

    const actions = await this.initiateDispute(dispute);

    return {
      message: `Dispute ${dispute.disputeId} prepared. The partner will be contacted first for direct resolution. ` +
        `If unresolved, the case will be escalated to the platform dispute team.`,
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

  private async handleStatusCheck(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const caseId = intent.entities['caseId'] as string;
    const caseType = intent.entities['caseType'] as string;

    if (!caseId) {
      return this.buildResponse(
        'Which case would you like to check the status of? Please provide the case ID.',
        traceId,
        startTime,
      );
    }

    // TODO: Fetch case status from support service.
    return this.buildResponse(
      `Checking status of ${caseType ?? 'support'} case ${caseId}...`,
      traceId,
      startTime,
    );
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
    return `trc_sup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
