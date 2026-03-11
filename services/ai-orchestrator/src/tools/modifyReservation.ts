/**
 * Atlas One -- modifyReservation Tool
 *
 * Modifies an existing reservation (date change, party size, preferences).
 * Validates against the modification policy and re-checks availability
 * before applying changes.
 *
 * Design invariant: Mutation tool -- rate-limited at 10 calls per minute.
 */

import type { ToolDefinition, ToolContext, ValidationResult } from './searchAvailability';

// ---------------------------------------------------------------------------
// Rate Limiter
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

export const modifyReservationTool: ToolDefinition = {
  name: 'modifyReservation',

  description:
    'Modify an existing reservation. Supports changes to date, time, party size, ' +
    'room type, special requests, and other booking attributes. Validates against ' +
    'the modification policy and checks availability at the new parameters.',

  parameters: {
    type: 'object',
    required: ['reservationId', 'modifications'],
    properties: {
      reservationId: {
        type: 'string',
        description: 'The reservation to modify.',
      },
      modifications: {
        type: 'object',
        description: 'Fields to modify. Only include fields that are changing.',
        properties: {
          date: { type: 'string', format: 'date' },
          time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          checkIn: { type: 'string', format: 'date' },
          checkOut: { type: 'string', format: 'date' },
          partySize: { type: 'integer', minimum: 1 },
          rooms: { type: 'integer', minimum: 1 },
          tablePreference: { type: 'string' },
          specialRequests: { type: 'string' },
          cabinClass: { type: 'string', enum: ['economy', 'premium_economy', 'business', 'first'] },
        },
      },
      reason: {
        type: 'string',
        description: 'Reason for the modification.',
      },
    },
  },

  /**
   * Validate modification parameters.
   */
  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['reservationId']) {
      errors.push('reservationId is required.');
    }

    if (!params['modifications'] || typeof params['modifications'] !== 'object') {
      errors.push('modifications object is required.');
    }

    const mods = params['modifications'] as Record<string, unknown> | undefined;
    if (mods && Object.keys(mods).length === 0) {
      errors.push('At least one modification field must be specified.');
    }

    // Validate date fields if present.
    if (mods) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      for (const field of ['date', 'checkIn', 'checkOut']) {
        if (mods[field] && typeof mods[field] === 'string' && !dateRegex.test(mods[field] as string)) {
          errors.push(`${field} must be in YYYY-MM-DD format.`);
        }
      }

      // checkOut must be after checkIn.
      if (mods['checkIn'] && mods['checkOut']) {
        if (new Date(mods['checkOut'] as string) <= new Date(mods['checkIn'] as string)) {
          errors.push('checkOut must be after checkIn.');
        }
      }
    }

    if (!checkRateLimit(context.userId)) {
      errors.push('Rate limit exceeded. Maximum 10 modification calls per minute.');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Execute the reservation modification.
   *
   * Flow:
   * 1. Fetch the current reservation.
   * 2. Check the modification policy.
   * 3. Verify availability at the new parameters.
   * 4. Apply modifications via Commerce Service.
   * 5. Return updated reservation with cost difference.
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    // TODO: Call Commerce Service to modify the reservation.

    return {
      traceId: context.traceId,
      reservationId: params['reservationId'],
      status: 'modified',
      modifications: params['modifications'],
      costDifference: { amount: 0, currency: 'USD' },
      changeFee: { amount: 0, currency: 'USD' },
      modifiedAt: new Date().toISOString(),
    };
  },
};
