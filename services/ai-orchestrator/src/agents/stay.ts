/**
 * Atlas One -- Stay Specialist Agent (Chat Interface)
 *
 * Implements the simplified Agent interface for hotel/accommodation search,
 * comparison, booking recommendations, and property analysis with realistic
 * mock data.
 */

import type { Agent, AgentContext, AgentResponse, ToolAction } from './base.js';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

interface MockProperty {
  id: string;
  name: string;
  type: 'hotel' | 'vacation_rental' | 'boutique' | 'resort';
  rating: number;
  reviewCount: number;
  nightlyRate: number;
  currency: string;
  address: string;
  neighborhood: string;
  amenities: string[];
  accessibilityFeatures: string[];
  cancellationPolicy: string;
  checkInTime: string;
  checkOutTime: string;
  roomTypes: string[];
  highlights: string[];
  walkScore: number;
  transitScore: number;
}

const MOCK_PROPERTIES: MockProperty[] = [
  {
    id: 'prop_four_seasons_ny',
    name: 'Four Seasons Hotel New York Downtown',
    type: 'hotel',
    rating: 4.8,
    reviewCount: 3421,
    nightlyRate: 695,
    currency: 'USD',
    address: '27 Barclay St, New York, NY 10007',
    neighborhood: 'Tribeca/Financial District',
    amenities: ['spa', 'fitness center', 'pool', 'restaurant', 'room service', 'concierge', 'valet parking', 'business center'],
    accessibilityFeatures: ['wheelchair accessible', 'elevator', 'accessible bathroom', 'roll-in shower'],
    cancellationPolicy: 'Free cancellation until 48 hours before check-in',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    roomTypes: ['Deluxe Room', 'Premier Room', 'One-Bedroom Suite', 'Presidential Suite'],
    highlights: ['Rooftop bar with panoramic views', 'Wolfgang Puck restaurant on-site', 'Located near One World Trade Center'],
    walkScore: 98,
    transitScore: 100,
  },
  {
    id: 'prop_the_standard',
    name: 'The Standard, High Line',
    type: 'boutique',
    rating: 4.4,
    reviewCount: 2876,
    nightlyRate: 385,
    currency: 'USD',
    address: '848 Washington St, New York, NY 10014',
    neighborhood: 'Meatpacking District',
    amenities: ['restaurant', 'bar', 'fitness center', 'beer garden', 'club', 'room service'],
    accessibilityFeatures: ['wheelchair accessible', 'elevator'],
    cancellationPolicy: 'Free cancellation until 24 hours before check-in',
    checkInTime: '15:00',
    checkOutTime: '11:00',
    roomTypes: ['Standard Room', 'Superior Room', 'Studio', 'Penthouse Suite'],
    highlights: ['Straddles the High Line park', 'Iconic design by Polshek Partnership', 'Le Bain rooftop bar'],
    walkScore: 97,
    transitScore: 95,
  },
  {
    id: 'prop_airbnb_soho',
    name: 'Luxury SoHo Loft - 2BR with Terrace',
    type: 'vacation_rental',
    rating: 4.9,
    reviewCount: 187,
    nightlyRate: 450,
    currency: 'USD',
    address: 'Prince St & Broadway, New York, NY 10012',
    neighborhood: 'SoHo',
    amenities: ['full kitchen', 'washer/dryer', 'wifi', 'terrace', 'workspace', 'smart TV', 'espresso machine'],
    accessibilityFeatures: ['elevator building'],
    cancellationPolicy: 'Full refund if cancelled 5 days before check-in',
    checkInTime: '16:00',
    checkOutTime: '10:00',
    roomTypes: ['2-Bedroom Loft (sleeps 4)'],
    highlights: ['Authentic cast-iron SoHo building', 'Private terrace with city views', 'Superhost with 100% response rate'],
    walkScore: 100,
    transitScore: 100,
  },
  {
    id: 'prop_ritz_paris',
    name: 'Ritz Paris',
    type: 'hotel',
    rating: 4.9,
    reviewCount: 4102,
    nightlyRate: 1250,
    currency: 'EUR',
    address: '15 Place Vendome, 75001 Paris, France',
    neighborhood: 'Place Vendome',
    amenities: ['spa', 'pool', 'fitness center', 'multiple restaurants', 'bar', 'concierge', 'valet', 'garden'],
    accessibilityFeatures: ['wheelchair accessible', 'elevator', 'accessible rooms'],
    cancellationPolicy: 'Free cancellation until 72 hours before check-in',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    roomTypes: ['Superior Room', 'Deluxe Room', 'Prestige Suite', 'Coco Chanel Suite'],
    highlights: ['Iconic luxury since 1898', 'Chanel Spa', 'Bar Hemingway', 'Ecole Ritz Escoffier cooking school'],
    walkScore: 95,
    transitScore: 98,
  },
  {
    id: 'prop_aman_tokyo',
    name: 'Aman Tokyo',
    type: 'resort',
    rating: 4.8,
    reviewCount: 1654,
    nightlyRate: 980,
    currency: 'USD',
    address: 'The Otemachi Tower, 1-5-6 Otemachi, Chiyoda-ku, Tokyo',
    neighborhood: 'Otemachi/Marunouchi',
    amenities: ['spa', 'pool', 'fitness center', 'restaurant', 'bar', 'library', 'garden', 'concierge'],
    accessibilityFeatures: ['wheelchair accessible', 'elevator', 'accessible rooms'],
    cancellationPolicy: 'Free cancellation until 7 days before check-in',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    roomTypes: ['Deluxe Room', 'Premier Room', 'Corner Suite', 'Aman Suite'],
    highlights: ['Occupies top 6 floors of Otemachi Tower', 'Traditional Japanese ryokan-inspired design', 'Panoramic views of Mt. Fuji'],
    walkScore: 92,
    transitScore: 100,
  },
  {
    id: 'prop_ace_hotel',
    name: 'Ace Hotel Brooklyn',
    type: 'boutique',
    rating: 4.3,
    reviewCount: 1234,
    nightlyRate: 249,
    currency: 'USD',
    address: '252 Schermerhorn St, Brooklyn, NY 11217',
    neighborhood: 'Boerum Hill',
    amenities: ['restaurant', 'bar', 'fitness center', 'coworking space', 'lobby lounge', 'vinyl library'],
    accessibilityFeatures: ['wheelchair accessible', 'elevator'],
    cancellationPolicy: 'Free cancellation until 24 hours before check-in',
    checkInTime: '15:00',
    checkOutTime: '12:00',
    roomTypes: ['Standard Room', 'Deluxe Room', 'Suite', 'Loft Suite'],
    highlights: ['Roman and Williams designed', 'As You Are restaurant', 'Creative community hub'],
    walkScore: 97,
    transitScore: 100,
  },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function formatPropertyList(properties: MockProperty[]): string {
  return properties
    .map(
      (p, i) =>
        `${i + 1}. **${p.name}** (${p.type.replace('_', ' ')})\n` +
        `   Rating: ${p.rating}/5 (${p.reviewCount} reviews)\n` +
        `   Price: $${p.nightlyRate} ${p.currency}/night | Neighborhood: ${p.neighborhood}\n` +
        `   Amenities: ${p.amenities.slice(0, 5).join(', ')}\n` +
        `   Highlights: ${p.highlights[0]}\n` +
        `   Cancellation: ${p.cancellationPolicy}\n` +
        `   Walk Score: ${p.walkScore} | Transit Score: ${p.transitScore}`,
    )
    .join('\n\n');
}

function matchesStayQuery(property: MockProperty, message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes(property.name.toLowerCase()) ||
    lower.includes(property.neighborhood.toLowerCase()) ||
    (lower.includes('luxury') && property.nightlyRate > 500) ||
    (lower.includes('budget') && property.nightlyRate < 300) ||
    (lower.includes('boutique') && property.type === 'boutique') ||
    (lower.includes('rental') && property.type === 'vacation_rental') ||
    (lower.includes('resort') && property.type === 'resort') ||
    (lower.includes('hotel') && property.type === 'hotel') ||
    (lower.includes('airbnb') && property.type === 'vacation_rental') ||
    (lower.includes('pool') && property.amenities.includes('pool')) ||
    (lower.includes('spa') && property.amenities.includes('spa')) ||
    (lower.includes('paris') && property.address.includes('Paris')) ||
    (lower.includes('tokyo') && property.address.includes('Tokyo')) ||
    (lower.includes('new york') && property.address.includes('New York')) ||
    (lower.includes('brooklyn') && property.address.includes('Brooklyn'))
  );
}

