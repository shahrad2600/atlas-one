import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ── Membership Queries ──────────────────────────────────────────────

export async function findMembershipByUserId(userId: string) {
  const result = await query(pool, 'SELECT * FROM lux.lux_membership WHERE user_id = $1', [userId]);
  return result.rows[0] ?? null;
}

// ── Concierge Case Queries ──────────────────────────────────────────

export async function findConciergeCase(id: string) {
  const result = await query(pool, 'SELECT * FROM lux.lux_concierge_case WHERE case_id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function findActiveConciergeByUserId(userId: string) {
  const result = await query(
    pool,
    `SELECT * FROM lux.lux_concierge_case WHERE user_id = $1 AND status IN ('open', 'in_progress') ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function createConciergeCase(data: {
  userId: string;
  membershipId: string | null;
  subject: string;
  description: string;
  priority: string;
  category: string | null;
}) {
  const result = await query(
    pool,
    `INSERT INTO lux.lux_concierge_case
       (user_id, membership_id, priority, category, status, summary)
     VALUES ($1, $2, $3, $4, 'open', $5)
     RETURNING *`,
    [
      data.userId,
      data.membershipId,
      data.priority,
      data.category,
      `${data.subject}: ${data.description}`,
    ],
  );
  return result.rows[0];
}

// ── Concierge Message Queries ───────────────────────────────────────

export async function findMessagesByCaseId(caseId: string) {
  const result = await query(
    pool,
    `SELECT * FROM lux.lux_concierge_message WHERE case_id = $1 ORDER BY created_at ASC`,
    [caseId],
  );
  return result.rows;
}

export async function createConciergeMessage(data: {
  caseId: string;
  senderId: string;
  senderType: string;
  body: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO lux.lux_concierge_message (case_id, sender_id, sender_type, body)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.caseId, data.senderId, data.senderType, data.body],
  );
  return result.rows[0];
}

// ── Inventory Hold Queries ──────────────────────────────────────────

export async function findInventoryHolds(userId: string) {
  const result = await query(
    pool,
    `SELECT h.* FROM lux.lux_inventory_hold h
     WHERE h.user_id = $1 AND h.status = 'active' AND h.expires_at > NOW()
     ORDER BY h.created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function createInventoryHold(data: {
  slotId: string;
  userId: string;
  membershipId: string;
  caseId: string | null;
  expiresAt: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO lux.lux_inventory_hold (slot_id, user_id, membership_id, case_id, expires_at, status)
     VALUES ($1, $2, $3, $4, $5, 'active')
     RETURNING *`,
    [data.slotId, data.userId, data.membershipId, data.caseId, data.expiresAt],
  );
  return result.rows[0];
}

// Re-export for route use
export { transaction, getPool };
