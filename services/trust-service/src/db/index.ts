import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ── Risk Event Queries ──────────────────────────────────────────────

export async function findRiskEventById(id: string) {
  const result = await query(pool, 'SELECT * FROM trust.trust_risk_event WHERE event_id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function findRiskEventsByEntityId(entityId: string) {
  const result = await query(
    pool,
    'SELECT * FROM trust.trust_risk_event WHERE entity_id = $1 ORDER BY created_at DESC',
    [entityId],
  );
  return result.rows;
}

// ── User Trust Score Queries ────────────────────────────────────────

export async function findUserTrustScore(userId: string) {
  const result = await query(pool, 'SELECT * FROM trust.trust_user_score WHERE user_id = $1', [userId]);
  return result.rows[0] ?? null;
}

// ── Moderation Queue Queries ────────────────────────────────────────

export async function findModerationQueue(status: string = 'pending') {
  const result = await query(
    pool,
    'SELECT * FROM trust.trust_moderation_queue WHERE status = $1 ORDER BY priority DESC, created_at ASC LIMIT 50',
    [status],
  );
  return result.rows;
}

// ── Review Queries (tg.tg_review) ───────────────────────────────────

export async function findReviewById(reviewId: string) {
  const result = await query(
    pool,
    'SELECT * FROM tg.tg_review WHERE review_id = $1',
    [reviewId],
  );
  return result.rows[0] ?? null;
}

export async function findReviewsByUserId(
  userId: string,
  opts: { entityType?: string; limit: number; offset: number },
) {
  const params: unknown[] = [userId];
  let paramIdx = 2;
  let sql: string;

  if (opts.entityType) {
    // Join with tg_entity to filter by entity type
    sql = `SELECT r.* FROM tg.tg_review r
           JOIN tg.tg_entity e ON e.entity_id = r.entity_id
           WHERE r.user_id = $1 AND e.entity_type = $${paramIdx}
           AND r.status != 'removed'`;
    params.push(opts.entityType);
    paramIdx++;
  } else {
    sql = `SELECT r.* FROM tg.tg_review r
           WHERE r.user_id = $1
           AND r.status != 'removed'`;
  }

  sql += ' ORDER BY r.created_at DESC';

  // Count total
  const countSql = sql.replace('SELECT r.*', 'SELECT COUNT(*)::int AS total');
  const countResult = await query(pool, countSql, params);
  const total = countResult.rows[0]?.total ?? 0;

  sql += ` LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
  params.push(opts.limit, opts.offset);

  const result = await query(pool, sql, params);
  return { data: result.rows, total };
}

export async function createReview(data: {
  entityId: string;
  userId: string;
  rating: number;
  title: string | null;
  body: string | null;
}) {
  const result = await query(
    pool,
    `INSERT INTO tg.tg_review (entity_id, user_id, rating, title, body, status)
     VALUES ($1, $2, $3, $4, $5, 'published')
     RETURNING *`,
    [data.entityId, data.userId, data.rating, data.title, data.body],
  );
  return result.rows[0];
}

export async function updateReview(
  reviewId: string,
  data: { rating?: number; title?: string; body?: string },
) {
  const sets: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (data.rating !== undefined) {
    sets.push(`rating = $${paramIdx}`);
    params.push(data.rating);
    paramIdx++;
  }

  if (data.title !== undefined) {
    sets.push(`title = $${paramIdx}`);
    params.push(data.title);
    paramIdx++;
  }

  if (data.body !== undefined) {
    sets.push(`body = $${paramIdx}`);
    params.push(data.body);
    paramIdx++;
  }

  if (sets.length === 0) return null;

  params.push(reviewId);
  const sql = `UPDATE tg.tg_review SET ${sets.join(', ')} WHERE review_id = $${paramIdx} RETURNING *`;

  const result = await query(pool, sql, params);
  return result.rows[0] ?? null;
}

export async function softDeleteReview(reviewId: string) {
  const result = await query(
    pool,
    `UPDATE tg.tg_review SET status = 'removed' WHERE review_id = $1 RETURNING *`,
    [reviewId],
  );
  return result.rows[0] ?? null;
}

// ── Report Queries (trust.trust_moderation_queue) ───────────────────

export async function findReportsByUserId(userId: string) {
  const result = await query(
    pool,
    `SELECT * FROM trust.trust_moderation_queue
     WHERE entity_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function createReport(data: {
  contentType: string;
  contentId: string;
  entityId: string;
  reason: string;
  description: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO trust.trust_moderation_queue
       (content_type, content_id, entity_id, reason, priority, status)
     VALUES ($1, $2, $3, $4, 'normal', 'pending')
     RETURNING *`,
    [data.contentType, data.contentId, data.entityId, `${data.reason}: ${data.description}`],
  );
  return result.rows[0];
}

// ════════════════════════════════════════════════════════════════════════════
//  UGC: REVIEW ENHANCEMENT QUERIES
// ════════════════════════════════════════════════════════════════════════════

// ── Review Votes (helpful / not helpful) ────────────────────────────

export async function upsertReviewVote(data: {
  reviewId: string;
  userId: string;
  voteType: 'helpful' | 'not_helpful';
}) {
  const result = await query(
    pool,
    `INSERT INTO tg.tg_review_vote (review_id, user_id, vote_type)
     VALUES ($1, $2, $3)
     ON CONFLICT (review_id, user_id) DO UPDATE
       SET vote_type = EXCLUDED.vote_type, created_at = NOW()
     RETURNING *`,
    [data.reviewId, data.userId, data.voteType],
  );
  return result.rows[0];
}

export async function getReviewVoteCounts(reviewId: string) {
  const result = await query(
    pool,
    `SELECT
       COUNT(*) FILTER (WHERE vote_type = 'helpful')::int AS helpful_count,
       COUNT(*) FILTER (WHERE vote_type = 'not_helpful')::int AS not_helpful_count
     FROM tg.tg_review_vote
     WHERE review_id = $1`,
    [reviewId],
  );
  return result.rows[0] ?? { helpful_count: 0, not_helpful_count: 0 };
}

// ── Review Sub-Ratings ──────────────────────────────────────────────

export async function findSubratingsByReviewId(reviewId: string) {
  const result = await query(
    pool,
    `SELECT * FROM tg.tg_review_subrating
     WHERE review_id = $1
     ORDER BY category ASC`,
    [reviewId],
  );
  return result.rows;
}

export async function upsertSubratings(
  reviewId: string,
  subratings: { category: string; rating: number }[],
) {
  const results: unknown[] = [];
  for (const sr of subratings) {
    const result = await query(
      pool,
      `INSERT INTO tg.tg_review_subrating (review_id, category, rating)
       VALUES ($1, $2, $3)
       ON CONFLICT (review_id, category) DO UPDATE SET rating = EXCLUDED.rating
       RETURNING *`,
      [reviewId, sr.category, sr.rating],
    );
    results.push(result.rows[0]);
  }
  return results;
}

// ── Review Response (by business owners) ────────────────────────────

export async function findReviewResponse(reviewId: string) {
  const result = await query(
    pool,
    `SELECT * FROM tg.tg_review_response
     WHERE review_id = $1 AND status = 'published'`,
    [reviewId],
  );
  return result.rows[0] ?? null;
}

export async function createReviewResponse(data: {
  reviewId: string;
  userId: string;
  body: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO tg.tg_review_response (review_id, user_id, body)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.reviewId, data.userId, data.body],
  );
  return result.rows[0];
}

// ── Enhanced Review Search ──────────────────────────────────────────

export async function searchReviews(filters: {
  entityId?: string;
  travelerType?: string;
  season?: string;
  ratingMin?: number;
  ratingMax?: number;
  lang?: string;
  sort?: 'recent' | 'helpful' | 'highest' | 'lowest';
  limit: number;
  offset: number;
}): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const conditions: string[] = ["r.status = 'published'"];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.entityId) {
    conditions.push(`r.entity_id = $${paramIndex}`);
    params.push(filters.entityId);
    paramIndex++;
  }

  if (filters.ratingMin) {
    conditions.push(`r.rating >= $${paramIndex}`);
    params.push(filters.ratingMin);
    paramIndex++;
  }

  if (filters.ratingMax) {
    conditions.push(`r.rating <= $${paramIndex}`);
    params.push(filters.ratingMax);
    paramIndex++;
  }

  if (filters.lang) {
    conditions.push(`r.lang = $${paramIndex}`);
    params.push(filters.lang);
    paramIndex++;
  }

  // Season filter: map season to visit_date month ranges
  if (filters.season) {
    const seasonMonths: Record<string, string> = {
      spring: '3,4,5',
      summer: '6,7,8',
      fall: '9,10,11',
      winter: '12,1,2',
    };
    const months = seasonMonths[filters.season];
    if (months) {
      conditions.push(`EXTRACT(MONTH FROM r.visit_date) IN (${months})`);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total
  const countResult = await query(
    pool,
    `SELECT COUNT(*)::int AS total FROM tg.tg_review r ${whereClause}`,
    params,
  );
  const total = countResult.rows[0]?.total ?? 0;

  // Determine sort order
  let orderClause: string;
  switch (filters.sort) {
    case 'helpful':
      orderClause = `(SELECT COUNT(*) FROM tg.tg_review_vote v WHERE v.review_id = r.review_id AND v.vote_type = 'helpful') DESC`;
      break;
    case 'highest':
      orderClause = 'r.rating DESC, r.created_at DESC';
      break;
    case 'lowest':
      orderClause = 'r.rating ASC, r.created_at DESC';
      break;
    case 'recent':
    default:
      orderClause = 'r.created_at DESC';
      break;
  }

  const dataResult = await query(
    pool,
    `SELECT r.*,
       (SELECT COUNT(*) FROM tg.tg_review_vote v
        WHERE v.review_id = r.review_id AND v.vote_type = 'helpful')::int AS helpful_votes,
       (SELECT COUNT(*) FROM tg.tg_review_vote v
        WHERE v.review_id = r.review_id AND v.vote_type = 'not_helpful')::int AS not_helpful_votes,
       (SELECT json_agg(json_build_object('category', s.category, 'rating', s.rating))
        FROM tg.tg_review_subrating s WHERE s.review_id = r.review_id) AS subratings,
       (SELECT json_build_object('response_id', rr.response_id, 'body', rr.body, 'created_at', rr.created_at)
        FROM tg.tg_review_response rr WHERE rr.review_id = r.review_id AND rr.status = 'published') AS owner_response
     FROM tg.tg_review r
     ${whereClause}
     ORDER BY ${orderClause}
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

// Re-export for route use
export { transaction, getPool };
