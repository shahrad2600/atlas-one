import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ── Types ───────────────────────────────────────────────────────

export interface QuoteRequestRow {
  quote_request_id: string;
  user_id: string;
  trip_id: string | null;
  reservation_ids: string[];
  coverage_intent: string;
  travelers: unknown;
  trip_cost: string | null;
  currency: string;
  destination_countries: string[];
  trip_start: string | null;
  trip_end: string | null;
  inputs: unknown;
  status: string;
  created_at: string;
}

export interface QuoteOptionRow {
  quote_option_id: string;
  quote_request_id: string;
  insurer_supplier_id: string;
  plan_name: string;
  plan_code: string;
  premium: string;
  currency: string;
  coverages: unknown;
  terms: unknown;
  highlights: unknown;
  rating: string | null;
  expires_at: string;
  created_at: string;
}

export interface PolicyRow {
  policy_id: string;
  reservation_id: string | null;
  quote_option_id: string | null;
  user_id: string;
  insurer_supplier_id: string;
  plan_name: string;
  plan_code: string;
  policy_number: string | null;
  status: string;
  effective_at: string;
  expires_at: string;
  premium: string;
  currency: string;
  coverages: unknown;
  covered_travelers: unknown;
  covered_reservations: string[];
  documents: unknown;
  created_at: string;
  updated_at: string;
}

export interface ClaimRow {
  claim_id: string;
  policy_id: string;
  user_id: string;
  claim_type: string;
  claim_number: string | null;
  status: string;
  incident_date: string;
  incident_location: string | null;
  description: string;
  amount_claimed: string;
  amount_approved: string | null;
  amount_paid: string | null;
  currency: string;
  evidence: unknown;
  denial_reason: string | null;
  adjuster_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Quote Request Queries ───────────────────────────────────────

export async function createQuoteRequest(params: {
  userId: string;
  tripId: string;
  coverageIntent: string;
  travelers: unknown;
  tripCost: number;
  currency: string;
}): Promise<QuoteRequestRow> {
  const result = await query(
    pool,
    `INSERT INTO ins.ins_quote_request
       (user_id, trip_id, coverage_intent, travelers, trip_cost, currency, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')
     RETURNING *`,
    [
      params.userId,
      params.tripId,
      params.coverageIntent,
      JSON.stringify(params.travelers),
      params.tripCost,
      params.currency,
    ],
  );
  return result.rows[0] as QuoteRequestRow;
}

export async function findQuoteRequestById(id: string): Promise<QuoteRequestRow | null> {
  const result = await query(
    pool,
    'SELECT * FROM ins.ins_quote_request WHERE quote_request_id = $1',
    [id],
  );
  return (result.rows[0] as QuoteRequestRow) ?? null;
}

export async function findQuoteRequestsByUserId(
  userId: string,
  opts: { limit: number; offset: number },
): Promise<{ data: QuoteRequestRow[]; total: number }> {
  const countResult = await query(
    pool,
    'SELECT COUNT(*)::int AS total FROM ins.ins_quote_request WHERE user_id = $1',
    [userId],
  );
  const total = (countResult.rows[0] as { total: number }).total;

  const result = await query(
    pool,
    `SELECT * FROM ins.ins_quote_request
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, opts.limit, opts.offset],
  );

  return { data: result.rows as QuoteRequestRow[], total };
}

export async function updateQuoteRequestStatus(
  id: string,
  status: string,
): Promise<QuoteRequestRow | null> {
  const result = await query(
    pool,
    `UPDATE ins.ins_quote_request SET status = $2 WHERE quote_request_id = $1 RETURNING *`,
    [id, status],
  );
  return (result.rows[0] as QuoteRequestRow) ?? null;
}

// ── Quote Option Queries ────────────────────────────────────────

export async function insertQuoteOption(params: {
  quoteRequestId: string;
  insurerSupplierId: string;
  planName: string;
  planCode: string;
  premium: number;
  currency: string;
  coverages: unknown;
  terms: unknown;
  highlights: unknown;
  rating: number | null;
  expiresAt: string;
}): Promise<QuoteOptionRow> {
  const result = await query(
    pool,
    `INSERT INTO ins.ins_quote_option
       (quote_request_id, insurer_supplier_id, plan_name, plan_code,
        premium, currency, coverages, terms, highlights, rating, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      params.quoteRequestId,
      params.insurerSupplierId,
      params.planName,
      params.planCode,
      params.premium,
      params.currency,
      JSON.stringify(params.coverages),
      JSON.stringify(params.terms),
      JSON.stringify(params.highlights),
      params.rating,
      params.expiresAt,
    ],
  );
  return result.rows[0] as QuoteOptionRow;
}

export async function findQuoteOptionById(id: string): Promise<QuoteOptionRow | null> {
  const result = await query(
    pool,
    'SELECT * FROM ins.ins_quote_option WHERE quote_option_id = $1',
    [id],
  );
  return (result.rows[0] as QuoteOptionRow) ?? null;
}

export async function findQuoteOptionsByRequestId(
  quoteRequestId: string,
): Promise<QuoteOptionRow[]> {
  const result = await query(
    pool,
    `SELECT * FROM ins.ins_quote_option
     WHERE quote_request_id = $1
     ORDER BY premium ASC`,
    [quoteRequestId],
  );
  return result.rows as QuoteOptionRow[];
}

export async function findQuotesByTrip(tripId: string): Promise<QuoteOptionRow[]> {
  const result = await query(
    pool,
    `SELECT qo.* FROM ins.ins_quote_option qo
     JOIN ins.ins_quote_request qr ON qr.quote_request_id = qo.quote_request_id
     WHERE qr.trip_id = $1
     ORDER BY qo.premium ASC`,
    [tripId],
  );
  return result.rows as QuoteOptionRow[];
}

// ── Policy Queries ──────────────────────────────────────────────

export async function createPolicyFromQuoteOption(
  client: PoolClient,
  params: {
    quoteOptionId: string;
    userId: string;
    insurerSupplierId: string;
    planName: string;
    planCode: string;
    premium: number;
    currency: string;
    coverages: unknown;
    coveredTravelers: unknown;
    effectiveAt: string;
    expiresAt: string;
  },
): Promise<PolicyRow> {
  // Generate a human-readable policy number
  const policyNumber = `ATL-INS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const result = await client.query(
    `INSERT INTO ins.ins_policy
       (quote_option_id, user_id, insurer_supplier_id, plan_name, plan_code,
        policy_number, status, effective_at, expires_at, premium, currency,
        coverages, covered_travelers)
     VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      params.quoteOptionId,
      params.userId,
      params.insurerSupplierId,
      params.planName,
      params.planCode,
      policyNumber,
      params.effectiveAt,
      params.expiresAt,
      params.premium,
      params.currency,
      JSON.stringify(params.coverages),
      JSON.stringify(params.coveredTravelers),
    ],
  );
  return result.rows[0] as PolicyRow;
}

