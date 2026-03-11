/**
 * Atlas One -- Experiences Specialist Agent (Chat Interface)
 *
 * Implements the simplified Agent interface for activities, tours,
 * attractions, and local experience discovery with realistic mock data.
 */

import type { Agent, AgentContext, AgentResponse, ToolAction } from './base.js';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

interface MockExperience {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewCount: number;
  price: number;
  currency: string;
  duration: string;
  location: string;
  description: string;
  highlights: string[];
  includes: string[];
  physicalLevel: 'easy' | 'moderate' | 'challenging';
  groupSize: string;
  languages: string[];
  cancellationPolicy: string;
  weatherDependent: boolean;
  childFriendly: boolean;
  accessibilityNote: string;
}

const MOCK_EXPERIENCES: MockExperience[] = [
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
    description: 'Skip the line and explore 1,000 years of history with a Yeoman Warder guide.',
    highlights: ['Crown Jewels viewing', 'Beefeater-led tour', 'Priority entry', 'White Tower access'],
    includes: ['Priority admission', 'Guided tour', 'Crown Jewels access'],
    physicalLevel: 'easy',
    groupSize: 'Up to 25',
    languages: ['English', 'French', 'Spanish', 'German'],
    cancellationPolicy: 'Free cancellation up to 24 hours before',
    weatherDependent: false,
    childFriendly: true,
    accessibilityNote: 'Partially accessible; some areas have stairs',
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
    description: 'Cruise past iconic London landmarks as the sun sets over the Thames.',
    highlights: ['Champagne reception', 'Big Ben & Parliament views', 'Tower Bridge passage', 'Live commentary'],
    includes: ['Welcome champagne', 'Canapes', 'Live guide commentary', 'Return to departure point'],
    physicalLevel: 'easy',
    groupSize: 'Up to 50',
    languages: ['English'],
    cancellationPolicy: 'Free cancellation up to 48 hours before',
    weatherDependent: true,
    childFriendly: false,
    accessibilityNote: 'Wheelchair accessible on main deck',
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
    description: 'Tour Borough Market with a chef, then cook a 3-course British meal.',
    highlights: ['Borough Market guided tour', 'Hands-on cooking', '3-course meal', 'Recipe booklet'],
    includes: ['Market tour', 'All ingredients', 'Cooking instruction', 'Lunch with wine', 'Recipes to take home'],
    physicalLevel: 'easy',
    groupSize: 'Up to 12',
    languages: ['English'],
    cancellationPolicy: 'Free cancellation up to 72 hours before',
    weatherDependent: false,
    childFriendly: true,
    accessibilityNote: 'Fully accessible kitchen and market areas',
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
    location: 'Leavesden, Watford (45 min from central London)',
    description: 'Step behind the scenes of the beloved Harry Potter film series.',
    highlights: ['Great Hall', 'Diagon Alley', 'Forbidden Forest', 'Platform 9 3/4', 'Butterbeer tasting'],
    includes: ['Studio entry', 'Self-guided tour', 'Digital guide app', 'Butterbeer included'],
    physicalLevel: 'easy',
    groupSize: 'Self-paced',
    languages: ['English', 'French', 'German', 'Spanish', 'Italian', 'Japanese', 'Chinese'],
    cancellationPolicy: 'Non-refundable (date change available up to 48 hours before)',
    weatherDependent: false,
    childFriendly: true,
    accessibilityNote: 'Fully wheelchair accessible',
  },
  {
    id: 'exp_west_end',
    name: 'West End Theatre: Premium Seats with Pre-Show Dinner',
    category: 'Theatre & Shows',
    rating: 4.6,
    reviewCount: 2156,
    price: 175,
    currency: 'GBP',
    duration: '5 hours (dinner + show)',
    location: 'West End, London',
    description: 'Premium seats at a top West End show with a pre-show 3-course dinner nearby.',
    highlights: ['Premium stalls or dress circle seats', '3-course pre-show dinner', 'Champagne welcome', 'Choice of current shows'],
    includes: ['Show ticket (premium)', 'Pre-show dinner', 'Welcome drink', 'Programme'],
    physicalLevel: 'easy',
    groupSize: '2-6',
    languages: ['English'],
    cancellationPolicy: 'Free cancellation up to 7 days before',
    weatherDependent: false,
    childFriendly: false,
    accessibilityNote: 'Accessible seating available on request',
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
    description: 'Cycle through Royal Parks, past Buckingham Palace, and along the Thames.',
    highlights: ['Hyde Park', 'Buckingham Palace', 'Houses of Parliament', 'Westminster Abbey', 'St. James\'s Park'],
    includes: ['Bike rental', 'Helmet', 'Guide', 'Photo stops', 'Bottled water'],
    physicalLevel: 'moderate',
    groupSize: 'Up to 15',
    languages: ['English', 'Spanish', 'Portuguese'],
    cancellationPolicy: 'Free cancellation up to 24 hours before',
    weatherDependent: true,
    childFriendly: true,
    accessibilityNote: 'Not wheelchair accessible; requires ability to ride a bicycle',
  },
];

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function formatExperienceList(experiences: MockExperience[]): string {
  return experiences
    .map(
      (e, i) =>
        `${i + 1}. **${e.name}**\n` +
        `   Category: ${e.category} | Rating: ${e.rating}/5 (${e.reviewCount.toLocaleString()} reviews)\n` +
        `   Price: ${e.price} ${e.currency}/person | Duration: ${e.duration}\n` +
        `   Location: ${e.location}\n` +
        `   Highlights: ${e.highlights.slice(0, 3).join(', ')}\n` +
        `   Physical level: ${e.physicalLevel} | ${e.childFriendly ? 'Child-friendly' : 'Adults only'}` +
        (e.weatherDependent ? ' | Weather-dependent' : ''),
    )
    .join('\n\n');
}

