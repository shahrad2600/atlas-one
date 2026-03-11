/**
 * Atlas One -- Budget Specialist Agent (Chat Interface)
 *
 * Implements the simplified Agent interface for budget analysis,
 * expense tracking, savings suggestions, and price comparison
 * with realistic mock data.
 */

import type { Agent, AgentContext, AgentResponse, ToolAction } from './base.js';

// ---------------------------------------------------------------------------
// Budget Specialist Agent
// ---------------------------------------------------------------------------

export class BudgetSpecialist implements Agent {
  name = 'budget-agent';

  description =
    'Expert in travel budgeting, price optimization, deal finding, expense tracking, ' +
    'and loyalty point optimization. Provides budget breakdowns, cost-saving suggestions, ' +
    'and spending analysis.';

  systemPrompt =
    'You are the Atlas One Budget Specialist -- an expert in optimizing ' +
    'trip costs and managing travel spending.\n\n' +
    'Your expertise:\n' +
    '- Per-category spend analysis and budget tracking\n' +
    '- Cost-saving swap suggestions (same quality, lower price)\n' +
    '- Budget alert management (approaching limits)\n' +
    '- Loyalty point and miles optimization\n' +
    '- Hidden cost identification (resort fees, service charges)\n' +
    '- Price freeze and fare drop monitoring\n\n' +
    'Communication style:\n' +
    '- Clear with numbers and percentages\n' +
    '- Frame savings in concrete terms\n' +
    '- Never make the user feel judged about spending\n' +
    '- Present options at different price points\n\n' +
    'Constraints:\n' +
    '- Always show both original and suggested prices\n' +
    '- Note when cheaper options involve tradeoffs\n' +
    '- Be transparent about loyalty program limitations';

  tools = ['analyzeBudget', 'trackExpenses', 'suggestSavings', 'comparePrices'];

  async process(
    message: string,
    context: AgentContext,
    _history: Array<{ role: string; content: string }>,
  ): Promise<AgentResponse> {
    const lower = message.toLowerCase();
    const actions: ToolAction[] = [];

    const isTrackExpense = /track|record|add expense|spent|log|paid/i.test(lower);
    const isSavings = /save|saving|cheaper|cut|reduce|optimize|swap/i.test(lower);
    const isCompare = /compare|price|prices|deal|deals|cheaper|best price/i.test(lower);
    const isLoyalty = /loyalty|points|miles|rewards|cashback/i.test(lower);

    if (isTrackExpense) {
      return this.handleTrackExpense(message, context, actions);
    }

    if (isSavings) {
      return this.handleSavings(context, actions);
    }

    if (isCompare) {
      return this.handlePriceComparison(message, context, actions);
    }

    if (isLoyalty) {
      return this.handleLoyaltyOptimization(context, actions);
    }

    // Default: budget analysis
    return this.handleBudgetAnalysis(context, actions);
  }

  private async handleBudgetAnalysis(
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const analysisAction: ToolAction = {
      tool: 'analyzeBudget',
      params: { tripId: context.tripId ?? 'trip_current', userId: context.userId },
      result: {
        tripId: context.tripId ?? 'trip_current',
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
      },
      status: 'executed' as const,
    };
    actions.push(analysisAction);

    const a = analysisAction.result as Record<string, unknown>;
    const categories = a['byCategory'] as Array<{
      category: string; budgeted: number; spent: number; committed: number; remaining: number; utilizationPct: number;
    }>;
    const topExpenses = a['topExpenses'] as Array<{ item: string; amount: number; category: string }>;

    let text = `**Trip Budget Analysis**\n\n`;
    text += `**Overall Health: ${(a['healthStatus'] as string).replace('_', ' ').toUpperCase()}**\n`;
    text += `Total Budget: $${a['totalBudget'] as number} | Spent: $${a['totalSpent'] as number} | Remaining: $${a['totalRemaining'] as number}\n`;
    text += `Utilization: ${a['utilizationPct'] as number}% | Daily Average: $${a['dailyAverage'] as number}\n\n`;

    text += `**Category Breakdown:**\n`;
    for (const cat of categories) {
      const bar = cat.utilizationPct >= 90 ? '!!' : cat.utilizationPct >= 70 ? '--' : '..';
      text += `- **${cat.category}**: $${cat.spent}/$${cat.budgeted} (${cat.utilizationPct}%) ${bar} $${cat.remaining} remaining\n`;
    }

    const atRisk = categories.filter((c) => c.utilizationPct >= 85);
    if (atRisk.length > 0) {
      text += `\n**Alerts:**\n`;
      for (const cat of atRisk) {
        text += `- ${cat.category} is at ${cat.utilizationPct}% -- only $${cat.remaining} remaining\n`;
      }
    }

    text += `\n**Top Expenses:**\n`;
    for (const exp of topExpenses) {
      text += `- ${exp.item}: $${exp.amount}\n`;
    }

    text += `\nProjected total: $${a['projectedTotal'] as number} (within budget)`;

    return {
      message: text,
      actions,
      suggestions: [
        'Show spending breakdown',
        'Suggest cost-saving swaps',
        'Check loyalty point options',
        'Set a budget alert',
      ],
      confidence: 0.93,
    };
  }

