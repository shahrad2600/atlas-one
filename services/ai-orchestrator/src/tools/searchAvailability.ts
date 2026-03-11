/**
 * Atlas One -- searchAvailability Tool
 *
 * Searches real-time inventory across dining, stays, and experiences.
 * This is the primary query tool that agents MUST call before claiming
 * any inventory is available (anti-hallucination enforcement).
 *
 * Design invariant: Query tool -- does not mutate state.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Execution context passed to every tool call. */
export interface ToolContext {
  tripId: string;
  userId: string;
  traceId: string;
}

/** Outcome of parameter validation. */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Standard tool definition shape. */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (params: Record<string, unknown>, context: ToolContext) => Promise<unknown>;
  validate: (params: Record<string, unknown>, context: ToolContext) => Promise<ValidationResult>;
}

/** Rate limit state tracker. */
interface RateLimitState {
  windowStart: number;
  count: number;
}

// ---------------------------------------------------------------------------
// Rate Limiter
// ---------------------------------------------------------------------------

const rateLimitMap = new Map<string, RateLimitState>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_CALLS = 100; // query tool limit

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

export const searchAvailabilityTool: ToolDefinition = {
  name: 'searchAvailability',

  description:
    'Search real-time inventory availability across dining, stays, and experiences. ' +
    'Returns verified availability from the inventory service. Agents MUST call this ' +
    'tool before claiming any inventory is available.',

  parameters: {
    type: 'object',
    required: ['category', 'destination', 'date'],
    properties: {
      category: {
        type: 'string',
        enum: ['dining', 'stay', 'experience'],
        description: 'The inventory category to search.',
      },
      destination: {
        type: 'string',
        description: 'Destination city or region.',
      },
      date: {
        type: 'string',
        format: 'date',
        description: 'The target date (YYYY-MM-DD).',
      },
      time: {
        type: 'string',
        pattern: '^\\d{2}:\\d{2}$',
        description: 'Preferred time (HH:MM). Required for dining.',
      },
      partySize: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        description: 'Number of guests / travelers.',
      },
      filters: {
        type: 'object',
        description: 'Category-specific filters.',
        properties: {
          cuisineTypes: { type: 'array', items: { type: 'string' } },
          priceRange: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
              currency: { type: 'string' },
            },
          },
          amenities: { type: 'array', items: { type: 'string' } },
          accessibilityRequired: { type: 'boolean' },
          stayType: { type: 'array', items: { type: 'string' } },
          rooms: { type: 'integer', minimum: 1 },
          checkOut: { type: 'string', format: 'date' },
        },
      },
      radius: {
        type: 'object',
        properties: {
          value: { type: 'number' },
          unit: { type: 'string', enum: ['km', 'mi'] },
        },
      },
      sortBy: {
        type: 'string',
        enum: ['price', 'rating', 'distance', 'match_score', 'availability'],
        description: 'Sort order for results.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        default: 20,
        description: 'Maximum number of results to return.',
      },
    },
  },

  /**
   * Validate search parameters before execution.
   */
  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // Required fields.
    if (!params['category']) errors.push('category is required.');
    if (!params['destination']) errors.push('destination is required.');
    if (!params['date']) errors.push('date is required.');

    // Category-specific validation.
    if (params['category'] === 'dining' && !params['time']) {
      errors.push('time is required for dining searches.');
    }

    // Date format validation.
    if (params['date'] && typeof params['date'] === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(params['date'])) {
        errors.push('date must be in YYYY-MM-DD format.');
      }
    }

    // Rate limit check.
    if (!checkRateLimit(context.userId)) {
      errors.push('Rate limit exceeded. Maximum 100 search calls per minute.');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Execute the availability search against the inventory service.
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    // TODO: Call the Inventory Service API.
    //
    // Example:
    //   const response = await inventoryClient.search({
    //     category: params.category,
    //     destination: params.destination,
    //     date: params.date,
    //     time: params.time,
    //     partySize: params.partySize,
    //     filters: params.filters,
    //   });
    //   return response.results;

    return {
      traceId: context.traceId,
      category: params['category'],
      destination: params['destination'],
      date: params['date'],
      results: [],
      totalCount: 0,
      searchedAt: new Date().toISOString(),
    };
  },
};
