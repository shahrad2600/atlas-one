/**
 * Atlas One -- Finance Tools
 *
 * Consolidated finance/budget tools for the AI orchestrator:
 * analyzeBudgetChat, trackExpenseChat, comparePricesChat.
 * Each returns realistic mock data.
 *
 * Design invariant: analyzeBudget and comparePrices are query tools;
 * trackExpense is a mutation tool with a lower rate limit.
 */

import type { ToolDefinition, ToolContext, ValidationResult } from './searchAvailability.js';

// ---------------------------------------------------------------------------
// Rate Limiters
// ---------------------------------------------------------------------------

interface RateLimitState {
  windowStart: number;
  count: number;
}

const queryRateLimitMap = new Map<string, RateLimitState>();
const mutationRateLimitMap = new Map<string, RateLimitState>();
const RATE_LIMIT_WINDOW_MS = 60_000;

function checkQueryRateLimit(userId: string): boolean {
  const now = Date.now();
  const state = queryRateLimitMap.get(userId);

  if (!state || now - state.windowStart > RATE_LIMIT_WINDOW_MS) {
    queryRateLimitMap.set(userId, { windowStart: now, count: 1 });
    return true;
  }

  if (state.count >= 100) return false;
  state.count++;
  return true;
}

function checkMutationRateLimit(userId: string): boolean {
  const now = Date.now();
  const state = mutationRateLimitMap.get(userId);

  if (!state || now - state.windowStart > RATE_LIMIT_WINDOW_MS) {
    mutationRateLimitMap.set(userId, { windowStart: now, count: 1 });
    return true;
  }

  if (state.count >= 30) return false;
  state.count++;
  return true;
}

// ---------------------------------------------------------------------------
// analyzeBudgetChat
// ---------------------------------------------------------------------------

export const analyzeBudgetChatTool: ToolDefinition = {
  name: 'analyzeBudgetChat',

  description:
    'Analyze trip budget with per-category breakdown, spending trends, alerts, ' +
    'and projections. Returns comprehensive budget health assessment.',

  parameters: {
    type: 'object',
    required: ['tripId', 'userId'],
    properties: {
      tripId: {
        type: 'string',
        description: 'Trip ID to analyze budget for.',
      },
      userId: {
        type: 'string',
        description: 'User ID.',
      },
      focus: {
        type: 'string',
        enum: ['overview', 'category', 'loyalty', 'projection'],
        description: 'Focus area for the analysis.',
        default: 'overview',
      },
      category: {
        type: 'string',
        enum: ['flights', 'stays', 'dining', 'experiences', 'transport', 'other'],
        description: 'Specific category to analyze (when focus is "category").',
      },
    },
  },

  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['tripId']) errors.push('tripId is required.');
    if (!params['userId']) errors.push('userId is required.');

    if (!checkQueryRateLimit(context.userId)) {
      errors.push('Rate limit exceeded.');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    const focus = (params['focus'] as string) ?? 'overview';

    if (focus === 'loyalty') {
      return {
        traceId: context.traceId,
        tripId: params['tripId'],
        focus: 'loyalty',
        loyaltyPrograms: [
          {
            program: 'American Airlines AAdvantage',
            pointsBalance: 45200,
            cashValue: 452,
            applicableTo: 'AA 100 JFK-LHR flight ($487)',
            redemptionRate: 0.01,
            worthRedeeming: false,
            reasoning: 'At $0.01/point, the 48,700 points needed represent poor value.',
          },
          {
            program: 'Atlas Rewards',
            pointsBalance: 12500,
            cashValue: 125,
            applicableTo: 'Any booking on Atlas One',
            redemptionRate: 0.01,
            worthRedeeming: true,
            reasoning: 'Good value. Apply 12,500 points to save $125 on your hotel.',
          },
          {
            program: 'Marriott Bonvoy',
            pointsBalance: 87000,
            cashValue: 609,
            applicableTo: 'Not applicable (Four Seasons is not Marriott)',
            redemptionRate: 0.007,
            worthRedeeming: false,
            reasoning: 'Points cannot be used at Four Seasons.',
          },
        ],
        totalRedeemableValue: 125,
        recommendation: 'Apply 12,500 Atlas Rewards points to save $125 on your hotel stay.',
      };
    }

    return {
      traceId: context.traceId,
      tripId: params['tripId'],
      focus: 'overview',
      currency: 'USD',
      totalBudget: 5000,
      totalSpent: 2847,
      totalCommitted: 650,
      totalRemaining: 1503,
      utilizationPct: 70,
      healthStatus: 'on_track',
      byCategory: [
        { category: 'flights', budgeted: 1500, spent: 974, committed: 0, remaining: 526, utilizationPct: 65, icon: 'plane' },
        { category: 'stays', budgeted: 1800, spent: 1245, committed: 450, remaining: 105, utilizationPct: 94, icon: 'bed' },
        { category: 'dining', budgeted: 600, spent: 328, committed: 150, remaining: 122, utilizationPct: 80, icon: 'utensils' },
        { category: 'experiences', budgeted: 800, spent: 200, committed: 50, remaining: 550, utilizationPct: 31, icon: 'camera' },
        { category: 'other', budgeted: 300, spent: 100, committed: 0, remaining: 200, utilizationPct: 33, icon: 'ellipsis' },
      ],
      projectedTotal: 4650,
      projectedOverage: null,
      dailyAverage: 356.50,
      topExpenses: [
        { item: 'Round-trip flights (JFK-LHR)', amount: 974, category: 'flights' },
        { item: 'Four Seasons Hotel (3 nights)', amount: 1245, category: 'stays' },
        { item: 'Le Bernardin dinner', amount: 185, category: 'dining' },
        { item: 'London Eye tickets (2)', amount: 120, category: 'experiences' },
        { item: 'Tower of London tour', amount: 80, category: 'experiences' },
      ],
      alerts: [
        {
          type: 'warning',
          category: 'stays',
          message: 'Stays budget is at 94% utilization -- only $105 remaining',
        },
      ],
      savingsOpportunities: 3,
    };
  },
};

