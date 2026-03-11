/**
 * Atlas One -- Tools Barrel File + ToolRegistry
 *
 * Re-exports all tool definitions and provides the ToolRegistry class
 * that manages tool registration, lookup, and invocation with tracing.
 */

// ---------------------------------------------------------------------------
// Re-exports (existing tools)
// ---------------------------------------------------------------------------

export {
  searchAvailabilityTool,
  type ToolDefinition,
  type ToolContext,
  type ValidationResult,
} from './searchAvailability';

export { createReservationTool } from './createReservation';
export { cancelReservationTool } from './cancelReservation';
export { modifyReservationTool } from './modifyReservation';
export { issueRefundTool } from './issueRefund';
export { sendMessageTool } from './sendMessage';
export { fetchPolicyTool } from './fetchPolicy';
export { getDisruptionSignalsTool } from './getDisruptionSignals';
export { searchFlightsTool } from './searchFlights';
export { getInsuranceQuotesTool } from './getInsuranceQuotes';
export { applyLoyaltyPointsTool } from './applyLoyaltyPoints';

// ---------------------------------------------------------------------------
// Re-exports (new chat-layer tools)
// ---------------------------------------------------------------------------

export {
  searchRestaurantsTool,
  searchHotelsTool,
  searchFlightsChatTool,
  searchExperiencesTool,
} from './search';

export {
  createReservationChatTool,
  cancelReservationChatTool,
  modifyReservationChatTool,
  checkAvailabilityChatTool,
} from './booking';

export {
  getPolicyChatTool,
  getTravelAdvisoriesTool,
  getInsuranceQuotesChatTool,
  getFlightStatusChatTool,
} from './information';

export {
  analyzeBudgetChatTool,
  trackExpenseChatTool,
  comparePricesChatTool,
} from './finance';

// ---------------------------------------------------------------------------
// Imports for registry initialization
// ---------------------------------------------------------------------------

import { searchAvailabilityTool } from './searchAvailability';
import { createReservationTool } from './createReservation';
import { cancelReservationTool } from './cancelReservation';
import { modifyReservationTool } from './modifyReservation';
import { issueRefundTool } from './issueRefund';
import { sendMessageTool } from './sendMessage';
import { fetchPolicyTool } from './fetchPolicy';
import { getDisruptionSignalsTool } from './getDisruptionSignals';
import { searchFlightsTool } from './searchFlights';
import { getInsuranceQuotesTool } from './getInsuranceQuotes';
import { applyLoyaltyPointsTool } from './applyLoyaltyPoints';

import { searchRestaurantsTool, searchHotelsTool, searchFlightsChatTool, searchExperiencesTool } from './search';
import { createReservationChatTool, cancelReservationChatTool, modifyReservationChatTool, checkAvailabilityChatTool } from './booking';
import { getPolicyChatTool, getTravelAdvisoriesTool, getInsuranceQuotesChatTool, getFlightStatusChatTool } from './information';
import { analyzeBudgetChatTool, trackExpenseChatTool, comparePricesChatTool } from './finance';

import type { ToolDefinition, ToolContext, ValidationResult } from './searchAvailability';

// ---------------------------------------------------------------------------
// Trace Record
// ---------------------------------------------------------------------------

/** Immutable record of a tool invocation for audit logging. */
export interface ToolTraceRecord {
  traceId: string;
  toolName: string;
  agentId: string;
  tripId: string;
  userId: string;
  params: Record<string, unknown>;
  validationResult: ValidationResult;
  executionResult: unknown | null;
  executionError: string | null;
  latencyMs: number;
  timestamp: string;
}

// ---------------------------------------------------------------------------
// ToolRegistry
// ---------------------------------------------------------------------------

/**
 * Central registry for all AI Orchestrator tools.
 *
 * Responsibilities:
 * - Register and look up tools by name.
 * - Validate parameters before execution.
 * - Execute tools with full trace logging.
 * - Provide tool catalog for agent introspection.
 *
 * Usage:
 *   const registry = ToolRegistry.createDefault();
 *   const tool = registry.getTool('searchAvailability');
 *   const result = await registry.invokeTool('searchAvailability', params, context);
 */
export class ToolRegistry {
  /** Tools indexed by name. */
  private tools: Map<string, ToolDefinition> = new Map();

  /** Trace log (append-only in production -- here stored in memory). */
  private traceLog: ToolTraceRecord[] = [];

  // -------------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------------

