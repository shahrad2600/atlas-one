/**
 * Atlas One -- fetchPolicy Tool
 *
 * Fetches applicable policies (cancellation, refund, modification, dispute
 * resolution, insurance) from the Policy Store. Used by guards and agents
 * to validate actions against business rules.
 *
 * Design invariant: Query tool -- does not mutate state.
 */

import type { ToolDefinition, ToolContext, ValidationResult } from './searchAvailability';

// ---------------------------------------------------------------------------
// Rate Limiter (query tier)
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { windowStart: number; count: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_CALLS = 100;

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

export const fetchPolicyTool: ToolDefinition = {
  name: 'fetchPolicy',

  description:
    'Fetch applicable policies from the Policy Store. Supports cancellation, ' +
    'refund, modification, dispute resolution, damage protection, and insurance ' +
    'policies. Policies are returned with their full terms and conditions.',

  parameters: {
    type: 'object',
    required: ['policyType'],
    properties: {
      policyType: {
        type: 'string',
        enum: [
          'cancellation',
          'refund',
          'modification',
          'dispute_resolution',
          'damage_protection',
          'insurance',
          'loyalty',
        ],
        description: 'Type of policy to fetch.',
      },
      reservationId: {
        type: 'string',
        description: 'Reservation to fetch the policy for. The policy is resolved from the reservation partner.',
      },
      policyId: {
        type: 'string',
        description: 'Direct policy ID when known.',
      },
      partnerId: {
        type: 'string',
        description: 'Partner ID to fetch default policies for.',
      },
      category: {
        type: 'string',
        enum: ['dining', 'stay', 'experience', 'flight'],
        description: 'Booking category to scope the policy lookup.',
      },
    },
  },

  /**
   * Validate policy fetch parameters.
   */
  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['policyType']) {
      errors.push('policyType is required.');
    }

    // At least one identifier must be provided.
    if (!params['reservationId'] && !params['policyId'] && !params['partnerId']) {
      errors.push('At least one of reservationId, policyId, or partnerId is required.');
    }

    if (!checkRateLimit(context.userId)) {
      errors.push('Rate limit exceeded. Maximum 100 policy fetch calls per minute.');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Fetch the policy from the Policy Store.
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    // TODO: Call the Policy Store service.

    return {
      traceId: context.traceId,
      policyId: params['policyId'] ?? `pol_${Date.now().toString(36)}`,
      policyType: params['policyType'],
      applicableTo: params['reservationId'] ?? params['partnerId'] ?? null,
      terms: {
        cancellationWindow: '24 hours before check-in',
        refundPercentage: 100,
        penaltyAfterWindow: 'first night charge',
        modificationAllowed: true,
        modificationFee: { amount: 0, currency: 'USD' },
      },
      effectiveFrom: '2025-01-01T00:00:00Z',
      effectiveUntil: null,
      fetchedAt: new Date().toISOString(),
    };
  },
};
