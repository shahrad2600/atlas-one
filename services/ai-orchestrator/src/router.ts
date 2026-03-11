/**
 * Atlas One -- Agent Router
 *
 * Determines which specialist agent should handle a given user message.
 * Supports two modes:
 *
 * 1. **LLM-based classification** (when LLM_PROVIDER env var is set):
 *    Sends the message to a fast LLM call with a structured prompt that
 *    returns the agent name and intent as JSON. More accurate for ambiguous
 *    or multi-domain messages.
 *
 * 2. **Keyword-based classification** (fallback):
 *    Uses keyword matching and intent heuristics. Fast, zero-cost, and
 *    always available. Used when no LLM provider is configured or when
 *    the LLM call fails.
 */

import { createLLMClient, type LLMClient } from './llm/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of routing a user message to a specialist agent. */
export interface RouteResult {
  /** The agent ID to route to. */
  agentName: string;
  /** Confidence in the routing decision (0.0 - 1.0). */
  confidence: number;
  /** The primary intent detected (e.g., "dining.search"). */
  intent: string;
  /** Keywords that contributed to the routing decision. */
  matchedKeywords: string[];
  /** Whether LLM-based classification was used. */
  classificationMethod?: 'llm' | 'keyword';
}

/** Configuration for a single agent route rule. */
interface AgentRouteRule {
  agentName: string;
  /** Primary intent category assigned when this agent is selected. */
  intentPrefix: string;
  /** Keywords that trigger this route (matched case-insensitively). */
  keywords: string[];
  /** Higher weight = stronger match when keyword counts tie. */
  weight: number;
}

// ---------------------------------------------------------------------------
// Route Rules
// ---------------------------------------------------------------------------

const ROUTE_RULES: AgentRouteRule[] = [
  {
    agentName: 'dining-agent',
    intentPrefix: 'dining',
    keywords: [
      'restaurant', 'restaurants', 'dining', 'dinner', 'lunch', 'breakfast',
      'brunch', 'food', 'cuisine', 'eat', 'eating', 'meal', 'meals',
      'reservation', 'table', 'bistro', 'cafe', 'bar', 'pub',
      'michelin', 'tasting', 'menu', 'chef', 'sushi', 'pizza',
      'steakhouse', 'seafood', 'vegetarian', 'vegan',
    ],
    weight: 1.0,
  },
  {
    agentName: 'stay-agent',
    intentPrefix: 'stay',
    keywords: [
      'hotel', 'hotels', 'stay', 'accommodation', 'accommodations',
      'lodging', 'resort', 'airbnb', 'apartment', 'villa', 'hostel',
      'motel', 'room', 'rooms', 'suite', 'check-in', 'checkout',
      'check in', 'check out', 'bed', 'property', 'rental',
      'bnb', 'inn', 'guesthouse', 'cabin', 'camping',
    ],
    weight: 1.0,
  },
  {
    agentName: 'flight-agent',
    intentPrefix: 'flight',
    keywords: [
      'flight', 'flights', 'fly', 'flying', 'airline', 'airlines',
      'airport', 'plane', 'ticket', 'tickets', 'boarding',
      'departure', 'arrival', 'layover', 'connection', 'connecting',
      'nonstop', 'non-stop', 'direct', 'seat', 'seats',
      'economy', 'business class', 'first class', 'carry-on',
      'baggage', 'luggage', 'turbulence', 'delay', 'delayed',
      'gate', 'terminal', 'takeoff', 'landing',
    ],
    weight: 1.0,
  },
  {
    agentName: 'budget-agent',
    intentPrefix: 'budget',
    keywords: [
      'budget', 'cost', 'costs', 'price', 'prices', 'pricing',
      'expensive', 'cheap', 'cheaper', 'affordable', 'save', 'saving',
      'savings', 'spend', 'spending', 'money', 'dollars', 'euros',
      'discount', 'deal', 'deals', 'offer', 'coupon',
      'loyalty', 'points', 'miles', 'rewards', 'cashback',
      'splurge', 'value', 'worth',
    ],
    weight: 0.8,
  },
  {
    agentName: 'risk-agent',
    intentPrefix: 'risk',
    keywords: [
      'risk', 'risks', 'safety', 'safe', 'danger', 'dangerous',
      'weather', 'storm', 'hurricane', 'disruption', 'cancel',
      'cancelled', 'cancellation', 'strike', 'closure', 'closed',
      'warning', 'advisory', 'alert', 'emergency', 'evacuation',
      'insurance', 'travel advisory', 'covid', 'health advisory',
      'political', 'unrest', 'natural disaster',
    ],
    weight: 0.9,
  },
  {
    agentName: 'support-agent',
    intentPrefix: 'support',
    keywords: [
      'help', 'support', 'issue', 'problem', 'complaint',
      'refund', 'refunds', 'reimburse', 'reimbursement',
      'reschedule', 'rescheduling', 'change', 'modify',
      'modification', 'dispute', 'claim', 'file a claim',
      'compensation', 'apology', 'sorry', 'wrong', 'broken',
      'mistake', 'error', 'overcharged',
    ],
    weight: 0.9,
  },
  {
    agentName: 'experiences-agent',
    intentPrefix: 'experiences',
    keywords: [
      'experience', 'experiences', 'activity', 'activities',
      'tour', 'tours', 'excursion', 'excursions', 'attraction',
      'attractions', 'sightseeing', 'museum', 'museums',
      'adventure', 'hiking', 'diving', 'snorkeling', 'surfing',
      'spa', 'wellness', 'cooking class', 'wine tasting',
      'concert', 'show', 'event', 'events', 'festival',
      'things to do', 'what to do',
    ],
    weight: 0.9,
  },
];

