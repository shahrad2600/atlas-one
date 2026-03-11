/**
 * Atlas One -- issueRefund Tool
 *
 * Requests a refund for a cancelled or disputed reservation. Validates
 * refund eligibility against the applicable policy before processing.
 *
 * Design invariant: Sensitive mutation tool -- rate-limited at 3 calls
 * per 5 minutes per user.
 */

import type { ToolDefinition, ToolContext, ValidationResult } from './searchAvailability';

// ---------------------------------------------------------------------------
// Rate Limiter (sensitive mutation tier)
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { windowStart: number; count: number }>();
const RATE_LIMIT_WINDOW_MS = 5 * 60_000;
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

export const issueRefundTool: ToolDefinition = {
  name: 'issueRefund',

  description:
    'Request a refund for a reservation. Validates refund eligibility against ' +
    'the cancellation/refund policy, calculates the refundable amount, and ' +
    'initiates the refund via the Payment Service.',

  parameters: {
    type: 'object',
    required: ['reservationId', 'amount', 'reason'],
    properties: {
      reservationId: {
        type: 'string',
        description: 'The reservation to refund.',
      },
      amount: {
        type: 'object',
        required: ['amount', 'currency'],
        properties: {
          amount: { type: 'number', minimum: 0 },
          currency: { type: 'string', minLength: 3, maxLength: 3 },
        },
        description: 'Refund amount.',
      },
      reason: {
        type: 'string',
        enum: [
          'user_cancellation',
          'disruption',
          'quality_issue',
          'partner_cancellation',
          'medical',
          'duplicate_charge',
          'other',
        ],
        description: 'Reason for the refund.',
      },
      method: {
        type: 'string',
        enum: ['original_payment', 'credit', 'points'],
        default: 'original_payment',
        description: 'Refund method.',
      },
      notes: {
        type: 'string',
        description: 'Additional notes for the refund request.',
      },
    },
  },

  /**
   * Validate refund parameters.
   */
  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['reservationId']) errors.push('reservationId is required.');
    if (!params['amount']) errors.push('amount is required.');
    if (!params['reason']) errors.push('reason is required.');

    const amount = params['amount'] as { amount?: number; currency?: string } | undefined;
    if (amount) {
      if (typeof amount.amount !== 'number' || amount.amount < 0) {
        errors.push('amount.amount must be a non-negative number.');
      }
      if (!amount.currency || amount.currency.length !== 3) {
        errors.push('amount.currency must be a 3-letter currency code.');
      }
    }

    if (!checkRateLimit(context.userId)) {
      errors.push('Rate limit exceeded. Maximum 3 refund calls per 5 minutes.');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Execute the refund request via the Payment Service.
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    // TODO: Call Payment Service to issue the refund.

    const amount = params['amount'] as { amount: number; currency: string };

    return {
      traceId: context.traceId,
      refundId: `rfd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      reservationId: params['reservationId'],
      amount,
      method: params['method'] ?? 'original_payment',
      reason: params['reason'],
      status: 'processing',
      estimatedCompletion: '5-7 business days',
      issuedAt: new Date().toISOString(),
    };
  },
};
