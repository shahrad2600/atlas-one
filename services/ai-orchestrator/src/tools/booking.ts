/**
 * Atlas One -- Booking Tools
 *
 * Consolidated booking/mutation tools for the AI orchestrator:
 * createReservationChat, cancelReservationChat, modifyReservationChat,
 * checkAvailabilityChat. Each returns realistic mock data.
 *
 * Design invariant: Mutation tools -- state-changing operations with
 * lower rate limits and stricter validation.
 */

import type { ToolDefinition, ToolContext, ValidationResult } from './searchAvailability.js';

// ---------------------------------------------------------------------------
// Rate Limiter (mutation tools -- lower limit)
// ---------------------------------------------------------------------------

interface RateLimitState {
  windowStart: number;
  count: number;
}

const bookingRateLimitMap = new Map<string, RateLimitState>();
const BOOKING_RATE_LIMIT_WINDOW_MS = 60_000;
const BOOKING_RATE_LIMIT_MAX_CALLS = 10;

function checkBookingRateLimit(userId: string): boolean {
  const now = Date.now();
  const state = bookingRateLimitMap.get(userId);

  if (!state || now - state.windowStart > BOOKING_RATE_LIMIT_WINDOW_MS) {
    bookingRateLimitMap.set(userId, { windowStart: now, count: 1 });
    return true;
  }

  if (state.count >= BOOKING_RATE_LIMIT_MAX_CALLS) {
    return false;
  }

  state.count++;
  return true;
}

// ---------------------------------------------------------------------------
// createReservationChat
// ---------------------------------------------------------------------------

export const createReservationChatTool: ToolDefinition = {
  name: 'createReservationChat',

  description:
    'Create a new reservation for dining, hotels, flights, or experiences. ' +
    'Requires explicit user confirmation before booking. Returns confirmation ' +
    'code, pricing breakdown, and cancellation policy.',

  parameters: {
    type: 'object',
    required: ['category', 'itemId', 'userId'],
    properties: {
      category: {
        type: 'string',
        enum: ['dining', 'hotel', 'flight', 'experience'],
        description: 'Booking category.',
      },
      itemId: {
        type: 'string',
        description: 'ID of the item to book (from search results).',
      },
      userId: {
        type: 'string',
        description: 'User making the reservation.',
      },
      tripId: {
        type: 'string',
        description: 'Associated trip ID.',
      },
      date: {
        type: 'string',
        format: 'date',
        description: 'Reservation date (YYYY-MM-DD).',
      },
      time: {
        type: 'string',
        description: 'Reservation time (for dining).',
      },
      guests: {
        type: 'integer',
        minimum: 1,
        description: 'Number of guests/travelers.',
      },
      specialRequests: {
        type: 'string',
        description: 'Special requests or preferences.',
      },
      paymentMethodId: {
        type: 'string',
        description: 'Payment method ID.',
      },
    },
  },

  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['category']) errors.push('category is required.');
    if (!params['itemId']) errors.push('itemId is required.');
    if (!params['userId']) errors.push('userId is required.');

    const validCategories = ['dining', 'hotel', 'flight', 'experience'];
    if (params['category'] && !validCategories.includes(params['category'] as string)) {
      errors.push(`category must be one of: ${validCategories.join(', ')}.`);
    }

    if (params['category'] === 'dining' && !params['time']) {
      errors.push('time is required for dining reservations.');
    }

    if (!checkBookingRateLimit(context.userId)) {
      errors.push('Rate limit exceeded. Maximum 10 booking operations per minute.');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    const category = params['category'] as string;
    const confirmationCode = `ATL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const reservationId = `res_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const categoryDetails: Record<string, unknown> = {};

    switch (category) {
      case 'dining':
        Object.assign(categoryDetails, {
          restaurant: 'Le Bernardin',
          date: params['date'] ?? '2026-03-21',
          time: params['time'] ?? '19:30',
          partySize: params['guests'] ?? 2,
          tableType: 'Indoor booth',
          menuNotes: 'Tasting menu available',
        });
        break;
      case 'hotel':
        Object.assign(categoryDetails, {
          property: 'Four Seasons Hotel New York Downtown',
          checkIn: params['date'] ?? '2026-03-20',
          checkOut: '2026-03-23',
          roomType: 'Deluxe King Room',
          guests: params['guests'] ?? 2,
          nights: 3,
        });
        break;
      case 'flight':
        Object.assign(categoryDetails, {
          airline: 'American Airlines',
          flightNumber: 'AA 100',
          route: 'JFK to LHR',
          date: params['date'] ?? '2026-03-20',
          departureTime: '19:00',
          arrivalTime: '07:15+1',
          passengers: params['guests'] ?? 1,
          cabinClass: 'economy',
          seatAssignment: '24A',
        });
        break;
      case 'experience':
        Object.assign(categoryDetails, {
          experience: 'Tower of London Priority Access',
          date: params['date'] ?? '2026-03-22',
          time: '10:00',
          participants: params['guests'] ?? 2,
          meetingPoint: 'Tower Hill entrance',
        });
        break;
    }

    return {
      traceId: context.traceId,
      reservationId,
      confirmationCode,
      category,
      status: 'confirmed',
      details: categoryDetails,
      pricing: {
        subtotal: category === 'hotel' ? 1245 : category === 'flight' ? 487 : category === 'dining' ? 185 : 84,
        taxes: category === 'hotel' ? 186.75 : category === 'flight' ? 72.50 : category === 'dining' ? 27.75 : 8.40,
        fees: category === 'hotel' ? 75 : category === 'flight' ? 35 : 0,
        total: category === 'hotel' ? 1506.75 : category === 'flight' ? 594.50 : category === 'dining' ? 212.75 : 92.40,
        currency: 'USD',
      },
      cancellation: {
        policy: category === 'hotel'
          ? 'Free cancellation until 48 hours before check-in'
          : category === 'flight'
            ? '24-hour risk-free cancellation'
            : category === 'dining'
              ? 'Free cancellation up to 2 hours before'
              : 'Free cancellation up to 24 hours before',
        deadline: new Date(Date.now() + 2 * 86400000).toISOString(),
      },
      specialRequests: params['specialRequests'] ?? null,
      createdAt: new Date().toISOString(),
      loyaltyPointsEarned: Math.floor((category === 'hotel' ? 1245 : 487) * 0.5),
    };
  },
};