// ---------------------------------------------------------------------------
// Valid Agent Names (for LLM output validation)
// ---------------------------------------------------------------------------

const VALID_AGENT_NAMES = new Set([
  'dining-agent',
  'stay-agent',
  'flight-agent',
  'budget-agent',
  'risk-agent',
  'support-agent',
  'experiences-agent',
  'orchestrator',
]);

// ---------------------------------------------------------------------------
// Token Helpers
// ---------------------------------------------------------------------------

/**
 * Tokenize a message into lowercase words and common multi-word phrases.
 */
function tokenize(message: string): string[] {
  const lower = message.toLowerCase();

  // Single-word tokens.
  const words = lower
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  // Also generate bigrams to catch multi-word phrases.
  const bigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    bigrams.push(`${words[i]} ${words[i + 1]}`);
  }

  return [...words, ...bigrams];
}

// ---------------------------------------------------------------------------
// Keyword-based Router
// ---------------------------------------------------------------------------

/**
 * Route a user message using keyword matching.
 *
 * Algorithm:
 * 1. Tokenize the message into words and bigrams.
 * 2. For each agent rule, count keyword matches.
 * 3. Compute a weighted score = (matchCount / totalKeywords) * weight.
 * 4. Select the agent with the highest score.
 * 5. If no keywords match, fall back to the orchestrator.
 *
 * @param message - The raw user message.
 * @returns Routing result with agent name, confidence, and matched keywords.
 */
export function routeMessageByKeyword(message: string): RouteResult {
  const tokens = new Set(tokenize(message));

  let bestResult: RouteResult = {
    agentName: 'orchestrator',
    confidence: 0.3,
    intent: 'general.planning',
    matchedKeywords: [],
    classificationMethod: 'keyword',
  };
  let bestScore = 0;

  for (const rule of ROUTE_RULES) {
    const matched: string[] = [];

    for (const keyword of rule.keywords) {
      // Check if keyword is in the token set (works for single words).
      if (tokens.has(keyword)) {
        matched.push(keyword);
        continue;
      }

      // For multi-word keywords, check if the message contains the phrase.
      if (keyword.includes(' ') && message.toLowerCase().includes(keyword)) {
        matched.push(keyword);
      }
    }

    if (matched.length === 0) continue;

    // Score: proportion of matched keywords, weighted by rule weight.
    // Use a log scale so diminishing returns after a few strong matches.
    const rawScore = Math.min(matched.length / 3, 1.0);
    const score = rawScore * rule.weight;

    if (score > bestScore) {
      bestScore = score;
      bestResult = {
        agentName: rule.agentName,
        confidence: Math.min(0.4 + score * 0.6, 1.0),
        intent: `${rule.intentPrefix}.general`,
        matchedKeywords: matched,
        classificationMethod: 'keyword',
      };
    }
  }

  return bestResult;
}

