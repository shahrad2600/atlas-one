/**
 * Atlas One -- getInsuranceQuotes Tool
 *
 * Fetches insurance quotes from available providers based on the trip's
 * risk profile, destination, dates, and traveler details.
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

export const getInsuranceQuotesTool: ToolDefinition = {
  name: 'getInsuranceQuotes',

  description:
    'Fetch insurance quotes from available providers. Supports trip cancellation, ' +
    'medical, baggage, delay, interruption, and evacuation coverage types. Returns ' +
    'quotes matched to the trip risk profile.',

  parameters: {
    type: 'object',
    required: ['tripId', 'destination', 'dates', 'travelers'],
    properties: {
      tripId: {
        type: 'string',
        description: 'Trip to get insurance quotes for.',
      },
      destination: {
        type: 'string',
        description: 'Travel destination country or region.',
      },
      dates: {
        type: 'object',
        required: ['departure', 'return'],
        properties: {
          departure: { type: 'string', format: 'date' },
          return: { type: 'string', format: 'date' },
        },
        description: 'Trip dates.',
      },
      travelers: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            age: { type: 'integer', minimum: 0, maximum: 120 },
            residenceCountry: { type: 'string' },
            preExistingConditions: { type: 'boolean' },
          },
        },
        description: 'Traveler details for quoting.',
      },
      tripCost: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          currency: { type: 'string' },
        },
        description: 'Total trip cost for cancellation coverage calculation.',
      },
      coverageTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['trip_cancellation', 'medical', 'baggage', 'delay', 'interruption', 'evacuation'],
        },
        description: 'Specific coverage types to quote. Defaults to all.',
      },
      maxPremium: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          currency: { type: 'string' },
        },
        description: 'Maximum premium budget.',
      },
    },
  },

  /**
   * Validate insurance quote parameters.
   */
  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['tripId']) errors.push('tripId is required.');
    if (!params['destination']) errors.push('destination is required.');
    if (!params['dates']) errors.push('dates is required.');
    if (!params['travelers']) errors.push('travelers is required.');

    const travelers = params['travelers'] as unknown[] | undefined;
    if (travelers && travelers.length === 0) {
      errors.push('At least one traveler is required.');
    }

    const dates = params['dates'] as { departure?: string; return?: string } | undefined;
    if (dates) {
      if (!dates.departure || !dates.return) {
        errors.push('Both departure and return dates are required.');
      }
      if (dates.departure && dates.return && new Date(dates.return) <= new Date(dates.departure)) {
        errors.push('Return date must be after departure date.');
      }
    }

    if (!checkRateLimit(context.userId)) {
      errors.push('Rate limit exceeded.');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Fetch insurance quotes from provider APIs.
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    // TODO: Call insurance provider APIs (Allianz, AIG, World Nomads, etc.).

    return {
      traceId: context.traceId,
      tripId: params['tripId'],
      destination: params['destination'],
      quotes: [],
      totalQuotes: 0,
      providers: ['allianz', 'aig', 'world_nomads'],
      quotedAt: new Date().toISOString(),
    };
  },
};
