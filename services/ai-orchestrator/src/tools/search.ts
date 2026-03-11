/**
 * Atlas One -- Search Tools
 *
 * Consolidated search tools for the AI orchestrator: searchRestaurants,
 * searchHotels, searchFlights, searchExperiences. Each returns realistic
 * mock data for development and demonstration purposes.
 *
 * Design invariant: Query tools -- do not mutate state.
 */

import type { ToolDefinition, ToolContext, ValidationResult } from './searchAvailability.js';

// ---------------------------------------------------------------------------
// Rate Limiter (shared across search tools)
// ---------------------------------------------------------------------------

interface RateLimitState {
  windowStart: number;
  count: number;
}

const searchRateLimitMap = new Map<string, RateLimitState>();
const SEARCH_RATE_LIMIT_WINDOW_MS = 60_000;
const SEARCH_RATE_LIMIT_MAX_CALLS = 100;

function checkSearchRateLimit(userId: string): boolean {
  const now = Date.now();
  const state = searchRateLimitMap.get(userId);

  if (!state || now - state.windowStart > SEARCH_RATE_LIMIT_WINDOW_MS) {
    searchRateLimitMap.set(userId, { windowStart: now, count: 1 });
    return true;
  }

  if (state.count >= SEARCH_RATE_LIMIT_MAX_CALLS) {
    return false;
  }

  state.count++;
  return true;
}

// ---------------------------------------------------------------------------
// searchRestaurants
// ---------------------------------------------------------------------------