// ---------------------------------------------------------------------------
// LLM-based Router
// ---------------------------------------------------------------------------

/** Cached LLM client for routing (lazily initialized). */
let routerLLMClient: LLMClient | null = null;

/**
 * Route a user message using an LLM for intent classification.
 *
 * Sends a focused prompt to the LLM asking it to classify the message
 * into one of the known agent categories. Returns structured routing.
 *
 * Falls back to keyword routing if the LLM call fails.
 *
 * @param message - The raw user message.
 * @returns Routing result.
 */
async function routeMessageByLLM(message: string): Promise<RouteResult> {
  try {
    if (!routerLLMClient) {
      routerLLMClient = createLLMClient();
    }

    const classificationPrompt =
      'You are a message classifier for a travel AI assistant. ' +
      'Given a user message, determine which specialist agent should handle it.\n\n' +
      'Available agents:\n' +
      '- dining-agent: Restaurants, food, reservations, cuisine, menus, dietary needs\n' +
      '- stay-agent: Hotels, accommodations, lodging, resorts, Airbnb, check-in/out\n' +
      '- flight-agent: Flights, airlines, airports, boarding, delays, seats, baggage\n' +
      '- budget-agent: Budget, costs, prices, savings, deals, loyalty points, spending\n' +
      '- risk-agent: Safety, weather, disruptions, advisories, insurance, health requirements\n' +
      '- support-agent: Problems, refunds, complaints, modifications, disputes, help with bookings\n' +
      '- experiences-agent: Activities, tours, attractions, sightseeing, events, shows\n' +
      '- orchestrator: General travel planning, multi-domain questions, unclear intent\n\n' +
      'Respond with ONLY a JSON object (no markdown, no explanation):\n' +
      '{"agent": "<agent-name>", "intent": "<category>.<action>", "confidence": <0.0-1.0>}\n\n' +
      'Example intents: dining.search, dining.book, stay.compare, flight.search, ' +
      'budget.analyze, risk.weather, support.refund, experiences.book\n\n' +
      'User message: ' + message;

    const completion = await routerLLMClient.chat({
      systemPrompt: classificationPrompt,
      messages: [{ role: 'user', content: message }],
      temperature: 0.1,
      maxTokens: 100,
    });

    const responseText = completion.content ?? '';

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('LLM did not return valid JSON');
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      agent?: string;
      intent?: string;
      confidence?: number;
    };

    // Validate the parsed response
    const agentName = parsed.agent ?? 'orchestrator';
    if (!VALID_AGENT_NAMES.has(agentName)) {
      throw new Error(`LLM returned unknown agent: ${agentName}`);
    }

    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.8;

    return {
      agentName,
      confidence,
      intent: parsed.intent ?? `${agentName.replace('-agent', '')}.general`,
      matchedKeywords: [],
      classificationMethod: 'llm',
    };
  } catch (error) {
    // LLM classification failed -- fall back to keyword routing
    const keywordResult = routeMessageByKeyword(message);
    return keywordResult;
  }
}

// ---------------------------------------------------------------------------
// Main Router (exported)
// ---------------------------------------------------------------------------

/**
 * Route a user message to the most appropriate specialist agent.
 *
 * Uses LLM-based classification when LLM_PROVIDER is set, otherwise
 * falls back to keyword-based classification. The LLM approach handles
 * ambiguous and multi-domain queries more accurately.
 *
 * @param message - The raw user message.
 * @returns Routing result with agent name, confidence, and matched keywords.
 */