export async function findPolicyById(id: string): Promise<PolicyRow | null> {
  const result = await query(pool, 'SELECT * FROM ins.ins_policy WHERE policy_id = $1', [id]);
  return (result.rows[0] as PolicyRow) ?? null;
}

export async function findPoliciesByUserId(
  userId: string,
  opts: { status?: string; limit: number; offset: number },
): Promise<{ data: PolicyRow[]; total: number }> {
  const conditions = ['user_id = $1'];
  const params: unknown[] = [userId];
  let paramIdx = 2;

  if (opts.status) {
    conditions.push(`status = $${paramIdx}`);
    params.push(opts.status);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await query(
    pool,
    `SELECT COUNT(*)::int AS total FROM ins.ins_policy WHERE ${whereClause}`,
    params,
  );
  const total = (countResult.rows[0] as { total: number }).total;

  const result = await query(
    pool,
    `SELECT * FROM ins.ins_policy
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, opts.limit, opts.offset],
  );

  return { data: result.rows as PolicyRow[], total };
}

export async function updatePolicyStatus(
  id: string,
  status: string,
): Promise<PolicyRow | null> {
  const result = await query(
    pool,
    `UPDATE ins.ins_policy SET status = $2 WHERE policy_id = $1 RETURNING *`,
    [id, status],
  );
  return (result.rows[0] as PolicyRow) ?? null;
}

// ── Claim Queries ───────────────────────────────────────────────

export async function createClaim(params: {
  policyId: string;
  userId: string;
  claimType: string;
  description: string;
  amountClaimed: number;
  currency: string;
  incidentDate: string;
  incidentLocation?: string;
  evidence?: unknown;
}): Promise<ClaimRow> {
  // Generate a human-readable claim number
  const claimNumber = `ATL-CLM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  const result = await query(
    pool,
    `INSERT INTO ins.ins_claim
       (policy_id, user_id, claim_type, claim_number, status, incident_date,
        incident_location, description, amount_claimed, currency, evidence)
     VALUES ($1, $2, $3, $4, 'submitted', $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      params.policyId,
      params.userId,
      params.claimType,
      claimNumber,
      params.incidentDate,
      params.incidentLocation ?? null,
      params.description,
      params.amountClaimed,
      params.currency,
      JSON.stringify(params.evidence ?? []),
    ],
  );
  return result.rows[0] as ClaimRow;
}

export async function findClaimById(id: string): Promise<ClaimRow | null> {
  const result = await query(pool, 'SELECT * FROM ins.ins_claim WHERE claim_id = $1', [id]);
  return (result.rows[0] as ClaimRow) ?? null;
}

export async function findClaimWithPolicy(id: string): Promise<(ClaimRow & { policy: PolicyRow }) | null> {
  const result = await query(
    pool,
    `SELECT
       c.*,
       row_to_json(p.*) AS policy
     FROM ins.ins_claim c
     JOIN ins.ins_policy p ON p.policy_id = c.policy_id
     WHERE c.claim_id = $1`,
    [id],
  );
  return (result.rows[0] as (ClaimRow & { policy: PolicyRow })) ?? null;
}

export async function findClaimsByUserId(
  userId: string,
  opts: { status?: string; limit: number; offset: number },
): Promise<{ data: ClaimRow[]; total: number }> {
  const conditions = ['user_id = $1'];
  const params: unknown[] = [userId];
  let paramIdx = 2;

  if (opts.status) {
    conditions.push(`status = $${paramIdx}`);
    params.push(opts.status);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await query(
    pool,
    `SELECT COUNT(*)::int AS total FROM ins.ins_claim WHERE ${whereClause}`,
    params,
  );
  const total = (countResult.rows[0] as { total: number }).total;

  const result = await query(
    pool,
    `SELECT * FROM ins.ins_claim
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, opts.limit, opts.offset],
  );

  return { data: result.rows as ClaimRow[], total };
}

export async function findClaimsByPolicyId(policyId: string): Promise<ClaimRow[]> {
  const result = await query(
    pool,
    `SELECT * FROM ins.ins_claim WHERE policy_id = $1 ORDER BY created_at DESC`,
    [policyId],
  );
  return result.rows as ClaimRow[];
}

// ── Re-export pool/transaction for route-level use ──────────────

export { getPool, transaction };
