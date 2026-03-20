/**
 * Atlas One -- Concierge Agent
 *
 * Handles luxury concierge services: pre-arrival requests, room assignment
 * intelligence, special requests, disruption recovery, and escalation to
 * human support. This agent bridges the gap between AI automation and
 * high-touch human service.
 *
 * Capabilities:
 *   - Pre-arrival request management (room preferences, amenities, transfers)
 *   - Room assignment intelligence (matching guest profiles to rooms)
 *   - Special request handling (celebrations, dietary, accessibility)
 *   - Disruption recovery (rebooking, alternative arrangements, compensation)
 *   - Escalation management (when AI cannot resolve, hand off to humans)
 *
 * Design invariant: All mutations flow through the Tool Registry.
 * Escalations always provide context handoff to human agents.
 */

import type {
  SubAgent,
  Intent,
  TripContext,
  AgentResponse,
  ProposedAction,
} from './orchestrator';

// ---------------------------------------------------------------------------
// Concierge Types
// ---------------------------------------------------------------------------

/** A pre-arrival request from the guest. */
export interface PreArrivalRequest {
  requestId: string;
  userId: string;
  reservationId: string;
  propertyId: string;
  propertyName: string;
  checkInDate: string;
  category: PreArrivalCategory;
  details: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'escalated' | 'cancelled';
  assignedTo?: string;
  notes: string[];
  createdAt: string;
  updatedAt: string;
}

/** Categories of pre-arrival requests. */
export type PreArrivalCategory =
  | 'room_preference'
  | 'dietary'
  | 'celebration'
  | 'transfer'
  | 'amenity'
  | 'accessibility'
  | 'childcare'
  | 'pet'
  | 'activity_booking'
  | 'restaurant_reservation'
  | 'spa_booking'
  | 'other';

/** Room assignment recommendation. */
export interface RoomAssignment {
  recommendedRoomId: string;
  roomType: string;
  floor: number;
  view: string;
  matchScore: number;
  matchReasons: string[];
  alternatives: Array<{
    roomId: string;
    roomType: string;
    floor: number;
    view: string;
    matchScore: number;
    tradeoff: string;
  }>;
}

/** Available room for assignment. */
export interface AvailableRoom {
  roomId: string;
  roomType: string;
  floor: number;
  view: string;
  bedType: string;
  sqMeters: number;
  features: string[];
  isAccessible: boolean;
  isConnecting: boolean;
  noiseLevel: 'quiet' | 'moderate' | 'noisy';
  recentlyRenovated: boolean;
}

/** Guest profile for room matching (subset of traveler profile). */
export interface GuestProfileForMatching {
  userId: string;
  bedPreference: string;
  floorPreference: string;
  viewPreference: string[];
  noiseSensitivity: string;
  needsAccessibility: boolean;
  needsConnecting: boolean;
  hasChildren: boolean;
  isRepeatGuest: boolean;
  previousRoomId?: string;
  previousRoomSatisfaction?: number;
  specialOccasion?: string;
  vipLevel: 'standard' | 'gold' | 'platinum' | 'ambassador';
}

/** A special request with handling details. */
export interface SpecialRequest {
  requestId: string;
  type: 'celebration' | 'dietary' | 'medical' | 'childcare' | 'pet' | 'surprise' | 'custom';
  description: string;
  handlingPlan: HandlingStep[];
  estimatedCost: { amount: number; currency: string } | null;
  requiresHumanApproval: boolean;
  status: 'planned' | 'approved' | 'executing' | 'completed' | 'failed';
}

/** A step in the handling plan for a special request. */
export interface HandlingStep {
  sequence: number;
  action: string;
  department: string;
  deadline: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  notes?: string;
}

/** Disruption event requiring recovery. */
export interface DisruptionEvent {
  type: 'flight_cancelled' | 'flight_delayed' | 'overbooked' | 'room_not_ready' | 'service_failure' | 'weather' | 'medical' | 'safety';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedBookings: string[];
  timestamp: string;
}

/** Recovery plan for a disruption. */
export interface RecoveryPlan {
  planId: string;
  disruption: DisruptionEvent;
  immediateActions: string[];
  recoverySteps: ProposedAction[];
  compensationOffered?: {
    type: 'refund' | 'credit' | 'upgrade' | 'complimentary_service';
    description: string;
    value: { amount: number; currency: string };
  };
  escalatedToHuman: boolean;
  estimatedResolutionTime: string;
}

