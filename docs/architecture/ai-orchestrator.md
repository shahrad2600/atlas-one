# Atlas One -- AI Orchestrator Architecture

## Table of Contents

1. [Overview](#1-overview)
2. [Agent Hierarchy](#2-agent-hierarchy)
3. [Tool-Gated Execution Model](#3-tool-gated-execution-model)
4. [Grounding Requirements](#4-grounding-requirements)
5. [Proposal / Approval Flow](#5-proposal--approval-flow)
6. [Safety and Guardrails](#6-safety-and-guardrails)
7. [Predictive Models](#7-predictive-models)
8. [Multi-Model Routing](#8-multi-model-routing)
9. [Observability](#9-observability)
10. [Failure Modes and Recovery](#10-failure-modes-and-recovery)

---

## 1. Overview

**Trip Agent OS** is the agentic orchestration layer that sits at the core of Atlas One. It plans, books, optimizes, protects, and adapts travel experiences on behalf of users -- without ever acting outside verified, tool-gated boundaries.

### Design Principles

| Principle | Description |
|---|---|
| **Tool-Gated Execution** | AI agents CANNOT mutate state directly. Every write operation flows through a registered tool that validates, logs, and executes against the appropriate backend service. |
| **Evidence-First Recommendations** | Every recommendation must cite internal evidence (Travel Graph, UGC corpus, partner data) before surfacing to the user. If an agent cannot cite a source, it must label the output "unverified." |
| **Proposal Before Action** | Agents propose actions; users (or delegated policies) approve them. No booking, cancellation, or modification happens without explicit approval. |
| **Graceful Degradation** | When a sub-agent fails, the orchestrator isolates the failure and continues with the remaining trip plan. Partial results are always preferable to total failure. |
| **Budget Sovereignty** | The user's budget envelope is a hard constraint. No agent may propose an action that would exceed it without explicit budget-override approval. |

### System Context

```
User / Client App
       |
       v
  API Gateway
       |
       v
  AI Orchestrator Service
       |
       +---> Sub-Agents (Dining, Stay, Flight, Experience, Budget, Trust, Risk, Support, Concierge)
       |         |
       |         +---> Tool Registry (searchAvailability, createReservation, cancelReservation, ...)
       |                    |
       |                    +---> Commerce Service
       |                    +---> Inventory Service
       |                    +---> Partner Service
       |                    +---> Payment Service
       |                    +---> Insurance Service
       |
       +---> Grounding Layer (RAG)
       |         |
       |         +---> Travel Graph (Neo4j)
       |         +---> UGC Corpus (Elasticsearch)
       |         +---> Policy Store
       |
       +---> Validation Pipeline
       |         |
       |         +---> Policy Guard
       |         +---> Availability Guard
       |         +---> Risk Guard
       |         +---> Budget Guard
       |
       +---> Event Bus (ai.action.proposed, ai.action.approved, ai.action.executed, ...)
```

### Trip Object Lifecycle

The Trip Object is the central data structure that the Orchestrator owns. It progresses through the following states:

```
DRAFT --> PLANNING --> PROPOSED --> CONFIRMED --> ACTIVE --> COMPLETED
                                                    |
                                                    +--> DISRUPTED --> RE-PLANNING --> ACTIVE
```

- **DRAFT**: User has expressed intent but no concrete plan exists.
- **PLANNING**: Agents are actively building the itinerary.
- **PROPOSED**: A complete proposal has been generated and awaits user approval.
- **CONFIRMED**: User approved the plan; bookings are being executed.
- **ACTIVE**: All bookings are confirmed; the trip is in progress.
- **DISRUPTED**: A disruption has been detected (flight delay, closure, weather).
- **RE-PLANNING**: The Risk Agent has triggered re-planning; agents are generating alternatives.
- **COMPLETED**: The trip has concluded.

---

## 2. Agent Hierarchy

The orchestrator employs a hierarchical multi-agent architecture. The **Orchestrator Agent** sits at the root and delegates to domain-specific sub-agents. Sub-agents never communicate with each other directly; all coordination flows through the orchestrator.

### 2.1 Orchestrator Agent

**Role**: Owns the Trip Object, maintains user constraints, routes intents to sub-agents, and manages the proposal/approval lifecycle.

**Responsibilities**:
- Parse and classify user messages into intents.
- Maintain the canonical trip context (budget, pace, accessibility requirements, dietary restrictions, group composition).
- Route each intent to the most appropriate sub-agent.
- Aggregate sub-agent responses into coherent proposals.
- Manage the approval flow and trigger tool execution on approval.
- Handle cross-agent dependencies (e.g., flight time changes that affect dinner reservations).
- Emit lifecycle events to the event bus.

**Constraints Managed**:
- `budget`: Total budget envelope with per-category breakdowns (flights, stays, dining, experiences).
- `pace`: Relaxed, moderate, or packed schedule density.
- `accessibility`: Mobility, visual, auditory, or cognitive accessibility requirements.
- `dietary`: Allergies, restrictions, preferences.
- `groupComposition`: Number of travelers, ages, relationships.

### 2.2 Dining Agent

**Role**: Discovers, recommends, and secures dining experiences.

**Capabilities**:
- Search restaurant availability across date/time/party-size dimensions.
- Recommend restaurants grounded in Travel Graph data and review corpus.
- Manage notify-me strategies for fully booked restaurants (cancellation watch).
- Suggest table preferences (indoor/outdoor, view, quiet section) based on user history.
- Handle auto-rebook when a reservation is cancelled by the venue.

**Tools Used**: `searchAvailability`, `createReservation`, `cancelReservation`, `modifyReservation`, `sendMessage`.

### 2.3 Stay Agent

**Role**: Finds and evaluates accommodation options across hotels, vacation rentals, and boutique stays.

**Capabilities**:
- Search stays with filters for location, dates, amenities, and accessibility.
- Evaluate host reliability for vacation rentals using Trust Agent scores.
- Compare rental intelligence: pricing trends, neighborhood safety, transit proximity.
- Handle damage claim scenarios and security deposit disputes.
- Monitor price drops after booking and propose rebooking if savings exceed threshold.

**Tools Used**: `searchAvailability`, `createReservation`, `cancelReservation`, `modifyReservation`, `fetchPolicy`.

### 2.4 Experience Agent

**Role**: Discovers tours, activities, and experiences that match traveler preferences.

**Capabilities**:
- Search experiences by category, location, date, group size, and intensity level.
- Match activities to traveler preference profiles (adventure, cultural, relaxation).
- Handle group-sizing constraints (minimum/maximum participants).
- Evaluate weather sensitivity and suggest indoor alternatives.
- Coordinate timing with other itinerary items via the orchestrator.

**Tools Used**: `searchAvailability`, `createReservation`, `cancelReservation`.

### 2.5 Flight Agent

**Role**: Searches, evaluates, and manages flight bookings with disruption awareness.

**Capabilities**:
- Search flights across multiple carriers and alliances.
- Evaluate disruption risk per route/carrier/aircraft using historical data.
- Handle rebooking when disruptions occur (cancellations, delays, misconnects).
- Match seat preferences (window, aisle, extra legroom, proximity for groups).
- Monitor fare changes and propose rebooking when savings are significant.
- Coordinate with loyalty programs for point redemption.

**Tools Used**: `searchFlights`, `createReservation`, `cancelReservation`, `modifyReservation`, `getDisruptionSignals`, `applyLoyaltyPoints`.

### 2.6 Budget Agent

**Role**: Optimizes total trip cost and monitors spend against the budget envelope.

**Capabilities**:
- Analyze current spend breakdown by category.
- Suggest swap alternatives to reduce cost without sacrificing quality.
- Monitor budget vs. actuals in real time during the trip.
- Forecast remaining budget based on planned activities.
- Identify cost-saving opportunities (loyalty points, bundle discounts, timing shifts).
- Alert when projected spend approaches or exceeds budget thresholds.

**Tools Used**: `searchAvailability`, `searchFlights`, `applyLoyaltyPoints`.

### 2.7 Trust Agent

**Role**: Evaluates the credibility of reviews, partner quality, and content integrity.

**Capabilities**:
- Score review credibility using linguistic analysis, reviewer history, and cross-reference signals.
- Maintain partner quality scores based on fulfillment history, complaint rates, and response times.
- Flag suspicious content: fake reviews, manipulated photos, misleading descriptions.
- Provide trust metadata that other agents attach to their recommendations.

**Tools Used**: Internal scoring models; does not directly call external tools.

### 2.8 Risk Agent

**Role**: Monitors disruption signals and triggers re-planning when trip health deteriorates.

**Capabilities**:
- Monitor real-time disruption feeds: weather, airline operations, venue closures, strikes.
- Evaluate overall trip health as a composite resilience score.
- Trigger re-plan proposals when disruption probability exceeds threshold.
- Recommend insurance coverage based on risk profile.
- Coordinate with Flight Agent for rebooking and Support Agent for claims.

**Tools Used**: `getDisruptionSignals`, `getInsuranceQuotes`, `fetchPolicy`.

### 2.9 Support Agent

**Role**: Handles post-booking support: refunds, reschedules, claims, and disputes.

**Capabilities**:
- Process refund requests with policy validation.
- Manage rescheduling across multiple bookings with dependency awareness.
- File insurance claims with required documentation.
- Escalate disputes that cannot be resolved automatically.
- Track resolution status and notify users of progress.

**Tools Used**: `issueRefund`, `cancelReservation`, `modifyReservation`, `fetchPolicy`, `sendMessage`.

### 2.10 Concierge Agent (Luxury Tier)

**Role**: White-glove planning with priority inventory access and SLA enforcement.

**Capabilities**:
- Access priority inventory pools (hold-back allocations, partner exclusives).
- Enforce planning SLAs: response within 60 seconds, proposal within 5 minutes.
- Coordinate multi-destination complex itineraries.
- Handle VIP requests: private transfers, personal guides, off-menu dining.
- Delegated approval for pre-authorized action categories.
- Proactive outreach: anticipate needs based on itinerary context.

**Tools Used**: All tools with elevated priority and rate limits.

---

## 3. Tool-Gated Execution Model

### Core Invariant

**AI agents CANNOT mutate state directly.** Every state mutation flows through a registered tool. Tools are the only authorized interface between agent intelligence and backend services.

### Execution Flow

```
1. Agent determines an action is needed
2. Agent constructs a tool call with validated parameters
3. Tool call is logged with a unique trace_id
4. Tool validates:
   a. Parameter schema compliance
   b. Rate limit compliance
   c. Availability verification (no hallucinated inventory)
   d. Policy compliance (cancellation windows, refund eligibility)
   e. Risk threshold compliance (fraud score, trust level)
   f. Budget compliance (action cost vs. remaining envelope)
5. If validation passes: tool executes against the backend service
6. Execution result is logged and returned to the agent
7. Agent incorporates result into its response
```

### Tool Definition Schema

Every tool is defined with the following structure:

```typescript
type ToolDefinition = {
  name: string;                          // Unique tool identifier
  description: string;                   // Human-readable description
  parameters: JSONSchema;                // JSON Schema for input validation
  execute: (params, context) => Promise; // Execution function
  validate: (params, context) => Promise<ValidationResult>; // Pre-execution validation
};
```

### Registered Tools

| Tool | Category | Description |
|---|---|---|
| `searchAvailability` | Query | Search inventory across dining, stays, experiences |
| `createReservation` | Mutation | Create a new booking |
| `cancelReservation` | Mutation | Cancel an existing booking |
| `modifyReservation` | Mutation | Modify an existing booking |
| `issueRefund` | Mutation | Request a refund |
| `sendMessage` | Mutation | Send a message to partner or user |
| `fetchPolicy` | Query | Fetch applicable policies |
| `getDisruptionSignals` | Query | Fetch real-time disruption data |
| `searchFlights` | Query | Search flight offers |
| `getInsuranceQuotes` | Query | Get insurance quotes |
| `applyLoyaltyPoints` | Mutation | Redeem loyalty points |

### Trace Logging

Every tool invocation produces a trace record:

```json
{
  "trace_id": "trc_abc123",
  "tool_name": "createReservation",
  "agent": "dining-agent",
  "trip_id": "trip_xyz",
  "user_id": "usr_456",
  "params": { "...sanitized..." },
  "validation_result": { "passed": true, "guards": ["policy", "availability", "budget"] },
  "execution_result": { "status": "success", "reservation_id": "res_789" },
  "latency_ms": 342,
  "timestamp": "2026-03-01T12:00:00Z"
}
```

### Anti-Hallucination Enforcement

**Rule**: An agent MUST call `searchAvailability` (or `searchFlights`) and receive a confirmed result BEFORE claiming that any inventory is available. Agents are forbidden from asserting availability based on training data, cached results, or inference.

Enforcement mechanism:
1. The orchestrator tracks which `searchAvailability` calls have been made in the current session.
2. When an agent proposes a `createReservation`, the orchestrator verifies that a corresponding `searchAvailability` result exists and is not stale (< 5 minutes old).
3. If no fresh availability check exists, the proposal is rejected with reason `STALE_AVAILABILITY`.

---

## 4. Grounding Requirements

### Architecture

The grounding layer provides Retrieval-Augmented Generation (RAG) over internal data sources to ensure that every recommendation is backed by verifiable evidence.

```
Agent Query
    |
    v
Grounding Router
    |
    +---> Travel Graph (Neo4j)
    |       - Destinations, venues, routes, relationships
    |       - Partner metadata, pricing history
    |       - Accessibility attributes, amenity catalogs
    |
    +---> UGC Corpus (Elasticsearch)
    |       - Verified user reviews
    |       - Trip reports and photos
    |       - Q&A threads
    |
    +---> Policy Store
    |       - Cancellation policies per partner
    |       - Refund rules
    |       - Loyalty program terms
    |
    +---> Partner Data API
            - Real-time inventory
            - Dynamic pricing
            - Availability calendars
```

### Evidence Citation Format

Every grounded recommendation includes citations:

```json
{
  "recommendation": "Osteria Francescana is an excellent choice for your group dinner.",
  "citations": [
    {
      "source": "travel_graph",
      "entity_id": "venue_12345",
      "field": "aggregate_rating",
      "value": 4.8,
      "freshness": "2026-02-28T00:00:00Z"
    },
    {
      "source": "ugc_corpus",
      "review_ids": ["rev_001", "rev_002"],
      "credibility_score": 0.92,
      "summary": "Consistently praised for tasting menu quality and service."
    }
  ],
  "confidence": 0.88,
  "unverified_claims": []
}
```

### Anti-Hallucination Rules

1. **Must-Cite Rule**: If an agent cannot attach at least one internal citation to a factual claim, it MUST label the claim as `"unverified"` in the response metadata.
2. **Review Credibility Gate**: Before surfacing review-based data to users, the Trust Agent must score review credibility. Reviews with credibility < 0.5 are suppressed; reviews between 0.5 and 0.7 are shown with a warning.
3. **Freshness Requirement**: Grounding data older than 30 days must be re-fetched before use in recommendations. Pricing data older than 24 hours is considered stale.
4. **No Synthetic Reviews**: Agents must never generate synthetic review content or paraphrase reviews in a way that changes their meaning.

---

## 5. Proposal / Approval Flow

### Lifecycle

```
Agent generates action plan
        |
        v
  ai.action.proposed (event emitted)
        |
        v
  User reviews proposal in client
        |
        +---> APPROVE --> ai.action.approved --> Sequential Execution
        |                                              |
        |                                              +---> Success: ai.action.executed
        |                                              +---> Failure: ai.action.failed --> Rollback
        |
        +---> REJECT (with feedback) --> ai.action.rejected --> Agent learns
        |
        +---> TIMEOUT (configurable) --> ai.action.expired
```

### Proposal Structure

```json
{
  "proposal_id": "prop_abc123",
  "trip_id": "trip_xyz",
  "created_by": "dining-agent",
  "created_at": "2026-03-01T12:00:00Z",
  "expires_at": "2026-03-01T12:15:00Z",
  "summary": "Book dinner at Osteria Francescana for 4 guests on March 15 at 8:00 PM.",
  "actions": [
    {
      "sequence": 1,
      "tool": "createReservation",
      "params": {
        "venue_id": "venue_12345",
        "date": "2026-03-15",
        "time": "20:00",
        "party_size": 4,
        "table_preference": "indoor_quiet"
      },
      "estimated_cost": { "amount": 480, "currency": "EUR" },
      "rollback_tool": "cancelReservation"
    }
  ],
  "total_estimated_cost": { "amount": 480, "currency": "EUR" },
  "budget_impact": {
    "category": "dining",
    "current_spend": 200,
    "after_action": 680,
    "budget_limit": 1000,
    "utilization_pct": 68
  },
  "evidence": [ "...citations..." ],
  "status": "pending_approval"
}
```

### Sequential Execution with Rollback

When a proposal is approved, actions execute in sequence order. If any action fails:

1. Execution halts at the failed action.
2. All previously succeeded actions are rolled back in reverse order using their `rollback_tool`.
3. The proposal status is set to `partially_failed`.
4. The agent is notified to generate an alternative proposal.

### Delegated Approval (Luxury Tier)

Luxury-tier users can configure delegated approval for specific action types:

```json
{
  "delegation_rules": [
    {
      "action_type": "dining_reservation",
      "max_cost": { "amount": 500, "currency": "EUR" },
      "auto_approve": true
    },
    {
      "action_type": "flight_rebooking",
      "condition": "same_class_or_better",
      "auto_approve": true
    }
  ]
}
```

When a proposal matches a delegation rule, it bypasses manual approval and proceeds directly to execution. The user is notified post-execution.

---

## 6. Safety and Guardrails

### Validation Pipeline

Every proposed action passes through a sequential validation pipeline before execution. All guards must pass; any failure rejects the action.

```
ProposedAction
    |
    v
Policy Guard -----> FAIL: policy_violation
    |
    v (PASS)
Availability Guard --> FAIL: inventory_unavailable
    |
    v (PASS)
Risk Guard --------> FAIL: risk_threshold_exceeded
    |
    v (PASS)
Budget Guard ------> FAIL: budget_exceeded
    |
    v (PASS)
APPROVED FOR EXECUTION
```

### 6.1 Policy Guard

**Purpose**: Ensures actions comply with applicable cancellation, refund, and modification policies.

**Checks**:
- Cancellation window: Is the booking still within the free cancellation period?
- Modification rules: Does the partner allow the requested modification type?
- Refund eligibility: What refund amount applies based on timing and policy tier?
- Card hold rules: Are authorization holds within acceptable timeframes?
- Partner-specific restrictions: blackout dates, minimum stay requirements.

### 6.2 Availability Guard

**Purpose**: Verifies that real-time inventory exists before executing a booking action.

**Checks**:
- Inventory exists and is bookable at the requested date/time.
- Availability data is fresh (< 5 minutes old for dining, < 15 minutes for stays/flights).
- Capacity constraints are met (party size, room count).
- No conflicting holds exist.

### 6.3 Risk Guard

**Purpose**: Evaluates fraud risk, partner reliability, and user trust level.

**Checks**:
- User fraud score: is this a legitimate booking pattern?
- Partner reliability score: does this partner have a history of honoring bookings?
- Transaction velocity: is this user making an unusual number of bookings in a short period?
- Value anomaly: does the transaction value deviate significantly from the user's historical pattern?
- Geographic consistency: does the booking location align with the trip itinerary?

### 6.4 Budget Guard

**Purpose**: Ensures actions do not exceed the user's budget envelope.

**Checks**:
- Action cost vs. remaining category budget.
- Action cost vs. remaining total budget.
- Projected total spend after action vs. budget limit.
- Currency conversion accuracy for multi-currency trips.
- Hidden cost detection: taxes, service charges, resort fees.

### Rate Limiting

Tool calls are rate-limited per user session to prevent runaway agent behavior:

| Tool Category | Limit | Window |
|---|---|---|
| Query tools | 100 calls | per minute |
| Mutation tools | 10 calls | per minute |
| Sensitive mutations (refund, cancel) | 3 calls | per 5 minutes |

If an agent exceeds its rate limit, subsequent calls are queued with exponential backoff.

---

## 7. Predictive Models

The orchestrator integrates several predictive models that inform agent decision-making.

### 7.1 Demand Forecasting

**Input**: Destination, dates, venue category, historical demand patterns.
**Output**: Demand level (low / moderate / high / peak) with confidence interval.
**Usage**: Dining Agent uses demand forecasts to recommend booking windows. Budget Agent uses them to identify off-peak savings opportunities.

### 7.2 Cancellation Probability

**Input**: Booking type, lead time, user history, venue category.
**Output**: Probability (0-1) that the booking will be cancelled by either party.
**Usage**: Risk Agent factors cancellation probability into trip resilience scoring. Support Agent pre-positions refund documentation for high-probability cancellations.

### 7.3 No-Show Risk

**Input**: User booking history, trip complexity, time-of-day, weather forecast.
**Output**: Probability (0-1) that the user will not show up.
**Usage**: Dining Agent adjusts overbooking strategy. Partners receive risk-appropriate hold policies.

### 7.4 Disruption Risk

**Input**: Route, carrier, aircraft type, weather forecast, historical operations data.
**Output**: Disruption probability with breakdown (delay, cancellation, diversion).
**Usage**: Flight Agent presents disruption risk alongside flight options. Risk Agent triggers proactive rebooking when risk exceeds threshold.

### 7.5 Crowd Density Forecast

**Input**: Venue, date, time, local events calendar, historical visit patterns.
**Output**: Expected crowd density (sparse / moderate / busy / overcrowded).
**Usage**: Experience Agent recommends optimal visit times. Orchestrator adjusts itinerary pacing.

### 7.6 Luxury Fit Score

**Input**: Venue attributes, user preference profile, historical satisfaction data.
**Output**: Score (0-100) indicating how well a venue matches luxury expectations.
**Usage**: Concierge Agent filters recommendations. Trust Agent incorporates into partner quality scores.

### 7.7 Dining Scarcity Index

**Input**: Restaurant, date, time, historical availability patterns.
**Output**: Scarcity level (available / limited / scarce / unavailable) with optimal booking window.
**Usage**: Dining Agent prioritizes scarce reservations. Notify strategy triggers for high-scarcity venues.

### 7.8 Trip Resilience Score

**Input**: All bookings in trip, disruption risks per booking, alternative availability.
**Output**: Composite score (0-100) indicating how well the trip would survive disruptions.
**Usage**: Risk Agent surfaces trips below resilience threshold. Orchestrator recommends resilience improvements.

### 7.9 Review Credibility Score

**Input**: Review text, reviewer history, cross-reference signals, temporal patterns.
**Output**: Credibility score (0-1) with breakdown (authenticity, relevance, recency).
**Usage**: Trust Agent gates which reviews surface to users. Dining and Stay Agents weight recommendations by credibility.

---

## 8. Multi-Model Routing

The orchestrator routes requests to different model tiers based on task complexity, latency requirements, and cost optimization.

### Model Tiers

| Tier | Model Class | Latency Target | Use Cases |
|---|---|---|---|
| **Fast** | Haiku-class | < 500ms | Chat responses, clarification questions, simple lookups, intent classification |
| **Strong** | Opus-class | < 5s | Itinerary synthesis, complex re-planning, multi-constraint optimization, cross-agent coordination |
| **Specialized** | Domain-specific | Varies | Fraud detection, image moderation, review credibility scoring, demand forecasting |

### Routing Logic

```
Incoming Request
      |
      v
Intent Classifier (Fast model)
      |
      +---> Simple query / clarification --> Fast model
      |
      +---> Booking action / single-agent task --> Fast model + tool calls
      |
      +---> Multi-agent planning / re-planning --> Strong model
      |
      +---> Fraud check --> Specialized fraud model
      |
      +---> Image analysis --> Specialized vision model
      |
      +---> Review scoring --> Specialized NLP model
```

### Cost Optimization

- Fast model calls cost roughly 1/20th of strong model calls.
- The orchestrator tracks per-trip model costs and optimizes routing to stay within cost targets.
- Strong model usage is reserved for high-value decisions where quality directly impacts user experience.
- Batch processing of non-urgent tasks (e.g., nightly review credibility scoring) uses the most cost-effective model tier.

### Fallback Strategy

If the target model tier is unavailable:
1. **Fast tier unavailable**: Route to strong model with latency warning.
2. **Strong tier unavailable**: Queue the request and notify the user of delayed processing. Do not fall back to fast model for complex tasks.
3. **Specialized tier unavailable**: Fall back to strong model with reduced confidence scoring.

---

## 9. Observability

### Metrics

| Metric | Description | Alert Threshold |
|---|---|---|
| `agent.response_latency_p99` | 99th percentile agent response time | > 10s |
| `tool.execution_latency_p99` | 99th percentile tool execution time | > 5s |
| `tool.failure_rate` | Percentage of tool calls that fail | > 5% |
| `proposal.approval_rate` | Percentage of proposals approved by users | < 60% (quality signal) |
| `proposal.execution_success_rate` | Percentage of approved proposals that execute fully | < 90% |
| `grounding.cache_hit_rate` | Percentage of grounding queries served from cache | < 50% |
| `budget.overage_count` | Number of trips that exceeded budget | > 0 (investigate) |
| `hallucination.detected_count` | Number of times anti-hallucination guard triggered | Trending up |

### Distributed Tracing

Every request generates a trace that spans:
1. API Gateway (request reception)
2. Orchestrator Agent (intent classification, routing)
3. Sub-Agent (task execution)
4. Tool calls (validation, execution)
5. Backend services (inventory, commerce, payments)

Trace IDs propagate through all layers via the `x-trace-id` header.

### Audit Log

All mutation tool calls are written to an immutable audit log:
- Who: user_id, agent_id
- What: tool_name, parameters, result
- When: timestamp
- Why: proposal_id, trace_id, approval_type (manual / delegated)

---

## 10. Failure Modes and Recovery

### Agent Failure

| Failure | Recovery |
|---|---|
| Sub-agent timeout | Orchestrator retries once, then returns partial result with explanation |
| Sub-agent error | Orchestrator isolates failure, continues with other agents, notifies user |
| Orchestrator crash | Stateless design allows restart from last persisted trip state |
| Model unavailable | Fallback routing per Section 8 |

### Tool Failure

| Failure | Recovery |
|---|---|
| Tool validation failure | Action rejected with specific guard failure reason |
| Tool execution failure | Retry with exponential backoff (max 3 attempts) |
| Backend service down | Circuit breaker opens after 5 consecutive failures; agent notified to propose alternative |
| Partial execution (multi-action) | Rollback succeeded actions in reverse order |

### Data Freshness Failure

| Failure | Recovery |
|---|---|
| Stale availability | Force refresh via `searchAvailability` before retrying |
| Stale pricing | Re-fetch and re-validate budget impact |
| Stale disruption data | Fall back to conservative risk estimates |

---

*This document is the authoritative reference for the Atlas One AI Orchestrator architecture. All implementation must conform to the principles, flows, and constraints defined here.*
