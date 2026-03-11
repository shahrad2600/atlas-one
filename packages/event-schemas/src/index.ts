// ---------------------------------------------------------------------------
// Atlas One - Event Schema TypeScript Definitions
// Auto-generated types matching JSON Schema draft-07 definitions
// ---------------------------------------------------------------------------

// ---- Common Envelope -------------------------------------------------------

export type ActorType = "user" | "system" | "agent" | "partner";

export interface Actor {
  type: ActorType;
  id: string;
}

export interface AtlasEventEnvelope<P = Record<string, unknown>> {
  /** UUID v4 unique event identifier */
  event_id: string;
  /** Dot-separated event type: domain.entity.action */
  event_type: string;
  /** Schema version for compatibility */
  schema_version: number;
  /** ISO 8601 timestamp */
  occurred_at: string;
  /** Service that produced the event */
  producer: string;
  /** Distributed tracing ID */
  trace_id?: string;
  /** Correlation ID linking related events */
  correlation_id?: string;
  /** Tenant UUID for multi-tenant isolation */
  tenant_id?: string | null;
  /** Entity that triggered the event */
  actor?: Actor;
  /** Event-specific payload */
  payload: P;
}

// ---- tg.entity.upserted ----------------------------------------------------

export type TgEntityType =
  | "place"
  | "venue"
  | "supplier"
  | "product"
  | "inventory_slot"
  | "brand"
  | "category"
  | "tag"
  | "event"
  | "transport_node"
  | "aircraft"
  | "route"
  | "policy"
  | "media";

export type TgEntityAction = "created" | "updated";
export type TgEntitySource = "internal" | "partner" | "ugc" | "import" | "editorial";

export interface TgEntityUpsertedPayload {
  entity_id: string;
  entity_type: TgEntityType;
  action: TgEntityAction;
  changes?: Record<string, { from: unknown; to: unknown }>;
  source?: TgEntitySource;
}

export type TgEntityUpsertedEvent = AtlasEventEnvelope<TgEntityUpsertedPayload>;

// ---- search.impression.logged -----------------------------------------------

export interface SearchResultItem {
  entity_id: string;
  rank: number;
  score: number;
  sponsored?: boolean;
}

export interface SearchContext {
  place_id?: string;
  device?: string;
  session_id?: string;
}

export interface SearchImpressionLoggedPayload {
  user_id: string;
  query: string;
  filters?: Record<string, unknown>;
  results: SearchResultItem[];
  result_count: number;
  context: SearchContext;
}

export type SearchImpressionLoggedEvent = AtlasEventEnvelope<SearchImpressionLoggedPayload>;

// ---- trip.created -----------------------------------------------------------

export type TripSource = "manual" | "ai" | "import";

export interface TripCreatedPayload {
  trip_id: string;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string;
  traveler_count: number;
  source: TripSource;
}

export type TripCreatedEvent = AtlasEventEnvelope<TripCreatedPayload>;

// ---- trip.itinerary_item.added ----------------------------------------------

export type ItineraryItemType = "place" | "venue" | "reservation" | "note" | "transport" | "buffer";
export type ItineraryItemSource = "manual" | "ai" | "suggestion";

export interface TripItineraryItemAddedPayload {
  trip_id: string;
  item_id: string;
  item_type: ItineraryItemType;
  entity_id: string | null;
  reservation_id: string | null;
  start_at: string;
  end_at: string;
  position: number;
  source: ItineraryItemSource;
}

export type TripItineraryItemAddedEvent = AtlasEventEnvelope<TripItineraryItemAddedPayload>;

// ---- commerce.order.paid ----------------------------------------------------

export interface OrderLineItem {
  reservation_id: string;
  reservation_type: string;
  amount: number;
}

export interface CommerceOrderPaidPayload {
  order_id: string;
  user_id: string;
  trip_id: string | null;
  total_amount: number;
  currency: string;
  payment_provider: string;
  payment_intent_id: string;
  reservation_count: number;
  items: OrderLineItem[];
}

export type CommerceOrderPaidEvent = AtlasEventEnvelope<CommerceOrderPaidPayload>;

// ---- commerce.reservation.confirmed -----------------------------------------

export type ReservationType =
  | "dining"
  | "experience"
  | "stay"
  | "rental"
  | "cruise"
  | "flight"
  | "insurance"
  | "ancillary";

export interface CommerceReservationConfirmedPayload {
  reservation_id: string;
  reservation_type: ReservationType;
  user_id: string;
  trip_id: string | null;
  order_id: string | null;
  product_id: string;
  slot_id: string | null;
  supplier_id: string;
  venue_id: string | null;
  external_provider: string | null;
  external_confirmation_code: string | null;
  start_at: string;
  end_at: string;
  party_size: number;
  price_paid: number;
  currency: string;
  status: string;
}

export type CommerceReservationConfirmedEvent = AtlasEventEnvelope<CommerceReservationConfirmedPayload>;

