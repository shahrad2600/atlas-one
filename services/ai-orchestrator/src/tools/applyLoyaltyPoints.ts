/**
 * Atlas One -- applyLoyaltyPoints Tool
 *
 * Applies or redeems loyalty points from various programs toward a booking.
 * Validates point balance, calculates redemption value, and executes the
 * redemption through the Loyalty Service.
 *
 * Design invariant: Mutation tool -- rate-limited at 10 calls per minute.
 */

import type { ToolDefinition, ToolContext, ValidationResult } from './searchAvailability';

// ---------------------------------------------------------------------------
// Rate Limiter (mutation tier)
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, { windowStart: number; count: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_CALLS = 10;

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

export const applyLoyaltyPointsTool: ToolDefinition = {
  name: 'applyLoyaltyPoints',

  description:
    'Apply or redeem loyalty points toward a booking. Supports multiple loyalty ' +
    'programs (airline miles, hotel points, Atlas rewards). Validates balance, ' +
    'calculates cash-equivalent value, and processes the redemption.',

  parameters: {
    type: 'object',
    required: ['programId', 'reservationId', 'pointsToRedeem'],
    properties: {
      programId: {
        type: 'string',
        description: 'Loyalty program identifier.',
      },
      reservationId: {
        type: 'string',
        description: 'Reservation to apply points toward.',
      },
      pointsToRedeem: {
        type: 'integer',
        minimum: 1,
        description: 'Number of points to redeem.',
      },
      redemptionType: {
        type: 'string',
        enum: ['full_payment', 'partial_payment', 'upgrade', 'addon'],
        default: 'partial_payment',
        description: 'How the points should be applied.',
      },
      combinedPayment: {
        type: 'boolean',
        default: true,
        description: 'Allow combining points with cash payment for remaining balance.',
      },
    },
  },

  /**
   * Validate loyalty point redemption parameters.
   */
  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['programId']) errors.push('programId is required.');
    if (!params['reservationId']) errors.push('reservationId is required.');
    if (!params['pointsToRedeem']) errors.push('pointsToRedeem is required.');

    const points = params['pointsToRedeem'] as number | undefined;
    if (points !== undefined && (typeof points !== 'number' || points < 1)) {
      errors.push('pointsToRedeem must be a positive integer.');
    }

    if (!checkRateLimit(context.userId)) {
      errors.push('Rate limit exceeded. Maximum 10 loyalty calls per minute.');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Execute the loyalty point redemption via the Loyalty Service.
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    // TODO: Call the Loyalty Service API to:
    // 1. Verify point balance.
    // 2. Calculate cash-equivalent value.
    // 3. Apply toward the reservation.
    // 4. Deduct points from account.

    const pointsToRedeem = params['pointsToRedeem'] as number;

    return {
      traceId: context.traceId,
      redemptionId: `rdm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      programId: params['programId'],
      reservationId: params['reservationId'],
      pointsRedeemed: pointsToRedeem,
      cashValue: { amount: pointsToRedeem * 0.01, currency: 'USD' },
      remainingBalance: 0,
      redemptionType: params['redemptionType'] ?? 'partial_payment',
      status: 'applied',
      appliedAt: new Date().toISOString(),
    };
  },
};
