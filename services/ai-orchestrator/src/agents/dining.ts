/**
 * Atlas One -- Dining Specialist Agent (Chat Interface)
 *
 * Implements the simplified Agent interface for the chat endpoints.
 * Handles restaurant search, recommendations, reservations, menu info,
 * and availability checking with realistic mock tool execution.
 */

import type { Agent, AgentContext, AgentResponse, ToolAction } from './base.js';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

interface MockRestaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  priceRange: string;
  priceLevel: number;
  address: string;
  neighborhood: string;
  dietaryOptions: string[];
  ambiance: string;
  michelinStars: number;
  reviewCount: number;
  popularDishes: string[];
  openHours: string;
  phone: string;
}

const MOCK_RESTAURANTS: MockRestaurant[] = [
  {
    id: 'rst_le_bernardin',
    name: 'Le Bernardin',
    cuisine: 'French Seafood',
    rating: 4.8,
    priceRange: '$$$$$',
    priceLevel: 5,
    address: '155 W 51st St, New York, NY 10019',
    neighborhood: 'Midtown West',
    dietaryOptions: ['gluten-free', 'pescatarian'],
    ambiance: 'Fine Dining',
    michelinStars: 3,
    reviewCount: 4231,
    popularDishes: ['Barely Cooked Salmon', 'Lobster Poached in Butter', 'Thinly Pounded Yellowfin Tuna'],
    openHours: 'Mon-Sat 12:00-14:30, 17:15-22:30',
    phone: '+1 212-554-1515',
  },
  {
    id: 'rst_nobu_downtown',
    name: 'Nobu Downtown',
    cuisine: 'Japanese-Peruvian Fusion',
    rating: 4.6,
    priceRange: '$$$$',
    priceLevel: 4,
    address: '195 Broadway, New York, NY 10007',
    neighborhood: 'Financial District',
    dietaryOptions: ['gluten-free', 'pescatarian', 'vegetarian options'],
    ambiance: 'Upscale Casual',
    michelinStars: 0,
    reviewCount: 3847,
    popularDishes: ['Black Cod Miso', 'Yellowtail Jalapeño', 'Rock Shrimp Tempura'],
    openHours: 'Daily 11:30-14:30, 17:30-23:00',
    phone: '+1 212-219-0500',
  },
  {
    id: 'rst_carbone',
    name: 'Carbone',
    cuisine: 'Italian-American',
    rating: 4.7,
    priceRange: '$$$$',
    priceLevel: 4,
    address: '181 Thompson St, New York, NY 10012',
    neighborhood: 'Greenwich Village',
    dietaryOptions: ['vegetarian options'],
    ambiance: 'Retro Fine Dining',
    michelinStars: 0,
    reviewCount: 5102,
    popularDishes: ['Spicy Rigatoni Vodka', 'Veal Parmesan', 'Caesar Salad'],
    openHours: 'Daily 17:00-23:00',
    phone: '+1 212-254-3000',
  },
  {
    id: 'rst_osteria_francescana',
    name: 'Osteria Francescana',
    cuisine: 'Modern Italian',
    rating: 4.9,
    priceRange: '$$$$$',
    priceLevel: 5,
    address: 'Via Stella 22, 41121 Modena, Italy',
    neighborhood: 'Centro Storico',
    dietaryOptions: ['vegetarian options', 'vegan options'],
    ambiance: 'Intimate Fine Dining',
    michelinStars: 3,
    reviewCount: 2874,
    popularDishes: ['Five Ages of Parmigiano Reggiano', 'Oops I Dropped the Lemon Tart', 'Crunchy Part of the Lasagna'],
    openHours: 'Tue-Sat 12:30-14:00, 20:00-22:30',
    phone: '+39 059 223912',
  },
  {
    id: 'rst_the_grill',
    name: 'The Grill',
    cuisine: 'American Steakhouse',
    rating: 4.5,
    priceRange: '$$$$',
    priceLevel: 4,
    address: '99 E 52nd St, New York, NY 10022',
    neighborhood: 'Midtown East',
    dietaryOptions: ['gluten-free options'],
    ambiance: 'Classic Power Dining',
    michelinStars: 0,
    reviewCount: 2198,
    popularDishes: ['Dry-Aged Porterhouse', 'Grand Plateau Seafood Tower', 'Tableside Caesar'],
    openHours: 'Mon-Sat 12:00-14:00, 17:00-22:00',
    phone: '+1 212-375-9001',
  },
  {
    id: 'rst_sukiyabashi_jiro',
    name: 'Sukiyabashi Jiro',
    cuisine: 'Sushi (Omakase)',
    rating: 4.9,
    priceRange: '$$$$$',
    priceLevel: 5,
    address: 'Tsukamoto Sogyo Building B1F, 2-15 Ginza 4-chome, Chuo, Tokyo',
    neighborhood: 'Ginza',
    dietaryOptions: ['pescatarian'],
    ambiance: 'Intimate Counter Dining',
    michelinStars: 3,
    reviewCount: 1876,
    popularDishes: ['20-Course Omakase', 'Otoro Nigiri', 'Kohada'],
    openHours: 'Mon-Sat 11:30-14:00, 17:30-20:30',
    phone: '+81 3-3535-3600',
  },
  {
    id: 'rst_veggie_garden',
    name: 'Eleven Madison Park',
    cuisine: 'Plant-Based Fine Dining',
    rating: 4.7,
    priceRange: '$$$$$',
    priceLevel: 5,
    address: '11 Madison Ave, New York, NY 10010',
    neighborhood: 'Flatiron',
    dietaryOptions: ['vegan', 'vegetarian', 'gluten-free options'],
    ambiance: 'Grand Fine Dining',
    michelinStars: 3,
    reviewCount: 3629,
    popularDishes: ['Sunflower Butter', 'Tonburi', 'Lavender Honey'],
    openHours: 'Thu-Mon 17:30-22:00',
    phone: '+1 212-889-0905',
  },
  {
    id: 'rst_la_petite_maison',
    name: 'La Petite Maison',
    cuisine: 'French Mediterranean',
    rating: 4.5,
    priceRange: '$$$$',
    priceLevel: 4,
    address: '54 Brooks Mews, London W1K 4EG',
    neighborhood: 'Mayfair',
    dietaryOptions: ['gluten-free options', 'vegetarian options'],
    ambiance: 'Elegant Casual',
    michelinStars: 0,
    reviewCount: 2456,
    popularDishes: ['Warm Prawns', 'Baked Sea Bass', 'Truffle Pizza'],
    openHours: 'Daily 12:00-15:00, 18:00-23:00',
    phone: '+44 20 7495 4774',
  },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function matchesQuery(restaurant: MockRestaurant, message: string): boolean {
  const lower = message.toLowerCase();
  const fields = [
    restaurant.name.toLowerCase(),
    restaurant.cuisine.toLowerCase(),
    restaurant.neighborhood.toLowerCase(),
    ...restaurant.dietaryOptions.map((d) => d.toLowerCase()),
    ...restaurant.popularDishes.map((d) => d.toLowerCase()),
  ];
  return fields.some((f) => lower.includes(f)) ||
    lower.includes(restaurant.ambiance.toLowerCase()) ||
    (lower.includes('michelin') && restaurant.michelinStars > 0) ||
    (lower.includes('vegan') && restaurant.dietaryOptions.some((d) => d.includes('vegan'))) ||
    (lower.includes('vegetarian') && restaurant.dietaryOptions.some((d) => d.includes('vegetarian'))) ||
    (lower.includes('seafood') && restaurant.cuisine.toLowerCase().includes('seafood')) ||
    (lower.includes('sushi') && restaurant.cuisine.toLowerCase().includes('sushi')) ||
    (lower.includes('italian') && restaurant.cuisine.toLowerCase().includes('italian')) ||
    (lower.includes('french') && restaurant.cuisine.toLowerCase().includes('french')) ||
    (lower.includes('japanese') && restaurant.cuisine.toLowerCase().includes('japanese')) ||
    (lower.includes('steak') && restaurant.cuisine.toLowerCase().includes('steak'));
}

function formatRestaurantList(restaurants: MockRestaurant[]): string {
  return restaurants
    .map(
      (r, i) =>
        `${i + 1}. **${r.name}** (${r.cuisine})\n` +
        `   Rating: ${r.rating}/5 (${r.reviewCount} reviews)${r.michelinStars > 0 ? ` | ${r.michelinStars} Michelin star${r.michelinStars > 1 ? 's' : ''}` : ''}\n` +
        `   Price: ${r.priceRange} | Ambiance: ${r.ambiance}\n` +
        `   Location: ${r.address}\n` +
        `   Popular dishes: ${r.popularDishes.join(', ')}\n` +
        `   Dietary: ${r.dietaryOptions.join(', ')}\n` +
        `   Hours: ${r.openHours}`,
    )
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// Dining Specialist Agent
// ---------------------------------------------------------------------------

export class DiningSpecialist implements Agent {
  name = 'dining-agent';

  description =
    'Expert in restaurant recommendations, dietary restrictions, cuisine types, ' +
    'ambiance matching, reservations, and menu information. Handles dining search, ' +
    'availability checking, reservation making, and menu inquiries.';

  systemPrompt =
    'You are the Atlas One Dining Specialist -- an expert in restaurant discovery, ' +
    'reservations, and culinary experiences worldwide.\n\n' +
    'Your expertise:\n' +
    '- Restaurant discovery and recommendations based on cuisine, ambiance, and dietary needs\n' +
    '- Real-time reservation availability checking\n' +
    '- Table preference optimization (indoor/outdoor, seating area)\n' +
    '- Dietary accommodation and accessibility requirements\n' +
    '- Menu knowledge and dish recommendations\n' +
    '- Price range guidance and value assessment\n\n' +
    'Communication style:\n' +
    '- Knowledgeable and enthusiastic about food and dining\n' +
    '- Consider the full group (allergies, children, accessibility)\n' +
    '- Always verify availability before recommending\n' +
    '- Present options clearly with ratings, price range, and key details\n\n' +
    'Constraints:\n' +
    '- Never claim a restaurant has availability without checking\n' +
    '- Always mention dietary limitations that may apply\n' +
    '- Be transparent about Michelin ratings and review credibility';

  tools = ['searchRestaurants', 'makeReservation', 'getMenuInfo', 'checkAvailability'];

  async process(
    message: string,
    context: AgentContext,
    _history: Array<{ role: string; content: string }>,
  ): Promise<AgentResponse> {
    const lower = message.toLowerCase();
    const actions: ToolAction[] = [];

    // Determine the user's intent
    const isBooking = /book|reserve|reservation|table for/i.test(lower);
    const isMenu = /menu|dish|dishes|what.*serve|what.*eat|specialt/i.test(lower);
    const isAvailability = /available|availability|open|tonight|tomorrow|this (friday|saturday|weekend)/i.test(lower);
    const isRecommend = /recommend|suggest|best|top|popular|where should|good place/i.test(lower);

    // Find matching restaurants
    let matchedRestaurants = MOCK_RESTAURANTS.filter((r) => matchesQuery(r, message));
    if (matchedRestaurants.length === 0) {
      // Return a broad set if no specific match
      matchedRestaurants = MOCK_RESTAURANTS.slice(0, 4);
    }

    if (isBooking) {
      return this.handleBooking(message, context, matchedRestaurants, actions);
    }

    if (isMenu) {
      return this.handleMenuInfo(message, context, matchedRestaurants, actions);
    }

    if (isAvailability) {
      return this.handleAvailability(message, context, matchedRestaurants, actions);
    }

    // Default: search and recommend
    return this.handleSearch(message, context, matchedRestaurants, actions, isRecommend);
  }

  // -------------------------------------------------------------------------
  // Intent Handlers
  // -------------------------------------------------------------------------

  private async handleSearch(
    message: string,
    context: AgentContext,
    restaurants: MockRestaurant[],
    actions: ToolAction[],
    isRecommend: boolean,
  ): Promise<AgentResponse> {
    const searchAction: ToolAction = {
      tool: 'searchRestaurants',
      params: {
        query: message,
        userId: context.userId,
        limit: 5,
      },
      result: {
        restaurants: restaurants.slice(0, 5).map((r) => ({
          id: r.id,
          name: r.name,
          cuisine: r.cuisine,
          rating: r.rating,
          priceRange: r.priceRange,
          address: r.address,
          reviewCount: r.reviewCount,
          michelinStars: r.michelinStars,
        })),
        totalResults: restaurants.length,
      },
      status: 'executed' as const,
    };
    actions.push(searchAction);

    const displayRestaurants = restaurants.slice(0, 5);
    const listing = formatRestaurantList(displayRestaurants);

    const header = isRecommend
      ? `Here are my top ${displayRestaurants.length} restaurant recommendations for you:`
      : `I found ${restaurants.length} restaurants matching your criteria. Here are the top results:`;

    return {
      message: `${header}\n\n${listing}\n\nWould you like me to check availability for any of these, or would you like more options?`,
      actions,
      suggestions: [
        'Check availability for the first one',
        'Show me the menu for ' + displayRestaurants[0]?.name,
        'Filter by dietary restrictions',
        'Show me more options',
      ],
      confidence: 0.9,
    };
  }

  private async handleBooking(
    _message: string,
    context: AgentContext,
    restaurants: MockRestaurant[],
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const restaurant = restaurants[0];

    // First check availability
    const availabilityAction: ToolAction = {
      tool: 'checkAvailability',
      params: {
        venueId: restaurant.id,
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '19:30',
        partySize: 2,
      },
      result: {
        available: true,
        slots: [
          { time: '18:30', tableType: 'indoor', capacity: 4 },
          { time: '19:30', tableType: 'indoor', capacity: 2 },
          { time: '20:00', tableType: 'window', capacity: 4 },
          { time: '21:00', tableType: 'outdoor', capacity: 6 },
        ],
      },
      status: 'executed' as const,
    };
    actions.push(availabilityAction);

    // Make the reservation
    const reservationId = generateId('res');
    const reservationAction: ToolAction = {
      tool: 'makeReservation',
      params: {
        venueId: restaurant.id,
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '19:30',
        partySize: 2,
        userId: context.userId,
        tablePreference: 'indoor',
      },
      result: {
        reservationId,
        venueName: restaurant.name,
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        time: '19:30',
        partySize: 2,
        tableType: 'indoor',
        status: 'confirmed',
        confirmationCode: `ATL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        cancellationPolicy: 'Free cancellation up to 2 hours before reservation time',
      },
      status: 'executed' as const,
    };
    actions.push(reservationAction);

    const res = reservationAction.result as Record<string, unknown>;

    return {
      message:
        `Your reservation has been confirmed at **${restaurant.name}**.\n\n` +
        `**Reservation Details:**\n` +
        `- Date: ${res['date'] as string}\n` +
        `- Time: ${res['time'] as string}\n` +
        `- Party size: ${res['partySize'] as number} guests\n` +
        `- Table: Indoor seating\n` +
        `- Confirmation code: ${res['confirmationCode'] as string}\n\n` +
        `**Cancellation policy:** Free cancellation up to 2 hours before your reservation time.\n\n` +
        `${restaurant.name} is known for their ${restaurant.popularDishes.slice(0, 2).join(' and ')}. Enjoy your meal!`,
      actions,
      suggestions: [
        'See the menu',
        'Change the time',
        'Add special requests',
        'Cancel this reservation',
      ],
      confidence: 0.95,
    };
  }

  private async handleMenuInfo(
    _message: string,
    _context: AgentContext,
    restaurants: MockRestaurant[],
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const restaurant = restaurants[0];

    const menuAction: ToolAction = {
      tool: 'getMenuInfo',
      params: {
        venueId: restaurant.id,
      },
      result: {
        venueName: restaurant.name,
        cuisine: restaurant.cuisine,
        menuSections: [
          {
            name: 'Appetizers',
            items: [
              { name: restaurant.popularDishes[0] ?? 'House Special Appetizer', price: '$18-$32', dietary: ['gluten-free'] },
              { name: 'Seasonal Salad', price: '$16', dietary: ['vegetarian', 'vegan'] },
              { name: 'Artisanal Cheese Plate', price: '$24', dietary: ['vegetarian'] },
            ],
          },
          {
            name: 'Main Courses',
            items: [
              { name: restaurant.popularDishes[1] ?? 'Chef\'s Special Entree', price: '$42-$68', dietary: [] },
              { name: restaurant.popularDishes[2] ?? 'Seasonal Fish', price: '$38-$52', dietary: ['pescatarian', 'gluten-free'] },
              { name: 'Vegetable Tasting', price: '$34', dietary: ['vegetarian', 'vegan', 'gluten-free'] },
            ],
          },
          {
            name: 'Desserts',
            items: [
              { name: 'Chocolate Soufflé', price: '$18', dietary: ['vegetarian'] },
              { name: 'Seasonal Fruit Tart', price: '$16', dietary: ['vegetarian'] },
              { name: 'Cheese Selection', price: '$22', dietary: ['vegetarian', 'gluten-free'] },
            ],
          },
        ],
        lastUpdated: new Date().toISOString(),
      },
      status: 'executed' as const,
    };
    actions.push(menuAction);

    const menu = menuAction.result as Record<string, unknown>;
    const sections = menu['menuSections'] as Array<{
      name: string;
      items: Array<{ name: string; price: string; dietary: string[] }>;
    }>;

    let menuText = `Here is the menu for **${restaurant.name}** (${restaurant.cuisine}):\n\n`;
    for (const section of sections) {
      menuText += `**${section.name}:**\n`;
      for (const item of section.items) {
        const dietaryNote = item.dietary.length > 0 ? ` _(${item.dietary.join(', ')})_` : '';
        menuText += `  - ${item.name} -- ${item.price}${dietaryNote}\n`;
      }
      menuText += '\n';
    }

    menuText += `\nPrices are subject to change. Tax and gratuity are not included.`;

    return {
      message: menuText,
      actions,
      suggestions: [
        'Make a reservation',
        'What are the dietary options?',
        'Tell me about the chef',
        'Check availability',
      ],
      confidence: 0.88,
    };
  }

  private async handleAvailability(
    _message: string,
    _context: AgentContext,
    restaurants: MockRestaurant[],
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const restaurant = restaurants[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const availabilityAction: ToolAction = {
      tool: 'checkAvailability',
      params: {
        venueId: restaurant.id,
        date: tomorrow,
        partySize: 2,
      },
      result: {
        venueName: restaurant.name,
        date: tomorrow,
        available: true,
        slots: [
          { time: '12:00', tableType: 'indoor', capacity: 2, available: true },
          { time: '12:30', tableType: 'window', capacity: 4, available: true },
          { time: '18:30', tableType: 'indoor', capacity: 4, available: true },
          { time: '19:00', tableType: 'indoor', capacity: 2, available: false },
          { time: '19:30', tableType: 'indoor', capacity: 2, available: true },
          { time: '20:00', tableType: 'outdoor', capacity: 6, available: true },
          { time: '20:30', tableType: 'bar', capacity: 2, available: true },
          { time: '21:00', tableType: 'indoor', capacity: 4, available: true },
        ],
        peakHoursNote: '19:00-20:00 are peak dinner hours and fill up quickly.',
      },
      status: 'executed' as const,
    };
    actions.push(availabilityAction);

    const result = availabilityAction.result as Record<string, unknown>;
    const slots = result['slots'] as Array<{ time: string; tableType: string; capacity: number; available: boolean }>;
    const availableSlots = slots.filter((s) => s.available);

    let responseText = `**Availability at ${restaurant.name}** for ${tomorrow}:\n\n`;

    if (availableSlots.length > 0) {
      responseText += 'Available time slots:\n';
      for (const slot of availableSlots) {
        responseText += `  - ${slot.time} (${slot.tableType} seating, up to ${slot.capacity} guests)\n`;
      }
      responseText += `\n${result['peakHoursNote'] as string}\n`;
      responseText += '\nWould you like me to book one of these slots?';
    } else {
      responseText += 'Unfortunately, there are no available slots for this date. I can set up a cancellation watch or check alternative dates.';
    }

    return {
      message: responseText,
      actions,
      suggestions: [
        'Book the 19:30 slot',
        'Check a different date',
        'Show alternative restaurants',
        'Set up a cancellation watch',
      ],
      confidence: 0.92,
    };
  }
}