  /**
   * Register a tool with the registry.
   *
   * @param tool - The tool definition to register.
   * @throws Error if a tool with the same name is already registered.
   */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered.`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Unregister a tool by name.
   *
   * @param name - The tool to remove.
   * @returns True if the tool was removed.
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  // -------------------------------------------------------------------------
  // Lookup
  // -------------------------------------------------------------------------

  /**
   * Get a tool definition by name.
   *
   * @param name - The tool name.
   * @returns The tool definition, or undefined if not found.
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Check if a tool is registered.
   *
   * @param name - The tool name.
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * List all registered tool names.
   */
  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Get the tool catalog (names + descriptions) for agent introspection.
   * Agents use this to understand which tools are available.
   */
  getCatalog(): { name: string; description: string; parameters: Record<string, unknown> }[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  // -------------------------------------------------------------------------
  // Invocation
  // -------------------------------------------------------------------------

  /**
   * Invoke a tool with full validation, execution, and trace logging.
   *
   * Flow:
   * 1. Look up the tool by name.
   * 2. Validate parameters.
   * 3. If validation fails, log and return the validation error.
   * 4. Execute the tool.
   * 5. Log the trace record.
   * 6. Return the result.
   *
   * @param toolName - Name of the tool to invoke.
   * @param params - Tool parameters.
   * @param context - Execution context (tripId, userId, traceId).
   * @param agentId - The agent making the call (for audit logging).
   * @returns The tool execution result.
   * @throws Error if the tool is not found or validation fails.
   */
  async invokeTool(
    toolName: string,
    params: Record<string, unknown>,
    context: ToolContext,
    agentId: string = 'unknown',
  ): Promise<unknown> {
    const startTime = Date.now();
    const tool = this.tools.get(toolName);

    if (!tool) {
      throw new Error(`Tool "${toolName}" is not registered.`);
    }

    // Step 1: Validate.
    const validationResult = await tool.validate(params, context);

    if (!validationResult.valid) {
      const traceRecord: ToolTraceRecord = {
        traceId: context.traceId,
        toolName,
        agentId,
        tripId: context.tripId,
        userId: context.userId,
        params: this.sanitizeParams(params),
        validationResult,
        executionResult: null,
        executionError: `Validation failed: ${validationResult.errors.join('; ')}`,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
      this.traceLog.push(traceRecord);

      throw new Error(
        `Tool "${toolName}" validation failed: ${validationResult.errors.join('; ')}`,
      );
    }

    // Step 2: Execute.
    let executionResult: unknown = null;
    let executionError: string | null = null;

    try {
      executionResult = await tool.execute(params, context);
    } catch (error) {
      executionError = error instanceof Error ? error.message : 'Unknown execution error';
      throw error;
    } finally {
      // Step 3: Log trace (always, even on failure).
      const traceRecord: ToolTraceRecord = {
        traceId: context.traceId,
        toolName,
        agentId,
        tripId: context.tripId,
        userId: context.userId,
        params: this.sanitizeParams(params),
        validationResult,
        executionResult: executionError ? null : executionResult,
        executionError,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
      this.traceLog.push(traceRecord);
    }

    return executionResult;
  }

  // -------------------------------------------------------------------------
  // Trace Access
  // -------------------------------------------------------------------------

  /**
   * Get the trace log for a specific trip.
   *
   * @param tripId - The trip to filter by.
   * @returns Trace records for the trip.
   */
  getTracesByTrip(tripId: string): ToolTraceRecord[] {
    return this.traceLog.filter((t) => t.tripId === tripId);
  }

  /**
   * Get the trace log for a specific trace ID.
   *
   * @param traceId - The trace ID to look up.
   */
  getTrace(traceId: string): ToolTraceRecord | undefined {
    return this.traceLog.find((t) => t.traceId === traceId);
  }

  /**
   * Get the full trace log. In production, this would be backed by
   * a persistent store with pagination.
   */
  getAllTraces(): ToolTraceRecord[] {
    return [...this.traceLog];
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  /**
   * Sanitize parameters for trace logging.
   * Redacts sensitive fields (payment info, tokens, etc.).
   */
  private sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['paymentMethodId', 'token', 'password', 'secret', 'cardNumber'];
    const sanitized = { ...params };

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '***REDACTED***';
      }
    }

    return sanitized;
  }

  // -------------------------------------------------------------------------
  // Factory
  // -------------------------------------------------------------------------

  /**
   * Create a ToolRegistry pre-populated with all standard tools.
   */
  static createDefault(): ToolRegistry {
    const registry = new ToolRegistry();

    // Existing orchestration-layer tools
    registry.register(searchAvailabilityTool);
    registry.register(createReservationTool);
    registry.register(cancelReservationTool);
    registry.register(modifyReservationTool);
    registry.register(issueRefundTool);
    registry.register(sendMessageTool);
    registry.register(fetchPolicyTool);
    registry.register(getDisruptionSignalsTool);
    registry.register(searchFlightsTool);
    registry.register(getInsuranceQuotesTool);
    registry.register(applyLoyaltyPointsTool);

    // New chat-layer search tools
    registry.register(searchRestaurantsTool);
    registry.register(searchHotelsTool);
    registry.register(searchFlightsChatTool);
    registry.register(searchExperiencesTool);

    // New chat-layer booking tools
    registry.register(createReservationChatTool);
    registry.register(cancelReservationChatTool);
    registry.register(modifyReservationChatTool);
    registry.register(checkAvailabilityChatTool);

    // New chat-layer information tools
    registry.register(getPolicyChatTool);
    registry.register(getTravelAdvisoriesTool);
    registry.register(getInsuranceQuotesChatTool);
    registry.register(getFlightStatusChatTool);

    // New chat-layer finance tools
    registry.register(analyzeBudgetChatTool);
    registry.register(trackExpenseChatTool);
    registry.register(comparePricesChatTool);

    return registry;
  }
}
