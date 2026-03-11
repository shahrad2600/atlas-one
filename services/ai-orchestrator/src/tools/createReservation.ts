/**
 * Atlas One -- createReservation Tool
 *
 * Creates a new booking through the Commerce Service. Requires a prior
 * searchAvailability call to have confirmed inventory exists (enforced
 * by the Orchestrator's anti-hallucination check).
 *
 * Design invariant: Mutation tool -- modifies state. Rate-limited at
 * 10 calls per minute per user.
 */

import type { ToolDefinition, ToolContext, ValidationResult } from './searchAvailability';

// ---------------------------------------------------------------------------
// Rate Limiter (mutation-tier)
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

export const createReservationTool: ToolDefinition = {
  name: 'createReservation',

  description:
    'Create a new reservation through the Commerce Service. Supports dining, ' +
    'stay, experience, and flight bookings. Requires prior availability ' +
    'verification via searchAvailability.',

  parameters: {
    type: 'object',
    required: ['type', 'tripId'],
    properties: {
      type: {
        type: 'string',
        enum: ['dining', 'stay', 'experience', 'flight'],
        description: 'Booking category.',
      },
      tripId: {
        type: 'string',
        description: 'Trip to associate this reservation with.',
      },
      venueId: {
        type: 'string',
        description: 'Venue or property identifier (dining, stay, experience).',
      },
      offerId: {
        type: 'string',
        description: 'Flight offer identifier (flights only).',
      },
      date: {
        type: 'string',
        format: 'date',
        description: 'Reservation date (YYYY-MM-DD).',
      },
      time: {
        type: 'string',
        pattern: '^\\d{2}:\\d{2}$',
        description: 'Reservation time (HH:MM).',
      },
      checkIn: {
        type: 'string',
        format: 'date',
        description: 'Check-in date for stays.',
      },
      checkOut: {
        type: 'string',
        format: 'date',
        description: 'Check-out date for stays.',
      },
      partySize: {
        type: 'integer',
        minimum: 1,
        description: 'Number of guests.',
      },
      tablePreference: {
        type: 'string',
        description: 'Table preference for dining.',
      },
      rooms: {
        type: 'integer',
        minimum: 1,
        description: 'Number of rooms for stays.',
      },
      passengers: {
        type: 'object',
        description: 'Passenger details for flights.',
        properties: {
          adults: { type: 'integer' },
          children: { type: 'integer' },
          infants: { type: 'integer' },
        },
      },
      specialRequests: {
        type: 'string',
        description: 'Free-text special requests.',
      },
      paymentMethodId: {
        type: 'string',
        description: 'Payment method to charge.',
      },
      rebookingOf: {
        type: 'string',
        description: 'Original reservation ID if this is a rebook.',
      },
    },
  },

  /**
   * Validate reservation parameters before execution.
   */
  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['type']) errors.push('type is required.');
    if (!params['tripId']) errors.push('tripId is required.');

    const type = params['type'] as string;

    // Category-specific required fields.
    switch (type) {
      case 'dining':
        if (!params['venueId']) errors.push('venueId is required for dining.');
        if (!params['date']) errors.push('date is required for dining.');
        if (!params['time']) errors.push('time is required for dining.');
        if (!params['partySize']) errors.push('partySize is required for dining.');
        break;
      case 'stay':
        if (!params['venueId']) errors.push('venueId is required for stays.');
        if (!params['checkIn']) errors.push('checkIn is required for stays.');
        if (!params['checkOut']) errors.push('checkOut is required for stays.');
        break;
      case 'experience':
        if (!params['venueId']) errors.push('venueId is required for experiences.');
        if (!params['date']) errors.push('date is required for experiences.');
        break;
      case 'flight':
        if (!params['offerId']) errors.push('offerId is required for flights.');
        break;
    }

    // Rate limit check.
    if (!checkRateLimit(context.userId)) {
      errors.push('Rate limit exceeded. Maximum 10 reservation calls per minute.');
    }

    return { valid: errors.length === 0, errors };
  },

  /**
   * Execute the reservation creation via the Commerce Service.
   */
  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    // TODO: Call the Commerce Service API.
    //
    // Example:
    //   const response = await commerceClient.createReservation({
    //     ...params,
    //     userId: context.userId,
    //   });
    //   return response;

    return {
      traceId: context.traceId,
      reservationId: `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      type: params['type'],
      tripId: params['tripId'],
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };
  },
};
