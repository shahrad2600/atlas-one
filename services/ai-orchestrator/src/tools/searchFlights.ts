/**
 * Atlas One -- searchFlights Tool
 *
 * Searches flight offers across multiple GDS providers and direct airline
 * APIs. Returns results with pricing, schedule, disruption risk assessment,
 * and seat availability.
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

export const searchFlightsTool: ToolDefinition = {
  name: 'searchFlights',

  description:
    'Search flight offers across multiple carriers, alliances, and booking classes. ' +
    'Returns verified availability with pricing, schedule details, disruption risk ' +
    'assessment, and remaining seat count.',

  parameters: {
    type: 'object',
    required: ['origin', 'destination', 'departureDate', 'passengers'],
    properties: {
      origin: {
        type: 'string',
        description: 'Origin airport IATA code (e.g., "JFK").',
      },
      destination: {
        type: 'string',
        description: 'Destination airport IATA code (e.g., "LHR").',
      },
      departureDate: {
        type: 'string',
        format: 'date',
        description: 'Departure date (YYYY-MM-DD).',
      },
      returnDate: {
        type: 'string',
        format: 'date',
        description: 'Return date for round-trip searches (YYYY-MM-DD).',
      },
      passengers: {
        type: 'object',
        required: ['adults'],
        properties: {
          adults: { type: 'integer', minimum: 1, maximum: 9 },
          children: { type: 'integer', minimum: 0, maximum: 9 },
          infants: { type: 'integer', minimum: 0, maximum: 4 },
        },
        description: 'Passenger counts by type.',
      },
      cabinClass: {
        type: 'string',
        enum: ['economy', 'premium_economy', 'business', 'first'],
        default: 'economy',
        description: 'Cabin class preference.',
      },
      directOnly: {
        type: 'boolean',
        default: false,
        description: 'Only return direct (non-stop) flights.',
      },
      maxStops: {
        type: 'integer',
        minimum: 0,
        maximum: 3,
        description: 'Maximum number of stops allowed.',
      },
      preferredCarriers: {
        type: 'array',
        items: { type: 'string' },
        description: 'Preferred airline IATA codes.',
      },
      excludeCarriers: {
        type: 'array',
        items: { type: 'string' },
        description: 'Airline IATA codes to exclude.',
      },
      maxPrice: {
        type: 'object',
        properties: {
          amount: { type: 'number' },
          currency: { type: 'string' },
        },
        description: 'Maximum total price filter.',
      },
      flexibleDates: {
        type: 'boolean',
        default: false,
        description: 'Include results for nearby dates.',
      },
      flexDaysRange: {
        type: 'integer',
        minimum: 1,
        maximum: 7,
        default: 3,
        description: 'Number of days to flex in each direction.',
      },
      includeDisruptionRisk: {
        type: 'boolean',
        default: true,
        description: 'Include disruption risk assessment per offer.',
      },
      sortBy: {
        type: 'string',
        enum: ['price', 'duration', 'departure_time', 'arrival_time', 'disruption_risk'],
        default: 'price',
        description: 'Sort order for results.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 50,
        default: 20,
        description: 'Maximum number of results.',
      },
    },
  },

  /**
   * Validate flight search parameters.
   */
  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['origin']) errors.push('origin is required.');
    if (!params['destination']) errors.push('destination is required.');
    if (!params['departureDate']) errors.push('departureDate is required.');
    if (!params['passengers']) errors.push('passengers is required.');

    // IATA code format.
    const iataRegex = /^[A-Z]{3}$/;
    if (params['origin'] && typeof params['origin'] === 'string' && !iataRegex.test(params['origin'])) {
      errors.push('origin must be a valid 3-letter IATA code.');
    }
    if (params['destination'] && typeof params['destination'] === 'string' && !iataRegex.test(params['destination'])) {
      errors.push('destination must be a valid 3-letter IATA code.');
    }

    // Same origin and destination.
    if (params['origin'] === params['destination']) {
      errors.push('origin and destination must be different.');
    }

    // Date validation.
    if (params['departureDate'] && typeof params['departureDate'] === 'string') {
      const depDate = new Date(params['departureDate']);
      if (depDate < new Date(new Date().toDateString())) {
        errors.push('departureDate must be in the future.');
      }
    }

    // Return date must be after departure.
    if (params['returnDate'] && params['departureDate']) {
      if (new Date(params['returnDate'] as string) <= new Date(params['departureDate'] as string)) {
        errors.push('returnDate must be after departureDate.');
      }
    }

    // Passenger validation.
    const pax = params['passengers'] as { adults?: number; infants?: number } | undefined;
    if (pax) {
      if (!pax.adults || pax.adults < 1) {
        errors.push('At least 1 adult passenger is required.');
      }
      if (pax.infants && pax.adults && pax.infants > pax.adults) {
        errors.push('Number of infants cannot exceed number of adults.');
      }
    }

    if (!checkRateLimit(context.userId)) {
      errors.push('Rate limit exceeded. Maximum 100 flight search calls per minute.');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Execute the flight search across GDS providers and airline APIs.
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    // TODO: Call flight search aggregator (Amadeus, Sabre, direct APIs).

    return {
      traceId: context.traceId,
      origin: params['origin'],
      destination: params['destination'],
      departureDate: params['departureDate'],
      returnDate: params['returnDate'] ?? null,
      offers: [],
      totalCount: 0,
      sources: ['amadeus', 'sabre', 'direct_api'],
      searchedAt: new Date().toISOString(),
    };
  },
};
