/**
 * Atlas One -- Agent Barrel File
 *
 * Re-exports all agent implementations and shared types from
 * the orchestrator module. Also exports the simplified Agent
 * interface specialists and the AgentRegistry for the chat layer.
 */

// ---------------------------------------------------------------------------
// Orchestrator Agent (root) + shared types
// ---------------------------------------------------------------------------
export {
  OrchestratorAgent,
  type SubAgent,
  type TripContext,
  type TripStatus,
  type PacePreference,
  type Budget,
  type BudgetBreakdown,
  type AccessibilityRequirements,
  type DietaryProfile,
  type GroupComposition,
  type DelegationRule,
  type Intent,
  type ProposedAction,
  type BudgetImpact,
  type Citation,
  type Proposal,
  type GroundingResult,
  type AgentResponse,
  type ExecutionResult,
} from './orchestrator';

// ---------------------------------------------------------------------------
// Domain Sub-Agents (Internal Orchestration Layer)
// ---------------------------------------------------------------------------
export {
  DiningAgent,
  type DiningSearchParams,
  type DiningSlot,
  type DiningPreferences,
  type RecommendedRestaurant,
  type NotifyParams,
  type NotifyRequest,
  type TablePreference,
  type Reservation,
} from './dining-agent';

export {
  StayAgent,
  type StaySearchParams,
  type StayOption,
  type HostInfo,
  type HostReliabilityScore,
  type RentalIntelligence,
  type DamageClaim,
  type PriceDropAlert,
} from './stay-agent';

export {
  FlightAgent,
  type FlightSearchParams,
  type FlightOffer,
  type FlightSegment,
  type DisruptionRiskAssessment,
  type DisruptionFactor,
  type SeatPreference,
  type SeatAssignment,
  type RebookingOption,
} from './flight-agent';

export {
  BudgetAgent,
  type SpendAnalysis,
  type CategorySpend,
  type SwapSuggestion,
  type BudgetAlert,
  type LoyaltyOpportunity,
} from './budget-agent';

export {
  RiskAgent,
  type DisruptionSignal,
  type TripResilienceScore,
  type RiskFactor,
  type ResilienceRecommendation,
  type InsuranceRecommendation,
  type InsuranceCoverage,
  type RePlanTrigger,
} from './risk-agent';

export {
  SupportAgent,
  type RefundRequest,
  type RefundAssessment,
  type AlternativeOption,
  type RescheduleRequest,
  type ReschedulePlan,
  type RescheduleBookingResult,
  type BookingDependency,
  type InsuranceClaim,
  type ClaimEvidence,
  type Dispute,
  type DisputeResolution,
} from './support-agent';

// ---------------------------------------------------------------------------
// Simplified Agent Interface (Chat Endpoint Layer)
// ---------------------------------------------------------------------------
export {
  type Agent,
  type AgentContext,
  type ToolAction,
  type AgentResponse as ChatAgentResponse,
} from './base';

// ---------------------------------------------------------------------------
// Chat-Layer Specialist Agents
// ---------------------------------------------------------------------------
export { DiningSpecialist } from './dining';
export { StaySpecialist } from './stay';
export { FlightSpecialist } from './flight';
export { BudgetSpecialist } from './budget';
export { ExperiencesSpecialist } from './experiences';
export { SupportSpecialist } from './support';
export { RiskSpecialist } from './risk';

// ---------------------------------------------------------------------------
// Agent Registry
// ---------------------------------------------------------------------------

import type { Agent } from './base';
import { DiningSpecialist } from './dining';
import { StaySpecialist } from './stay';
import { FlightSpecialist } from './flight';
import { BudgetSpecialist } from './budget';
import { ExperiencesSpecialist } from './experiences';
import { SupportSpecialist } from './support';
import { RiskSpecialist } from './risk';

/**
 * Registry of all chat-layer specialist agents.
 *
 * Maps agent names (as returned by the router) to Agent instances.
 * Used by the routes layer to look up the correct agent for processing.
 */
export class AgentRegistry {
  private agents: Map<string, Agent> = new Map();

  constructor() {
    // Register all specialist agents.
    const specialists: Agent[] = [
      new DiningSpecialist(),
      new StaySpecialist(),
      new FlightSpecialist(),
      new BudgetSpecialist(),
      new ExperiencesSpecialist(),
      new SupportSpecialist(),
      new RiskSpecialist(),
    ];

    for (const agent of specialists) {
      this.agents.set(agent.name, agent);
    }
  }

  /**
   * Get an agent by name.
   *
   * @param name - The agent name (e.g., "dining-agent").
   * @returns The Agent instance, or undefined if not found.
   */
  getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  /**
   * Check if an agent is registered.
   *
   * @param name - The agent name.
   */
  hasAgent(name: string): boolean {
    return this.agents.has(name);
  }

  /**
   * List all registered agent names.
   */
  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get metadata for all registered agents (for the /agents endpoint).
   */
  getCatalog(): Array<{
    name: string;
    description: string;
    tools: string[];
  }> {
    return Array.from(this.agents.values()).map((agent) => ({
      name: agent.name,
      description: agent.description,
      tools: agent.tools,
    }));
  }

  /**
   * Create a default AgentRegistry with all specialists registered.
   */
  static createDefault(): AgentRegistry {
    return new AgentRegistry();
  }
}