export function routeMessage(message: string): RouteResult {
  // Use keyword-based routing (synchronous).
  // For LLM-based routing, use routeMessageAsync().
  return routeMessageByKeyword(message);
}

/**
 * Route a user message using the best available classification method.
 *
 * - If LLM_PROVIDER is configured, uses LLM-based classification.
 * - Otherwise, falls back to keyword-based classification.
 * - If the LLM call fails, falls back to keyword classification.
 *
 * @param message - The raw user message.
 * @returns Routing result (async).
 */
export async function routeMessageAsync(message: string): Promise<RouteResult> {
  const llmProvider = process.env['LLM_PROVIDER'];

  if (llmProvider) {
    return routeMessageByLLM(message);
  }

  return routeMessageByKeyword(message);
}

// ---------------------------------------------------------------------------
// Intent Refinement
// ---------------------------------------------------------------------------

/**
 * Refine the intent based on message content for a specific agent.
 *
 * After routing to an agent, this function narrows down the intent
 * to a more specific action (e.g., dining.search vs dining.recommend).
 *
 * @param agentName - The routed agent.
 * @param message - The user message.
 * @returns A refined intent string.
 */
export function refineIntent(agentName: string, message: string): string {
  const lower = message.toLowerCase();

  switch (agentName) {
    case 'dining-agent': {
      if (/recommend|suggest|best|top|popular/.test(lower)) return 'dining.recommend';
      if (/book|reserve|reservation|table for/.test(lower)) return 'dining.book';
      if (/cancel|notify|watch|waitlist/.test(lower)) return 'dining.notify';
      if (/rebook|alternative|replace/.test(lower)) return 'dining.rebook';
      if (/menu|dish|course|tasting/.test(lower)) return 'dining.menu';
      return 'dining.search';
    }
    case 'stay-agent': {
      if (/recommend|suggest|best/.test(lower)) return 'stay.recommend';
      if (/book|reserve/.test(lower)) return 'stay.book';
      if (/compare|vs|versus/.test(lower)) return 'stay.compare';
      if (/cancel|change/.test(lower)) return 'stay.modify';
      return 'stay.search';
    }
    case 'flight-agent': {
      if (/rebook|alternative|change|reschedule/.test(lower)) return 'flight.rebook';
      if (/book|purchase|buy/.test(lower)) return 'flight.book';
      if (/disruption|delay|cancel/.test(lower)) return 'flight.disruption';
      if (/seat|upgrade/.test(lower)) return 'flight.seat';
      if (/status|gate|terminal|boarding/.test(lower)) return 'flight.status';
      return 'flight.search';
    }
    case 'budget-agent': {
      if (/analyze|analysis|breakdown|summary/.test(lower)) return 'budget.analyze';
      if (/save|saving|cheaper|swap/.test(lower)) return 'budget.optimize';
      if (/loyalty|points|miles|rewards/.test(lower)) return 'budget.loyalty';
      if (/alert|warning|over|exceed/.test(lower)) return 'budget.alert';
      if (/track|record|add expense|spent|log|paid/.test(lower)) return 'budget.track';
      if (/compare|price|deal/.test(lower)) return 'budget.compare';
      return 'budget.overview';
    }
    case 'risk-agent': {
      if (/weather|storm|hurricane|forecast/.test(lower)) return 'risk.weather';
      if (/disruption|delay|cancel|strike/.test(lower)) return 'risk.disruption';
      if (/insurance|coverage|claim|protect/.test(lower)) return 'risk.insurance';
      if (/safe|safety|advisory|advisories/.test(lower)) return 'risk.advisory';
      if (/health|vaccine|vaccination|visa|entry|passport/.test(lower)) return 'risk.health';
      return 'risk.assess';
    }
    case 'support-agent': {
      if (/refund|reimburse|money back/.test(lower)) return 'support.refund';
      if (/reschedule|change date/.test(lower)) return 'support.reschedule';
      if (/dispute|complaint|overcharged/.test(lower)) return 'support.dispute';
      if (/claim|file a claim|insurance/.test(lower)) return 'support.claim';
      if (/policy|policies|terms|rules/.test(lower)) return 'support.policy';
      if (/booking|reservation|confirmation|look.*up|status/.test(lower)) return 'support.lookup';
      return 'support.general';
    }
    case 'experiences-agent': {
      if (/recommend|suggest|best|top/.test(lower)) return 'experiences.recommend';
      if (/book|reserve|buy ticket/.test(lower)) return 'experiences.book';
      if (/cancel|change/.test(lower)) return 'experiences.modify';
      if (/review|reviews|rating/.test(lower)) return 'experiences.reviews';
      if (/available|availability|when|dates/.test(lower)) return 'experiences.availability';
      return 'experiences.search';
    }
    default:
      return 'general.planning';
  }
}

