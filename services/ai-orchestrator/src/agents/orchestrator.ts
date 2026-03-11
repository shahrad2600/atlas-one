/**
 * Atlas One -- Orchestrator Agent
 *
 * The root agent that owns the Trip Object, maintains user constraints,
 * routes intents to domain-specific sub-agents, and manages the
 * proposal/approval lifecycle.
 *
 * Design invariant: AI agents CANNOT mutate state directly. Every write
 * operation flows through the Tool Registry and Validation Pipeline.
 */

import type { ToolRegistry } from '../tools';
import type { ValidationPipeline } from '../validators';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Accessibility requirements for a traveler. */
export interface AccessibilityRequirements {
  mobility: boolean;
  visual: boolean;
  auditory: boolean;
  cognitive: boolean;
  notes: string | null;
}

/** Dietary restrictions and preferences. */
export interface DietaryProfile {
  allergies: string[];
  restrictions: string[];
  preferences: string[];
}

/** Group composition for the trip. */
export interface GroupComposition {
  totalTravelers: number;
  adults: number;
  children: number;
  infants: number;
  ages: number[];
}

/** Per-category budget breakdown. */
export interface BudgetBreakdown {
  flights: number;
  stays: number;
  dining: number;
  experiences: number;
  other: number;
}

/** The user's budget envelope. */
export interface Budget {
  total: number;
  currency: string;
  breakdown: BudgetBreakdown;
  spent: BudgetBreakdown;
}

/** Schedule pacing preference. */
export type PacePreference = 'relaxed' | 'moderate' | 'packed';

/** Trip lifecycle state. */
export type TripStatus =
  | 'draft'
  | 'planning'
  | 'proposed'
  | 'confirmed'
  | 'active'
  | 'disrupted'
  | 're-planning'
  | 'completed';

/**
 * Canonical trip context maintained by the Orchestrator.
 * Every sub-agent receives a read-only snapshot of this context.
 */
export interface TripContext {
  tripId: string;
  userId: string;
  status: TripStatus;
  destination: string;
  startDate: string;
  endDate: string;
  budget: Budget;
  pace: PacePreference;
  accessibility: AccessibilityRequirements;
  dietary: DietaryProfile;
  groupComposition: GroupComposition;
  /** IDs of all confirmed bookings in this trip. */
  bookingIds: string[];
  /** Luxury tier flag -- enables Concierge Agent and delegated approval. */
  isLuxuryTier: boolean;
  /** Delegated approval rules for luxury-tier users. */
  delegationRules: DelegationRule[];
}

/** Rule that allows automatic approval for certain action types. */
export interface DelegationRule {
  actionType: string;
  maxCost: { amount: number; currency: string } | null;
  condition: string | null;
  autoApprove: boolean;
}

/** Classified user intent routed to a sub-agent. */
export interface Intent {
  type: string;
  subAgent: string;
  confidence: number;
  entities: Record<string, unknown>;
  rawMessage: string;
}

/** A single action within a proposal. */
export interface ProposedAction {
  sequence: number;
  tool: string;
  params: Record<string, unknown>;
  estimatedCost: { amount: number; currency: string } | null;
  rollbackTool: string | null;
  description: string;
}

/** Budget impact analysis for a proposal. */
export interface BudgetImpact {
  category: keyof BudgetBreakdown;
  currentSpend: number;
  afterAction: number;
  budgetLimit: number;
  utilizationPct: number;
}

/** Evidence citation attached to recommendations. */
export interface Citation {
  source: 'travel_graph' | 'ugc_corpus' | 'policy_store' | 'partner_api';
  entityId: string;
  field: string | null;
  value: unknown;
  freshness: string;
}

/** Proposal awaiting user approval. */
export interface Proposal {
  proposalId: string;
  tripId: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  summary: string;
  actions: ProposedAction[];
  totalEstimatedCost: { amount: number; currency: string };
  budgetImpact: BudgetImpact;
  evidence: Citation[];
  status: 'pending_approval' | 'approved' | 'rejected' | 'expired' | 'executing' | 'executed' | 'partially_failed';
}

