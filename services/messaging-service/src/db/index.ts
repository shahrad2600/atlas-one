import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ── Notification Queries ────────────────────────────────────────────

export async function findNotificationById(id: string) {
  const result = await query(pool, 'SELECT * FROM msg.notif_notification WHERE notification_id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function findNotificationsByUserId(
  userId: string,
  opts: { unreadOnly?: boolean; type?: string; limit: number; offset: number },
) {
  const params: unknown[] = [userId];
  let sql = 'SELECT * FROM msg.notif_notification WHERE user_id = $1';
  let paramIdx = 2;

  if (opts.unreadOnly) {
    sql += ' AND read_at IS NULL';
  }

  if (opts.type) {
    sql += ` AND channel = $${paramIdx}`;
    params.push(opts.type);
    paramIdx++;
  }

  sql += ' ORDER BY created_at DESC';

  // Count total before pagination
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)::int AS total');
  const countResult = await query(pool, countSql, params);
  const total = countResult.rows[0]?.total ?? 0;

  sql += ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
  params.push(opts.limit, opts.offset);

  const result = await query(pool, sql, params);
  return { data: result.rows, total };
}

export async function markNotificationRead(notificationId: string) {
  const result = await query(
    pool,
    `UPDATE msg.notif_notification
     SET read_at = NOW(), status = 'read'
     WHERE notification_id = $1 AND read_at IS NULL
     RETURNING *`,
    [notificationId],
  );
  return result.rows[0] ?? null;
}

export async function markAllNotificationsRead(userId: string) {
  const result = await query(
    pool,
    `UPDATE msg.notif_notification
     SET read_at = NOW(), status = 'read'
     WHERE user_id = $1 AND read_at IS NULL`,
    [userId],
  );
  return result.rowCount ?? 0;
}

// ── Thread Queries ──────────────────────────────────────────────────

export async function findThreadById(id: string) {
  const result = await query(pool, 'SELECT * FROM msg.msg_thread WHERE thread_id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function findThreadsByUserId(
  userId: string,
  opts: { limit: number; offset: number },
) {
  // Find threads where user is a participant
  const params: unknown[] = [userId];

  // Count total threads for user
  const countSql = `SELECT COUNT(DISTINCT t.thread_id)::int AS total
     FROM msg.msg_thread t
     JOIN msg.msg_participant p ON p.thread_id = t.thread_id
     WHERE p.participant_ref_id = $1 AND p.participant_type = 'user'`;
  const countResult = await query(pool, countSql, params);
  const total = countResult.rows[0]?.total ?? 0;

  // Fetch threads with last message preview
  const sql = `SELECT t.*,
       (SELECT m.body FROM msg.msg_message m
        WHERE m.thread_id = t.thread_id AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC LIMIT 1) AS last_message_preview,
       (SELECT m.created_at FROM msg.msg_message m
        WHERE m.thread_id = t.thread_id AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
     FROM msg.msg_thread t
     JOIN msg.msg_participant p ON p.thread_id = t.thread_id
     WHERE p.participant_ref_id = $1 AND p.participant_type = 'user'
     ORDER BY COALESCE(
       (SELECT m.created_at FROM msg.msg_message m
        WHERE m.thread_id = t.thread_id AND m.deleted_at IS NULL
        ORDER BY m.created_at DESC LIMIT 1),
       t.created_at
     ) DESC
     LIMIT $2 OFFSET $3`;

  const result = await query(pool, sql, [userId, opts.limit, opts.offset]);
  return { data: result.rows, total };
}

export async function isThreadParticipant(threadId: string, userId: string): Promise<boolean> {
  const result = await query(
    pool,
    `SELECT 1 FROM msg.msg_participant
     WHERE thread_id = $1 AND participant_ref_id = $2 AND participant_type = 'user'`,
    [threadId, userId],
  );
  return result.rows.length > 0;
}

export async function createThread(
  client: PoolClient,
  data: {
    threadType: string;
    subject: string | null;
    tripId: string | null;
  },
) {
  const result = await client.query(
    `INSERT INTO msg.msg_thread (thread_type, subject, trip_id, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING *`,
    [data.threadType, data.subject, data.tripId],
  );
  return result.rows[0];
}

export async function addParticipant(
  client: PoolClient,
  data: {
    threadId: string;
    participantType: string;
    participantRefId: string;
    displayName: string | null;
  },
) {
  const result = await client.query(
    `INSERT INTO msg.msg_participant (thread_id, participant_type, participant_ref_id, display_name, last_read_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (thread_id, participant_type, participant_ref_id) DO NOTHING
     RETURNING *`,
    [data.threadId, data.participantType, data.participantRefId, data.displayName],
  );
  return result.rows[0] ?? null;
}

// ── Message Queries ─────────────────────────────────────────────────

export async function findMessagesByThread(
  threadId: string,
  opts: { limit: number; offset: number },
) {
  const countResult = await query(
    pool,
    `SELECT COUNT(*)::int AS total FROM msg.msg_message
     WHERE thread_id = $1 AND deleted_at IS NULL`,
    [threadId],
  );
  const total = countResult.rows[0]?.total ?? 0;

  const result = await query(
    pool,
    `SELECT * FROM msg.msg_message
     WHERE thread_id = $1 AND deleted_at IS NULL
     ORDER BY created_at ASC
     LIMIT $2 OFFSET $3`,
    [threadId, opts.limit, opts.offset],
  );
  return { data: result.rows, total };
}

export async function createMessage(data: {
  threadId: string;
  senderId: string;
  senderType: string;
  body: string;
  contentType?: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO msg.msg_message (thread_id, sender_type, sender_id, body, content_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.threadId, data.senderType, data.senderId, data.body, data.contentType ?? 'text'],
  );
  return result.rows[0];
}

export async function createMessageInTx(
  client: PoolClient,
  data: {
    threadId: string;
    senderId: string;
    senderType: string;
    body: string;
    contentType?: string;
  },
) {
  const result = await client.query(
    `INSERT INTO msg.msg_message (thread_id, sender_type, sender_id, body, content_type)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.threadId, data.senderType, data.senderId, data.body, data.contentType ?? 'text'],
  );
  return result.rows[0];
}

// Re-export for route use
export { transaction, getPool };