// ---- dining.notify.fulfilled ------------------------------------------------

export interface MatchedSlot {
  dining_slot_id: string;
  start_at: string;
  duration_min: number;
}

export type DiningNotifyAction = "notified" | "auto_reserved" | "expired";

export interface DiningNotifyFulfilledPayload {
  notify_id: string;
  restaurant_id: string;
  user_id: string;
  party_size: number;
  target_date: string;
  matched_slot: MatchedSlot;
  priority_level: string;
  action: DiningNotifyAction;
}

export type DiningNotifyFulfilledEvent = AtlasEventEnvelope<DiningNotifyFulfilledPayload>;

// ---- risk.review.flagged ----------------------------------------------------

export type RiskReviewAction = "hidden" | "queued_for_review" | "auto_removed" | "none";

export interface RiskReviewFlaggedPayload {
  review_id: string;
  entity_id: string;
  entity_type: string;
  user_id: string;
  fraud_score: number;
  trust_score: number;
  reason_codes: string[];
  action: RiskReviewAction;
  evidence?: Record<string, unknown>;
}

export type RiskReviewFlaggedEvent = AtlasEventEnvelope<RiskReviewFlaggedPayload>;

// ---- disruption.alert.raised ------------------------------------------------

export type DisruptionType =
  | "weather"
  | "strike"
  | "closure"
  | "delay"
  | "cancellation"
  | "diversion"
  | "natural_disaster"
  | "civil_unrest"
  | "health_advisory";

export type DisruptionSeverity = "low" | "medium" | "high" | "critical";

export type RecommendedAction = "rebook" | "refund" | "reroute" | "wait" | "hotel" | "meal_voucher";

