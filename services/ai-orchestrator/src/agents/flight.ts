/**
 * Atlas One -- Flight Specialist Agent (Chat Interface)
 *
 * Implements the simplified Agent interface for flight search, status
 * checks, disruption handling, and rebooking suggestions with realistic
 * mock data.
 */

import type { Agent, AgentContext, AgentResponse, ToolAction } from './base.js';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

interface MockFlight {
  flightNumber: string;
  airline: string;
  origin: string;
  originCity: string;
  destination: string;
  destinationCity: string;
  departureTime: string;
  arrivalTime: string;
  duration: string;
  durationMinutes: number;
  stops: number;
  stopCity?: string;
  aircraft: string;
  cabinClass: string;
  price: number;
  currency: string;
  seatsRemaining: number;
  onTimeRate: number;
  baggageIncluded: string;
  wifiAvailable: boolean;
}

function generateMockFlights(origin: string, destination: string): MockFlight[] {
  const departureDateStr = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

  return [
    {
      flightNumber: 'AA 100',
      airline: 'American Airlines',
      origin: origin || 'JFK',
      originCity: 'New York',
      destination: destination || 'LHR',
      destinationCity: 'London',
      departureTime: `${departureDateStr}T19:00:00`,
      arrivalTime: `${departureDateStr}T07:05:00`,
      duration: '7h 05m',
      durationMinutes: 425,
      stops: 0,
      aircraft: 'Boeing 777-300ER',
      cabinClass: 'Economy',
      price: 487,
      currency: 'USD',
      seatsRemaining: 23,
      onTimeRate: 82,
      baggageIncluded: '1 checked bag (23kg) + 1 carry-on',
      wifiAvailable: true,
    },
    {
      flightNumber: 'BA 178',
      airline: 'British Airways',
      origin: origin || 'JFK',
      originCity: 'New York',
      destination: destination || 'LHR',
      destinationCity: 'London',
      departureTime: `${departureDateStr}T21:30:00`,
      arrivalTime: `${departureDateStr}T09:25:00`,
      duration: '6h 55m',
      durationMinutes: 415,
      stops: 0,
      aircraft: 'Airbus A380',
      cabinClass: 'Economy',
      price: 523,
      currency: 'USD',
      seatsRemaining: 15,
      onTimeRate: 78,
      baggageIncluded: '1 checked bag (23kg) + 1 carry-on',
      wifiAvailable: true,
    },
    {
      flightNumber: 'VS 4',
      airline: 'Virgin Atlantic',
      origin: origin || 'JFK',
      originCity: 'New York',
      destination: destination || 'LHR',
      destinationCity: 'London',
      departureTime: `${departureDateStr}T22:00:00`,
      arrivalTime: `${departureDateStr}T10:10:00`,
      duration: '7h 10m',
      durationMinutes: 430,
      stops: 0,
      aircraft: 'Airbus A350-1000',
      cabinClass: 'Economy',
      price: 456,
      currency: 'USD',
      seatsRemaining: 31,
      onTimeRate: 85,
      baggageIncluded: '1 checked bag (23kg) + 1 carry-on',
      wifiAvailable: true,
    },
    {
      flightNumber: 'UA 114',
      airline: 'United Airlines',
      origin: origin || 'EWR',
      originCity: 'Newark',
      destination: destination || 'LHR',
      destinationCity: 'London',
      departureTime: `${departureDateStr}T17:45:00`,
      arrivalTime: `${departureDateStr}T06:00:00`,
      duration: '7h 15m',
      durationMinutes: 435,
      stops: 0,
      aircraft: 'Boeing 787-10 Dreamliner',
      cabinClass: 'Economy',
      price: 472,
      currency: 'USD',
      seatsRemaining: 19,
      onTimeRate: 79,
      baggageIncluded: '1 carry-on (personal item extra)',
      wifiAvailable: true,
    },
    {
      flightNumber: 'DL 1 / KL 642',
      airline: 'Delta / KLM (codeshare)',
      origin: origin || 'JFK',
      originCity: 'New York',
      destination: destination || 'LHR',
      destinationCity: 'London',
      departureTime: `${departureDateStr}T16:30:00`,
      arrivalTime: `${departureDateStr}T08:45:00`,
      duration: '10h 15m',
      durationMinutes: 615,
      stops: 1,
      stopCity: 'Amsterdam (AMS)',
      aircraft: 'Boeing 767-400ER / Embraer 190',
      cabinClass: 'Economy',
      price: 389,
      currency: 'USD',
      seatsRemaining: 42,
      onTimeRate: 74,
      baggageIncluded: '1 checked bag (23kg) + 1 carry-on',
      wifiAvailable: true,
    },
    {
      flightNumber: 'BA 115',
      airline: 'British Airways',
      origin: origin || 'JFK',
      originCity: 'New York',
      destination: destination || 'LHR',
      destinationCity: 'London',
      departureTime: `${departureDateStr}T10:30:00`,
      arrivalTime: `${departureDateStr}T22:25:00`,
      duration: '6h 55m',
      durationMinutes: 415,
      stops: 0,
      aircraft: 'Boeing 777-200ER',
      cabinClass: 'Business',
      price: 3842,
      currency: 'USD',
      seatsRemaining: 4,
      onTimeRate: 81,
      baggageIncluded: '2 checked bags (32kg each) + 1 carry-on + 1 personal item',
      wifiAvailable: true,
    },
  ];
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function formatFlightList(flights: MockFlight[]): string {
  return flights
    .map(
      (f, i) =>
        `${i + 1}. **${f.airline}** ${f.flightNumber}\n` +
        `   ${f.originCity} (${f.origin}) -> ${f.destinationCity} (${f.destination})\n` +
        `   Depart: ${f.departureTime.split('T')[1]?.slice(0, 5)} | Arrive: ${f.arrivalTime.split('T')[1]?.slice(0, 5)} | Duration: ${f.duration}\n` +
        `   ${f.stops === 0 ? 'Non-stop' : `${f.stops} stop${f.stops > 1 ? 's' : ''} (${f.stopCity ?? ''})`} | Aircraft: ${f.aircraft}\n` +
        `   Cabin: ${f.cabinClass} | Baggage: ${f.baggageIncluded}\n` +
        `   Price: **$${f.price} ${f.currency}** | Seats left: ${f.seatsRemaining} | On-time: ${f.onTimeRate}%` +
        (f.seatsRemaining <= 5 ? ' _-- limited availability_' : ''),
    )
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// Flight Specialist Agent
// ---------------------------------------------------------------------------

export class FlightSpecialist implements Agent {
  name = 'flight-agent';

  description =
    'Expert in flight routing, layovers, airline programs, and disruption handling. ' +
    'Handles flight search, status checks, rebooking suggestions, and fare comparison ' +
    'with consideration for layover preferences, airline alliances, and price vs. duration tradeoffs.';

  systemPrompt =
    'You are the Atlas One Flight Specialist -- an expert in finding and ' +
    'managing flights.\n\n' +
    'Your expertise:\n' +
    '- Flight search across airlines with fare comparison\n' +
    '- Disruption risk assessment per route and carrier\n' +
    '- Seat selection and upgrade recommendations\n' +
    '- Rebooking on disruptions with minimal impact\n' +
    '- Connection time optimization\n' +
    '- Fare class and baggage policy guidance\n\n' +
    'Communication style:\n' +
    '- Precise with times, durations, and costs\n' +
    '- Proactively mention layover quality and connection risks\n' +
    '- Compare options with clear tradeoffs (price vs. convenience)\n' +
    '- Flag any disruption risks upfront\n\n' +
    'Constraints:\n' +
    '- Never claim seat availability without checking\n' +
    '- Always show total cost including fees\n' +
    '- Flag tight connections (under 90 min international, 60 min domestic)';

  tools = ['searchFlights', 'getFlightStatus', 'checkDisruptions', 'suggestAlternatives'];

  async process(
    message: string,
    context: AgentContext,
    _history: Array<{ role: string; content: string }>,
  ): Promise<AgentResponse> {
    const lower = message.toLowerCase();
    const actions: ToolAction[] = [];

    const isStatus = /status|delayed|on time|gate|terminal|where.*my flight/i.test(lower);
    const isDisruption = /disruption|cancel|delay|weather|storm|strike/i.test(lower);
    const isAlternative = /alternative|rebook|change|different flight/i.test(lower);

    // Extract origin/destination hints
    const iataMatch = message.match(/\b([A-Z]{3})\b/g);
    const origin = iataMatch?.[0] ?? 'JFK';
    const destination = iataMatch?.[1] ?? 'LHR';

    if (isStatus) {
      return this.handleFlightStatus(message, context, actions);
    }

    if (isDisruption) {
      return this.handleDisruptions(message, context, actions, origin, destination);
    }

    if (isAlternative) {
      return this.handleAlternatives(message, context, actions, origin, destination);
    }

    return this.handleSearch(message, context, actions, origin, destination);
  }

  private async handleSearch(
    _message: string,
    context: AgentContext,
    actions: ToolAction[],
    origin: string,
    destination: string,
  ): Promise<AgentResponse> {
    const flights = generateMockFlights(origin, destination);

    const searchAction: ToolAction = {
      tool: 'searchFlights',
      params: {
        origin,
        destination,
        departureDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        passengers: { adults: 1 },
        cabinClass: 'economy',
      },
      result: {
        flights: flights.map((f) => ({
          flightNumber: f.flightNumber,
          airline: f.airline,
          price: f.price,
          duration: f.duration,
          stops: f.stops,
          seatsRemaining: f.seatsRemaining,
          onTimeRate: f.onTimeRate,
        })),
        totalResults: flights.length,
        cheapest: flights.reduce((a, b) => (a.price < b.price ? a : b)).price,
        fastest: flights.filter((f) => f.stops === 0).reduce((a, b) => (a.durationMinutes < b.durationMinutes ? a : b)).duration,
      },
      status: 'executed' as const,
    };
    actions.push(searchAction);

    const listing = formatFlightList(flights);
    const cheapest = flights.reduce((a, b) => (a.price < b.price ? a : b));
    const fastest = flights.filter((f) => f.stops === 0).reduce((a, b) => (a.durationMinutes < b.durationMinutes ? a : b));

    const summary =
      `I found ${flights.length} flight options from ${flights[0].originCity} to ${flights[0].destinationCity}.\n\n` +
      `**Quick Summary:**\n` +
      `- Cheapest: $${cheapest.price} (${cheapest.airline}, ${cheapest.stops === 0 ? 'non-stop' : `${cheapest.stops} stop`})\n` +
      `- Fastest non-stop: ${fastest.duration} (${fastest.airline})\n` +
      `- Business class available from $${flights.find((f) => f.cabinClass === 'Business')?.price ?? 'N/A'}\n\n` +
      `${listing}\n\n` +
      `Would you like to book any of these, or would you like me to search different dates for potentially better prices?`;

    return {
      message: summary,
      actions,
      suggestions: [
        'Show flexible dates',
        'Look for direct flights only',
        'Check business class prices',
        'What is the disruption risk?',
      ],
      confidence: 0.92,
    };
  }

  private async handleFlightStatus(
    _message: string,
    _context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const statusAction: ToolAction = {
      tool: 'getFlightStatus',
      params: { flightNumber: 'AA 100' },
      result: {
        flightNumber: 'AA 100',
        airline: 'American Airlines',
        status: 'On Time',
        origin: { code: 'JFK', city: 'New York', terminal: '8', gate: 'B42' },
        destination: { code: 'LHR', city: 'London', terminal: '5' },
        scheduledDeparture: '2026-03-14T19:00:00',
        estimatedDeparture: '2026-03-14T19:05:00',
        scheduledArrival: '2026-03-15T07:05:00',
        estimatedArrival: '2026-03-15T07:10:00',
        aircraft: 'Boeing 777-300ER',
        delayMinutes: 5,
        boardingStartsAt: '2026-03-14T18:15:00',
        lastUpdated: new Date().toISOString(),
      },
      status: 'executed' as const,
    };
    actions.push(statusAction);

    const s = statusAction.result as Record<string, unknown>;
    const orig = s['origin'] as { code: string; city: string; terminal: string; gate: string };
    const dest = s['destination'] as { code: string; city: string; terminal: string };

    return {
      message:
        `**Flight Status: ${s['flightNumber'] as string}** (${s['airline'] as string})\n\n` +
        `Status: **${s['status'] as string}** (${s['delayMinutes'] as number} min delay)\n\n` +
        `**Departure:**\n` +
        `- Airport: ${orig.city} (${orig.code})\n` +
        `- Terminal: ${orig.terminal} | Gate: ${orig.gate}\n` +
        `- Scheduled: ${(s['scheduledDeparture'] as string).split('T')[1]?.slice(0, 5)}\n` +
        `- Estimated: ${(s['estimatedDeparture'] as string).split('T')[1]?.slice(0, 5)}\n` +
        `- Boarding starts: ${(s['boardingStartsAt'] as string).split('T')[1]?.slice(0, 5)}\n\n` +
        `**Arrival:**\n` +
        `- Airport: ${dest.city} (${dest.code})\n` +
        `- Terminal: ${dest.terminal}\n` +
        `- Estimated: ${(s['estimatedArrival'] as string).split('T')[1]?.slice(0, 5)}\n\n` +
        `Aircraft: ${s['aircraft'] as string}\n` +
        `Last updated: just now`,
      actions,
      suggestions: [
        'Check disruption risk',
        'Show gate information',
        'Find airport lounges',
        'Track this flight',
      ],
      confidence: 0.95,
    };
  }

  private async handleDisruptions(
    _message: string,
    _context: AgentContext,
    actions: ToolAction[],
    origin: string,
    destination: string,
  ): Promise<AgentResponse> {
    const disruptionAction: ToolAction = {
      tool: 'checkDisruptions',
      params: { origin, destination },
      result: {
        route: `${origin} -> ${destination}`,
        overallRisk: 'moderate',
        factors: [
          {
            type: 'weather',
            severity: 'moderate',
            description: 'Low pressure system over North Atlantic may cause moderate turbulence and minor delays',
            confidence: 0.72,
          },
          {
            type: 'carrier_operations',
            severity: 'low',
            description: 'All major carriers operating normally on this route',
            confidence: 0.88,
          },
          {
            type: 'airport_congestion',
            severity: 'low',
            description: 'JFK operating at normal capacity; no congestion alerts',
            confidence: 0.91,
          },
        ],
        historicalOnTimeRate: 81,
        delayProbability: 0.24,
        cancellationProbability: 0.03,
        recommendation: 'Moderate risk. Consider booking flights with higher on-time rates (>85%) for added peace of mind.',
        alternativeCount: 4,
      },
      status: 'executed' as const,
    };
    actions.push(disruptionAction);

    const d = disruptionAction.result as Record<string, unknown>;
    const factors = d['factors'] as Array<{ type: string; severity: string; description: string; confidence: number }>;

    let text =
      `**Disruption Risk Assessment: ${d['route'] as string}**\n\n` +
      `Overall Risk: **${(d['overallRisk'] as string).toUpperCase()}**\n` +
      `Historical on-time rate: ${d['historicalOnTimeRate'] as number}%\n` +
      `Delay probability: ${Math.round((d['delayProbability'] as number) * 100)}%\n` +
      `Cancellation probability: ${Math.round((d['cancellationProbability'] as number) * 100)}%\n\n` +
      `**Risk Factors:**\n`;

    for (const f of factors) {
      const icon = f.severity === 'low' ? 'LOW' : f.severity === 'moderate' ? 'MED' : 'HIGH';
      text += `- [${icon}] **${f.type.replace('_', ' ')}**: ${f.description} (${Math.round(f.confidence * 100)}% confidence)\n`;
    }

    text += `\n**Recommendation:** ${d['recommendation'] as string}`;

    return {
      message: text,
      actions,
      suggestions: [
        'Show flights with best on-time rates',
        'Recommend travel insurance',
        'Search alternative dates',
        'Create a backup plan',
      ],
      confidence: 0.87,
    };
  }

  private async handleAlternatives(
    _message: string,
    _context: AgentContext,
    actions: ToolAction[],
    origin: string,
    destination: string,
  ): Promise<AgentResponse> {
    const flights = generateMockFlights(origin, destination).slice(0, 3);

    const altAction: ToolAction = {
      tool: 'suggestAlternatives',
      params: { origin, destination, reason: 'rebooking' },
      result: {
        alternatives: flights.map((f) => ({
          flightNumber: f.flightNumber,
          airline: f.airline,
          departureTime: f.departureTime,
          arrivalTime: f.arrivalTime,
          price: f.price,
          priceDifference: f.price - 487,
          onTimeRate: f.onTimeRate,
          seatsRemaining: f.seatsRemaining,
        })),
        bestValue: flights[0].flightNumber,
        bestReliability: flights.reduce((a, b) => (a.onTimeRate > b.onTimeRate ? a : b)).flightNumber,
      },
      status: 'executed' as const,
    };
    actions.push(altAction);

    const listing = formatFlightList(flights);

    return {
      message:
        `Here are alternative flights for your route:\n\n${listing}\n\n` +
        `I recommend **${flights.reduce((a, b) => (a.onTimeRate > b.onTimeRate ? a : b)).airline}** ` +
        `(${flights.reduce((a, b) => (a.onTimeRate > b.onTimeRate ? a : b)).flightNumber}) for the best reliability ` +
        `with a ${flights.reduce((a, b) => (a.onTimeRate > b.onTimeRate ? a : b)).onTimeRate}% on-time rate.`,
      actions,
      suggestions: [
        'Book the most reliable option',
        'Book the cheapest option',
        'Check business class on these',
        'Search different dates',
      ],
      confidence: 0.88,
    };
  }
}
