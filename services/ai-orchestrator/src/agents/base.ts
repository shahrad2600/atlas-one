/**
 * Atlas One -- Agent Base Interfaces
 *
 * Defines the simplified Agent interface used by the chat endpoints.
 * This layer sits above the existing SubAgent interface and provides
 * a simpler contract for the HTTP routes: given a user message, context,
 * and conversation history, return a structured AgentResponse.
 *
 * The SubAgent interface (orchestrator.ts) handles the internal
 * intent/context routing; this interface handles the chat-facing contract.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Context passed to every agent process() call. */
export interface AgentContext {
  userId: string;
  conversationId: string;
  tripId?: string;
  preferences?: Record<string, unknown>;
}

/** A tool action executed (or to be executed) during agent processing. */
export interface ToolAction {
  tool: string;
  params: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'executed' | 'failed';
}

/** Structured response from an agent's process() method. */
export interface AgentResponse {
  message: string;
  actions?: ToolAction[];
  suggestions?: string[];
  confidence: number;
}

/** The simplified Agent interface for the chat endpoints. */
export interface Agent {
  /** Unique agent identifier (e.g., "dining-agent"). */
  name: string;
  /** Human-readable description of the agent's capabilities. */
  description: string;
  /** System prompt used when this agent drives the LLM conversation. */
  systemPrompt: string;
  /** Tool names this agent is allowed to invoke. */
  tools: string[];
  /**
   * Process a user message and return a structured response.
   *
   * @param message - The raw user message.
   * @param context - Execution context (userId, conversationId, etc.).
   * @param history - Recent conversation messages for multi-turn context.
   * @returns Structured agent response with message, actions, and suggestions.
   */
  process(
    message: string,
    context: AgentContext,
    history: Array<{ role: string; content: string }>,
  ): Promise<AgentResponse>;
}