// ---------------------------------------------------------------------------
// Stay Specialist Agent
// ---------------------------------------------------------------------------

export class StaySpecialist implements Agent {
  name = 'stay-agent';

  description =
    'Expert in hotels, vacation rentals, resorts, and boutique accommodations. ' +
    'Handles property search, comparison, booking recommendations, amenity matching, ' +
    'location scoring, and cancellation policy guidance.';

  systemPrompt =
    'You are the Atlas One Accommodation Specialist -- an expert in finding ' +
    'the perfect place to stay for any trip.\n\n' +
    'Your expertise:\n' +
    '- Hotel, resort, vacation rental, and boutique stay recommendations\n' +
    '- Property comparison with pros and cons\n' +
    '- Price analysis and value assessment\n' +
    '- Location convenience relative to planned activities\n' +
    '- Amenity matching and accessibility features\n' +
    '- Cancellation policy guidance\n\n' +
    'Communication style:\n' +
    '- Detail-oriented about property features\n' +
    '- Compare options clearly with tradeoffs\n' +
    '- Highlight value, not just price\n' +
    '- Consider location convenience for the trip\n\n' +
    'Constraints:\n' +
    '- Never claim rooms are available without checking inventory\n' +
    '- Always note cancellation policies\n' +
    '- Be transparent about pricing (include all fees)';