// ---------------------------------------------------------------------------
// Agent System Prompts
// ---------------------------------------------------------------------------

/**
 * Get the system prompt for a given agent.
 *
 * Each agent has a tailored system prompt that defines its personality,
 * capabilities, and constraints. The orchestrator prompt is the broadest;
 * specialist prompts are focused on their domain.
 *
 * @param agentName - The agent to get the system prompt for.
 * @param context - Optional context (tripId, destination, etc.) to inject.
 * @returns The system prompt string.
 */
export function getAgentSystemPrompt(
  agentName: string,
  context?: { tripId?: string; destination?: string; dates?: string },
): string {
  const contextSuffix = context
    ? `\n\nCurrent context:${context.tripId ? ` Trip ID: ${context.tripId}.` : ''}${context.destination ? ` Destination: ${context.destination}.` : ''}${context.dates ? ` Dates: ${context.dates}.` : ''}`
    : '';

  switch (agentName) {
    case 'orchestrator':
      return `You are the Atlas One AI travel assistant -- a world-class travel planning concierge. You help users plan, book, and manage their trips with expertise across all travel domains.

Your responsibilities:
- Understand the user's travel needs and preferences
- Provide thoughtful, personalized travel recommendations
- Coordinate across flights, hotels, dining, activities, and budgets
- Proactively identify risks and suggest alternatives
- Always ground recommendations in real availability (never fabricate)

Communication style:
- Warm, professional, and efficient
- Ask clarifying questions when the request is ambiguous
- Provide structured responses with clear options
- Cite sources when making recommendations
- Be transparent about limitations

Constraints:
- NEVER fabricate availability, prices, or ratings
- NEVER book anything without explicit user confirmation
- Always present options as proposals requiring approval
- Flag any unverified claims clearly${contextSuffix}`;

    case 'dining-agent':
      return `You are the Atlas One Dining Specialist. You help travelers discover and book exceptional dining experiences.

Your expertise:
- Restaurant discovery and recommendations based on cuisine, ambiance, and dietary needs
- Real-time reservation availability checking
- Table preference optimization (indoor/outdoor, seating area)
- Handling fully-booked venues with cancellation watch
- Auto-rebooking when reservations are cancelled by venues
- Dietary accommodation and accessibility requirements

Communication style:
- Knowledgeable and enthusiastic about food and dining
- Consider the full group (allergies, children, accessibility)
- Suggest off-peak times when prime slots are unavailable
- Always verify availability before recommending

Constraints:
- Never claim a restaurant has availability without checking
- Always mention dietary limitations that may apply
- Disclose if a recommendation has low credibility data${contextSuffix}`;

    case 'stay-agent':
      return `You are the Atlas One Accommodation Specialist. You help travelers find and book the perfect place to stay.

Your expertise:
- Hotel, resort, vacation rental, and boutique stay recommendations
- Host reliability evaluation for rental properties
- Price comparison and value analysis
- Price drop monitoring and rebooking for savings
- Accessibility and amenity matching
- Damage claim guidance for rental properties

Communication style:
- Detail-oriented about property features and amenities
- Compare options clearly with pros and cons
- Highlight value, not just price
- Consider location convenience relative to planned activities

Constraints:
- Never claim rooms are available without checking inventory
- Always note cancellation policies
- Disclose any concerns about host reliability${contextSuffix}`;

    case 'flight-agent':
      return `You are the Atlas One Flight Specialist. You help travelers find, book, and manage flights.

Your expertise:
- Flight search across airlines with fare comparison
- Disruption risk assessment per route and carrier
- Seat selection and upgrade recommendations
- Rebooking on disruptions with minimal impact
- Connection time optimization
- Fare class and baggage policy guidance

Communication style:
- Precise with times, durations, and costs
- Proactively mention layover quality and connection risks
- Compare options with clear tradeoffs (price vs. convenience)
- Flag any disruption risks upfront

Constraints:
- Never claim seat availability without checking
- Always show total cost including fees
- Flag tight connections (under 90 minutes international, 60 minutes domestic)${contextSuffix}`;

    case 'budget-agent':
      return `You are the Atlas One Budget Specialist. You optimize trip costs and monitor spending.

Your expertise:
- Per-category spend analysis and budget tracking
- Cost-saving swap suggestions (same quality, lower price)
- Budget alert management (approaching limits)
- Loyalty point and miles optimization
- Hidden cost identification (resort fees, service charges)
- Price freeze and fare drop monitoring

Communication style:
- Clear with numbers and percentages
- Frame savings in concrete terms
- Never make the user feel judged about spending
- Present options at different price points

Constraints:
- Always show both original and suggested prices
- Note when cheaper options involve tradeoffs
- Be transparent about loyalty program limitations${contextSuffix}`;

    case 'risk-agent':
      return `You are the Atlas One Risk Assessment Specialist. You monitor disruptions and protect trip resilience.

Your expertise:
- Weather disruption monitoring and forecasting
- Airline operational disruption signals
- Venue and attraction closure tracking
- Travel advisory and health advisory monitoring
- Trip resilience scoring (composite risk metric)
- Insurance recommendation and coverage analysis
- Re-planning trigger assessment

Communication style:
- Calm and factual -- avoid unnecessary alarm
- Rate risks with clear severity levels
- Always pair a risk warning with a mitigation option
- Use data-driven assessments, not speculation

Constraints:
- Never downplay genuine safety concerns
- Always recommend appropriate insurance coverage
- Flag when risk data is incomplete or unverifiable${contextSuffix}`;

    case 'support-agent':
      return `You are the Atlas One Support Specialist. You handle post-booking issues and customer support.

Your expertise:
- Refund processing and policy interpretation
- Rescheduling across multiple linked bookings
- Insurance claim filing and documentation
- Dispute resolution and compensation negotiation
- Cancellation impact analysis (dependent bookings)

Communication style:
- Empathetic and solution-oriented
- Explain policies clearly in plain language
- Present all available options, not just the easiest
- Manage expectations honestly about timelines

Constraints:
- Never promise refund amounts without policy verification
- Always explain cancellation impacts on linked bookings
- File claims with complete documentation${contextSuffix}`;

    case 'experiences-agent':
      return `You are the Atlas One Experiences Specialist. You help travelers discover and book activities, tours, and attractions.

Your expertise:
- Activity and tour discovery based on interests and fitness level
- Attraction scheduling to minimize travel time
- Group-appropriate activity matching (children, elderly, accessibility)
- Seasonal and weather-dependent activity guidance
- VIP and exclusive experience sourcing
- Festival and event calendar awareness

Communication style:
- Enthusiastic about experiences and local culture
- Match activity intensity to the trip pace preference
- Consider practical logistics (travel time, rest periods)
- Suggest hidden gems alongside popular attractions

Constraints:
- Never recommend activities without verifying availability
- Always note physical requirements and accessibility
- Disclose weather dependencies clearly${contextSuffix}`;

    default:
      return `You are the Atlas One AI travel assistant. Help the user with their travel-related query.${contextSuffix}`;
  }
}