/** Grounding result from the RAG layer. */
export interface GroundingResult {
  content: string;
  citations: Citation[];
  credibilityScore: number;
  isVerified: boolean;
}

/** Response from any agent (orchestrator or sub-agent). */
export interface AgentResponse {
  message: string;
  proposals: Proposal[];
  groundingResults: GroundingResult[];
  metadata: {
    agentId: string;
    traceId: string;
    modelTier: 'fast' | 'strong' | 'specialized';
    latencyMs: number;
    unverifiedClaims: string[];
  };
}

/** Outcome of executing an approved proposal. */
export interface ExecutionResult {
  proposalId: string;
  status: 'success' | 'partial_failure' | 'failure';
  executedActions: {
    sequence: number;
    tool: string;
    status: 'success' | 'failure' | 'rolled_back';
    result: Record<string, unknown> | null;
    error: string | null;
  }[];
  rollbackPerformed: boolean;
}

/** Base interface that every sub-agent implements. */
export interface SubAgent {
  readonly agentId: string;
  readonly name: string;
  handleTask(intent: Intent, context: TripContext): Promise<AgentResponse>;
}

// ---------------------------------------------------------------------------
// Orchestrator Agent
// ---------------------------------------------------------------------------

/**
 * The root Orchestrator Agent.
 *
 * Responsibilities:
 * - Parse and classify user messages into intents.
 * - Maintain canonical trip context.
 * - Route intents to the appropriate sub-agent.
 * - Aggregate sub-agent responses into coherent proposals.
 * - Manage the approval flow and trigger tool execution on approval.
 * - Enforce the anti-hallucination rule (fresh availability checks).
 */
export class OrchestratorAgent {
  /** Current trip identifier. */
  public readonly tripId: string;

  /** Authenticated user identifier. */
  public readonly userId: string;

  /** Canonical trip context -- single source of truth for all agents. */
  private context: TripContext | null = null;

  /** Registry of domain-specific sub-agents keyed by agent ID. */
  private subAgents: Map<string, SubAgent> = new Map();

  /** Pending proposals indexed by proposal ID. */
  private proposals: Map<string, Proposal> = new Map();

  /** Tracks recent searchAvailability results for anti-hallucination checks. */
  private availabilityCache: Map<string, { result: unknown; timestamp: number }> = new Map();

  /** Maximum age (ms) for availability data before it is considered stale. */
  private static readonly AVAILABILITY_TTL_MS = 5 * 60 * 1000; // 5 minutes

  private readonly toolRegistry: ToolRegistry;
  private readonly validationPipeline: ValidationPipeline;

  constructor(deps: {
    tripId: string;
    userId: string;
    toolRegistry: ToolRegistry;
    validationPipeline: ValidationPipeline;
  }) {
    this.tripId = deps.tripId;
    this.userId = deps.userId;
    this.toolRegistry = deps.toolRegistry;
    this.validationPipeline = deps.validationPipeline;
  }

  // -------------------------------------------------------------------------
  // Sub-Agent Management
  // -------------------------------------------------------------------------

  /**
   * Register a sub-agent with the orchestrator.
   * @param agent - The sub-agent instance to register.
   */
  registerSubAgent(agent: SubAgent): void {
    this.subAgents.set(agent.agentId, agent);
  }

  /**
   * Retrieve a registered sub-agent by ID.
   * @param agentId - The agent identifier.
   */
  getSubAgent(agentId: string): SubAgent | undefined {
    return this.subAgents.get(agentId);
  }

  // -------------------------------------------------------------------------
  // Core Message Handling
  // -------------------------------------------------------------------------

  /**
   * Handle an incoming user message.
   *
   * Flow:
   * 1. Load (or refresh) the trip context.
   * 2. Classify the message into one or more intents.
   * 3. Route each intent to the appropriate sub-agent.
   * 4. Aggregate responses and return to the user.
   *
   * @param message - The raw user message text.
   * @returns Aggregated agent response.
   */
  async handleUserMessage(message: string): Promise<AgentResponse> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    // Step 1 -- Ensure we have fresh trip context.
    if (!this.context) {
      this.context = await this.loadTripContext(this.tripId);
    }