  tools = ['searchHotels', 'checkAvailability', 'createBooking', 'compareProperties'];

  async process(
    message: string,
    context: AgentContext,
    _history: Array<{ role: string; content: string }>,
  ): Promise<AgentResponse> {
    const lower = message.toLowerCase();
    const actions: ToolAction[] = [];

    const isCompare = /compare|vs|versus|between|which.*better|difference/i.test(lower);
    const isBook = /book|reserve|reservation/i.test(lower);
    const isAvailability = /available|availability|open/i.test(lower);

    let matchedProperties = MOCK_PROPERTIES.filter((p) => matchesStayQuery(p, message));
    if (matchedProperties.length === 0) {
      matchedProperties = MOCK_PROPERTIES.slice(0, 4);
    }

    if (isCompare && matchedProperties.length >= 2) {
      return this.handleComparison(matchedProperties.slice(0, 3), context, actions);
    }

    if (isBook) {
      return this.handleBooking(matchedProperties[0], context, actions);
    }

    if (isAvailability) {
      return this.handleAvailability(matchedProperties[0], context, actions);
    }

    return this.handleSearch(message, matchedProperties, context, actions);
  }

  private async handleSearch(
    _message: string,
    properties: MockProperty[],
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const searchAction: ToolAction = {
      tool: 'searchHotels',
      params: { userId: context.userId, limit: 5 },
      result: {
        properties: properties.slice(0, 5).map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          rating: p.rating,
          nightlyRate: p.nightlyRate,
          currency: p.currency,
          neighborhood: p.neighborhood,
        })),
        totalResults: properties.length,
      },
      status: 'executed' as const,
    };
    actions.push(searchAction);

    const listing = formatPropertyList(properties.slice(0, 5));

    return {
      message:
        `I found ${properties.length} accommodation options. Here are the top results:\n\n${listing}\n\n` +
        'Would you like me to compare any of these, check availability, or get more details?',
      actions,
      suggestions: [
        'Compare the top 2 options',
        'Show cheaper options',
        'Check availability for different dates',
        'Tell me about the neighborhood',
      ],
      confidence: 0.9,
    };
  }

  private async handleComparison(
    properties: MockProperty[],
    _context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const compareAction: ToolAction = {
      tool: 'compareProperties',
      params: { propertyIds: properties.map((p) => p.id) },
      result: {
        properties: properties.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          rating: p.rating,
          nightlyRate: p.nightlyRate,
          amenities: p.amenities,
          walkScore: p.walkScore,
          cancellationPolicy: p.cancellationPolicy,
        })),
        recommendation: properties[0].id,
        reasoning: 'Best overall value considering location, amenities, and guest ratings.',
      },
      status: 'executed' as const,
    };
    actions.push(compareAction);

    let comparisonText = '**Property Comparison:**\n\n';
    comparisonText += '| Feature | ' + properties.map((p) => p.name.split(' ').slice(0, 3).join(' ')).join(' | ') + ' |\n';
    comparisonText += '|---------|' + properties.map(() => '------').join('|') + '|\n';
    comparisonText += '| Type | ' + properties.map((p) => p.type.replace('_', ' ')).join(' | ') + ' |\n';
    comparisonText += '| Rating | ' + properties.map((p) => `${p.rating}/5`).join(' | ') + ' |\n';
    comparisonText += '| Price/Night | ' + properties.map((p) => `$${p.nightlyRate}`).join(' | ') + ' |\n';
    comparisonText += '| Walk Score | ' + properties.map((p) => `${p.walkScore}`).join(' | ') + ' |\n';
    comparisonText += '| Cancellation | ' + properties.map((p) => p.cancellationPolicy.split('until')[0].trim()).join(' | ') + ' |\n';

    comparisonText += '\n**Amenity Highlights:**\n';
    for (const p of properties) {
      comparisonText += `- **${p.name}**: ${p.amenities.slice(0, 4).join(', ')}\n`;
    }

    comparisonText += `\n**My Recommendation:** ${properties[0].name} offers the best overall value considering location, amenities, and guest ratings.`;

    return {
      message: comparisonText,
      actions,
      suggestions: [
        `Book ${properties[0].name.split(' ').slice(0, 3).join(' ')}`,
        'Show me more options',
        'What about vacation rentals?',
        'Check cancellation policies',
      ],
      confidence: 0.88,
    };
  }

  private async handleBooking(
    property: MockProperty,
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const checkIn = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const checkOut = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];
    const nights = 3;

    const bookingAction: ToolAction = {
      tool: 'createBooking',
      params: {
        propertyId: property.id,
        checkIn,
        checkOut,
        guests: 2,
        roomType: property.roomTypes[0],
        userId: context.userId,
      },
      result: {
        bookingId: `bkg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        propertyName: property.name,
        checkIn,
        checkOut,
        nights,
        roomType: property.roomTypes[0],
        nightlyRate: { amount: property.nightlyRate, currency: property.currency },
        totalCost: { amount: property.nightlyRate * nights + Math.round(property.nightlyRate * nights * 0.14), currency: property.currency },
        taxes: { amount: Math.round(property.nightlyRate * nights * 0.14), currency: property.currency },
        status: 'confirmed',
        confirmationCode: `ATL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        cancellationPolicy: property.cancellationPolicy,
        checkInTime: property.checkInTime,
        checkOutTime: property.checkOutTime,
      },
      status: 'executed' as const,
    };
    actions.push(bookingAction);

    const booking = bookingAction.result as Record<string, unknown>;
    const total = booking['totalCost'] as { amount: number; currency: string };
    const taxes = booking['taxes'] as { amount: number; currency: string };

    return {
      message:
        `Your stay at **${property.name}** has been booked.\n\n` +
        `**Booking Details:**\n` +
        `- Check-in: ${checkIn} at ${property.checkInTime}\n` +
        `- Check-out: ${checkOut} at ${property.checkOutTime}\n` +
        `- Duration: ${nights} nights\n` +
        `- Room: ${property.roomTypes[0]}\n` +
        `- Rate: $${property.nightlyRate}/night\n` +
        `- Taxes & fees: $${taxes.amount}\n` +
        `- **Total: $${total.amount} ${total.currency}**\n` +
        `- Confirmation: ${booking['confirmationCode'] as string}\n\n` +
        `**Cancellation:** ${property.cancellationPolicy}`,
      actions,
      suggestions: [
        'Add special requests',
        'Change room type',
        'Check nearby restaurants',
        'Cancel this booking',
      ],
      confidence: 0.93,
    };
  }

  private async handleAvailability(
    property: MockProperty,
    _context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const checkIn = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const checkOut = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0];

    const availAction: ToolAction = {
      tool: 'checkAvailability',
      params: { propertyId: property.id, checkIn, checkOut, guests: 2 },
      result: {
        propertyName: property.name,
        checkIn,
        checkOut,
        available: true,
        roomOptions: property.roomTypes.map((rt, i) => ({
          roomType: rt,
          available: i < 3,
          nightlyRate: property.nightlyRate + i * 150,
          currency: property.currency,
          remainingRooms: Math.max(1, 5 - i * 2),
        })),
      },
      status: 'executed' as const,
    };
    actions.push(availAction);

    const result = availAction.result as Record<string, unknown>;
    const rooms = result['roomOptions'] as Array<{
      roomType: string; available: boolean; nightlyRate: number; currency: string; remainingRooms: number;
    }>;
    const availableRooms = rooms.filter((r) => r.available);

    let text = `**Availability at ${property.name}** (${checkIn} to ${checkOut}):\n\n`;
    for (const room of availableRooms) {
      text += `- **${room.roomType}**: $${room.nightlyRate}/night (${room.remainingRooms} room${room.remainingRooms > 1 ? 's' : ''} left)\n`;
    }
    text += `\nCancellation: ${property.cancellationPolicy}`;

    return {
      message: text,
      actions,
      suggestions: [
        `Book ${availableRooms[0]?.roomType ?? 'a room'}`,
        'Check different dates',
        'Show similar properties',
        'Compare with other hotels',
      ],
      confidence: 0.91,
    };
  }
}