function matchesExperienceQuery(exp: MockExperience, message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes(exp.name.toLowerCase()) ||
    lower.includes(exp.category.toLowerCase()) ||
    (lower.includes('tour') && exp.category.includes('Tour')) ||
    (lower.includes('food') && exp.category.includes('Food')) ||
    (lower.includes('cooking') && exp.name.toLowerCase().includes('cooking')) ||
    (lower.includes('theatre') && exp.category.includes('Theatre')) ||
    (lower.includes('show') && exp.category.includes('Theatre')) ||
    (lower.includes('cruise') && exp.category.includes('Cruise')) ||
    (lower.includes('boat') && exp.category.includes('Cruise')) ||
    (lower.includes('harry potter') && exp.name.includes('Harry Potter')) ||
    (lower.includes('bike') && exp.category.includes('Outdoor')) ||
    (lower.includes('adventure') && exp.category.includes('Outdoor')) ||
    (lower.includes('history') && exp.category.includes('Historical')) ||
    (lower.includes('kid') && exp.childFriendly) ||
    (lower.includes('child') && exp.childFriendly) ||
    (lower.includes('family') && exp.childFriendly) ||
    (lower.includes('outdoor') && exp.category.includes('Outdoor'))
  );
}

// ---------------------------------------------------------------------------
// Experiences Specialist Agent
// ---------------------------------------------------------------------------

export class ExperiencesSpecialist implements Agent {
  name = 'experiences-agent';

  description =
    'Expert in tours, activities, attractions, and local experiences. Recommends ' +
    'experiences based on interests, location, timing, weather, crowds, and value. ' +
    'Handles experience search, booking, reviews, and availability checking.';

  systemPrompt =
    'You are the Atlas One Experiences Specialist -- an expert in discovering ' +
    'unforgettable activities and attractions.\n\n' +
    'Your expertise:\n' +
    '- Activity and tour discovery based on interests and fitness level\n' +
    '- Attraction scheduling to minimize travel time\n' +
    '- Group-appropriate matching (children, elderly, accessibility)\n' +
    '- Weather-dependent activity guidance\n' +
    '- VIP and exclusive experience sourcing\n' +
    '- Festival and event awareness\n\n' +
    'Communication style:\n' +
    '- Enthusiastic about experiences and local culture\n' +
    '- Match activity intensity to trip pace preference\n' +
    '- Consider practical logistics (travel time, rest periods)\n' +
    '- Suggest hidden gems alongside popular attractions\n\n' +
    'Constraints:\n' +
    '- Never recommend activities without verifying availability\n' +
    '- Always note physical requirements and accessibility\n' +
    '- Disclose weather dependencies clearly';