  private async handleTrackExpense(
    message: string,
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    // Extract amount from message
    const amountMatch = message.match(/\$?(\d+(?:\.\d{2})?)/);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : 45.00;

    const trackAction: ToolAction = {
      tool: 'trackExpenses',
      params: {
        tripId: context.tripId ?? 'trip_current',
        userId: context.userId,
        amount,
        currency: 'USD',
        category: 'dining',
        description: 'Expense from user input',
      },
      result: {
        expenseId: `exp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        amount,
        currency: 'USD',
        category: 'dining',
        recordedAt: new Date().toISOString(),
        newCategoryTotal: 373,
        categoryBudget: 600,
        categoryRemaining: 227,
        categoryUtilization: 62,
      },
      status: 'executed' as const,
    };
    actions.push(trackAction);

    const r = trackAction.result as Record<string, unknown>;

    return {
      message:
        `Expense recorded successfully.\n\n` +
        `**Recorded:** $${amount} for dining\n` +
        `**Category total:** $${r['newCategoryTotal'] as number} of $${r['categoryBudget'] as number} budget\n` +
        `**Remaining:** $${r['categoryRemaining'] as number} (${r['categoryUtilization'] as number}% used)\n\n` +
        `Your dining budget is on track.`,
      actions,
      suggestions: [
        'Show full budget breakdown',
        'Add another expense',
        'Show recent expenses',
        'Suggest savings',
      ],
      confidence: 0.9,
    };
  }

  private async handleSavings(
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const savingsAction: ToolAction = {
      tool: 'suggestSavings',
      params: { tripId: context.tripId ?? 'trip_current', userId: context.userId },
      result: {
        totalPotentialSavings: 487,
        currency: 'USD',
        suggestions: [
          {
            id: 'swap_1',
            category: 'stays',
            currentItem: 'Four Seasons Hotel (3 nights) - $1,245',
            alternativeItem: 'The Standard, High Line (3 nights) - $855',
            savings: 390,
            savingsPercent: 31,
            qualityImpact: 'moderate',
            tradeoffs: ['Smaller room', 'No pool or spa', 'Different neighborhood (Meatpacking vs Financial District)'],
          },
          {
            id: 'swap_2',
            category: 'flights',
            currentItem: 'British Airways BA 178 (non-stop) - $523',
            alternativeItem: 'Delta/KLM DL 1 (1 stop via Amsterdam) - $389',
            savings: 134,
            savingsPercent: 26,
            qualityImpact: 'minimal',
            tradeoffs: ['One stop in Amsterdam (2h layover)', 'Slightly longer total journey'],
          },
          {
            id: 'swap_3',
            category: 'dining',
            currentItem: 'Le Bernardin dinner for 2 - $370',
            alternativeItem: 'The Grill dinner for 2 - $280',
            savings: 90,
            savingsPercent: 24,
            qualityImpact: 'minimal',
            tradeoffs: ['Different cuisine (steakhouse vs seafood)', 'No Michelin stars but excellent reviews'],
          },
        ],
      },
      status: 'executed' as const,
    };
    actions.push(savingsAction);

    const r = savingsAction.result as Record<string, unknown>;
    const suggestions = r['suggestions'] as Array<{
      id: string; category: string; currentItem: string; alternativeItem: string;
      savings: number; savingsPercent: number; qualityImpact: string; tradeoffs: string[];
    }>;

    let text = `**Cost-Saving Opportunities**\n\n`;
    text += `Total potential savings: **$${r['totalPotentialSavings'] as number}**\n\n`;

    for (const s of suggestions) {
      text += `**${s.category.toUpperCase()} -- Save $${s.savings} (${s.savingsPercent}%)**\n`;
      text += `- Current: ${s.currentItem}\n`;
      text += `- Alternative: ${s.alternativeItem}\n`;
      text += `- Quality impact: ${s.qualityImpact}\n`;
      text += `- Tradeoffs: ${s.tradeoffs.join('; ')}\n\n`;
    }

    text += `All alternatives have been verified for availability. Would you like to make any of these swaps?`;

    return {
      message: text,
      actions,
      suggestions: [
        'Apply the hotel swap',
        'Apply the flight swap',
        'Show me more options',
        'Keep current bookings',
      ],
      confidence: 0.88,
    };
  }

  private async handlePriceComparison(
    _message: string,
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const compareAction: ToolAction = {
      tool: 'comparePrices',
      params: { tripId: context.tripId ?? 'trip_current', category: 'stays' },
      result: {
        item: 'Four Seasons Hotel New York Downtown - 3 nights',
        currentPrice: 1245,
        currency: 'USD',
        providers: [
          { name: 'Atlas One Direct', price: 1245, perks: 'Free cancellation, loyalty points, concierge support' },
          { name: 'Booking.com', price: 1302, perks: 'Genius discount available' },
          { name: 'Hotels.com', price: 1289, perks: 'Earn 1 free night for every 10' },
          { name: 'Expedia', price: 1310, perks: 'Bundle discount with flights' },
          { name: 'Hotel Direct', price: 1350, perks: 'Room upgrade subject to availability' },
        ],
        bestPrice: 1245,
        bestProvider: 'Atlas One Direct',
        savings: 105,
        verdict: 'You already have the best price through Atlas One.',
      },
      status: 'executed' as const,
    };
    actions.push(compareAction);

    const r = compareAction.result as Record<string, unknown>;
    const providers = r['providers'] as Array<{ name: string; price: number; perks: string }>;

    let text = `**Price Comparison: ${r['item'] as string}**\n\n`;
    for (const p of providers) {
      const isBest = p.price === (r['bestPrice'] as number);
      text += `${isBest ? '-> ' : '   '}**${p.name}**: $${p.price}${isBest ? ' (BEST)' : ''}\n`;
      text += `   ${p.perks}\n\n`;
    }

    text += `**Verdict:** ${r['verdict'] as string}\n`;
    text += `You are saving $${r['savings'] as number} compared to the most expensive option.`;

    return {
      message: text,
      actions,
      suggestions: [
        'Compare flight prices',
        'Compare experience prices',
        'Show price history',
        'Set up price alerts',
      ],
      confidence: 0.9,
    };
  }

  private async handleLoyaltyOptimization(
    context: AgentContext,
    actions: ToolAction[],
  ): Promise<AgentResponse> {
    const loyaltyAction: ToolAction = {
      tool: 'analyzeBudget',
      params: { tripId: context.tripId ?? 'trip_current', userId: context.userId, focus: 'loyalty' },
      result: {
        loyaltyPrograms: [
          {
            program: 'American Airlines AAdvantage',
            pointsBalance: 45200,
            cashValue: 452,
            applicableTo: 'AA 100 JFK-LHR flight ($487)',
            redemptionRate: 0.01,
            worthRedeeming: false,
            reasoning: 'At $0.01/point, the 48,700 points needed represent poor value. Cash price is better.',
          },
          {
            program: 'Atlas Rewards',
            pointsBalance: 12500,
            cashValue: 125,
            applicableTo: 'Any booking on Atlas One',
            redemptionRate: 0.01,
            worthRedeeming: true,
            reasoning: 'Good value. Apply 12,500 points to save $125 on your hotel stay.',
          },
          {
            program: 'Marriott Bonvoy',
            pointsBalance: 87000,
            cashValue: 609,
            applicableTo: 'Not applicable (Four Seasons is not Marriott)',
            redemptionRate: 0.007,
            worthRedeeming: false,
            reasoning: 'Points cannot be used at Four Seasons. Consider for future Marriott stays.',
          },
        ],
        totalRedeemableValue: 125,
        recommendation: 'Apply 12,500 Atlas Rewards points to save $125 on your hotel stay.',
      },
      status: 'executed' as const,
    };
    actions.push(loyaltyAction);

    const r = loyaltyAction.result as Record<string, unknown>;
    const programs = r['loyaltyPrograms'] as Array<{
      program: string; pointsBalance: number; cashValue: number; applicableTo: string;
      redemptionRate: number; worthRedeeming: boolean; reasoning: string;
    }>;

    let text = `**Loyalty Points Optimization**\n\n`;

    for (const p of programs) {
      text += `**${p.program}**\n`;
      text += `- Balance: ${p.pointsBalance.toLocaleString()} points (worth ~$${p.cashValue})\n`;
      text += `- Applicable to: ${p.applicableTo}\n`;
      text += `- ${p.worthRedeeming ? 'RECOMMENDED' : 'Not recommended'}: ${p.reasoning}\n\n`;
    }

    text += `**Recommendation:** ${r['recommendation'] as string}\n`;
    text += `Total redeemable value for this trip: $${r['totalRedeemableValue'] as number}`;

    return {
      message: text,
      actions,
      suggestions: [
        'Apply Atlas Rewards points',
        'Show earning opportunities',
        'Compare redemption rates',
        'Show full budget breakdown',
      ],
      confidence: 0.86,
    };
  }
}