export const searchRestaurantsTool: ToolDefinition = {
  name: 'searchRestaurants',

  description:
    'Search for restaurants by location, cuisine type, price range, and dining preferences. ' +
    'Returns a list of matching restaurants with ratings, pricing, and availability status.',

  parameters: {
    type: 'object',
    required: ['destination'],
    properties: {
      destination: {
        type: 'string',
        description: 'City or area to search in (e.g., "London", "Manhattan").',
      },
      cuisine: {
        type: 'string',
        description: 'Cuisine type filter (e.g., "Italian", "Japanese", "French").',
      },
      priceRange: {
        type: 'string',
        enum: ['$', '$$', '$$$', '$$$$'],
        description: 'Price range filter.',
      },
      date: {
        type: 'string',
        format: 'date',
        description: 'Desired dining date (YYYY-MM-DD).',
      },
      time: {
        type: 'string',
        pattern: '^\\d{2}:\\d{2}$',
        description: 'Desired dining time (HH:MM).',
      },
      partySize: {
        type: 'integer',
        minimum: 1,
        maximum: 20,
        description: 'Number of diners.',
      },
      dietaryRequirements: {
        type: 'array',
        items: { type: 'string' },
        description: 'Dietary requirements (e.g., "vegetarian", "gluten-free").',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 20,
        default: 5,
        description: 'Maximum number of results.',
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

    if (params['date'] && typeof params['date'] === 'string') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(params['date'])) {
        errors.push('date must be in YYYY-MM-DD format.');
      }
    }

    if (params['time'] && typeof params['time'] === 'string') {
      if (!/^\d{2}:\d{2}$/.test(params['time'])) {
        errors.push('time must be in HH:MM format.');
      }
    }

    if (!checkSearchRateLimit(context.userId)) {
      errors.push('Rate limit exceeded. Maximum 100 search calls per minute.');
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
      searchedAt: new Date().toISOString(),
      totalResults: 6,
      results: [
        {
          id: 'rest_le_bernardin',
          name: 'Le Bernardin',
          cuisine: 'French Seafood',
          priceRange: '$$$$',
          rating: 4.8,
          reviewCount: 3421,
          address: '155 W 51st St, New York, NY 10019',
          neighborhood: 'Midtown West',
          phone: '+1-212-554-1515',
          michelinStars: 3,
          avgMealPrice: 185,
          currency: 'USD',
          availableSlots: ['18:00', '20:30'],
          dietaryOptions: ['gluten-free', 'pescatarian'],
          ambiance: 'Fine Dining',
        },
        {
          id: 'rest_nobu',
          name: 'Nobu Fifty Seven',
          cuisine: 'Japanese Fusion',
          priceRange: '$$$$',
          rating: 4.6,
          reviewCount: 2876,
          address: '40 W 57th St, New York, NY 10019',
          neighborhood: 'Midtown',
          phone: '+1-212-757-3000',
          michelinStars: 0,
          avgMealPrice: 120,
          currency: 'USD',
          availableSlots: ['17:30', '19:00', '21:00'],
          dietaryOptions: ['gluten-free', 'vegetarian'],
          ambiance: 'Upscale Casual',
        },
        {
          id: 'rest_carbone',
          name: 'Carbone',
          cuisine: 'Italian-American',
          priceRange: '$$$$',
          rating: 4.7,
          reviewCount: 4532,
          address: '181 Thompson St, New York, NY 10012',
          neighborhood: 'Greenwich Village',
          phone: '+1-212-254-3000',
          michelinStars: 0,
          avgMealPrice: 95,
          currency: 'USD',
          availableSlots: [],
          waitlistAvailable: true,
          dietaryOptions: ['vegetarian'],
          ambiance: 'Classic Italian',
        },
        {
          id: 'rest_hawksmoor',
          name: 'Hawksmoor',
          cuisine: 'Steakhouse',
          priceRange: '$$$',
          rating: 4.7,
          reviewCount: 8934,
          address: 'Air Street, London W1J 0AD',
          neighborhood: 'Piccadilly',
          phone: '+44-20-7406-3980',
          michelinStars: 0,
          avgMealPrice: 75,
          currency: 'GBP',
          availableSlots: ['18:30', '19:30', '20:30', '21:30'],
          dietaryOptions: ['gluten-free'],
          ambiance: 'Upscale Casual',
        },
        {
          id: 'rest_dishoom',
          name: 'Dishoom',
          cuisine: 'Indian',
          priceRange: '$$',
          rating: 4.5,
          reviewCount: 15234,
          address: '12 Upper St Martin\'s Ln, London WC2H 9FB',
          neighborhood: 'Covent Garden',
          phone: '+44-20-7420-9320',
          michelinStars: 0,
          avgMealPrice: 35,
          currency: 'GBP',
          availableSlots: ['12:00', '13:00', '18:00', '19:30', '20:30'],
          dietaryOptions: ['vegetarian', 'vegan', 'gluten-free'],
          ambiance: 'Casual Dining',
        },
        {
          id: 'rest_sketch',
          name: 'Sketch (The Lecture Room)',
          cuisine: 'French Contemporary',
          priceRange: '$$$$',
          rating: 4.4,
          reviewCount: 2156,
          address: '9 Conduit St, London W1S 2XG',
          neighborhood: 'Mayfair',
          phone: '+44-20-7659-4500',
          michelinStars: 2,
          avgMealPrice: 150,
          currency: 'GBP',
          availableSlots: ['19:00', '20:30'],
          dietaryOptions: ['vegetarian', 'vegan', 'gluten-free'],
          ambiance: 'Artistic Fine Dining',
        },
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// searchHotels
// ---------------------------------------------------------------------------

export const searchHotelsTool: ToolDefinition = {
  name: 'searchHotels',

  description:
    'Search for hotels and accommodations by destination, dates, guests, and preferences. ' +
    'Returns properties with pricing, ratings, amenities, and availability.',

  parameters: {
    type: 'object',
    required: ['destination', 'checkIn', 'checkOut'],
    properties: {
      destination: {
        type: 'string',
        description: 'City or area to search in.',
      },
      checkIn: {
        type: 'string',
        format: 'date',
        description: 'Check-in date (YYYY-MM-DD).',
      },
      checkOut: {
        type: 'string',
        format: 'date',
        description: 'Check-out date (YYYY-MM-DD).',
      },
      guests: {
        type: 'integer',
        minimum: 1,
        maximum: 10,
        description: 'Number of guests.',
      },
      rooms: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        description: 'Number of rooms.',
      },
      starRating: {
        type: 'integer',
        minimum: 1,
        maximum: 5,
        description: 'Minimum star rating.',
      },
      priceMax: {
        type: 'number',
        description: 'Maximum price per night in USD.',
      },
      amenities: {
        type: 'array',
        items: { type: 'string' },
        description: 'Required amenities (e.g., "pool", "spa", "gym").',
      },
      propertyType: {
        type: 'string',
        enum: ['hotel', 'resort', 'apartment', 'villa', 'hostel'],
        description: 'Type of property.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 20,
        default: 5,
        description: 'Maximum number of results.',
      },
    },
  },

  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['destination']) errors.push('destination is required.');
    if (!params['checkIn']) errors.push('checkIn is required.');
    if (!params['checkOut']) errors.push('checkOut is required.');

    if (params['checkIn'] && params['checkOut']) {
      const ci = new Date(params['checkIn'] as string);
      const co = new Date(params['checkOut'] as string);
      if (co <= ci) {
        errors.push('checkOut must be after checkIn.');
      }
    }

    if (!checkSearchRateLimit(context.userId)) {
      errors.push('Rate limit exceeded.');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    const checkIn = params['checkIn'] as string;
    const checkOut = params['checkOut'] as string;

    return {
      traceId: context.traceId,
      destination: params['destination'],
      checkIn,
      checkOut,
      searchedAt: new Date().toISOString(),
      totalResults: 6,
      results: [
        {
          id: 'htl_four_seasons_ny',
          name: 'Four Seasons Hotel New York Downtown',
          stars: 5,
          rating: 4.8,
          reviewCount: 2341,
          address: '27 Barclay St, New York, NY 10007',
          neighborhood: 'Financial District / Tribeca',
          pricePerNight: 415,
          totalPrice: 1245,
          currency: 'USD',
          roomType: 'Deluxe King Room',
          amenities: ['Pool', 'Spa', 'Fitness Center', 'Restaurant', 'Room Service', 'Concierge'],
          cancellation: 'Free cancellation until 48h before check-in',
          breakfastIncluded: false,
          distanceToCenter: '0.5 miles',
        },
        {
          id: 'htl_standard_highline',
          name: 'The Standard, High Line',
          stars: 4,
          rating: 4.5,
          reviewCount: 3456,
          address: '848 Washington St, New York, NY 10014',
          neighborhood: 'Meatpacking District',
          pricePerNight: 285,
          totalPrice: 855,
          currency: 'USD',
          roomType: 'Standard King Room',
          amenities: ['Fitness Center', 'Restaurant', 'Rooftop Bar', 'Bike Rental'],
          cancellation: 'Free cancellation until 24h before check-in',
          breakfastIncluded: false,
          distanceToCenter: '1.2 miles',
        },
        {
          id: 'htl_ritz_paris',
          name: 'Ritz Paris',
          stars: 5,
          rating: 4.9,
          reviewCount: 1876,
          address: '15 Place Vendome, 75001 Paris',
          neighborhood: 'Place Vendome',
          pricePerNight: 1250,
          totalPrice: 3750,
          currency: 'EUR',
          roomType: 'Superior Room',
          amenities: ['Spa', 'Pool', 'Fine Dining', 'Bar', 'Concierge', 'Butler Service'],
          cancellation: 'Free cancellation until 72h before check-in',
          breakfastIncluded: true,
          distanceToCenter: '0.1 miles',
        },
        {
          id: 'htl_aman_tokyo',
          name: 'Aman Tokyo',
          stars: 5,
          rating: 4.9,
          reviewCount: 987,
          address: 'Otemachi Tower, 1-5-6, Tokyo',
          neighborhood: 'Otemachi / Imperial Palace',
          pricePerNight: 950,
          totalPrice: 2850,
          currency: 'USD',
          roomType: 'Deluxe Room',
          amenities: ['Spa', 'Pool', 'Fine Dining', 'Fitness', 'Onsen', 'Library'],
          cancellation: 'Free cancellation until 14 days before check-in',
          breakfastIncluded: true,
          distanceToCenter: '0.3 miles',
        },
        {
          id: 'htl_ace_brooklyn',
          name: 'Ace Hotel Brooklyn',
          stars: 4,
          rating: 4.4,
          reviewCount: 1234,
          address: '252 Schermerhorn St, Brooklyn, NY 11217',
          neighborhood: 'Downtown Brooklyn',
          pricePerNight: 195,
          totalPrice: 585,
          currency: 'USD',
          roomType: 'Standard Queen Room',
          amenities: ['Restaurant', 'Rooftop', 'Co-Working Space', 'Lobby Bar'],
          cancellation: 'Free cancellation until 48h before check-in',
          breakfastIncluded: false,
          distanceToCenter: '2.5 miles (to Manhattan)',
        },
        {
          id: 'htl_soho_airbnb',
          name: 'SoHo Luxury Loft',
          stars: 0,
          rating: 4.6,
          reviewCount: 567,
          address: 'Prince Street, SoHo, New York',
          neighborhood: 'SoHo',
          pricePerNight: 225,
          totalPrice: 675,
          currency: 'USD',
          roomType: 'Entire loft apartment',
          amenities: ['Kitchen', 'Washer/Dryer', 'WiFi', 'Workspace', 'Air Conditioning'],
          cancellation: 'Moderate: Full refund 5 days before check-in',
          breakfastIncluded: false,
          distanceToCenter: '0.8 miles',
          propertyType: 'apartment',
          superhost: true,
        },
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// searchFlights (chat-layer version)
// ---------------------------------------------------------------------------

export const searchFlightsChatTool: ToolDefinition = {
  name: 'searchFlightsChat',

  description:
    'Search for flights by origin, destination, and dates. Returns flight options ' +
    'with pricing, duration, stops, and airline details.',

  parameters: {
    type: 'object',
    required: ['origin', 'destination', 'departureDate'],
    properties: {
      origin: {
        type: 'string',
        description: 'Departure airport code (IATA) or city name.',
      },
      destination: {
        type: 'string',
        description: 'Arrival airport code (IATA) or city name.',
      },
      departureDate: {
        type: 'string',
        format: 'date',
        description: 'Departure date (YYYY-MM-DD).',
      },
      returnDate: {
        type: 'string',
        format: 'date',
        description: 'Return date for round trip (YYYY-MM-DD). Omit for one-way.',
      },
      passengers: {
        type: 'integer',
        minimum: 1,
        maximum: 9,
        description: 'Number of passengers.',
      },
      cabinClass: {
        type: 'string',
        enum: ['economy', 'premium_economy', 'business', 'first'],
        description: 'Cabin class preference.',
      },
      directOnly: {
        type: 'boolean',
        description: 'Only show non-stop flights.',
      },
      maxPrice: {
        type: 'number',
        description: 'Maximum price per person in USD.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 20,
        default: 5,
      },
    },
  },

  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['origin']) errors.push('origin is required.');
    if (!params['destination']) errors.push('destination is required.');
    if (!params['departureDate']) errors.push('departureDate is required.');

    if (params['returnDate'] && params['departureDate']) {
      const dep = new Date(params['departureDate'] as string);
      const ret = new Date(params['returnDate'] as string);
      if (ret < dep) {
        errors.push('returnDate must be on or after departureDate.');
      }
    }

    if (!checkSearchRateLimit(context.userId)) {
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
      origin: params['origin'],
      destination: params['destination'],
      departureDate: params['departureDate'],
      searchedAt: new Date().toISOString(),
      totalResults: 6,
      results: [
        {
          id: 'flt_aa100',
          airline: 'American Airlines',
          flightNumber: 'AA 100',
          departure: { airport: 'JFK', time: '19:00', terminal: '8' },
          arrival: { airport: 'LHR', time: '07:15+1', terminal: '3' },
          duration: '7h 15m',
          stops: 0,
          aircraft: 'Boeing 777-300ER',
          cabinClass: 'economy',
          price: 487,
          currency: 'USD',
          seatsRemaining: 12,
          baggageIncluded: '1 checked bag',
          onTimePerformance: 82,
        },
        {
          id: 'flt_ba178',
          airline: 'British Airways',
          flightNumber: 'BA 178',
          departure: { airport: 'JFK', time: '21:30', terminal: '7' },
          arrival: { airport: 'LHR', time: '09:40+1', terminal: '5' },
          duration: '7h 10m',
          stops: 0,
          aircraft: 'Airbus A380',
          cabinClass: 'economy',
          price: 523,
          currency: 'USD',
          seatsRemaining: 8,
          baggageIncluded: '1 checked bag (23kg)',
          onTimePerformance: 78,
        },
        {
          id: 'flt_vs4',
          airline: 'Virgin Atlantic',
          flightNumber: 'VS 4',
          departure: { airport: 'JFK', time: '20:55', terminal: '4' },
          arrival: { airport: 'LHR', time: '09:00+1', terminal: '3' },
          duration: '7h 05m',
          stops: 0,
          aircraft: 'Airbus A350-1000',
          cabinClass: 'economy',
          price: 498,
          currency: 'USD',
          seatsRemaining: 15,
          baggageIncluded: '1 checked bag (23kg)',
          onTimePerformance: 85,
        },
        {
          id: 'flt_ua114',
          airline: 'United Airlines',
          flightNumber: 'UA 114',
          departure: { airport: 'EWR', time: '18:30', terminal: 'C' },
          arrival: { airport: 'LHR', time: '06:35+1', terminal: '2' },
          duration: '7h 05m',
          stops: 0,
          aircraft: 'Boeing 767-400ER',
          cabinClass: 'economy',
          price: 461,
          currency: 'USD',
          seatsRemaining: 22,
          baggageIncluded: 'No free checked bag',
          onTimePerformance: 80,
        },
        {
          id: 'flt_dl1',
          airline: 'Delta / KLM',
          flightNumber: 'DL 1 / KL 642',
          departure: { airport: 'JFK', time: '17:00', terminal: '4' },
          arrival: { airport: 'LHR', time: '10:25+1', terminal: '4' },
          duration: '10h 25m',
          stops: 1,
          stopDetails: 'Amsterdam (AMS) -- 2h layover',
          aircraft: 'Boeing 767-300 / Boeing 737-900',
          cabinClass: 'economy',
          price: 389,
          currency: 'USD',
          seatsRemaining: 34,
          baggageIncluded: '1 checked bag (23kg)',
          onTimePerformance: 76,
        },
        {
          id: 'flt_ba115_biz',
          airline: 'British Airways',
          flightNumber: 'BA 115',
          departure: { airport: 'JFK', time: '10:00', terminal: '7' },
          arrival: { airport: 'LHR', time: '22:05', terminal: '5' },
          duration: '7h 05m',
          stops: 0,
          aircraft: 'Boeing 777-300ER',
          cabinClass: 'business',
          price: 3250,
          currency: 'USD',
          seatsRemaining: 4,
          baggageIncluded: '2 checked bags (32kg each)',
          onTimePerformance: 84,
          extras: ['Lounge access', 'Lie-flat seat', 'Multi-course meal', 'Amenity kit'],
        },
      ],
    };
  },
};

// ---------------------------------------------------------------------------
// searchExperiences
// ---------------------------------------------------------------------------

export const searchExperiencesTool: ToolDefinition = {
  name: 'searchExperiences',

  description:
    'Search for activities, tours, attractions, and local experiences by destination, ' +
    'category, date, and preferences. Returns experiences with ratings, pricing, and availability.',

  parameters: {
    type: 'object',
    required: ['destination'],
    properties: {
      destination: {
        type: 'string',
        description: 'City or area to search in.',
      },
      category: {
        type: 'string',
        enum: ['tours', 'activities', 'attractions', 'food_drink', 'entertainment', 'outdoor', 'wellness'],
        description: 'Experience category filter.',
      },
      date: {
        type: 'string',
        format: 'date',
        description: 'Desired date (YYYY-MM-DD).',
      },
      participants: {
        type: 'integer',
        minimum: 1,
        maximum: 20,
        description: 'Number of participants.',
      },
      physicalLevel: {
        type: 'string',
        enum: ['easy', 'moderate', 'challenging'],
        description: 'Physical activity level.',
      },
      childFriendly: {
        type: 'boolean',
        description: 'Filter for child-friendly experiences.',
      },
      priceMax: {
        type: 'number',
        description: 'Maximum price per person.',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 20,
        default: 5,
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

    if (!checkSearchRateLimit(context.userId)) {
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
      destination: params['destination'],
      searchedAt: new Date().toISOString(),
      totalResults: 6,
      results: [
        {
          id: 'exp_tower_london',
          name: 'Tower of London: Priority Access with Beefeater Tour',
          category: 'Historical Tour',
          rating: 4.7,
          reviewCount: 12453,
          price: 42,
          currency: 'GBP',
          duration: '3 hours',
          location: 'Tower Hill, London',
          physicalLevel: 'easy',
          childFriendly: true,
          weatherDependent: false,
          highlights: ['Crown Jewels', 'Beefeater-led tour', 'Priority entry'],
        },
        {
          id: 'exp_thames_cruise',
          name: 'Thames River Sunset Champagne Cruise',
          category: 'Cruise & Boat Tour',
          rating: 4.8,
          reviewCount: 3247,
          price: 85,
          currency: 'GBP',
          duration: '2 hours',
          location: 'Westminster Pier, London',
          physicalLevel: 'easy',
          childFriendly: false,
          weatherDependent: true,
          highlights: ['Champagne reception', 'Sunset views', 'Tower Bridge passage'],
        },
        {
          id: 'exp_cooking_class',
          name: 'Traditional British Cooking Class with Market Tour',
          category: 'Food & Drink',
          rating: 4.9,
          reviewCount: 876,
          price: 120,
          currency: 'GBP',
          duration: '4 hours',
          location: 'Borough Market, London',
          physicalLevel: 'easy',
          childFriendly: true,
          weatherDependent: false,
          highlights: ['Borough Market tour', 'Hands-on cooking', '3-course meal'],
        },
        {
          id: 'exp_harry_potter',
          name: 'Warner Bros. Studio Tour: The Making of Harry Potter',
          category: 'Entertainment & Culture',
          rating: 4.9,
          reviewCount: 28341,
          price: 95,
          currency: 'GBP',
          duration: '4-5 hours',
          location: 'Leavesden, Watford',
          physicalLevel: 'easy',
          childFriendly: true,
          weatherDependent: false,
          highlights: ['Great Hall', 'Diagon Alley', 'Platform 9 3/4'],
        },
        {
          id: 'exp_west_end',
          name: 'West End Theatre: Premium Seats with Pre-Show Dinner',
          category: 'Theatre & Shows',
          rating: 4.6,
          reviewCount: 2156,
          price: 175,
          currency: 'GBP',
          duration: '5 hours',
          location: 'West End, London',
          physicalLevel: 'easy',
          childFriendly: false,
          weatherDependent: false,
          highlights: ['Premium seats', '3-course dinner', 'Champagne welcome'],
        },
        {
          id: 'exp_bike_tour',
          name: 'Royal London Bike Tour: Parks, Palaces & Parliament',
          category: 'Outdoor & Adventure',
          rating: 4.8,
          reviewCount: 4532,
          price: 36,
          currency: 'GBP',
          duration: '3.5 hours',
          location: 'Hyde Park Corner, London',
          physicalLevel: 'moderate',
          childFriendly: true,
          weatherDependent: true,
          highlights: ['Hyde Park', 'Buckingham Palace', 'Houses of Parliament'],
        },
      ],
    };
  },
};