// ---------------------------------------------------------------------------
// cancelReservationChat
// ---------------------------------------------------------------------------

export const cancelReservationChatTool: ToolDefinition = {
  name: 'cancelReservationChat',

  description:
    'Cancel an existing reservation. Evaluates cancellation policy, calculates refund amount, ' +
    'and identifies any linked bookings that may be affected.',

  parameters: {
    type: 'object',
    required: ['reservationId', 'userId'],
    properties: {
      reservationId: {
        type: 'string',
        description: 'The reservation ID to cancel.',
      },
      confirmationCode: {
        type: 'string',
        description: 'The confirmation code.',
      },
      userId: {
        type: 'string',
        description: 'User requesting cancellation.',
      },
      reason: {
        type: 'string',
        description: 'Reason for cancellation.',
      },
    },
  },

  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['reservationId'] && !params['confirmationCode']) {
      errors.push('Either reservationId or confirmationCode is required.');
    }
    if (!params['userId']) errors.push('userId is required.');

    if (!checkBookingRateLimit(context.userId)) {
      errors.push('Rate limit exceeded.');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    return {
      traceId: context.traceId,
      reservationId: params['reservationId'] ?? 'res_default',
      confirmationCode: params['confirmationCode'] ?? 'ATL-K8M4X2',
      cancellationId: `cxl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'cancelled',
      refund: {
        eligible: true,
        amount: 1481.75,
        currency: 'USD',
        method: 'Original payment method (Visa ending in 4242)',
        serviceFeeDeducted: 25.00,
        estimatedArrival: '5-10 business days',
      },
      linkedBookingsImpacted: [
        {
          type: 'dining',
          confirmationCode: 'DIN-X4R8N2',
          description: 'Le Bernardin dinner Mar 21',
          impact: 'Still valid -- review if needed',
        },
      ],
      cancelledAt: new Date().toISOString(),
      reason: params['reason'] ?? 'User requested cancellation',
    };
  },
};

// ---------------------------------------------------------------------------
// modifyReservationChat
// ---------------------------------------------------------------------------

export const modifyReservationChatTool: ToolDefinition = {
  name: 'modifyReservationChat',

  description:
    'Modify an existing reservation (dates, room type, party size, etc.). ' +
    'Returns the updated reservation details and any price difference.',

  parameters: {
    type: 'object',
    required: ['reservationId', 'userId', 'modifications'],
    properties: {
      reservationId: {
        type: 'string',
        description: 'The reservation ID to modify.',
      },
      confirmationCode: {
        type: 'string',
        description: 'The confirmation code.',
      },
      userId: {
        type: 'string',
        description: 'User requesting modification.',
      },
      modifications: {
        type: 'object',
        description: 'Fields to modify.',
        properties: {
          date: { type: 'string', description: 'New date.' },
          time: { type: 'string', description: 'New time.' },
          checkIn: { type: 'string', description: 'New check-in date.' },
          checkOut: { type: 'string', description: 'New check-out date.' },
          guests: { type: 'integer', description: 'New guest count.' },
          roomType: { type: 'string', description: 'New room type.' },
          specialRequests: { type: 'string', description: 'Updated requests.' },
        },
      },
    },
  },

  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['reservationId'] && !params['confirmationCode']) {
      errors.push('Either reservationId or confirmationCode is required.');
    }
    if (!params['userId']) errors.push('userId is required.');
    if (!params['modifications']) errors.push('modifications object is required.');

    if (params['modifications'] && typeof params['modifications'] === 'object') {
      const mods = params['modifications'] as Record<string, unknown>;
      if (Object.keys(mods).length === 0) {
        errors.push('At least one modification field is required.');
      }
    }

    if (!checkBookingRateLimit(context.userId)) {
      errors.push('Rate limit exceeded.');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    const modifications = params['modifications'] as Record<string, unknown>;

    return {
      traceId: context.traceId,
      reservationId: params['reservationId'] ?? 'res_default',
      confirmationCode: params['confirmationCode'] ?? 'ATL-K8M4X2',
      modificationId: `mod_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      status: 'modified',
      previousDetails: {
        checkIn: '2026-03-20',
        checkOut: '2026-03-23',
        roomType: 'Deluxe King Room',
        guests: 2,
        total: 1506.75,
      },
      updatedDetails: {
        checkIn: (modifications['checkIn'] as string) ?? '2026-03-20',
        checkOut: (modifications['checkOut'] as string) ?? '2026-03-24',
        roomType: (modifications['roomType'] as string) ?? 'Deluxe King Room',
        guests: (modifications['guests'] as number) ?? 2,
        total: 1921.75,
      },
      priceDifference: {
        amount: 415.00,
        direction: 'increase',
        currency: 'USD',
        reason: 'Additional night added',
      },
      modificationFee: 0,
      modifiedAt: new Date().toISOString(),
      notes: 'Modification applied successfully. No modification fee for first change.',
    };
  },
};

