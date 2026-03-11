import type { ReservationStatus } from '@atlas/shared-types';

// ─── Types ───────────────────────────────────────────────────────────

export interface TimeWindow {
  /** Hours before event start */
  hoursBeforeStart: number;
}

export interface Penalty {
  /** Percentage of total cost (0-100) */
  percentage: number;
  /** Flat fee in minor currency units (cents) */
  flatFee?: number;
  currency: string;
}

export interface PolicyCondition {
  /** Minimum hours before event to qualify */
  minHoursBefore?: number;
  /** Maximum hours before event to qualify */
  maxHoursBefore?: number;
  /** Reservation statuses this condition applies to */
  statuses?: ReservationStatus[];
  /** Reason categories (e.g., 'weather', 'medical') */
  reasons?: string[];
}

export interface PolicyRule {
  name: string;
  conditions: PolicyCondition;
  penalty: Penalty;
  window: TimeWindow;
}

export interface PolicyResult {
  allowed: boolean;
  fee: number;
  currency: string;
  reason: string;
  appliedRule?: string;
}

export interface Reservation {
  id: string;
  status: ReservationStatus;
  totalAmount: number;
  currency: string;
  eventStartsAt: string; // ISO datetime
}

export interface Policy {
  rules: PolicyRule[];
  /** Default behavior when no rule matches */
  defaultAllow: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function hoursUntil(dateStr: string, now: Date): number {
  const target = new Date(dateStr);
  return (target.getTime() - now.getTime()) / (1000 * 60 * 60);
}

function findMatchingRule(
  policy: Policy,
  reservation: Reservation,
  now: Date,
  reason?: string,
): PolicyRule | null {
  const hours = hoursUntil(reservation.eventStartsAt, now);

  for (const rule of policy.rules) {
    const c = rule.conditions;

    if (c.minHoursBefore !== undefined && hours < c.minHoursBefore) continue;
    if (c.maxHoursBefore !== undefined && hours > c.maxHoursBefore) continue;
    if (c.statuses && !c.statuses.includes(reservation.status)) continue;
    if (c.reasons && reason && !c.reasons.includes(reason)) continue;

    return rule;
  }

  return null;
}

function calculateFee(penalty: Penalty, totalAmount: number): number {
  const percentageFee = (penalty.percentage / 100) * totalAmount;
  return Math.round(percentageFee + (penalty.flatFee ?? 0));
}

// ─── Public API ──────────────────────────────────────────────────────

export function evaluatePolicy(
  policy: Policy,
  context: { reservation: Reservation; now?: Date; reason?: string },
): PolicyResult {
  const now = context.now ?? new Date();
  const rule = findMatchingRule(policy, context.reservation, now, context.reason);

  if (!rule) {
    return {
      allowed: policy.defaultAllow,
      fee: 0,
      currency: context.reservation.currency,
      reason: policy.defaultAllow
        ? 'No matching rule; default allow'
        : 'No matching rule; default deny',
    };
  }

  const fee = calculateFee(rule.penalty, context.reservation.totalAmount);

  return {
    allowed: true,
    fee,
    currency: rule.penalty.currency,
    reason: `Matched rule: ${rule.name}`,
    appliedRule: rule.name,
  };
}

export function canCancel(
  policy: Policy,
  reservation: Reservation,
  now?: Date,
): PolicyResult {
  return evaluatePolicy(policy, { reservation, now, reason: 'cancellation' });
}

export function canModify(
  policy: Policy,
  reservation: Reservation,
  _changes: Record<string, unknown>,
): PolicyResult {
  return evaluatePolicy(policy, { reservation, reason: 'modification' });
}

export function getRefundAmount(
  policy: Policy,
  reservation: Reservation,
  reason?: string,
): { amount: number; currency: string } {
  const result = evaluatePolicy(policy, { reservation, reason });

  if (!result.allowed) {
    return { amount: 0, currency: reservation.currency };
  }

  const refund = Math.max(0, reservation.totalAmount - result.fee);
  return { amount: refund, currency: reservation.currency };
}