export interface DisruptionLocation {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface DisruptionEvidence {
  source?: string;
  details?: string;
  confidence?: number;
}

export interface DisruptionAlertRaisedPayload {
  disruption_id: string;
  trip_id: string | null;
  reservation_id: string | null;
  ticket_id: string | null;
  disruption_type: DisruptionType;
  severity: DisruptionSeverity;
  affected_dates: string[];
  location: DisruptionLocation;
  recommended_actions: RecommendedAction[];
  evidence: DisruptionEvidence;
}

export type DisruptionAlertRaisedEvent = AtlasEventEnvelope<DisruptionAlertRaisedPayload>;

// ---- ai.action.proposed -----------------------------------------------------

export type AiAgentType =
  | "orchestrator"
  | "dining"
  | "stay"
  | "experience"
  | "flight"
  | "budget"
  | "trust"
  | "support";

export type ProposedActionType =
  | "move_reservation"
  | "cancel_reservation"
  | "add_item"
  | "modify_reservation"
  | "rebook_flight"
  | "file_claim"
  | "send_message";

export type EvidenceType =
  | "inventory_check"
  | "policy_check"
  | "trust_signal"
  | "review_data"
  | "disruption_data";

export type Urgency = "low" | "normal" | "high" | "critical";

export interface ProposedAction {
  type: ProposedActionType;
  target_id: string;
  params: Record<string, unknown>;
}

export interface GroundingItem {
  entity_id: string;
  evidence_type: EvidenceType;
  ref: string;
  confidence: number;
}

export interface AiActionProposedPayload {
  trip_id: string;
  proposal_id: string;
  agent_type: AiAgentType;
  actions: ProposedAction[];
  grounding: GroundingItem[];
  reasoning: string;
  requires_approval: boolean;
  urgency: Urgency;
}

export type AiActionProposedEvent = AtlasEventEnvelope<AiActionProposedPayload>;

// ---- ai.action.executed -----------------------------------------------------

export type ExecutionResult = "success" | "failed" | "partial";

export interface ExecutedAction {
  type: string;
  target_id: string;
  result: ExecutionResult;
  error?: string;
}

export interface SideEffect {
  event_type: string;
  entity_id: string;
}

export interface AiActionExecutedPayload {
  proposal_id: string;
  trip_id: string;
  approved_by: string;
  approved_at: string;
  executed_actions: ExecutedAction[];
  execution_duration_ms: number;
  side_effects: SideEffect[];
}

export type AiActionExecutedEvent = AtlasEventEnvelope<AiActionExecutedPayload>;

// ---- commerce.reservation.cancelled -----------------------------------------

export type CancellationReason =
  | "user_request"
  | "no_show"
  | "disruption"
  | "policy"
  | "partner"
  | "system";

export type CancelledBy = "user" | "partner" | "system" | "agent";

export interface CommerceReservationCancelledPayload {
  reservation_id: string;
  reservation_type: string;
  user_id: string;
  trip_id: string;
  reason: CancellationReason;
  refund_amount: number;
  refund_status: string;
  protection_used: string | null;
  cancelled_by: CancelledBy;
}

export type CommerceReservationCancelledEvent = AtlasEventEnvelope<CommerceReservationCancelledPayload>;

// ---- finance.wallet.credited ------------------------------------------------

export type CreditType =
  | "refund"
  | "reward"
  | "promotion"
  | "claim_payout"
  | "chargeback_reversal";

export interface FinanceWalletCreditedPayload {
  wallet_id: string;
  user_id: string;
  amount: number;
  currency: string;
  running_balance: number;
  credit_type: CreditType;
  reference_type: string;
  reference_id: string;
  description: string;
}

export type FinanceWalletCreditedEvent = AtlasEventEnvelope<FinanceWalletCreditedPayload>;

// ---- insurance.claim.status_changed -----------------------------------------

export interface InsuranceClaimStatusChangedPayload {
  claim_id: string;
  policy_id: string;
  user_id: string;
  claim_type: string;
  old_status: string;
  new_status: string;
  amount_claimed: number;
  amount_approved: number | null;
  amount_paid: number | null;
  reason: string | null;
}

export type InsuranceClaimStatusChangedEvent = AtlasEventEnvelope<InsuranceClaimStatusChangedPayload>;

// ---- Event Type Union -------------------------------------------------------

export type AtlasEventType =
  | "tg.entity.upserted"
  | "search.impression.logged"
  | "trip.created"
  | "trip.itinerary_item.added"
  | "commerce.order.paid"
  | "commerce.reservation.confirmed"
  | "dining.notify.fulfilled"
  | "risk.review.flagged"
  | "disruption.alert.raised"
  | "ai.action.proposed"
  | "ai.action.executed"
  | "commerce.reservation.cancelled"
  | "finance.wallet.credited"
  | "insurance.claim.status_changed";

export type AtlasEvent =
  | TgEntityUpsertedEvent
  | SearchImpressionLoggedEvent
  | TripCreatedEvent
  | TripItineraryItemAddedEvent
  | CommerceOrderPaidEvent
  | CommerceReservationConfirmedEvent
  | DiningNotifyFulfilledEvent
  | RiskReviewFlaggedEvent
  | DisruptionAlertRaisedEvent
  | AiActionProposedEvent
  | AiActionExecutedEvent
  | CommerceReservationCancelledEvent
  | FinanceWalletCreditedEvent
  | InsuranceClaimStatusChangedEvent;

// ---- Payload Map (event_type -> payload type) -------------------------------

export interface AtlasEventPayloadMap {
  "tg.entity.upserted": TgEntityUpsertedPayload;
  "search.impression.logged": SearchImpressionLoggedPayload;
  "trip.created": TripCreatedPayload;
  "trip.itinerary_item.added": TripItineraryItemAddedPayload;
  "commerce.order.paid": CommerceOrderPaidPayload;
  "commerce.reservation.confirmed": CommerceReservationConfirmedPayload;
  "dining.notify.fulfilled": DiningNotifyFulfilledPayload;
  "risk.review.flagged": RiskReviewFlaggedPayload;
  "disruption.alert.raised": DisruptionAlertRaisedPayload;
  "ai.action.proposed": AiActionProposedPayload;
  "ai.action.executed": AiActionExecutedPayload;
  "commerce.reservation.cancelled": CommerceReservationCancelledPayload;
  "finance.wallet.credited": FinanceWalletCreditedPayload;
  "insurance.claim.status_changed": InsuranceClaimStatusChangedPayload;
}

// ---- Validation Stub --------------------------------------------------------

/**
 * Validates an event envelope against its JSON Schema definition.
 *
 * This is a stub implementation. In production, wire this up to a JSON Schema
 * validator (e.g., ajv) loaded with the schema files from this package.
 *
 * @param event - The event envelope to validate
 * @returns Validation result with success flag and optional errors
 */
export function validate(
  event: AtlasEventEnvelope,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!event.event_id) {
    errors.push("event_id is required");
  }
  if (!event.event_type) {
    errors.push("event_type is required");
  }
  if (typeof event.schema_version !== "number" || event.schema_version < 1) {
    errors.push("schema_version must be a positive integer");
  }
  if (!event.occurred_at) {
    errors.push("occurred_at is required");
  }
  if (!event.producer) {
    errors.push("producer is required");
  }
  if (!event.payload || typeof event.payload !== "object") {
    errors.push("payload must be an object");
  }

  // Validate event_type pattern: domain.entity.action
  if (event.event_type && !/^[a-z]+\.[a-z_]+\.[a-z_]+$/.test(event.event_type)) {
    errors.push("event_type must match pattern: domain.entity.action (lowercase, dot-separated)");
  }

  return { valid: errors.length === 0, errors };
}

// ---- Re-export emitter module -----------------------------------------------

export {
  emitEvent,
  createEventEnvelope,
  AtlasEventEmitter,
  pollOutbox,
  type EmitOptions,
  type EventEmitterConfig,
  type OutboxMessage,
} from './emitter.js';