  tools = ['searchExperiences', 'checkAvailability', 'bookExperience', 'getReviews'];

  async process(
    message: string,
    context: AgentContext,
    _history: Array<{ role: string; content: string }>,
  ): Promise<AgentResponse> {
    const lower = message.toLowerCase();
    const actions: ToolAction[] = [];

    const isBook = /book|reserve|buy ticket/i.test(lower);
    const isReview = /review|reviews|what.*people.*say|rating/i.test(lower);
    const isAvailability = /available|availability|when|dates/i.test(lower);

    let matched = MOCK_EXPERIENCES.filter((e) => matchesExperienceQuery(e, message));
    if (matched.length === 0) {
      matched = MOCK_EXPERIENCES.slice(0, 5);
    }

    if (isBook && matched.length > 0) {
      return this.handleBooking(matched[0], context, actions);
    }

    if (isReview && matched.length > 0) {
      return this.handleReviews(matched[0], actions);
    }

    if (isAvailability && matched.length > 0) {
      return this.handleAvailability(matched[0], actions);
    }

    return this.handleSearch(message, matched, context, actions);
  }

  private async handleSearch(
    _message: string,
    experiences: MockExperience[],
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const searchAction: ToolAction = {
      tool: 'searchExperiences',
      params: { userId: context.userId, limit: 5 },
      result: {
        experiences: experiences.slice(0, 5).map((e) => ({
          id: e.id,
          name: e.name,
          category: e.category,
          rating: e.rating,
          price: e.price,
          currency: e.currency,
          duration: e.duration,
        })),
        totalResults: experiences.length,
      },
      status: 'executed' as const,
    };
    actions.push(searchAction);

    const listing = formatExperienceList(experiences.slice(0, 5));

    return {
      message:
        `I found ${experiences.length} experiences for you. Here are the top picks:\n\n${listing}\n\n` +
        `Would you like to book any of these, see reviews, or check availability for specific dates?`,
      actions,
      suggestions: [
        'Book the top-rated one',
        'Show family-friendly options',
        'Check availability for tomorrow',
        'Show me outdoor activities',
      ],
      confidence: 0.89,
    };
  }

  private async handleBooking(
    experience: MockExperience,
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const date = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

    const bookAction: ToolAction = {
      tool: 'bookExperience',
      params: {
        experienceId: experience.id,
        date,
        participants: 2,
        userId: context.userId,
      },
      result: {
        bookingId: `ebk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        experienceName: experience.name,
        date,
        startTime: '10:00',
        participants: 2,
        totalPrice: experience.price * 2,
        currency: experience.currency,
        status: 'confirmed',
        confirmationCode: `EXP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        meetingPoint: experience.location,
        includes: experience.includes,
        cancellationPolicy: experience.cancellationPolicy,
        whatToBring: ['Comfortable shoes', 'Weather-appropriate clothing', 'Camera', 'Valid ID'],
      },
      status: 'executed' as const,
    };
    actions.push(bookAction);

    const b = bookAction.result as Record<string, unknown>;

    return {
      message:
        `Your experience has been booked!\n\n` +
        `**${experience.name}**\n` +
        `- Date: ${date} at ${b['startTime'] as string}\n` +
        `- Participants: ${b['participants'] as number}\n` +
        `- Total: ${b['totalPrice'] as number} ${experience.currency}\n` +
        `- Confirmation: ${b['confirmationCode'] as string}\n` +
        `- Meeting point: ${experience.location}\n\n` +
        `**Includes:** ${experience.includes.join(', ')}\n\n` +
        `**What to bring:** ${(b['whatToBring'] as string[]).join(', ')}\n\n` +
        `**Cancellation:** ${experience.cancellationPolicy}`,
      actions,
      suggestions: [
        'Add to my itinerary',
        'Find nearby restaurants',
        'Book another experience',
        'Cancel this booking',
      ],
      confidence: 0.94,
    };
  }

