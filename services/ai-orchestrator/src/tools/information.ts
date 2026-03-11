/**
 * Atlas One -- Information Tools
 *
 * Consolidated information/lookup tools for the AI orchestrator:
 * getPolicyChat, getTravelAdvisories, getInsuranceQuotesChat,
 * getFlightStatusChat. Each returns realistic mock data.
 *
 * Design invariant: Query tools -- do not mutate state.
 */

import type { ToolDefinition, ToolContext, ValidationResult } from './searchAvailability.js';

// ---------------------------------------------------------------------------
// Rate Limiter (query tools -- higher limit)
// ---------------------------------------------------------------------------

interface RateLimitState {
  windowStart: number;
  count: number;
}

const infoRateLimitMap = new Map<string, RateLimitState>();
const INFO_RATE_LIMIT_WINDOW_MS = 60_000;
const INFO_RATE_LIMIT_MAX_CALLS = 100;

function checkInfoRateLimit(userId: string): boolean {
  const now = Date.now();
  const state = infoRateLimitMap.get(userId);

  if (!state || now - state.windowStart > INFO_RATE_LIMIT_WINDOW_MS) {
    infoRateLimitMap.set(userId, { windowStart: now, count: 1 });
    return true;
  }

  if (state.count >= INFO_RATE_LIMIT_MAX_CALLS) {
    return false;
  }

  state.count++;
  return true;
}

// ---------------------------------------------------------------------------
// getPolicyChat
// ---------------------------------------------------------------------------

