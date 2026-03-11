/**
 * Atlas One -- cancelReservation Tool
 *
 * Cancels an existing reservation. Checks cancellation policy before
 * executing to determine refund eligibility and any applicable penalties.
 *
 * Design invariant: Sensitive mutation tool -- rate-limited at 3 calls
 * per 5 minutes per user.
 */

import type { ToolDefinition, ToolContext, ValidationResult } from './searchAvailability';

// ---------------------------------------------------------------------------
// Rate Limiter (sensitive mutation tier)
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { windowStart: number; count: number }>();
const RATE_LIMIT_WINDOW_MS = 5 * 60_000; // 5 minutes
const RATE_LIMIT_MAX_CALLS = 3;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const state = rateLimitMap.get(userId);

  if (!state || now - state.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { windowStart: now, count: 1 });
    return true;
  }

  if (state.count >= RATE_LIMIT_MAX_CALLS) {
    return false;
  }

  state.count++;
  return true;
}

// ---------------------------------------------------------------------------
// Tool Definition
// ---------------------------------------------------------------------------

export const cancelReservationTool: ToolDefinition = {
  name: 'cancelReservation',

  description:
    'Cancel an existing reservation. Validates against the cancellation policy ' +
    'before executing. Returns the cancellation result including refund amount ' +
    'and any applicable penalties.',

  parameters: {
    type: 'object',
    required: ['reservationId'],
    properties: {
      reservationId: {
        type: 'string',
        description: 'The reservation to cancel.',
      },
      reason: {
        type: 'string',
        enum: [
          'user_request',
          'disruption_rebook',
          'partner_cancellation',
          'quality_issue',
          'schedule_change',
          'medical',
          'other',
        ],
        description: 'Reason for cancellation.',
      },
      reasonDetail: {
        type: 'string',
        description: 'Additional detail about the cancellation reason.',
      },
      requestRefund: {
        type: 'boolean',
        default: true,
        description: 'Whether to request a refund as part of cancellation.',
      },
      rollbackOf: {
        type: 'object',
        description: 'If this cancellation is a rollback of a failed proposal, include the original execution result.',
      },
    },
  },

  /**
   * Validate cancellation parameters.
   */
  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['reservationId']) {
      errors.push('reservationId is required.');
    }

    if (typeof params['reservationId'] === 'string' && params['reservationId'].length === 0) {
      errors.push('reservationId cannot be empty.');
    }

    // Rate limit check.
    if (!checkRateLimit(context.userId)) {
      errors.push('Rate limit exceeded. Maximum 3 cancellation calls per 5 minutes.');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Execute the cancellation.
   *
   * Flow:
   * 1. Fetch the reservation details.
   * 2. Look up the applicable cancellation policy.
   * 3. Calculate refund amount based on policy and timing.
   * 4. Execute the cancellation via Commerce Service.
   * 5. Return the result with refund details.
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    // TODO: Call Commerce Service to cancel the reservation.
    //
    // Example:
    //   const policy = await policyClient.getCancellationPolicy(params.reservationId);
    //   const result = await commerceClient.cancelReservation({
    //     reservationId: params.reservationId,
    //     reason: params.reason,
    //     userId: context.userId,
    //   });
    //   return { ...result, refundDetails: policy.calculateRefund(result) };

    return {
      traceId: context.traceId,
      reservationId: params['reservationId'],
      status: 'cancelled',
      reason: params['reason'] ?? 'user_request',
      refund: {
        eligible: true,
        amount: 0,
        currency: 'USD',
        method: 'original_payment',
        processingTime: '5-7 business days',
      },
      penalty: {
        amount: 0,
        currency: 'USD',
        reason: null,
      },
      cancelledAt: new Date().toISOString(),
    };
  },
};