// ---------------------------------------------------------------------------
// checkAvailabilityChat
// ---------------------------------------------------------------------------

export const checkAvailabilityChatTool: ToolDefinition = {
  name: 'checkAvailabilityChat',

  description:
    'Check real-time availability for a specific item (restaurant time slots, hotel rooms, ' +
    'flight seats, or experience spots). Returns detailed slot-level availability.',

  parameters: {
    type: 'object',
    required: ['category', 'itemId'],
    properties: {
      category: {
        type: 'string',
        enum: ['dining', 'hotel', 'flight', 'experience'],
        description: 'Item category.',
      },
      itemId: {
        type: 'string',
        description: 'ID of the item to check.',
      },
      date: {
        type: 'string',
        format: 'date',
        description: 'Date to check availability for.',
      },
      dates: {
        type: 'array',
        items: { type: 'string' },
        description: 'Multiple dates to check (for hotel/experience).',
      },
      guests: {
        type: 'integer',
        minimum: 1,
        description: 'Number of guests to check for.',
      },
    },
  },

  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['category']) errors.push('category is required.');
    if (!params['itemId']) errors.push('itemId is required.');

    if (!checkBookingRateLimit(context.userId)) {
      errors.push('Rate limit exceeded.');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    const category = params['category'] as string;
    const itemId = params['itemId'] as string;

    if (category === 'dining') {
      return {
        traceId: context.traceId,
        category,
        itemId,
        itemName: 'Le Bernardin',
        date: params['date'] ?? new Date(Date.now() + 86400000).toISOString().split('T')[0],
        availability: [
          { time: '17:30', available: true, partyMax: 4 },
          { time: '18:00', available: true, partyMax: 6 },
          { time: '19:00', available: false, partyMax: 0, waitlistAvailable: true },
          { time: '19:30', available: true, partyMax: 2 },
          { time: '20:30', available: true, partyMax: 4 },
          { time: '21:00', available: false, partyMax: 0, waitlistAvailable: false },
        ],
        checkedAt: new Date().toISOString(),
      };
    }

    if (category === 'hotel') {
      return {
        traceId: context.traceId,
        category,
        itemId,
        itemName: 'Four Seasons Hotel New York Downtown',
        roomTypes: [
          { type: 'Deluxe King', available: true, rate: 415, remaining: 3 },
          { type: 'Premier Suite', available: true, rate: 695, remaining: 1 },
          { type: 'One Bedroom Suite', available: true, rate: 895, remaining: 2 },
          { type: 'Presidential Suite', available: false, rate: 2500, remaining: 0 },
        ],
        checkedAt: new Date().toISOString(),
      };
    }

    if (category === 'flight') {
      return {
        traceId: context.traceId,
        category,
        itemId,
        itemName: 'AA 100 JFK-LHR',
        cabins: [
          { class: 'Economy', available: true, seatsRemaining: 12, price: 487 },
          { class: 'Premium Economy', available: true, seatsRemaining: 6, price: 892 },
          { class: 'Business', available: true, seatsRemaining: 4, price: 3250 },
          { class: 'First', available: false, seatsRemaining: 0, price: 8500 },
        ],
        checkedAt: new Date().toISOString(),
      };
    }

    // Experience
    const dates = (params['dates'] as string[]) ?? [
      new Date(Date.now() + 86400000).toISOString().split('T')[0],
    ];

    return {
      traceId: context.traceId,
      category,
      itemId,
      itemName: 'Tower of London Priority Access',
      availability: dates.map((date: string, i: number) => ({
        date,
        slots: [
          { time: '09:00', spotsRemaining: Math.max(0, 12 - i * 3), available: i < 4 },
          { time: '13:00', spotsRemaining: Math.max(0, 8 - i * 2), available: i < 3 },
          { time: '16:00', spotsRemaining: Math.max(0, 15 - i * 2), available: true },
        ],
      })),
      checkedAt: new Date().toISOString(),
    };
  },
};