  private async handleReviews(
    experience: MockExperience,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const reviewAction: ToolAction = {
      tool: 'getReviews',
      params: { experienceId: experience.id, limit: 5 },
      result: {
        experienceName: experience.name,
        overallRating: experience.rating,
        totalReviews: experience.reviewCount,
        ratingBreakdown: { 5: 68, 4: 22, 3: 7, 2: 2, 1: 1 },
        recentReviews: [
          { author: 'Sarah M.', rating: 5, date: '2026-02-28', text: 'Absolutely fantastic! The guide was incredibly knowledgeable and entertaining. Worth every penny.' },
          { author: 'James K.', rating: 5, date: '2026-02-25', text: 'One of the best experiences of our London trip. Highly recommend the early morning slot to avoid crowds.' },
          { author: 'Maria L.', rating: 4, date: '2026-02-20', text: 'Great experience overall. A bit crowded during peak hours but the guide managed the group well.' },
          { author: 'Tom R.', rating: 5, date: '2026-02-18', text: 'My kids absolutely loved it. The interactive elements kept everyone engaged throughout.' },
          { author: 'Ana P.', rating: 4, date: '2026-02-15', text: 'Very well organized. The only downside was the gift shop being quite expensive.' },
        ],
        topPositives: ['Knowledgeable guides', 'Well-organized', 'Great for families'],
        topConcerns: ['Can get crowded at peak times', 'Gift shop prices'],
      },
      status: 'executed' as const,
    };
    actions.push(reviewAction);

    const r = reviewAction.result as Record<string, unknown>;
    const reviews = r['recentReviews'] as Array<{ author: string; rating: number; date: string; text: string }>;
    const breakdown = r['ratingBreakdown'] as Record<number, number>;

    let text = `**Reviews for ${experience.name}**\n\n`;
    text += `Overall: ${experience.rating}/5 (${experience.reviewCount.toLocaleString()} reviews)\n\n`;

    text += `**Rating Distribution:**\n`;
    for (let i = 5; i >= 1; i--) {
      text += `${'*'.repeat(i)} ${breakdown[i]}%\n`;
    }

    text += `\n**Recent Reviews:**\n`;
    for (const rev of reviews) {
      text += `\n_"${rev.text}"_ -- ${rev.author}, ${'*'.repeat(rev.rating)} (${rev.date})\n`;
    }

    text += `\n**What people love:** ${(r['topPositives'] as string[]).join(', ')}\n`;
    text += `**Common concerns:** ${(r['topConcerns'] as string[]).join(', ')}`;

    return {
      message: text,
      actions,
      suggestions: [
        'Book this experience',
        'Check availability',
        'Show similar experiences',
        'See photo gallery',
      ],
      confidence: 0.87,
    };
  }

  private async handleAvailability(
    experience: MockExperience,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const dates = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(Date.now() + (i + 1) * 86400000);
      return d.toISOString().split('T')[0];
    });

    const availAction: ToolAction = {
      tool: 'checkAvailability',
      params: { experienceId: experience.id, dates },
      result: {
        experienceName: experience.name,
        availability: dates.map((date, i) => ({
          date,
          slots: [
            { time: '09:00', spotsRemaining: Math.max(0, 12 - i * 3), available: i < 4 },
            { time: '13:00', spotsRemaining: Math.max(0, 8 - i * 2), available: i < 3 },
            { time: '16:00', spotsRemaining: Math.max(0, 15 - i * 2), available: true },
          ],
        })),
      },
      status: 'executed' as const,
    };
    actions.push(availAction);

    const r = availAction.result as Record<string, unknown>;
    const availability = r['availability'] as Array<{
      date: string;
      slots: Array<{ time: string; spotsRemaining: number; available: boolean }>;
    }>;

    let text = `**Availability for ${experience.name}**\n\n`;
    for (const day of availability) {
      const availSlots = day.slots.filter((s) => s.available);
      text += `**${day.date}:**\n`;
      if (availSlots.length > 0) {
        for (const slot of availSlots) {
          text += `  - ${slot.time} (${slot.spotsRemaining} spots left${slot.spotsRemaining <= 3 ? ' -- selling fast!' : ''})\n`;
        }
      } else {
        text += '  - Fully booked\n';
      }
    }

    text += `\nPrice: ${experience.price} ${experience.currency}/person | Duration: ${experience.duration}`;

    return {
      message: text,
      actions,
      suggestions: [
        'Book the earliest available slot',
        'Check next week',
        'Show similar experiences',
        'Read reviews first',
      ],
      confidence: 0.91,
    };
  }
}