export const getPolicyChatTool: ToolDefinition = {
  name: 'getPolicyChat',

  description:
    'Look up Atlas One policies for cancellation, refund, modification, baggage, ' +
    'and insurance. Returns policy conditions, exceptions, and relevant details.',

  parameters: {
    type: 'object',
    required: ['area'],
    properties: {
      area: {
        type: 'string',
        enum: ['cancellation', 'refund', 'modification', 'baggage', 'insurance', 'general'],
        description: 'Policy area to look up.',
      },
      category: {
        type: 'string',
        enum: ['hotel', 'flight', 'dining', 'experience'],
        description: 'Booking category for category-specific policies.',
      },
      reservationId: {
        type: 'string',
        description: 'Optional reservation ID for booking-specific policy lookup.',
      },
    },
  },

  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['area'] || typeof params['area'] !== 'string') {
      errors.push('area is required.');
    }

    const validAreas = ['cancellation', 'refund', 'modification', 'baggage', 'insurance', 'general'];
    if (params['area'] && !validAreas.includes(params['area'] as string)) {
      errors.push(`area must be one of: ${validAreas.join(', ')}.`);
    }

    if (!checkInfoRateLimit(context.userId)) {
      errors.push('Rate limit exceeded.');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    const area = params['area'] as string;

    const policies: Record<string, unknown> = {
      cancellation: {
        area: 'cancellation',
        lastUpdated: '2026-02-01',
        policies: [
          {
            title: 'Hotel Cancellations',
            description: 'Most hotel bookings can be cancelled free of charge up to 48 hours before check-in.',
            conditions: [
              'Cancellation must be made at least 48 hours before check-in time',
              'Non-refundable rates are excluded from free cancellation',
              'Group bookings (5+ rooms) require 14 days notice',
            ],
            exceptions: [
              'Medical emergencies with documentation: full refund at any time',
              'Natural disasters at destination: full refund or free rebooking',
              'Government travel restrictions: full refund within 30 days',
            ],
          },
          {
            title: 'Flight Cancellations',
            description: 'Airline cancellation policies vary by carrier and fare class.',
            conditions: [
              '24-hour risk-free cancellation for all flights (DOT regulation)',
              'After 24 hours, airline cancellation fees apply',
              'Atlas One Premium members get extended 72-hour cancellation',
            ],
            exceptions: [
              'Airline-initiated cancellations: full refund or free rebooking',
              'Significant schedule changes (>2 hours): refund eligible',
            ],
          },
          {
            title: 'Experience Cancellations',
            description: 'Cancellation windows vary by experience provider.',
            conditions: [
              'Most experiences: free cancellation 24 hours before start time',
              'Private tours: 48-72 hours notice required',
              'Non-refundable experiences are clearly marked at booking',
            ],
            exceptions: [
              'Weather-related cancellations: full refund or rebooking',
              'Provider cancellation: full refund and priority rebooking',
            ],
          },
        ],
      },
      refund: {
        area: 'refund',
        lastUpdated: '2026-02-01',
        policies: [
          {
            title: 'Refund Processing',
            description: 'Refunds are processed to the original payment method.',
            conditions: [
              'Refund amount depends on cancellation policy at time of booking',
              'Service fees ($25 per booking) are non-refundable',
              'Processing time: 5-10 business days',
              'Loyalty points used are restored within 48 hours',
            ],
            exceptions: [
              'Atlas One Premium members: service fee waived on first refund per year',
              'Expedited refund (1-2 business days) available for verified emergencies',
            ],
          },
        ],
      },
      modification: {
        area: 'modification',
        lastUpdated: '2026-02-01',
        policies: [
          {
            title: 'Booking Modifications',
            description: 'Most bookings can be modified up to 24 hours before the service date.',
            conditions: [
              'Date changes subject to availability and price difference',
              'Room type changes charged at the new rate',
              'Name changes allowed for hotels (not flights)',
              'One free modification per booking; subsequent changes may incur a $15 fee',
            ],
            exceptions: [
              'Flexible rate bookings: unlimited free modifications',
              'Atlas One Premium: two free modifications per booking',
            ],
          },
        ],
      },
      baggage: {
        area: 'baggage',
        lastUpdated: '2026-02-01',
        policies: [
          {
            title: 'Baggage Policies',
            description: 'Baggage allowances vary by airline and fare class.',
            conditions: [
              'Economy: typically 1 carry-on + 1 personal item',
              'Most transatlantic flights include 1 checked bag (23kg)',
              'Business/First: typically 2 checked bags (32kg each)',
              'Overweight fees: $75-200 per bag depending on airline',
            ],
            exceptions: [
              'Delayed/lost baggage: file claim within 21 days of flight',
              'Atlas One insurance covers up to $2,500 in baggage loss',
            ],
          },
        ],
      },
      insurance: {
        area: 'insurance',
        lastUpdated: '2026-02-01',
        policies: [
          {
            title: 'Travel Insurance Coverage',
            description: 'Atlas Shield insurance plans provide comprehensive travel protection.',
            conditions: [
              'Must be purchased before trip start date',
              'Pre-existing condition coverage requires waiver (Premium+ plans)',
              'Claims must be filed within 90 days of incident',
              'Medical claims require original receipts and documentation',
            ],
            exceptions: [
              'Cancel for any reason (CFAR) available on Premium and Platinum plans',
              'Extreme sports coverage available as add-on ($25)',
            ],
          },
        ],
      },
      general: {
        area: 'general',
        lastUpdated: '2026-02-01',
        policies: [
          {
            title: 'Atlas One General Terms',
            description: 'Atlas One acts as a booking intermediary. Individual provider terms also apply.',
            conditions: [
              'All bookings subject to availability at time of confirmation',
              'Prices guaranteed once booking is confirmed',
              'Communication preferences managed in account settings',
            ],
            exceptions: [
              'Price guarantee: lower price found within 24 hours = we match it',
              'Provider bankruptcy: refund protection up to $5,000',
            ],
          },
        ],
      },
    };

    return {
      traceId: context.traceId,
      ...(policies[area] ?? policies['general']) as Record<string, unknown>,
    };
  },
};

// ---------------------------------------------------------------------------
// getTravelAdvisories
// ---------------------------------------------------------------------------