// ---------------------------------------------------------------------------
// trackExpenseChat
// ---------------------------------------------------------------------------

export const trackExpenseChatTool: ToolDefinition = {
  name: 'trackExpenseChat',

  description:
    'Record a new expense against the trip budget. Supports amount, category, ' +
    'description, and optional receipt. Returns updated category totals.',

  parameters: {
    type: 'object',
    required: ['tripId', 'userId', 'amount', 'category'],
    properties: {
      tripId: {
        type: 'string',
        description: 'Trip ID to record expense against.',
      },
      userId: {
        type: 'string',
        description: 'User recording the expense.',
      },
      amount: {
        type: 'number',
        minimum: 0.01,
        description: 'Expense amount.',
      },
      currency: {
        type: 'string',
        default: 'USD',
        description: 'Expense currency (ISO 4217).',
      },
      category: {
        type: 'string',
        enum: ['flights', 'stays', 'dining', 'experiences', 'transport', 'other'],
        description: 'Expense category.',
      },
      description: {
        type: 'string',
        description: 'Expense description.',
      },
      date: {
        type: 'string',
        format: 'date',
        description: 'Date of expense (YYYY-MM-DD). Defaults to today.',
      },
      paymentMethod: {
        type: 'string',
        description: 'Payment method used.',
      },
    },
  },

  async validate(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!params['tripId']) errors.push('tripId is required.');
    if (!params['userId']) errors.push('userId is required.');

    if (!params['amount'] || typeof params['amount'] !== 'number' || params['amount'] <= 0) {
      errors.push('amount is required and must be a positive number.');
    }

    if (!params['category']) errors.push('category is required.');

    const validCategories = ['flights', 'stays', 'dining', 'experiences', 'transport', 'other'];
    if (params['category'] && !validCategories.includes(params['category'] as string)) {
      errors.push(`category must be one of: ${validCategories.join(', ')}.`);
    }

    if (!checkMutationRateLimit(context.userId)) {
      errors.push('Rate limit exceeded. Maximum 30 expense entries per minute.');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    const amount = params['amount'] as number;
    const category = params['category'] as string;
    const currency = (params['currency'] as string) ?? 'USD';

    // Simulate category totals based on the category
    const categoryTotals: Record<string, { previousTotal: number; budget: number }> = {
      flights: { previousTotal: 974, budget: 1500 },
      stays: { previousTotal: 1245, budget: 1800 },
      dining: { previousTotal: 328, budget: 600 },
      experiences: { previousTotal: 200, budget: 800 },
      transport: { previousTotal: 75, budget: 200 },
      other: { previousTotal: 100, budget: 300 },
    };

    const catData = categoryTotals[category] ?? { previousTotal: 0, budget: 500 };
    const newTotal = catData.previousTotal + amount;
    const remaining = catData.budget - newTotal;
    const utilization = Math.round((newTotal / catData.budget) * 100);

    return {
      traceId: context.traceId,
      expenseId: `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      tripId: params['tripId'],
      amount,
      currency,
      category,
      description: params['description'] ?? 'Expense',
      date: params['date'] ?? new Date().toISOString().split('T')[0],
      paymentMethod: params['paymentMethod'] ?? 'Visa ending in 4242',
      recordedAt: new Date().toISOString(),
      categoryUpdate: {
        previousTotal: catData.previousTotal,
        newTotal,
        budget: catData.budget,
        remaining,
        utilization,
      },
      alert: utilization >= 90
        ? {
            type: 'warning',
            message: `${category} budget is at ${utilization}% -- only $${remaining} remaining`,
          }
        : null,
      loyaltyPointsEarned: Math.floor(amount * 0.5),
    };
  },
};

// ---------------------------------------------------------------------------
// comparePricesChat
// ---------------------------------------------------------------------------

export const comparePricesChatTool: ToolDefinition = {
  name: 'comparePricesChat',

  description:
    'Compare prices for a booking across multiple providers. Returns side-by-side ' +
    'comparison with prices, perks, and best-price recommendation.',

  parameters: {
    type: 'object',
    required: ['category', 'itemId'],
    properties: {
      category: {
        type: 'string',
        enum: ['hotel', 'flight', 'experience'],
        description: 'Booking category to compare.',
      },
      itemId: {
        type: 'string',
        description: 'ID of the item to compare prices for.',
      },
      itemName: {
        type: 'string',
        description: 'Name of the item (for display).',
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

    if (!checkQueryRateLimit(context.userId)) {
      errors.push('Rate limit exceeded.');
    }

    return { valid: errors.length === 0, errors };
  },

  async execute(
    params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<unknown> {
    const category = params['category'] as string;

    if (category === 'hotel') {
      return {
        traceId: context.traceId,
        item: params['itemName'] ?? 'Four Seasons Hotel New York Downtown - 3 nights',
        category,
        currentPrice: 1245,
        currency: 'USD',
        providers: [
          { name: 'Atlas One Direct', price: 1245, perks: 'Free cancellation, loyalty points, concierge support', bestPrice: true },
          { name: 'Booking.com', price: 1302, perks: 'Genius discount available' },
          { name: 'Hotels.com', price: 1289, perks: 'Earn 1 free night for every 10' },
          { name: 'Expedia', price: 1310, perks: 'Bundle discount with flights' },
          { name: 'Hotel Direct', price: 1350, perks: 'Room upgrade subject to availability' },
        ],
        bestPrice: 1245,
        bestProvider: 'Atlas One Direct',
        savings: 105,
        verdict: 'You already have the best price through Atlas One.',
        priceHistory: {
          trend: 'stable',
          thirtyDayLow: 1198,
          thirtyDayHigh: 1450,
          currentVsAverage: 'below_average',
        },
        checkedAt: new Date().toISOString(),
      };
    }

    if (category === 'flight') {
      return {
        traceId: context.traceId,
        item: params['itemName'] ?? 'JFK to LHR - Round trip',
        category,
        currentPrice: 487,
        currency: 'USD',
        providers: [
          { name: 'Atlas One', price: 487, perks: 'Free cancellation 24h, loyalty points' },
          { name: 'Google Flights', price: 487, perks: 'Price tracking' },
          { name: 'Kayak', price: 492, perks: 'Price alert available' },
          { name: 'Airline Direct (AA)', price: 487, perks: 'Extra baggage, seat selection priority' },
          { name: 'Skyscanner', price: 478, perks: 'Lowest price but no cancellation support', bestPrice: true },
        ],
        bestPrice: 478,
        bestProvider: 'Skyscanner',
        savings: 9,
        verdict: 'Skyscanner is $9 cheaper but lacks cancellation support. Atlas One offers better value with free cancellation.',
        priceHistory: {
          trend: 'rising',
          thirtyDayLow: 412,
          thirtyDayHigh: 567,
          currentVsAverage: 'average',
        },
        checkedAt: new Date().toISOString(),
      };
    }

    // Experience
    return {
      traceId: context.traceId,
      item: params['itemName'] ?? 'Tower of London Priority Access',
      category,
      currentPrice: 42,
      currency: 'GBP',
      providers: [
        { name: 'Atlas One', price: 42, perks: 'Instant confirmation, mobile ticket, free cancellation', bestPrice: true },
        { name: 'GetYourGuide', price: 45, perks: 'App-based ticket' },
        { name: 'Viator', price: 44, perks: 'Bundle available' },
        { name: 'Official Site', price: 42, perks: 'Direct booking, membership discount available' },
        { name: 'Tiqets', price: 43, perks: 'Last-minute booking available' },
      ],
      bestPrice: 42,
      bestProvider: 'Atlas One',
      savings: 3,
      verdict: 'Atlas One and the official site offer the best price. Atlas One adds free cancellation.',
      checkedAt: new Date().toISOString(),
    };
  },
};
