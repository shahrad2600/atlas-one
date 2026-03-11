/**
 * Atlas One -- getDisruptionSignals Tool
 *
 * Fetches current disruption data from multiple sources: weather services,
 * airline operations, venue status feeds, strike/protest trackers, and
 * health advisory systems.
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

export const getDisruptionSignalsTool: ToolDefinition = {
  name: 'getDisruptionSignals',

  description:
    'Fetch current disruption signals for a destination, route, or specific booking. ' +
    'Aggregates data from weather services, airline operations, venue status feeds, ' +
    'strike trackers, and health advisory systems.',

  parameters: {
    type: 'object',
    properties: {
      destination: {
        type: 'string',
        description: 'Destination city or region to check.',
      },
      route: {
        type: 'object',
        properties: {
          origin: { type: 'string' },
          destination: { type: 'string' },
        },
        description: 'Flight route to check for disruptions.',
      },
      bookingIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Specific booking IDs to check against disruption signals.',
      },
      dateRange: {
        type: 'object',
        required: ['start', 'end'],
        properties: {
          start: { type: 'string', format: 'date' },
          end: { type: 'string', format: 'date' },
        },
        description: 'Date range to check for disruptions.',
      },
      signalTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['weather', 'airline_ops', 'venue_closure', 'strike', 'natural_disaster', 'political', 'health_advisory'],
        },
        description: 'Filter by specific signal types. Defaults to all.',
      },
      minSeverity: {
        type: 'string',
        enum: ['advisory', 'watch', 'warning', 'emergency'],
        default: 'advisory',
        description: 'Minimum severity level to include.',
      },
    },
  },

  /**
   * Validate disruption query parameters.
   */
  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // At least one scope must be provided.
    if (!params['destination'] && !params['route'] && !params['bookingIds']) {
      errors.push('At least one of destination, route, or bookingIds is required.');
    }

    // Validate date range if provided.
    const dateRange = params['dateRange'] as { start?: string; end?: string } | undefined;
    if (dateRange) {
      if (!dateRange.start || !dateRange.end) {
        errors.push('dateRange requires both start and end dates.');
      } else if (new Date(dateRange.end) < new Date(dateRange.start)) {
        errors.push('dateRange.end must be after dateRange.start.');
      }
    }

    if (!checkRateLimit(context.userId)) {
      errors.push('Rate limit exceeded. Maximum 100 disruption signal calls per minute.');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Fetch disruption signals from aggregated data sources.
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    // TODO: Aggregate from multiple disruption data sources:
    // - Weather API (OpenWeatherMap, AccuWeather)
    // - Airline operations (FlightAware, OAG)
    // - Venue status feeds (partner APIs)
    // - Strike/protest trackers
    // - WHO/CDC health advisories

    return {
      traceId: context.traceId,
      signals: [],
      totalCount: 0,
      sources: ['weather', 'airline_ops', 'venue_status', 'advisory'],
      queriedAt: new Date().toISOString(),
      destination: params['destination'] ?? null,
      route: params['route'] ?? null,
    };
  },
};