/** Escalation to human support. */
export interface EscalationRecord {
  escalationId: string;
  userId: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context: {
    conversationSummary: string;
    guestProfile: string;
    currentSituation: string;
    attemptedResolutions: string[];
    unresolved: string;
  };
  assignedTeam: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved';
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Mock Room Data
// ---------------------------------------------------------------------------

const MOCK_ROOMS: AvailableRoom[] = [
  { roomId: 'rm_501', roomType: 'Deluxe Suite', floor: 5, view: 'ocean', bedType: 'king', sqMeters: 65, features: ['balcony', 'bathtub', 'mini_bar'], isAccessible: false, isConnecting: false, noiseLevel: 'quiet', recentlyRenovated: true },
  { roomId: 'rm_502', roomType: 'Deluxe Suite', floor: 5, view: 'garden', bedType: 'king', sqMeters: 60, features: ['balcony', 'bathtub'], isAccessible: false, isConnecting: true, noiseLevel: 'quiet', recentlyRenovated: true },
  { roomId: 'rm_301', roomType: 'Premier Room', floor: 3, view: 'city', bedType: 'queen', sqMeters: 45, features: ['walk_in_shower'], isAccessible: true, isConnecting: false, noiseLevel: 'moderate', recentlyRenovated: false },
  { roomId: 'rm_701', roomType: 'Penthouse Suite', floor: 7, view: 'ocean', bedType: 'king', sqMeters: 120, features: ['balcony', 'bathtub', 'private_pool', 'dining_room', 'mini_bar', 'fireplace'], isAccessible: false, isConnecting: false, noiseLevel: 'quiet', recentlyRenovated: true },
  { roomId: 'rm_402', roomType: 'Family Suite', floor: 4, view: 'pool', bedType: 'king', sqMeters: 80, features: ['balcony', 'bathtub', 'kitchenette', 'extra_beds'], isAccessible: false, isConnecting: true, noiseLevel: 'moderate', recentlyRenovated: true },
  { roomId: 'rm_201', roomType: 'Accessible Suite', floor: 2, view: 'garden', bedType: 'king', sqMeters: 55, features: ['roll_in_shower', 'grab_bars', 'lowered_fixtures', 'bathtub'], isAccessible: true, isConnecting: false, noiseLevel: 'quiet', recentlyRenovated: true },
];

// ---------------------------------------------------------------------------
// Room Assignment Logic
// ---------------------------------------------------------------------------

/** Score a room against a guest profile. */
function scoreRoom(room: AvailableRoom, guest: GuestProfileForMatching): { score: number; reasons: string[] } {
  let score = 50; // baseline
  const reasons: string[] = [];

  // Accessibility is a hard requirement
  if (guest.needsAccessibility && !room.isAccessible) {
    return { score: 0, reasons: ['Room is not accessible'] };
  }
  if (guest.needsAccessibility && room.isAccessible) {
    score += 20;
    reasons.push('Accessible room matches accessibility needs.');
  }

  // Connecting room requirement
  if (guest.needsConnecting && !room.isConnecting) {
    score -= 30;
    reasons.push('Guest needs connecting room but this room is not connecting.');
  }
  if (guest.needsConnecting && room.isConnecting) {
    score += 15;
    reasons.push('Connecting room for family.');
  }

  // Bed preference
  if (room.bedType === guest.bedPreference) {
    score += 10;
    reasons.push(`Preferred bed type: ${room.bedType}.`);
  }

  // Floor preference
  if (guest.floorPreference === 'high' && room.floor >= 5) {
    score += 10;
    reasons.push('High floor as preferred.');
  } else if (guest.floorPreference === 'low' && room.floor <= 3) {
    score += 10;
    reasons.push('Lower floor as preferred.');
  }

  // View preference
  if (guest.viewPreference.includes(room.view)) {
    score += 15;
    reasons.push(`Preferred view: ${room.view}.`);
  }

  // Noise sensitivity
  if (guest.noiseSensitivity === 'high' && room.noiseLevel === 'quiet') {
    score += 15;
    reasons.push('Quiet room for noise-sensitive guest.');
  } else if (guest.noiseSensitivity === 'high' && room.noiseLevel === 'noisy') {
    score -= 20;
    reasons.push('Noisy room -- not suitable for noise-sensitive guest.');
  }

  // VIP level upgrades
  if (guest.vipLevel === 'ambassador' || guest.vipLevel === 'platinum') {
    if (room.sqMeters >= 80) {
      score += 15;
      reasons.push('Spacious room appropriate for VIP status.');
    }
    if (room.features.includes('private_pool') || room.features.includes('fireplace')) {
      score += 10;
      reasons.push('Premium features for VIP guest.');
    }
  }

  // Special occasion boost for premium rooms
  if (guest.specialOccasion && room.sqMeters >= 80) {
    score += 10;
    reasons.push(`Upgraded room for ${guest.specialOccasion}.`);
  }

  // Repeat guest with previous room satisfaction
  if (guest.isRepeatGuest && guest.previousRoomId === room.roomId && guest.previousRoomSatisfaction && guest.previousRoomSatisfaction >= 4) {
    score += 20;
    reasons.push('Guest previously stayed in this room and rated it highly.');
  }

  // Recently renovated bonus
  if (room.recentlyRenovated) {
    score += 5;
    reasons.push('Recently renovated room.');
  }

  // Family with children
  if (guest.hasChildren && room.features.includes('extra_beds')) {
    score += 10;
    reasons.push('Room has extra beds suitable for children.');
  }

  return { score: Math.min(100, Math.max(0, score)), reasons };
}

/** Generate room assignment recommendation. */
function generateRoomAssignment(guest: GuestProfileForMatching, rooms: AvailableRoom[]): RoomAssignment {
  const scored = rooms.map((room) => {
    const { score, reasons } = scoreRoom(room, guest);
    return { room, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  const alternatives = scored.slice(1, 4).map((s) => ({
    roomId: s.room.roomId,
    roomType: s.room.roomType,
    floor: s.room.floor,
    view: s.room.view,
    matchScore: s.score,
    tradeoff: s.score < best.score
      ? `${best.score - s.score} points lower: ${s.reasons.filter((r) => !best.reasons.includes(r)).join('; ') || 'minor differences'}`
      : 'Equivalent match',
  }));

  return {
    recommendedRoomId: best.room.roomId,
    roomType: best.room.roomType,
    floor: best.room.floor,
    view: best.room.view,
    matchScore: best.score,
    matchReasons: best.reasons,
    alternatives,
  };
}

// ---------------------------------------------------------------------------
// Special Request Handling
// ---------------------------------------------------------------------------

/** Create a handling plan for a celebration request. */
function handleCelebrationRequest(description: string, checkInDate: string): SpecialRequest {
  const steps: HandlingStep[] = [
    {
      sequence: 1,
      action: 'Confirm celebration details with guest',
      department: 'Guest Relations',
      deadline: new Date(new Date(checkInDate).getTime() - 7 * 86400000).toISOString(),
      status: 'pending',
    },
    {
      sequence: 2,
      action: 'Prepare room decoration (flowers, champagne, card)',
      department: 'Housekeeping',
      deadline: checkInDate,
      status: 'pending',
    },
    {
      sequence: 3,
      action: 'Alert F&B team for special dining arrangement',
      department: 'Food & Beverage',
      deadline: checkInDate,
      status: 'pending',
    },
    {
      sequence: 4,
      action: 'Prepare celebration cake/amenity',
      department: 'Pastry',
      deadline: checkInDate,
      status: 'pending',
    },
    {
      sequence: 5,
      action: 'Brief concierge team on celebration details',
      department: 'Concierge',
      deadline: new Date(new Date(checkInDate).getTime() - 86400000).toISOString(),
      status: 'pending',
    },
  ];

  return {
    requestId: `sr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'celebration',
    description,
    handlingPlan: steps,
    estimatedCost: { amount: 250, currency: 'USD' },
    requiresHumanApproval: false,
    status: 'planned',
  };
}

/** Create a handling plan for a dietary request. */
function handleDietaryRequest(description: string, checkInDate: string): SpecialRequest {
  return {
    requestId: `sr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    type: 'dietary',
    description,
    handlingPlan: [
      {
        sequence: 1,
        action: 'Document all dietary restrictions and allergies',
        department: 'Guest Relations',
        deadline: new Date(new Date(checkInDate).getTime() - 3 * 86400000).toISOString(),
        status: 'pending',
      },
      {
        sequence: 2,
        action: 'Brief Executive Chef on dietary requirements',
        department: 'Kitchen',
        deadline: new Date(new Date(checkInDate).getTime() - 2 * 86400000).toISOString(),
        status: 'pending',
      },
      {
        sequence: 3,
        action: 'Prepare customized menu options for all restaurants',
        department: 'Food & Beverage',
        deadline: new Date(new Date(checkInDate).getTime() - 86400000).toISOString(),
        status: 'pending',
      },
      {
        sequence: 4,
        action: 'Stock minibar with appropriate alternatives',
        department: 'Housekeeping',
        deadline: checkInDate,
        status: 'pending',
      },
    ],
    estimatedCost: null,
    requiresHumanApproval: false,
    status: 'planned',
  };
}

// ---------------------------------------------------------------------------
// Disruption Recovery
// ---------------------------------------------------------------------------

/** Generate a recovery plan for a disruption. */
function generateRecoveryPlan(disruption: DisruptionEvent): RecoveryPlan {
  const immediateActions: string[] = [];
  const recoverySteps: ProposedAction[] = [];
  let escalateToHuman = false;
  let estimatedResolution = '2 hours';

  switch (disruption.type) {
    case 'flight_cancelled':
    case 'flight_delayed':
      immediateActions.push(
        'Notify guest of flight status change',
        'Adjust check-in/check-out expectations',
        'Arrange alternative transport if needed',
      );
      recoverySteps.push({
        sequence: 1,
        tool: 'searchFlights',
        params: { rebooking: true, affectedBookings: disruption.affectedBookings },
        estimatedCost: null,
        rollbackTool: null,
        description: 'Search for alternative flight options.',
      });
      if (disruption.severity === 'high' || disruption.severity === 'critical') {
        immediateActions.push('Offer complimentary airport lounge access');
        escalateToHuman = true;
        estimatedResolution = '4-6 hours';
      }
      break;

    case 'overbooked':
      immediateActions.push(
        'Apologize to guest immediately',
        'Offer upgrade at partner property',
        'Arrange complimentary transport to alternative',
      );
      escalateToHuman = true;
      estimatedResolution = '1-2 hours';
      break;

    case 'room_not_ready':
      immediateActions.push(
        'Offer complimentary welcome drink in lounge',
        'Store luggage securely',
        'Provide estimated room ready time',
        'Offer spa access or activity voucher while waiting',
      );
      estimatedResolution = '30-60 minutes';
      break;

    case 'service_failure':
      immediateActions.push(
        'Acknowledge the issue and apologize',
        'Identify root cause',
        'Offer immediate remedy',
      );
      if (disruption.severity === 'high') {
        escalateToHuman = true;
        immediateActions.push('Assign dedicated staff to guest for remainder of stay');
      }
      break;

    case 'weather':
      immediateActions.push(
        'Inform guest of weather impact on planned activities',
        'Suggest indoor alternatives',
        'Offer to reschedule outdoor bookings',
      );
      break;

    case 'medical':
      immediateActions.push(
        'Call property medical staff immediately',
        'Contact local emergency services if severe',
        'Notify guest relations manager',
      );
      escalateToHuman = true;
      estimatedResolution = 'immediate';
      break;

    case 'safety':
      immediateActions.push(
        'Ensure guest safety is the top priority',
        'Follow property emergency protocols',
        'Assign dedicated staff to guest',
      );
      escalateToHuman = true;
      estimatedResolution = 'immediate';
      break;
  }

  // Determine compensation
  let compensation: RecoveryPlan['compensationOffered'];
  if (disruption.severity === 'high' || disruption.severity === 'critical') {
    compensation = {
      type: 'credit',
      description: 'Credit towards future stay or current stay services',
      value: { amount: disruption.severity === 'critical' ? 500 : 200, currency: 'USD' },
    };
  } else if (disruption.severity === 'medium') {
    compensation = {
      type: 'complimentary_service',
      description: 'Complimentary spa treatment or dining credit',
      value: { amount: 100, currency: 'USD' },
    };
  }

  return {
    planId: `rp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    disruption,
    immediateActions,
    recoverySteps,
    compensationOffered: compensation,
    escalatedToHuman: escalateToHuman,
    estimatedResolutionTime: estimatedResolution,
  };
}

// ---------------------------------------------------------------------------
// In-Memory Stores
// ---------------------------------------------------------------------------

const requestStore = new Map<string, PreArrivalRequest>();
const escalationStore = new Map<string, EscalationRecord>();

// ---------------------------------------------------------------------------
// Concierge Agent
// ---------------------------------------------------------------------------

export class ConciergeAgent implements SubAgent {
  public readonly agentId = 'concierge-agent';
  public readonly name = 'Concierge Agent';

  async handleTask(intent: Intent, context: TripContext): Promise<AgentResponse> {
    const traceId = this.generateTraceId();
    const startTime = Date.now();

    switch (intent.type) {
      case 'concierge.pre_arrival':
        return this.handlePreArrival(intent, context, traceId, startTime);
      case 'concierge.room_assignment':
        return this.handleRoomAssignment(intent, context, traceId, startTime);
      case 'concierge.special_request':
        return this.handleSpecialRequest(intent, context, traceId, startTime);
      case 'concierge.disruption':
        return this.handleDisruption(intent, context, traceId, startTime);
      case 'concierge.escalate':
        return this.handleEscalation(intent, context, traceId, startTime);
      case 'concierge.request_status':
        return this.handleRequestStatus(intent, traceId, startTime);
      default:
        return {
          message: `Concierge Agent does not handle intent type "${intent.type}".`,
          proposals: [],
          groundingResults: [],
          metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
        };
    }
  }

  // ── Core Capabilities ───────────────────────────────────────────

  /**
   * Create a pre-arrival request.
   */
  async createPreArrivalRequest(
    userId: string,
    reservationId: string,
    propertyId: string,
    propertyName: string,
    checkInDate: string,
    category: PreArrivalCategory,
    details: string,
  ): Promise<PreArrivalRequest> {
    const priority = this.determinePriority(category, checkInDate);
    const request: PreArrivalRequest = {
      requestId: `par_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      reservationId,
      propertyId,
      propertyName,
      checkInDate,
      category,
      details,
      priority,
      status: 'pending',
      notes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    requestStore.set(request.requestId, request);
    return request;
  }

  /**
   * Recommend a room assignment based on guest profile.
   */
  async recommendRoomAssignment(guest: GuestProfileForMatching): Promise<RoomAssignment> {
    return generateRoomAssignment(guest, MOCK_ROOMS);
  }

  /**
   * Handle a special request (celebration, dietary, etc.).
   */
  async processSpecialRequest(
    type: SpecialRequest['type'],
    description: string,
    checkInDate: string,
  ): Promise<SpecialRequest> {
    switch (type) {
      case 'celebration':
        return handleCelebrationRequest(description, checkInDate);
      case 'dietary':
        return handleDietaryRequest(description, checkInDate);
      default:
        return {
          requestId: `sr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
          type,
          description,
          handlingPlan: [
            {
              sequence: 1,
              action: `Process ${type} request: ${description}`,
              department: 'Guest Relations',
              deadline: checkInDate,
              status: 'pending',
            },
          ],
          estimatedCost: null,
          requiresHumanApproval: type === 'medical' || type === 'custom',
          status: 'planned',
        };
    }
  }

  /**
   * Create a recovery plan for a disruption.
   */
  async createRecoveryPlan(disruption: DisruptionEvent): Promise<RecoveryPlan> {
    return generateRecoveryPlan(disruption);
  }

  /**
   * Escalate to human support with full context.
   */
  async escalateToHuman(
    userId: string,
    reason: string,
    severity: EscalationRecord['severity'],
    conversationSummary: string,
    attemptedResolutions: string[],
    unresolved: string,
  ): Promise<EscalationRecord> {
    const escalation: EscalationRecord = {
      escalationId: `esc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      userId,
      reason,
      severity,
      context: {
        conversationSummary,
        guestProfile: `Guest ${userId}`,
        currentSituation: reason,
        attemptedResolutions,
        unresolved,
      },
      assignedTeam: severity === 'critical' ? 'Duty Manager' : severity === 'high' ? 'Senior Concierge' : 'Guest Relations',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    escalationStore.set(escalation.escalationId, escalation);
    return escalation;
  }

  // ── Intent Handlers ─────────────────────────────────────────────

  private async handlePreArrival(
    intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const category = intent.entities['category'] as PreArrivalCategory | undefined;
    const details = intent.entities['details'] as string | undefined;
    const reservationId = intent.entities['reservationId'] as string ?? 'unknown';
    const propertyId = intent.entities['propertyId'] as string ?? 'unknown';
    const propertyName = intent.entities['propertyName'] as string ?? 'the property';
    const checkInDate = intent.entities['checkInDate'] as string ?? context.startDate;

    if (!category || !details) {
      return {
        message: 'Please specify the category and details for your pre-arrival request. Categories include: room_preference, dietary, celebration, transfer, amenity, accessibility, childcare, pet, activity_booking, restaurant_reservation, spa_booking.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const request = await this.createPreArrivalRequest(
      context.userId, reservationId, propertyId, propertyName, checkInDate, category, details,
    );

    return {
      message: `Pre-arrival request created (${request.requestId}):\n` +
        `  Category: ${category}\n` +
        `  Priority: ${request.priority}\n` +
        `  Details: ${details}\n` +
        `  Status: ${request.status}\n\n` +
        `The ${propertyName} team will process this request before your arrival on ${checkInDate}.`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleRoomAssignment(
    intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const guest: GuestProfileForMatching = {
      userId: context.userId,
      bedPreference: (intent.entities['bedPreference'] as string) ?? 'king',
      floorPreference: (intent.entities['floorPreference'] as string) ?? 'high',
      viewPreference: (intent.entities['viewPreference'] as string[]) ?? ['ocean'],
      noiseSensitivity: (intent.entities['noiseSensitivity'] as string) ?? 'medium',
      needsAccessibility: context.accessibility.mobility || false,
      needsConnecting: context.groupComposition.children > 0,
      hasChildren: context.groupComposition.children > 0,
      isRepeatGuest: (intent.entities['isRepeatGuest'] as boolean) ?? false,
      previousRoomId: intent.entities['previousRoomId'] as string | undefined,
      previousRoomSatisfaction: intent.entities['previousRoomSatisfaction'] as number | undefined,
      specialOccasion: intent.entities['specialOccasion'] as string | undefined,
      vipLevel: (intent.entities['vipLevel'] as GuestProfileForMatching['vipLevel']) ?? 'standard',
    };

    const assignment = await this.recommendRoomAssignment(guest);

    const altText = assignment.alternatives
      .map((a) => `  ${a.roomId}: ${a.roomType} (floor ${a.floor}, ${a.view} view, ${a.matchScore}pts)\n    Tradeoff: ${a.tradeoff}`)
      .join('\n');

    return {
      message: `Room Assignment Recommendation:\n\n` +
        `  Recommended: ${assignment.recommendedRoomId} -- ${assignment.roomType}\n` +
        `  Floor: ${assignment.floor} | View: ${assignment.view} | Match: ${assignment.matchScore}/100\n\n` +
        `  Reasons:\n${assignment.matchReasons.map((r) => `    - ${r}`).join('\n')}\n\n` +
        `  Alternatives:\n${altText || '    (none available)'}`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleSpecialRequest(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const type = (intent.entities['requestType'] as SpecialRequest['type']) ?? 'custom';
    const description = (intent.entities['description'] as string) ?? '';
    const checkInDate = (intent.entities['checkInDate'] as string) ?? new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    if (!description) {
      return {
        message: 'Please describe your special request so I can create a handling plan.',
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const request = await this.processSpecialRequest(type, description, checkInDate);

    const stepsText = request.handlingPlan
      .map((s) => `  ${s.sequence}. ${s.action} (${s.department}) -- by ${s.deadline.split('T')[0]}`)
      .join('\n');

    return {
      message: `Special Request Plan (${request.requestId}):\n` +
        `  Type: ${request.type}\n` +
        `  Description: ${request.description}\n` +
        (request.estimatedCost ? `  Estimated cost: ${request.estimatedCost.currency} ${request.estimatedCost.amount}\n` : '') +
        (request.requiresHumanApproval ? '  ** Requires human approval **\n' : '') +
        `\n  Handling Steps:\n${stepsText}`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleDisruption(
    intent: Intent,
    _context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const disruption: DisruptionEvent = {
      type: (intent.entities['disruptionType'] as DisruptionEvent['type']) ?? 'service_failure',
      severity: (intent.entities['severity'] as DisruptionEvent['severity']) ?? 'medium',
      description: (intent.entities['description'] as string) ?? 'Disruption reported',
      affectedBookings: (intent.entities['affectedBookings'] as string[]) ?? [],
      timestamp: new Date().toISOString(),
    };

    const plan = await this.createRecoveryPlan(disruption);

    const actionsText = plan.immediateActions.map((a) => `  - ${a}`).join('\n');
    const compText = plan.compensationOffered
      ? `\n  Compensation: ${plan.compensationOffered.description} (${plan.compensationOffered.value.currency} ${plan.compensationOffered.value.amount})`
      : '';

    return {
      message: `Recovery Plan (${plan.planId}):\n\n` +
        `  Disruption: ${disruption.type} (${disruption.severity})\n` +
        `  Description: ${disruption.description}\n\n` +
        `  Immediate Actions:\n${actionsText}\n` +
        compText +
        `\n  Estimated resolution: ${plan.estimatedResolutionTime}` +
        (plan.escalatedToHuman ? '\n\n  ** This has been escalated to human support **' : ''),
      proposals: plan.recoverySteps,
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleEscalation(
    intent: Intent,
    context: TripContext,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const reason = (intent.entities['reason'] as string) ?? 'Guest requested human assistance';
    const severity = (intent.entities['severity'] as EscalationRecord['severity']) ?? 'medium';
    const summary = (intent.entities['conversationSummary'] as string) ?? 'No summary available';
    const attempted = (intent.entities['attemptedResolutions'] as string[]) ?? [];
    const unresolved = (intent.entities['unresolved'] as string) ?? reason;

    const escalation = await this.escalateToHuman(
      context.userId, reason, severity, summary, attempted, unresolved,
    );

    return {
      message: `Your request has been escalated to our ${escalation.assignedTeam} team (${escalation.escalationId}).\n\n` +
        `  Severity: ${severity}\n` +
        `  Reason: ${reason}\n` +
        `  Assigned to: ${escalation.assignedTeam}\n\n` +
        `A team member will reach out to you shortly. In the meantime, please do not hesitate to contact the front desk directly for any urgent needs.`,
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  private async handleRequestStatus(
    intent: Intent,
    traceId: string,
    startTime: number,
  ): Promise<AgentResponse> {
    const requestId = intent.entities['requestId'] as string | undefined;

    if (!requestId) {
      // List all requests for the user
      const allRequests = Array.from(requestStore.values()).slice(0, 10);
      if (allRequests.length === 0) {
        return {
          message: 'No pre-arrival requests found.',
          proposals: [],
          groundingResults: [],
          metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
        };
      }

      const text = allRequests
        .map((r) => `  ${r.requestId}: ${r.category} -- ${r.status} (${r.priority} priority)\n    ${r.details}`)
        .join('\n\n');

      return {
        message: `Pre-arrival Requests:\n\n${text}`,
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    const request = requestStore.get(requestId);
    if (!request) {
      return {
        message: `Request ${requestId} not found.`,
        proposals: [],
        groundingResults: [],
        metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
      };
    }

    return {
      message: `Request ${request.requestId}:\n` +
        `  Property: ${request.propertyName}\n` +
        `  Category: ${request.category}\n` +
        `  Status: ${request.status}\n` +
        `  Priority: ${request.priority}\n` +
        `  Details: ${request.details}\n` +
        `  Check-in: ${request.checkInDate}\n` +
        (request.notes.length > 0 ? `  Notes:\n${request.notes.map((n) => `    - ${n}`).join('\n')}` : ''),
      proposals: [],
      groundingResults: [],
      metadata: { agentId: this.agentId, traceId, modelTier: 'fast', latencyMs: Date.now() - startTime, unverifiedClaims: [] },
    };
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private determinePriority(category: PreArrivalCategory, checkInDate: string): PreArrivalRequest['priority'] {
    const daysUntil = Math.floor((new Date(checkInDate).getTime() - Date.now()) / 86400000);

    if (category === 'accessibility' || category === 'dietary') return 'high';
    if (category === 'celebration' && daysUntil <= 3) return 'urgent';
    if (daysUntil <= 1) return 'urgent';
    if (daysUntil <= 3) return 'high';
    if (daysUntil <= 7) return 'medium';
    return 'low';
  }

  private generateTraceId(): string {
    return `trc_con_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}