    // Step 2 -- Classify intent (uses fast model tier).
    const intents = await this.classifyIntents(message);

    if (intents.length === 0) {
      return this.buildResponse({
        message: 'I was not able to determine what you need. Could you provide more detail?',
        proposals: [],
        groundingResults: [],
        traceId,
        modelTier: 'fast',
        startTime,
        unverifiedClaims: [],
      });
    }

    // Step 3 -- Route to sub-agents and collect responses.
    const subResponses: AgentResponse[] = [];
    for (const intent of intents) {
      const response = await this.routeToSubAgent(intent);
      subResponses.push(response);
    }

    // Step 4 -- Aggregate into a single coherent response.
    return this.aggregateResponses(subResponses, traceId, startTime);
  }

  // -------------------------------------------------------------------------
  // Intent Routing
  // -------------------------------------------------------------------------

  /**
   * Route a classified intent to the appropriate sub-agent.
   *
   * If the target sub-agent is not registered, returns an error response
   * rather than silently failing.
   *
   * @param intent - The classified user intent.
   * @returns The sub-agent's response.
   */
  async routeToSubAgent(intent: Intent): Promise<AgentResponse> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    const agent = this.subAgents.get(intent.subAgent);
    if (!agent) {
      return this.buildResponse({
        message: `No agent registered for "${intent.subAgent}". This capability is not yet available.`,
        proposals: [],
        groundingResults: [],
        traceId,
        modelTier: 'fast',
        startTime,
        unverifiedClaims: [],
      });
    }

    if (!this.context) {
      this.context = await this.loadTripContext(this.tripId);
    }

    try {
      return await agent.handleTask(intent, this.context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown agent error';
      return this.buildResponse({
        message: `The ${agent.name} encountered an error: ${errorMessage}. I will try an alternative approach.`,
        proposals: [],
        groundingResults: [],
        traceId,
        modelTier: 'fast',
        startTime,
        unverifiedClaims: [],
      });
    }
  }

  // -------------------------------------------------------------------------
  // Proposal Management
  // -------------------------------------------------------------------------

  /**
   * Create a proposal from a set of proposed actions.
   *
   * Each action is validated through the Validation Pipeline before
   * the proposal is persisted and an `ai.action.proposed` event is emitted.
   *
   * @param actions - Ordered list of proposed actions.
   * @returns The created proposal.
   */
  async createProposal(actions: ProposedAction[]): Promise<Proposal> {
    if (!this.context) {
      this.context = await this.loadTripContext(this.tripId);
    }

    // Pre-validate every action through the guard pipeline.
    for (const action of actions) {
      const validationResult = await this.validationPipeline.validate(action, this.context.budget);
      if (!validationResult.passed) {
        throw new Error(
          `Validation failed for action #${action.sequence} (${action.tool}): ` +
          `${validationResult.failedGuard} -- ${validationResult.reason}`
        );
      }
    }

    // Anti-hallucination check: mutation tools must have a fresh availability search.
    for (const action of actions) {
      if (action.tool === 'createReservation' || action.tool === 'modifyReservation') {
        this.assertFreshAvailability(action);
      }
    }

    const now = new Date();
    const proposal: Proposal = {
      proposalId: this.generateProposalId(),
      tripId: this.tripId,
      createdBy: 'orchestrator',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      summary: this.summarizeActions(actions),
      actions,
      totalEstimatedCost: this.calculateTotalCost(actions),
      budgetImpact: this.calculateBudgetImpact(actions),
      evidence: [],
      status: 'pending_approval',
    };

    // Check delegated approval for luxury tier.
    if (this.context.isLuxuryTier) {
      const canAutoApprove = this.checkDelegatedApproval(proposal);
      if (canAutoApprove) {
        proposal.status = 'approved';
      }
    }

    this.proposals.set(proposal.proposalId, proposal);

    // Emit lifecycle event.
    await this.emitEvent('ai.action.proposed', { proposal });

    return proposal;
  }

  /**
   * Execute a previously approved proposal.
   *
   * Actions execute sequentially. If any action fails, all previously
   * succeeded actions are rolled back in reverse order.
   *
   * @param proposalId - The proposal to execute.
   * @returns Execution result with per-action outcomes.
   */
  async executeApprovedProposal(proposalId: string): Promise<ExecutionResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${proposalId} not found`);
    }

    if (proposal.status !== 'approved') {
      throw new Error(`Proposal ${proposalId} is not approved (status: ${proposal.status})`);
    }

    proposal.status = 'executing';
    await this.emitEvent('ai.action.approved', { proposalId });

    const executedActions: ExecutionResult['executedActions'] = [];
    let failureIndex = -1;

    // Sequential execution.
    for (let i = 0; i < proposal.actions.length; i++) {
      const action = proposal.actions[i];
      const tool = this.toolRegistry.getTool(action.tool);

      if (!tool) {
        executedActions.push({
          sequence: action.sequence,
          tool: action.tool,
          status: 'failure',
          result: null,
          error: `Tool "${action.tool}" not found in registry`,
        });
        failureIndex = i;
        break;
      }

      try {
        const result = await tool.execute(action.params, {
          tripId: this.tripId,
          userId: this.userId,
          traceId: this.generateTraceId(),
        });

        executedActions.push({
          sequence: action.sequence,
          tool: action.tool,
          status: 'success',
          result: result as Record<string, unknown>,
          error: null,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
        executedActions.push({
          sequence: action.sequence,
          tool: action.tool,
          status: 'failure',
          result: null,
          error: errorMessage,
        });
        failureIndex = i;
        break;
      }
    }

    // Rollback on failure.
    let rollbackPerformed = false;
    if (failureIndex >= 0) {
      rollbackPerformed = await this.rollbackActions(proposal.actions, executedActions, failureIndex);
    }

    const status: ExecutionResult['status'] =
      failureIndex < 0
        ? 'success'
        : rollbackPerformed
          ? 'partial_failure'
          : 'failure';

    proposal.status = status === 'success' ? 'executed' : 'partially_failed';

    const result: ExecutionResult = {
      proposalId,
      status,
      executedActions,
      rollbackPerformed,
    };

    await this.emitEvent('ai.action.executed', { result });

    return result;
  }

  // -------------------------------------------------------------------------
  // Grounding (RAG)
  // -------------------------------------------------------------------------

  /**
   * Query the grounding layer for evidence-backed information.
   *
   * Searches across the Travel Graph, UGC corpus, and policy store.
   * Every result includes citations and a credibility score.
   *
   * @param query - The natural-language query.
   * @returns Grounding results with citations.
   */
  private async grounding(query: string): Promise<GroundingResult[]> {
    // TODO: Integrate with Travel Graph (Neo4j), UGC corpus (Elasticsearch),
    // and Policy Store. For now, return a structured placeholder that
    // demonstrates the expected contract.
    const _query = query; // Acknowledge parameter for linting.

    return [
      {
        content: '',
        citations: [],
        credibilityScore: 0,
        isVerified: false,
      },
    ];
  }

  // -------------------------------------------------------------------------
  // Trip Context
  // -------------------------------------------------------------------------

  /**
   * Load the canonical trip context from the persistence layer.
   *
   * @param tripId - The trip to load.
   * @returns The hydrated trip context.
   */
  private async loadTripContext(tripId: string): Promise<TripContext> {
    // TODO: Fetch from Trip Service. Placeholder returns a minimal context.
    return {
      tripId,
      userId: this.userId,
      status: 'draft',
      destination: '',
      startDate: '',
      endDate: '',
      budget: {
        total: 0,
        currency: 'USD',
        breakdown: { flights: 0, stays: 0, dining: 0, experiences: 0, other: 0 },
        spent: { flights: 0, stays: 0, dining: 0, experiences: 0, other: 0 },
      },
      pace: 'moderate',
      accessibility: { mobility: false, visual: false, auditory: false, cognitive: false, notes: null },
      dietary: { allergies: [], restrictions: [], preferences: [] },
      groupComposition: { totalTravelers: 1, adults: 1, children: 0, infants: 0, ages: [] },
      bookingIds: [],
      isLuxuryTier: false,
      delegationRules: [],
    };
  }

  // -------------------------------------------------------------------------
  // Intent Classification
  // -------------------------------------------------------------------------

  /**
   * Classify a user message into one or more intents.
   *
   * Uses the fast model tier for low-latency classification.
   *
   * @param message - The raw user message.
   * @returns Array of classified intents sorted by confidence.
   */
  private async classifyIntents(message: string): Promise<Intent[]> {
    // TODO: Call fast-tier model for intent classification.
    // Placeholder returns an empty array to be replaced with model integration.
    const _message = message;
    return [];
  }

  // -------------------------------------------------------------------------
  // Anti-Hallucination
  // -------------------------------------------------------------------------

  /**
   * Assert that a mutation action has a corresponding fresh availability check.
   *
   * @param action - The proposed mutation action.
   * @throws Error if no fresh availability data exists.
   */
  private assertFreshAvailability(action: ProposedAction): void {
    const cacheKey = this.buildAvailabilityCacheKey(action.params);
    const cached = this.availabilityCache.get(cacheKey);

    if (!cached) {
      throw new Error(
        `STALE_AVAILABILITY: No availability check found for action #${action.sequence} ` +
        `(${action.tool}). You must call searchAvailability before proposing a booking.`
      );
    }

    const ageMs = Date.now() - cached.timestamp;
    if (ageMs > OrchestratorAgent.AVAILABILITY_TTL_MS) {
      throw new Error(
        `STALE_AVAILABILITY: Availability data for action #${action.sequence} is ` +
        `${Math.round(ageMs / 1000)}s old (max ${OrchestratorAgent.AVAILABILITY_TTL_MS / 1000}s). ` +
        `Please re-check availability.`
      );
    }
  }

  /**
   * Record a fresh availability search result in the cache.
   *
   * Called by sub-agents after a successful searchAvailability tool call.
   *
   * @param params - The search parameters used.
   * @param result - The availability result.
   */
  recordAvailabilityCheck(params: Record<string, unknown>, result: unknown): void {
    const cacheKey = this.buildAvailabilityCacheKey(params);
    this.availabilityCache.set(cacheKey, { result, timestamp: Date.now() });
  }

  /**
   * Build a deterministic cache key from search parameters.
   */
  private buildAvailabilityCacheKey(params: Record<string, unknown>): string {
    const sorted = Object.keys(params)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});
    return JSON.stringify(sorted);
  }

  // -------------------------------------------------------------------------
  // Rollback
  // -------------------------------------------------------------------------

  /**
   * Roll back previously executed actions in reverse order.
   *
   * @param actions - The full action list from the proposal.
   * @param executed - The execution results so far.
   * @param failureIndex - Index of the action that failed.
   * @returns True if rollback was performed.
   */
  private async rollbackActions(
    actions: ProposedAction[],
    executed: ExecutionResult['executedActions'],
    failureIndex: number,
  ): Promise<boolean> {
    let rollbackPerformed = false;

    for (let i = failureIndex - 1; i >= 0; i--) {
      const action = actions[i];
      const executedAction = executed[i];

      if (executedAction.status !== 'success' || !action.rollbackTool) {
        continue;
      }

      const rollbackTool = this.toolRegistry.getTool(action.rollbackTool);
      if (!rollbackTool) {
        continue;
      }

      try {
        await rollbackTool.execute(
          { ...action.params, rollbackOf: executedAction.result },
          { tripId: this.tripId, userId: this.userId, traceId: this.generateTraceId() },
        );
        executedAction.status = 'rolled_back';
        rollbackPerformed = true;
      } catch {
        // Rollback failure is logged but does not propagate.
        // Manual intervention may be required.
      }
    }

    return rollbackPerformed;
  }

  // -------------------------------------------------------------------------
  // Delegated Approval
  // -------------------------------------------------------------------------

  /**
   * Check whether a proposal qualifies for delegated (automatic) approval.
   *
   * @param proposal - The proposal to check.
   * @returns True if all actions match a delegation rule.
   */
  private checkDelegatedApproval(proposal: Proposal): boolean {
    if (!this.context || !this.context.isLuxuryTier) {
      return false;
    }

    for (const action of proposal.actions) {
      const matchingRule = this.context.delegationRules.find((rule) => {
        if (rule.actionType !== action.tool) return false;
        if (!rule.autoApprove) return false;
        if (
          rule.maxCost &&
          action.estimatedCost &&
          action.estimatedCost.amount > rule.maxCost.amount
        ) {
          return false;
        }
        return true;
      });

      if (!matchingRule) {
        return false;
      }
    }

    return true;
  }

  // -------------------------------------------------------------------------
  // Response Helpers
  // -------------------------------------------------------------------------

  /**
   * Aggregate multiple sub-agent responses into a single coherent response.
   */
  private aggregateResponses(
    responses: AgentResponse[],
    traceId: string,
    startTime: number,
  ): AgentResponse {
    const messages = responses.map((r) => r.message).filter(Boolean);
    const proposals = responses.flatMap((r) => r.proposals);
    const groundingResults = responses.flatMap((r) => r.groundingResults);
    const unverifiedClaims = responses.flatMap((r) => r.metadata.unverifiedClaims);

    return this.buildResponse({
      message: messages.join('\n\n'),
      proposals,
      groundingResults,
      traceId,
      modelTier: 'strong',
      startTime,
      unverifiedClaims,
    });
  }

  /**
   * Build a standardized agent response.
   */
  private buildResponse(params: {
    message: string;
    proposals: Proposal[];
    groundingResults: GroundingResult[];
    traceId: string;
    modelTier: 'fast' | 'strong' | 'specialized';
    startTime: number;
    unverifiedClaims: string[];
  }): AgentResponse {
    return {
      message: params.message,
      proposals: params.proposals,
      groundingResults: params.groundingResults,
      metadata: {
        agentId: 'orchestrator',
        traceId: params.traceId,
        modelTier: params.modelTier,
        latencyMs: Date.now() - params.startTime,
        unverifiedClaims: params.unverifiedClaims,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Proposal Helpers
  // -------------------------------------------------------------------------

  /**
   * Generate a human-readable summary of a set of proposed actions.
   */
  private summarizeActions(actions: ProposedAction[]): string {
    return actions.map((a) => a.description).join('; ');
  }

  /**
   * Calculate the total estimated cost across all actions.
   */
  private calculateTotalCost(actions: ProposedAction[]): { amount: number; currency: string } {
    let total = 0;
    let currency = 'USD';

    for (const action of actions) {
      if (action.estimatedCost) {
        total += action.estimatedCost.amount;
        currency = action.estimatedCost.currency;
      }
    }

    return { amount: total, currency };
  }

  /**
   * Calculate the budget impact of a set of proposed actions.
   */
  private calculateBudgetImpact(actions: ProposedAction[]): BudgetImpact {
    const totalCost = this.calculateTotalCost(actions);
    const currentSpend = this.context
      ? Object.values(this.context.budget.spent).reduce((sum, v) => sum + v, 0)
      : 0;
    const budgetLimit = this.context?.budget.total ?? 0;

    return {
      category: 'other',
      currentSpend,
      afterAction: currentSpend + totalCost.amount,
      budgetLimit,
      utilizationPct: budgetLimit > 0
        ? Math.round(((currentSpend + totalCost.amount) / budgetLimit) * 100)
        : 0,
    };
  }

  // -------------------------------------------------------------------------
  // Event Emission
  // -------------------------------------------------------------------------

  /**
   * Emit a lifecycle event to the event bus.
   *
   * @param eventType - The event type (e.g., "ai.action.proposed").
   * @param payload - Event payload.
   */
  private async emitEvent(eventType: string, payload: Record<string, unknown>): Promise<void> {
    // TODO: Publish to event bus (Kafka / EventBridge / etc.).
    const _eventType = eventType;
    const _payload = payload;
  }

  // -------------------------------------------------------------------------
  // ID Generation
  // -------------------------------------------------------------------------

  /** Generate a unique trace ID. */
  private generateTraceId(): string {
    return `trc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /** Generate a unique proposal ID. */
  private generateProposalId(): string {
    return `prop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