export const getTravelAdvisoriesTool: ToolDefinition = {
  name: 'getTravelAdvisories',

  description:
    'Get current travel advisories, safety information, and entry requirements ' +
    'for a destination. Includes government advisories, health alerts, and security warnings.',

  parameters: {
    type: 'object',
    required: ['destination'],
    properties: {
      destination: {
        type: 'string',
        description: 'Country or city to check advisories for.',
      },
      origin: {
        type: 'string',
        description: 'Traveler origin country (for entry requirements).',
        default: 'United States',
      },
    },
  },

  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['destination'] || typeof params['destination'] !== 'string') {
      errors.push('destination is required and must be a string.');
    }

    if (!checkInfoRateLimit(context.userId)) {
      errors.push('Rate limit exceeded.');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    const destination = params['destination'] as string;

    return {
      traceId: context.traceId,
      destination,
      country: destination,
      overallLevel: 'Level 1 - Exercise Normal Precautions',
      lastUpdated: '2026-03-08',
      source: 'US Department of State',
      advisories: [
        {
          type: 'general',
          level: 'low',
          title: 'Standard Travel Advisory',
          description: `Exercise normal precautions in ${destination}.`,
          effectiveDate: '2026-01-15',
          regions: ['Nationwide'],
        },
        {
          type: 'health',
          level: 'low',
          title: 'Routine Vaccinations',
          description: 'Ensure routine vaccinations are up to date. No special health warnings.',
          effectiveDate: '2026-02-01',
          regions: ['Nationwide'],
        },
        {
          type: 'security',
          level: 'low',
          title: 'Standard Security Awareness',
          description: 'Be aware of pickpocketing in tourist areas. Avoid demonstrations.',
          effectiveDate: '2026-01-01',
          regions: ['Major cities'],
        },
      ],
      entryRequirements: {
        visaRequired: false,
        visaType: 'Visa waiver (6 months for US citizens)',
        passportValidity: 'Must be valid for duration of stay',
        covidRestrictions: 'None currently in effect',
        customsDeclaration: 'Standard customs form',
      },
      emergencyContacts: {
        localEmergency: '999',
        usEmbassy: '+44-20-7499-9000',
        atlasOneEmergency: '+1-888-555-ATLAS',
      },
    };
  },
};

// ---------------------------------------------------------------------------
// getInsuranceQuotesChat
// ---------------------------------------------------------------------------

export const getInsuranceQuotesChatTool: ToolDefinition = {
  name: 'getInsuranceQuotesChat',

  description:
    'Get travel insurance quotes for a trip. Returns multiple plan options with ' +
    'coverage details, pricing, exclusions, and recommendations.',

  parameters: {
    type: 'object',
    required: ['tripValue', 'destination', 'startDate', 'endDate'],
    properties: {
      tripValue: {
        type: 'number',
        description: 'Total trip value in USD.',
      },
      destination: {
        type: 'string',
        description: 'Travel destination.',
      },
      startDate: {
        type: 'string',
        format: 'date',
        description: 'Trip start date (YYYY-MM-DD).',
      },
      endDate: {
        type: 'string',
        format: 'date',
        description: 'Trip end date (YYYY-MM-DD).',
      },
      travelers: {
        type: 'integer',
        minimum: 1,
        maximum: 10,
        description: 'Number of travelers.',
        default: 1,
      },
      ages: {
        type: 'array',
        items: { type: 'integer' },
        description: 'Ages of travelers (affects premium).',
      },
    },
  },

  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['tripValue'] || typeof params['tripValue'] !== 'number') {
      errors.push('tripValue is required and must be a number.');
    }
    if (!params['destination']) errors.push('destination is required.');
    if (!params['startDate']) errors.push('startDate is required.');
    if (!params['endDate']) errors.push('endDate is required.');

    if (!checkInfoRateLimit(context.userId)) {
      errors.push('Rate limit exceeded.');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    const tripValue = params['tripValue'] as number;
    const travelers = (params['travelers'] as number) ?? 1;

    return {
      traceId: context.traceId,
      tripValue,
      destination: params['destination'],
      travelDates: { start: params['startDate'], end: params['endDate'] },
      travelers,
      quotes: [
        {
          id: 'ins_basic',
          provider: 'Atlas Shield Basic',
          premium: Math.round(tripValue * 0.014) * travelers,
          premiumPerPerson: Math.round(tripValue * 0.014),
          coverage: {
            tripCancellation: tripValue,
            tripInterruption: tripValue,
            medicalEmergency: 50000,
            emergencyEvacuation: 100000,
            baggageLoss: 1000,
            travelDelay: 500,
          },
          highlights: ['Trip cancellation', 'Emergency medical', 'Baggage loss', '24/7 hotline'],
          exclusions: ['Pre-existing conditions', 'Extreme sports', 'Cancel for any reason'],
          rating: 4.2,
        },
        {
          id: 'ins_premium',
          provider: 'Atlas Shield Premium',
          premium: Math.round(tripValue * 0.025) * travelers,
          premiumPerPerson: Math.round(tripValue * 0.025),
          coverage: {
            tripCancellation: Math.round(tripValue * 1.4),
            tripInterruption: Math.round(tripValue * 1.4),
            medicalEmergency: 250000,
            emergencyEvacuation: 500000,
            baggageLoss: 2500,
            travelDelay: 1500,
            cancelForAnyReason: Math.round(tripValue * 0.75),
          },
          highlights: ['Cancel for any reason (75%)', 'Enhanced medical', 'Pre-existing waiver', 'Concierge service'],
          exclusions: ['Intentional self-harm', 'Active conflict zones'],
          rating: 4.7,
        },
        {
          id: 'ins_platinum',
          provider: 'Atlas Shield Platinum',
          premium: Math.round(tripValue * 0.042) * travelers,
          premiumPerPerson: Math.round(tripValue * 0.042),
          coverage: {
            tripCancellation: Math.round(tripValue * 2),
            tripInterruption: Math.round(tripValue * 2),
            medicalEmergency: 1000000,
            emergencyEvacuation: 1000000,
            baggageLoss: 5000,
            travelDelay: 3000,
            cancelForAnyReason: tripValue,
            rentalCarDamage: 50000,
          },
          highlights: ['Maximum coverage', 'Cancel for any reason (100%)', 'Rental car', 'Private evacuation'],
          exclusions: ['Intentional self-harm'],
          rating: 4.9,
        },
      ],
      recommendation: 'ins_premium',
      recommendationReason: 'Best balance of coverage and value for your trip.',
    };
  },
};

// ---------------------------------------------------------------------------
// getFlightStatusChat
// ---------------------------------------------------------------------------

export const getFlightStatusChatTool: ToolDefinition = {
  name: 'getFlightStatusChat',

  description:
    'Get real-time flight status including departure/arrival times, gate information, ' +
    'delays, and terminal details.',

  parameters: {
    type: 'object',
    required: ['flightNumber'],
    properties: {
      flightNumber: {
        type: 'string',
        description: 'Flight number (e.g., "AA 100", "BA 178").',
      },
      date: {
        type: 'string',
        format: 'date',
        description: 'Flight date (YYYY-MM-DD). Defaults to today.',
      },
    },
  },

  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['flightNumber'] || typeof params['flightNumber'] !== 'string') {
      errors.push('flightNumber is required and must be a string.');
    }

    if (!checkInfoRateLimit(context.userId)) {
      errors.push('Rate limit exceeded.');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    const flightNumber = (params['flightNumber'] as string).toUpperCase().replace(/\s+/g, ' ');

    return {
      traceId: context.traceId,
      flightNumber,
      date: params['date'] ?? new Date().toISOString().split('T')[0],
      status: 'on_time',
      airline: flightNumber.startsWith('AA') ? 'American Airlines'
        : flightNumber.startsWith('BA') ? 'British Airways'
          : flightNumber.startsWith('VS') ? 'Virgin Atlantic'
            : flightNumber.startsWith('UA') ? 'United Airlines'
              : flightNumber.startsWith('DL') ? 'Delta Air Lines'
                : 'Unknown Airline',
      departure: {
        airport: 'JFK',
        airportName: 'John F. Kennedy International Airport',
        terminal: flightNumber.startsWith('AA') ? '8' : flightNumber.startsWith('BA') ? '7' : '4',
        gate: 'B42',
        scheduledTime: '19:00',
        estimatedTime: '19:00',
        actualTime: null,
        status: 'on_time',
      },
      arrival: {
        airport: 'LHR',
        airportName: 'London Heathrow Airport',
        terminal: flightNumber.startsWith('BA') ? '5' : '3',
        gate: null,
        scheduledTime: '07:15+1',
        estimatedTime: '07:10+1',
        actualTime: null,
        status: 'on_time',
      },
      aircraft: {
        type: 'Boeing 777-300ER',
        registration: 'N721AN',
        age: '4 years',
      },
      duration: '7h 15m',
      distance: '3,459 miles',
      lastUpdated: new Date().toISOString(),
      alerts: [],
      boardingInfo: {
        boardingTime: '18:20',
        boardingGroup: 'Group 4',
        boardingStatus: 'not_started',
      },
      weather: {
        departure: 'Clear, 8C (46F)',
        arrival: 'Partly cloudy, 10C (50F)',
      },
    };
  },
};
