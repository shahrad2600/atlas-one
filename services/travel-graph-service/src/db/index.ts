import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';
import { generateMockEmbedding, INTERACTION_WEIGHTS } from '@atlas/shared-types';

const pool: Pool = getPool();

// ════════════════════════════════════════════════════════════════════════════
//  PLACE QUERIES
// ════════════════════════════════════════════════════════════════════════════

export async function findPlaceById(id: string) {
  const result = await query(
    pool,
    `SELECT p.*, e.canonical_name, e.status, e.source_of_truth
     FROM tg.tg_place p
     JOIN tg.tg_entity e ON e.entity_id = p.place_id
     WHERE p.place_id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function searchPlaces(filters: {
  name?: string;
  placeType?: string;
  countryCode?: string;
  limit: number;
  offset: number;
}): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.name) {
    conditions.push(`e.canonical_name ILIKE $${paramIndex}`);
    params.push(`%${filters.name}%`);
    paramIndex++;
  }

  if (filters.placeType) {
    conditions.push(`p.place_type = $${paramIndex}`);
    params.push(filters.placeType);
    paramIndex++;
  }

  if (filters.countryCode) {
    conditions.push(`p.country_code = $${paramIndex}`);
    params.push(filters.countryCode.toUpperCase());
    paramIndex++;
  }

  // Always filter to active entities
  conditions.push(`e.status = 'active'`);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM tg.tg_place p
     JOIN tg.tg_entity e ON e.entity_id = p.place_id
     ${whereClause}`,
    params,
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT p.*, e.canonical_name, e.status, e.source_of_truth
     FROM tg.tg_place p
     JOIN tg.tg_entity e ON e.entity_id = p.place_id
     ${whereClause}
     ORDER BY p.popularity_score DESC, e.canonical_name ASC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

export async function countVenuesByPlaceId(placeId: string): Promise<number> {
  const result = await query(
    pool,
    `SELECT COUNT(*) AS count FROM tg.tg_venue WHERE place_id = $1`,
    [placeId],
  );
  return parseInt(result.rows[0]?.count ?? '0', 10);
}

export async function findEdgesByPlaceEntityId(placeId: string) {
  const result = await query(
    pool,
    `SELECT r.*,
            fe.canonical_name AS from_name, fe.entity_type AS from_type,
            te.canonical_name AS to_name, te.entity_type AS to_type
     FROM tg.tg_relationship r
     JOIN tg.tg_entity fe ON fe.entity_id = r.from_entity_id
     JOIN tg.tg_entity te ON te.entity_id = r.to_entity_id
     WHERE r.from_entity_id = $1 OR r.to_entity_id = $1
     ORDER BY r.weight DESC`,
    [placeId],
  );
  return result.rows;
}

// ════════════════════════════════════════════════════════════════════════════
//  VENUE QUERIES
// ════════════════════════════════════════════════════════════════════════════

export async function findVenuesByPlaceId(
  placeId: string,
  filters: {
    venueType?: string;
    status?: string;
    limit: number;
    offset: number;
  },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const conditions: string[] = ['v.place_id = $1'];
  const params: unknown[] = [placeId];
  let paramIndex = 2;

  if (filters.venueType) {
    conditions.push(`v.venue_type = $${paramIndex}`);
    params.push(filters.venueType);
    paramIndex++;
  }

  // Default to active entities unless a specific status is requested
  if (filters.status) {
    conditions.push(`e.status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  } else {
    conditions.push(`e.status = 'active'`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM tg.tg_venue v
     JOIN tg.tg_entity e ON e.entity_id = v.venue_id
     ${whereClause}`,
    params,
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT v.*, e.canonical_name, e.status, e.source_of_truth
     FROM tg.tg_venue v
     JOIN tg.tg_entity e ON e.entity_id = v.venue_id
     ${whereClause}
     ORDER BY v.rating_avg DESC NULLS LAST, e.canonical_name ASC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findVenueById(venueId: string) {
  const result = await query(
    pool,
    `SELECT v.*, e.canonical_name, e.status, e.source_of_truth,
            a.line1, a.line2, a.city, a.region, a.postal_code,
            a.country_code AS address_country_code, a.lat AS address_lat, a.lng AS address_lng,
            s.supplier_id, s.supplier_type, s.legal_name AS supplier_name
     FROM tg.tg_venue v
     JOIN tg.tg_entity e ON e.entity_id = v.venue_id
     LEFT JOIN tg.tg_address a ON a.address_id = v.address_id
     LEFT JOIN tg.tg_product pr ON pr.venue_id = v.venue_id AND pr.active = true
     LEFT JOIN tg.tg_supplier s ON s.supplier_id = pr.supplier_id
     WHERE v.venue_id = $1`,
    [venueId],
  );
  return result.rows[0] ?? null;
}

export async function findMediaByEntityId(entityId: string) {
  const result = await query(
    pool,
    `SELECT * FROM tg.tg_media
     WHERE entity_id = $1 AND moderation_status = 'approved'
     ORDER BY created_at DESC`,
    [entityId],
  );
  return result.rows;
}

// ════════════════════════════════════════════════════════════════════════════
//  PRODUCT QUERIES
// ════════════════════════════════════════════════════════════════════════════

export async function findProductsByVenueId(
  venueId: string,
  filters: {
    productType?: string;
    category?: string;
    limit: number;
    offset: number;
  },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const conditions: string[] = ['pr.venue_id = $1', 'pr.active = true'];
  const params: unknown[] = [venueId];
  let paramIndex = 2;

  if (filters.productType) {
    conditions.push(`pr.product_type = $${paramIndex}`);
    params.push(filters.productType);
    paramIndex++;
  }

  if (filters.category) {
    conditions.push(`pr.attributes->>'category' = $${paramIndex}`);
    params.push(filters.category);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM tg.tg_product pr
     ${whereClause}`,
    params,
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT pr.*, e.canonical_name, e.status,
            s.legal_name AS supplier_name, s.supplier_type
     FROM tg.tg_product pr
     JOIN tg.tg_entity e ON e.entity_id = pr.product_id
     LEFT JOIN tg.tg_supplier s ON s.supplier_id = pr.supplier_id
     ${whereClause}
     ORDER BY pr.base_price ASC NULLS LAST
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findProductById(productId: string) {
  const result = await query(
    pool,
    `SELECT pr.*, e.canonical_name, e.status, e.source_of_truth,
            s.supplier_id, s.supplier_type, s.legal_name AS supplier_name,
            s.support_email AS supplier_email, s.risk_tier AS supplier_risk_tier,
            v.venue_id, v.venue_type,
            pol.policy_type, pol.name AS policy_name, pol.rules AS policy_rules, pol.jurisdiction
     FROM tg.tg_product pr
     JOIN tg.tg_entity e ON e.entity_id = pr.product_id
     JOIN tg.tg_supplier s ON s.supplier_id = pr.supplier_id
     LEFT JOIN tg.tg_venue v ON v.venue_id = pr.venue_id
     LEFT JOIN tg.tg_policy pol ON pol.policy_id = pr.policy_id
     WHERE pr.product_id = $1`,
    [productId],
  );
  return result.rows[0] ?? null;
}

export async function findInventorySlots(
  productId: string,
  filters: {
    startDate: string;
    endDate: string;
    status?: string;
    limit: number;
    offset: number;
  },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const conditions: string[] = [
    'sl.product_id = $1',
    'sl.start_at >= $2',
    'sl.end_at <= $3',
  ];
  const params: unknown[] = [productId, filters.startDate, filters.endDate];
  let paramIndex = 4;

  if (filters.status) {
    conditions.push(`sl.availability_status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  } else {
    // Default to open slots
    conditions.push(`sl.availability_status = 'open'`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM tg.tg_inventory_slot sl
     ${whereClause}`,
    params,
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT sl.*
     FROM tg.tg_inventory_slot sl
     ${whereClause}
     ORDER BY sl.start_at ASC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

// ════════════════════════════════════════════════════════════════════════════
//  ENTITY & EDGE QUERIES
// ════════════════════════════════════════════════════════════════════════════

export async function findEntityById(id: string) {
  const result = await query(
    pool,
    `SELECT e.*,
       (SELECT json_agg(json_build_object(
          'alias_id', a.alias_id, 'alias', a.alias, 'lang', a.lang, 'source', a.source, 'confidence', a.confidence
        )) FROM tg.tg_entity_alias a WHERE a.entity_id = e.entity_id) AS aliases,
       (SELECT json_agg(json_build_object(
          'ref_id', r.ref_id, 'system', r.system, 'external_id', r.external_id, 'external_url', r.external_url
        )) FROM tg.tg_entity_external_ref r WHERE r.entity_id = e.entity_id) AS external_refs
     FROM tg.tg_entity e
     WHERE e.entity_id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function findEdgesByEntityId(
  entityId: string,
  filters: {
    direction?: 'outgoing' | 'incoming' | 'both';
    relType?: string;
    limit: number;
    offset: number;
  },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const direction = filters.direction ?? 'both';
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (direction === 'outgoing') {
    conditions.push(`r.from_entity_id = $${paramIndex}`);
    params.push(entityId);
    paramIndex++;
  } else if (direction === 'incoming') {
    conditions.push(`r.to_entity_id = $${paramIndex}`);
    params.push(entityId);
    paramIndex++;
  } else {
    conditions.push(`(r.from_entity_id = $${paramIndex} OR r.to_entity_id = $${paramIndex})`);
    params.push(entityId);
    paramIndex++;
  }

  if (filters.relType) {
    conditions.push(`r.rel_type = $${paramIndex}`);
    params.push(filters.relType);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM tg.tg_relationship r
     ${whereClause}`,
    params,
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT r.*,
            fe.canonical_name AS from_name, fe.entity_type AS from_type, fe.status AS from_status,
            te.canonical_name AS to_name, te.entity_type AS to_type, te.status AS to_status
     FROM tg.tg_relationship r
     JOIN tg.tg_entity fe ON fe.entity_id = r.from_entity_id
     JOIN tg.tg_entity te ON te.entity_id = r.to_entity_id
     ${whereClause}
     ORDER BY r.weight DESC, r.created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

// ════════════════════════════════════════════════════════════════════════════
//  SEMANTIC SEARCH
// ════════════════════════════════════════════════════════════════════════════

export async function semanticSearch(
  embedding: number[],
  filters: {
    entityType?: string;
    limit: number;
  },
) {
  const conditions: string[] = [];
  const params: unknown[] = [JSON.stringify(embedding)];
  let paramIndex = 2;

  if (filters.entityType) {
    conditions.push(`ent.entity_type = $${paramIndex}`);
    params.push(filters.entityType);
    paramIndex++;
  }

  // Only include active entities
  conditions.push(`ent.status = 'active'`);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    pool,
    `SELECT emb.entity_id, emb.embedding_type, emb.model,
            ent.entity_type, ent.canonical_name, ent.status,
            1 - (emb.vector <=> $1::vector) AS similarity
     FROM tg.tg_embedding emb
     JOIN tg.tg_entity ent ON ent.entity_id = emb.entity_id
     ${whereClause}
     ORDER BY emb.vector <=> $1::vector
     LIMIT $${paramIndex}`,
    [...params, filters.limit],
  );
  return result.rows;
}

// ════════════════════════════════════════════════════════════════════════════
//  SUPPLIER QUERIES
// ════════════════════════════════════════════════════════════════════════════

export async function findSupplierById(supplierId: string) {
  const result = await query(
    pool,
    `SELECT s.*, e.canonical_name, e.status, e.source_of_truth
     FROM tg.tg_supplier s
     JOIN tg.tg_entity e ON e.entity_id = s.supplier_id
     WHERE s.supplier_id = $1`,
    [supplierId],
  );
  return result.rows[0] ?? null;
}

export async function findVenuesBySupplierId(
  supplierId: string,
  filters: {
    limit: number;
    offset: number;
  },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const countResult = await query(
    pool,
    `SELECT COUNT(DISTINCT v.venue_id) AS total
     FROM tg.tg_venue v
     JOIN tg.tg_product pr ON pr.venue_id = v.venue_id
     WHERE pr.supplier_id = $1`,
    [supplierId],
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT DISTINCT v.*, e.canonical_name, e.status
     FROM tg.tg_venue v
     JOIN tg.tg_entity e ON e.entity_id = v.venue_id
     JOIN tg.tg_product pr ON pr.venue_id = v.venue_id
     WHERE pr.supplier_id = $1
     ORDER BY e.canonical_name ASC
     LIMIT $2 OFFSET $3`,
    [supplierId, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

// ════════════════════════════════════════════════════════════════════════════
//  REVIEW QUERIES (for enrichment)
// ════════════════════════════════════════════════════════════════════════════

export async function findReviewsByEntityId(
  entityId: string,
  filters: { limit: number; offset: number },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM tg.tg_review
     WHERE entity_id = $1 AND status = 'published'`,
    [entityId],
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT review_id, entity_id, user_id, rating, title, body, lang, visit_date, created_at
     FROM tg.tg_review
     WHERE entity_id = $1 AND status = 'published'
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [entityId, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

// ════════════════════════════════════════════════════════════════════════════
//  UGC: PHOTO / MEDIA QUERIES
// ════════════════════════════════════════════════════════════════════════════

export async function createMedia(data: {
  entityId: string;
  entityType: string;
  userId: string;
  mediaType: string;
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}) {
  const result = await query(
    pool,
    `INSERT INTO tg.tg_media
       (entity_id, entity_type, user_id, media_type, url, thumbnail_url,
        caption, width, height, size_bytes, mime_type, metadata, moderation_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
     RETURNING *`,
    [
      data.entityId, data.entityType, data.userId, data.mediaType,
      data.url, data.thumbnailUrl ?? null, data.caption ?? null,
      data.width ?? null, data.height ?? null, data.sizeBytes ?? null,
      data.mimeType ?? null, JSON.stringify(data.metadata ?? {}),
    ],
  );
  return result.rows[0];
}

export async function findMediaForEntity(
  entityId: string,
  filters: {
    status?: string;
    mediaType?: string;
    limit: number;
    offset: number;
  },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const conditions: string[] = ['entity_id = $1'];
  const params: unknown[] = [entityId];
  let paramIndex = 2;

  if (filters.status) {
    conditions.push(`moderation_status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  } else {
    conditions.push(`moderation_status = 'approved'`);
  }

  if (filters.mediaType) {
    conditions.push(`media_type = $${paramIndex}`);
    params.push(filters.mediaType);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM tg.tg_media ${whereClause}`,
    params,
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT * FROM tg.tg_media ${whereClause}
     ORDER BY helpful_count DESC NULLS LAST, created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findMediaById(mediaId: string) {
  const result = await query(
    pool,
    `SELECT * FROM tg.tg_media WHERE media_id = $1`,
    [mediaId],
  );
  return result.rows[0] ?? null;
}

export async function deleteMediaById(mediaId: string) {
  const result = await query(
    pool,
    `UPDATE tg.tg_media SET moderation_status = 'rejected', moderation_notes = 'Removed by user'
     WHERE media_id = $1 RETURNING *`,
    [mediaId],
  );
  return result.rows[0] ?? null;
}

export async function incrementMediaHelpful(mediaId: string) {
  const result = await query(
    pool,
    `UPDATE tg.tg_media SET helpful_count = COALESCE(helpful_count, 0) + 1
     WHERE media_id = $1 RETURNING *`,
    [mediaId],
  );
  return result.rows[0] ?? null;
}

export async function incrementMediaReport(mediaId: string) {
  const result = await query(
    pool,
    `UPDATE tg.tg_media SET report_count = COALESCE(report_count, 0) + 1
     WHERE media_id = $1 RETURNING *`,
    [mediaId],
  );
  return result.rows[0] ?? null;
}

// ════════════════════════════════════════════════════════════════════════════
//  UGC: Q&A QUERIES
// ════════════════════════════════════════════════════════════════════════════

export async function createQuestion(data: {
  entityId: string;
  entityType: string;
  userId: string;
  title: string;
  body?: string;
  tags?: string[];
}) {
  const result = await query(
    pool,
    `INSERT INTO tg.tg_question (entity_id, entity_type, user_id, title, body, tags)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [data.entityId, data.entityType, data.userId, data.title, data.body ?? null, data.tags ?? []],
  );
  return result.rows[0];
}

export async function findQuestionsForEntity(
  entityId: string,
  filters: {
    status?: string;
    limit: number;
    offset: number;
  },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const conditions: string[] = ['entity_id = $1'];
  const params: unknown[] = [entityId];
  let paramIndex = 2;

  if (filters.status) {
    conditions.push(`status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex++;
  } else {
    conditions.push(`status != 'removed'`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM tg.tg_question ${whereClause}`,
    params,
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT * FROM tg.tg_question ${whereClause}
     ORDER BY helpful_count DESC, created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findQuestionById(questionId: string) {
  const result = await query(
    pool,
    `SELECT * FROM tg.tg_question WHERE question_id = $1`,
    [questionId],
  );
  return result.rows[0] ?? null;
}

export async function findAnswersByQuestionId(
  questionId: string,
  filters: { limit: number; offset: number },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM tg.tg_answer
     WHERE question_id = $1 AND status = 'published'`,
    [questionId],
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT * FROM tg.tg_answer
     WHERE question_id = $1 AND status = 'published'
     ORDER BY is_accepted DESC, helpful_count DESC, created_at ASC
     LIMIT $2 OFFSET $3`,
    [questionId, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

export async function createAnswer(data: {
  questionId: string;
  userId: string;
  body: string;
  isOwnerResponse?: boolean;
}) {
  return transaction(pool, async (client: PoolClient) => {
    const answerResult = await client.query(
      `INSERT INTO tg.tg_answer (question_id, user_id, body, is_owner_response)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.questionId, data.userId, data.body, data.isOwnerResponse ?? false],
    );

    // Increment the question's answer_count
    await client.query(
      `UPDATE tg.tg_question SET answer_count = answer_count + 1, status = 'answered'
       WHERE question_id = $1`,
      [data.questionId],
    );

    return answerResult.rows[0];
  });
}

export async function incrementAnswerHelpful(answerId: string) {
  const result = await query(
    pool,
    `UPDATE tg.tg_answer SET helpful_count = helpful_count + 1
     WHERE answer_id = $1 AND status = 'published' RETURNING *`,
    [answerId],
  );
  return result.rows[0] ?? null;
}

export async function findAnswerById(answerId: string) {
  const result = await query(
    pool,
    `SELECT * FROM tg.tg_answer WHERE answer_id = $1`,
    [answerId],
  );
  return result.rows[0] ?? null;
}

export async function acceptAnswer(answerId: string, questionId: string) {
  return transaction(pool, async (client: PoolClient) => {
    // Unaccept any previously accepted answer for this question
    await client.query(
      `UPDATE tg.tg_answer SET is_accepted = FALSE
       WHERE question_id = $1 AND is_accepted = TRUE`,
      [questionId],
    );

    // Accept the specified answer
    const result = await client.query(
      `UPDATE tg.tg_answer SET is_accepted = TRUE
       WHERE answer_id = $1 AND question_id = $2 RETURNING *`,
      [answerId, questionId],
    );

    return result.rows[0] ?? null;
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  UGC: FORUM QUERIES
// ════════════════════════════════════════════════════════════════════════════

export async function findForums(
  filters: {
    category?: string;
    limit: number;
    offset: number;
  },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const conditions: string[] = ['is_active = TRUE'];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.category) {
    conditions.push(`category = $${paramIndex}`);
    params.push(filters.category);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM tg.tg_forum ${whereClause}`,
    params,
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT * FROM tg.tg_forum ${whereClause}
     ORDER BY sort_order ASC, subscriber_count DESC, name ASC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findForumById(forumId: string) {
  const result = await query(
    pool,
    `SELECT * FROM tg.tg_forum WHERE forum_id = $1 AND is_active = TRUE`,
    [forumId],
  );
  return result.rows[0] ?? null;
}

export async function findTopicsByForumId(
  forumId: string,
  filters: {
    sort?: 'recent' | 'popular' | 'unanswered';
    limit: number;
    offset: number;
  },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM tg.tg_forum_topic
     WHERE forum_id = $1 AND status = 'active'`,
    [forumId],
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  let orderClause: string;
  switch (filters.sort) {
    case 'popular':
      orderClause = 'is_pinned DESC, view_count DESC, reply_count DESC';
      break;
    case 'unanswered':
      orderClause = 'is_pinned DESC, reply_count ASC, created_at DESC';
      break;
    case 'recent':
    default:
      orderClause = 'is_pinned DESC, last_reply_at DESC NULLS LAST, created_at DESC';
      break;
  }

  const dataResult = await query(
    pool,
    `SELECT * FROM tg.tg_forum_topic
     WHERE forum_id = $1 AND status = 'active'
     ORDER BY ${orderClause}
     LIMIT $2 OFFSET $3`,
    [forumId, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findTopicById(topicId: string) {
  const result = await query(
    pool,
    `SELECT * FROM tg.tg_forum_topic WHERE topic_id = $1`,
    [topicId],
  );
  return result.rows[0] ?? null;
}

export async function createTopic(data: {
  forumId: string;
  userId: string;
  title: string;
  body: string;
  tags?: string[];
}) {
  return transaction(pool, async (client: PoolClient) => {
    const topicResult = await client.query(
      `INSERT INTO tg.tg_forum_topic (forum_id, user_id, title, body, tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.forumId, data.userId, data.title, data.body, data.tags ?? []],
    );

    // Increment the forum's post_count
    await client.query(
      `UPDATE tg.tg_forum SET post_count = post_count + 1
       WHERE forum_id = $1`,
      [data.forumId],
    );

    return topicResult.rows[0];
  });
}

export async function findRepliesByTopicId(
  topicId: string,
  filters: { limit: number; offset: number },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM tg.tg_forum_reply
     WHERE topic_id = $1 AND status = 'published'`,
    [topicId],
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT * FROM tg.tg_forum_reply
     WHERE topic_id = $1 AND status = 'published'
     ORDER BY created_at ASC
     LIMIT $2 OFFSET $3`,
    [topicId, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

export async function createReply(data: {
  topicId: string;
  userId: string;
  body: string;
  parentReplyId?: string;
}) {
  return transaction(pool, async (client: PoolClient) => {
    const replyResult = await client.query(
      `INSERT INTO tg.tg_forum_reply (topic_id, user_id, body, parent_reply_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.topicId, data.userId, data.body, data.parentReplyId ?? null],
    );

    // Update topic reply count and last_reply info
    await client.query(
      `UPDATE tg.tg_forum_topic
       SET reply_count = reply_count + 1,
           last_reply_at = NOW(),
           last_reply_user_id = $2
       WHERE topic_id = $1`,
      [data.topicId, data.userId],
    );

    // Increment forum post_count
    const topicResult = await client.query(
      `SELECT forum_id FROM tg.tg_forum_topic WHERE topic_id = $1`,
      [data.topicId],
    );
    if (topicResult.rows[0]) {
      await client.query(
        `UPDATE tg.tg_forum SET post_count = post_count + 1
         WHERE forum_id = $1`,
        [topicResult.rows[0].forum_id],
      );
    }

    return replyResult.rows[0];
  });
}

export async function subscribeToForum(data: {
  userId: string;
  forumId: string;
  notifyEmail?: boolean;
  notifyPush?: boolean;
}) {
  const result = await query(
    pool,
    `INSERT INTO tg.tg_forum_subscription (user_id, forum_id, notify_email, notify_push)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, forum_id) DO UPDATE
       SET notify_email = EXCLUDED.notify_email, notify_push = EXCLUDED.notify_push
     RETURNING *`,
    [data.userId, data.forumId, data.notifyEmail ?? true, data.notifyPush ?? true],
  );

  // Increment subscriber_count only on actual insert (not conflict update)
  // We use a simple approach: always set it based on actual count
  await query(
    pool,
    `UPDATE tg.tg_forum
     SET subscriber_count = (SELECT COUNT(*) FROM tg.tg_forum_subscription WHERE forum_id = $1)
     WHERE forum_id = $1`,
    [data.forumId],
  );

  return result.rows[0];
}

export async function unsubscribeFromForum(userId: string, forumId: string) {
  const result = await query(
    pool,
    `DELETE FROM tg.tg_forum_subscription
     WHERE user_id = $1 AND forum_id = $2
     RETURNING *`,
    [userId, forumId],
  );

  if (result.rowCount && result.rowCount > 0) {
    await query(
      pool,
      `UPDATE tg.tg_forum
       SET subscriber_count = (SELECT COUNT(*) FROM tg.tg_forum_subscription WHERE forum_id = $1)
       WHERE forum_id = $1`,
      [forumId],
    );
  }

  return result.rows[0] ?? null;
}

// ════════════════════════════════════════════════════════════════════════════
//  UGC: DESTINATION EXPERT QUERIES
// ════════════════════════════════════════════════════════════════════════════

export async function findExperts(
  filters: {
    placeId?: string;
    limit: number;
    offset: number;
  },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const conditions: string[] = ['de.is_active = TRUE'];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.placeId) {
    conditions.push(`de.place_id = $${paramIndex}`);
    params.push(filters.placeId);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM tg.tg_destination_expert de ${whereClause}`,
    params,
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT de.*, p.place_type, e.canonical_name AS place_name
     FROM tg.tg_destination_expert de
     LEFT JOIN tg.tg_place p ON p.place_id = de.place_id
     LEFT JOIN tg.tg_entity e ON e.entity_id = de.place_id
     ${whereClause}
     ORDER BY de.rating DESC, de.answers_count DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findExpertById(expertId: string) {
  const result = await query(
    pool,
    `SELECT de.*, p.place_type, e.canonical_name AS place_name
     FROM tg.tg_destination_expert de
     LEFT JOIN tg.tg_place p ON p.place_id = de.place_id
     LEFT JOIN tg.tg_entity e ON e.entity_id = de.place_id
     WHERE de.expert_id = $1`,
    [expertId],
  );
  return result.rows[0] ?? null;
}

// ════════════════════════════════════════════════════════════════════════════
//  MAP PIN QUERIES
// ════════════════════════════════════════════════════════════════════════════

export async function findMapPins(filters: {
  placeId?: string;
  category?: string;
  bounds?: { north: number; south: number; east: number; west: number };
  limit: number;
}): Promise<Record<string, unknown>[]> {
  const conditions: string[] = [`status = 'active'`];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.placeId) {
    conditions.push(`place_id = $${paramIndex}`);
    params.push(filters.placeId);
    paramIndex++;
  }

  if (filters.category) {
    conditions.push(`category = $${paramIndex}`);
    params.push(filters.category);
    paramIndex++;
  }

  if (filters.bounds) {
    conditions.push(
      `latitude BETWEEN $${paramIndex} AND $${paramIndex + 1} AND longitude BETWEEN $${paramIndex + 2} AND $${paramIndex + 3}`,
    );
    params.push(filters.bounds.south, filters.bounds.north, filters.bounds.west, filters.bounds.east);
    paramIndex += 4;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const result = await query(
    pool,
    `SELECT pin_id, entity_id, entity_type, place_id, name, category,
            latitude, longitude, bubble_rating, review_count, price_level,
            has_award, award_name, thumbnail_url, is_open_now, hours_today, metadata
     FROM tg.tg_map_pin
     ${whereClause}
     ORDER BY bubble_rating DESC NULLS LAST, review_count DESC
     LIMIT $${paramIndex}`,
    [...params, filters.limit],
  );

  return result.rows;
}

export async function findMapPinByEntity(entityId: string) {
  const result = await query(
    pool,
    `SELECT pin_id, entity_id, entity_type, place_id, name, category,
            latitude, longitude, bubble_rating, review_count, price_level,
            has_award, award_name, thumbnail_url, is_open_now, hours_today,
            metadata, created_at, updated_at
     FROM tg.tg_map_pin
     WHERE entity_id = $1 AND status = 'active'`,
    [entityId],
  );
  return result.rows[0] ?? null;
}

export async function findMapPinsByRadius(
  lat: number,
  lng: number,
  radiusKm: number,
  category?: string,
  limit: number = 50,
): Promise<Record<string, unknown>[]> {
  const conditions: string[] = [`status = 'active'`];
  const params: unknown[] = [lat, lng];
  let paramIndex = 3;

  if (category) {
    conditions.push(`category = $${paramIndex}`);
    params.push(category);
    paramIndex++;
  }

  // Haversine distance filter
  conditions.push(
    `(6371 * acos(
       cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2))
       + sin(radians($1)) * sin(radians(latitude))
     )) <= $${paramIndex}`,
  );
  params.push(radiusKm);
  paramIndex++;

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const result = await query(
    pool,
    `SELECT pin_id, entity_id, entity_type, place_id, name, category,
            latitude, longitude, bubble_rating, review_count, price_level,
            has_award, award_name, thumbnail_url, is_open_now, hours_today, metadata,
            (6371 * acos(
              cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2))
              + sin(radians($1)) * sin(radians(latitude))
            )) AS distance_km
     FROM tg.tg_map_pin
     ${whereClause}
     ORDER BY distance_km ASC
     LIMIT $${paramIndex}`,
    [...params, limit],
  );

  return result.rows;
}

export async function upsertMapPin(data: {
  entityId: string;
  entityType: string;
  placeId?: string;
  name: string;
  category?: string;
  latitude: number;
  longitude: number;
  bubbleRating?: number;
  reviewCount?: number;
  priceLevel?: number;
  hasAward?: boolean;
  awardName?: string;
  thumbnailUrl?: string;
  isOpenNow?: boolean;
  hoursToday?: string;
  metadata?: Record<string, unknown>;
}) {
  const result = await query(
    pool,
    `INSERT INTO tg.tg_map_pin
       (entity_id, entity_type, place_id, name, category, latitude, longitude,
        bubble_rating, review_count, price_level, has_award, award_name,
        thumbnail_url, is_open_now, hours_today, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     ON CONFLICT (entity_id) WHERE status = 'active'
     DO UPDATE SET
       entity_type = EXCLUDED.entity_type,
       place_id = EXCLUDED.place_id,
       name = EXCLUDED.name,
       category = EXCLUDED.category,
       latitude = EXCLUDED.latitude,
       longitude = EXCLUDED.longitude,
       bubble_rating = EXCLUDED.bubble_rating,
       review_count = EXCLUDED.review_count,
       price_level = EXCLUDED.price_level,
       has_award = EXCLUDED.has_award,
       award_name = EXCLUDED.award_name,
       thumbnail_url = EXCLUDED.thumbnail_url,
       is_open_now = EXCLUDED.is_open_now,
       hours_today = EXCLUDED.hours_today,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()
     RETURNING *`,
    [
      data.entityId, data.entityType, data.placeId ?? null,
      data.name, data.category ?? null, data.latitude, data.longitude,
      data.bubbleRating ?? null, data.reviewCount ?? 0,
      data.priceLevel ?? null, data.hasAward ?? false, data.awardName ?? null,
      data.thumbnailUrl ?? null, data.isOpenNow ?? null, data.hoursToday ?? null,
      JSON.stringify(data.metadata ?? {}),
    ],
  );
  return result.rows[0];
}

// ════════════════════════════════════════════════════════════════════════════
//  LOCATION SCORE QUERIES
// ════════════════════════════════════════════════════════════════════════════

export async function getLocationScore(entityId: string) {
  const result = await query(
    pool,
    `SELECT score_id, entity_id, entity_type, overall_score,
            walkability_score, transit_score, dining_score, attractions_score,
            nightlife_score, shopping_score, safety_score,
            nearby_restaurants, nearby_attractions, nearby_transit_stops,
            nearest_airport_km, nearest_beach_km, nearest_city_center_km,
            computed_at, created_at
     FROM tg.tg_location_score
     WHERE entity_id = $1`,
    [entityId],
  );
  return result.rows[0] ?? null;
}

export async function upsertLocationScore(data: {
  entityId: string;
  entityType: string;
  overallScore: number;
  walkabilityScore?: number;
  transitScore?: number;
  diningScore?: number;
  attractionsScore?: number;
  nightlifeScore?: number;
  shoppingScore?: number;
  safetyScore?: number;
  nearbyRestaurants?: number;
  nearbyAttractions?: number;
  nearbyTransitStops?: number;
  nearestAirportKm?: number;
  nearestBeachKm?: number;
  nearestCityCenterKm?: number;
}) {
  const result = await query(
    pool,
    `INSERT INTO tg.tg_location_score
       (entity_id, entity_type, overall_score,
        walkability_score, transit_score, dining_score, attractions_score,
        nightlife_score, shopping_score, safety_score,
        nearby_restaurants, nearby_attractions, nearby_transit_stops,
        nearest_airport_km, nearest_beach_km, nearest_city_center_km,
        computed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
     ON CONFLICT (entity_id)
     DO UPDATE SET
       entity_type = EXCLUDED.entity_type,
       overall_score = EXCLUDED.overall_score,
       walkability_score = EXCLUDED.walkability_score,
       transit_score = EXCLUDED.transit_score,
       dining_score = EXCLUDED.dining_score,
       attractions_score = EXCLUDED.attractions_score,
       nightlife_score = EXCLUDED.nightlife_score,
       shopping_score = EXCLUDED.shopping_score,
       safety_score = EXCLUDED.safety_score,
       nearby_restaurants = EXCLUDED.nearby_restaurants,
       nearby_attractions = EXCLUDED.nearby_attractions,
       nearby_transit_stops = EXCLUDED.nearby_transit_stops,
       nearest_airport_km = EXCLUDED.nearest_airport_km,
       nearest_beach_km = EXCLUDED.nearest_beach_km,
       nearest_city_center_km = EXCLUDED.nearest_city_center_km,
       computed_at = NOW()
     RETURNING *`,
    [
      data.entityId, data.entityType, data.overallScore,
      data.walkabilityScore ?? null, data.transitScore ?? null,
      data.diningScore ?? null, data.attractionsScore ?? null,
      data.nightlifeScore ?? null, data.shoppingScore ?? null,
      data.safetyScore ?? null,
      data.nearbyRestaurants ?? 0, data.nearbyAttractions ?? 0,
      data.nearbyTransitStops ?? 0,
      data.nearestAirportKm ?? null, data.nearestBeachKm ?? null,
      data.nearestCityCenterKm ?? null,
    ],
  );
  return result.rows[0];
}

// ════════════════════════════════════════════════════════════════════════════
//  WALKING TOUR QUERIES
// ════════════════════════════════════════════════════════════════════════════

export async function findWalkingTours(
  filters: {
    placeId?: string;
    tourType?: string;
    difficulty?: string;
    limit: number;
    offset: number;
  },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const conditions: string[] = [`status = 'active'`];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.placeId) {
    conditions.push(`place_id = $${paramIndex}`);
    params.push(filters.placeId);
    paramIndex++;
  }

  if (filters.tourType) {
    conditions.push(`tour_type = $${paramIndex}`);
    params.push(filters.tourType);
    paramIndex++;
  }

  if (filters.difficulty) {
    conditions.push(`difficulty = $${paramIndex}`);
    params.push(filters.difficulty);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM tg.tg_walking_tour ${whereClause}`,
    params,
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT tour_id, place_id, name, slug, description, tour_type,
            duration_minutes, distance_km, difficulty, hero_image_url,
            tags, review_count, average_rating, is_featured,
            created_at, updated_at
     FROM tg.tg_walking_tour
     ${whereClause}
     ORDER BY is_featured DESC, average_rating DESC NULLS LAST, review_count DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findWalkingTourBySlug(slug: string) {
  const result = await query(
    pool,
    `SELECT tour_id, place_id, name, slug, description, tour_type,
            duration_minutes, distance_km, difficulty, hero_image_url,
            tags, review_count, average_rating, is_featured, status,
            created_at, updated_at
     FROM tg.tg_walking_tour
     WHERE slug = $1 AND status = 'active'`,
    [slug],
  );
  return result.rows[0] ?? null;
}

export async function findTourStops(tourId: string): Promise<Record<string, unknown>[]> {
  const result = await query(
    pool,
    `SELECT stop_id, tour_id, position, name, description,
            latitude, longitude, entity_id, image_url, audio_url,
            duration_minutes, tips
     FROM tg.tg_walking_tour_stop
     WHERE tour_id = $1
     ORDER BY position ASC`,
    [tourId],
  );
  return result.rows;
}

// ════════════════════════════════════════════════════════════════════════════
//  FAVORITES MAP QUERIES
// ════════════════════════════════════════════════════════════════════════════

export async function findFavoritesMap(
  userId: string,
  filters: { limit: number; offset: number },
): Promise<{ data: Record<string, unknown>[]; total: number }> {
  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM tg.v_favorites_map WHERE user_id = $1`,
    [userId],
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT favorite_id, user_id, entity_id, entity_type,
            name, latitude, longitude, category, bubble_rating,
            thumbnail_url, created_at
     FROM tg.v_favorites_map
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, filters.limit, filters.offset],
  );

  return { data: dataResult.rows, total };
}

// ════════════════════════════════════════════════════════════════════════════
//  AI RECOMMENDATION QUERIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Gets personalized recommendations for a user by comparing their preference
 * vector against entity embeddings using cosine similarity. Excludes entities
 * the user has already interacted with (viewed, saved, booked, or reviewed).
 */
export async function getPersonalizedRecommendations(
  userId: string,
  types?: string[],
  limit = 20,
): Promise<Record<string, unknown>[]> {
  // First check if user has a preference vector
  const prefResult = await query(
    pool,
    `SELECT preference_vector
     FROM identity.identity_preference_vector
     WHERE user_id = $1`,
    [userId],
  );

  if (prefResult.rows.length === 0 || !prefResult.rows[0].preference_vector) {
    return [];
  }

  const prefVector = prefResult.rows[0].preference_vector as string;

  const conditions: string[] = [
    'ent.status = \'active\'',
  ];
  const params: unknown[] = [prefVector, userId];
  let paramIndex = 3;

  if (types && types.length > 0) {
    conditions.push(`ent.entity_type = ANY($${paramIndex})`);
    params.push(types);
    paramIndex++;
  }

  params.push(limit);

  const whereClause = conditions.join(' AND ');

  const sql = `
    SELECT
      ent.entity_id,
      ent.entity_type,
      ent.canonical_name,
      ent.status,
      ent.created_at,
      ent.updated_at,
      emb.embedding_type,
      1 - (emb.vector <=> $1::vector) AS similarity,
      p.place_type,
      p.lat,
      p.lng,
      p.country_code,
      p.popularity_score,
      v.venue_type,
      v.price_tier,
      v.rating_avg,
      v.rating_count,
      pr.title AS product_title,
      pr.description AS product_description,
      pr.base_price,
      pr.currency
    FROM tg.tg_embedding emb
    JOIN tg.tg_entity ent ON ent.entity_id = emb.entity_id
    LEFT JOIN tg.tg_place p ON p.place_id = ent.entity_id
    LEFT JOIN tg.tg_venue v ON v.venue_id = ent.entity_id
    LEFT JOIN tg.tg_product pr ON pr.product_id = ent.entity_id
    WHERE ${whereClause}
      AND ent.entity_id NOT IN (
        SELECT entity_id FROM tg.tg_recommendation_log
        WHERE user_id = $2 AND (clicked = true OR booked = true)
      )
    ORDER BY emb.vector <=> $1::vector
    LIMIT $${paramIndex}
  `;

  const result = await query(pool, sql, params);
  return result.rows;
}

/**
 * Gets trending entities weighted by popularity and recency. Uses a decay
 * function where recent activity (reviews, bookings) is weighted higher
 * than older activity.
 */
export async function getTrendingRecommendations(
  types?: string[],
  timeWindow = '7 days',
  limit = 20,
): Promise<Record<string, unknown>[]> {
  const conditions: string[] = ['e.status = \'active\''];
  const params: unknown[] = [timeWindow];
  let paramIndex = 2;

  if (types && types.length > 0) {
    conditions.push(`e.entity_type = ANY($${paramIndex})`);
    params.push(types);
    paramIndex++;
  }

  params.push(limit);

  const whereClause = conditions.join(' AND ');

  const sql = `
    SELECT
      e.entity_id,
      e.entity_type,
      e.canonical_name,
      e.status,
      e.created_at,
      e.updated_at,
      p.place_type,
      p.lat,
      p.lng,
      p.country_code,
      p.popularity_score,
      v.venue_type,
      v.price_tier,
      v.rating_avg,
      v.rating_count,
      pr.title AS product_title,
      pr.description AS product_description,
      pr.base_price,
      pr.currency,
      COALESCE(recent_reviews.review_count, 0) AS recent_review_count,
      COALESCE(total_reviews.review_count, 0) AS total_review_count,
      (
        COALESCE(p.popularity_score, 0) * 0.3
        + COALESCE(v.rating_avg, 0) / 5.0 * 0.3
        + COALESCE(recent_reviews.review_count, 0)::real
          / GREATEST(1.0, EXTRACT(EPOCH FROM (NOW() - e.updated_at)) / 86400.0) * 0.4
      ) AS trending_score
    FROM tg.tg_entity e
    LEFT JOIN tg.tg_place p ON p.place_id = e.entity_id
    LEFT JOIN tg.tg_venue v ON v.venue_id = e.entity_id
    LEFT JOIN tg.tg_product pr ON pr.product_id = e.entity_id
    LEFT JOIN (
      SELECT entity_id, COUNT(*)::int AS review_count
      FROM tg.tg_review
      WHERE status = 'published'
        AND created_at >= NOW() - $1::interval
      GROUP BY entity_id
    ) recent_reviews ON recent_reviews.entity_id = e.entity_id
    LEFT JOIN (
      SELECT entity_id, COUNT(*)::int AS review_count
      FROM tg.tg_review
      WHERE status = 'published'
      GROUP BY entity_id
    ) total_reviews ON total_reviews.entity_id = e.entity_id
    WHERE ${whereClause}
    ORDER BY trending_score DESC, e.updated_at DESC
    LIMIT $${paramIndex}
  `;

  const result = await query(pool, sql, params);
  return result.rows;
}

/**
 * Finds entities similar to a given entity using embedding cosine similarity.
 * First checks the precomputed similarity cache, then falls back to live
 * vector queries.
 */
export async function getSimilarEntities(
  entityId: string,
  limit = 10,
): Promise<Record<string, unknown>[]> {
  // Check similarity cache first
  const cachedResult = await query(
    pool,
    `SELECT
       sc.entity_b AS entity_id,
       sc.similarity,
       ent.entity_type,
       ent.canonical_name,
       ent.status,
       ent.created_at,
       ent.updated_at,
       p.place_type,
       p.lat,
       p.lng,
       p.country_code,
       p.popularity_score,
       v.venue_type,
       v.price_tier,
       v.rating_avg,
       v.rating_count,
       pr.title AS product_title,
       pr.description AS product_description,
       pr.base_price,
       pr.currency
     FROM tg.tg_similarity_cache sc
     JOIN tg.tg_entity ent ON ent.entity_id = sc.entity_b
     LEFT JOIN tg.tg_place p ON p.place_id = ent.entity_id
     LEFT JOIN tg.tg_venue v ON v.venue_id = ent.entity_id
     LEFT JOIN tg.tg_product pr ON pr.product_id = ent.entity_id
     WHERE sc.entity_a = $1
       AND ent.status = 'active'
     ORDER BY sc.similarity DESC
     LIMIT $2`,
    [entityId, limit],
  );

  if (cachedResult.rows.length > 0) {
    return cachedResult.rows;
  }

  // Fallback: live vector search
  const embeddingResult = await query(
    pool,
    `SELECT vector FROM tg.tg_embedding
     WHERE entity_id = $1
     ORDER BY
       CASE embedding_type
         WHEN 'name' THEN 1
         WHEN 'description' THEN 2
         ELSE 3
       END
     LIMIT 1`,
    [entityId],
  );

  if (embeddingResult.rows.length === 0) {
    return [];
  }

  const entityVector = embeddingResult.rows[0].vector as string;

  const result = await query(
    pool,
    `SELECT
       ent.entity_id,
       ent.entity_type,
       ent.canonical_name,
       ent.status,
       ent.created_at,
       ent.updated_at,
       emb.embedding_type,
       1 - (emb.vector <=> $1::vector) AS similarity,
       p.place_type,
       p.lat,
       p.lng,
       p.country_code,
       p.popularity_score,
       v.venue_type,
       v.price_tier,
       v.rating_avg,
       v.rating_count,
       pr.title AS product_title,
       pr.description AS product_description,
       pr.base_price,
       pr.currency
     FROM tg.tg_embedding emb
     JOIN tg.tg_entity ent ON ent.entity_id = emb.entity_id
     LEFT JOIN tg.tg_place p ON p.place_id = ent.entity_id
     LEFT JOIN tg.tg_venue v ON v.venue_id = ent.entity_id
     LEFT JOIN tg.tg_product pr ON pr.product_id = ent.entity_id
     WHERE ent.status = 'active'
       AND ent.entity_id != $2
     ORDER BY emb.vector <=> $1::vector
     LIMIT $3`,
    [entityVector, entityId, limit],
  );

  return result.rows;
}

/**
 * Updates a user's preference vector based on a new interaction with an entity.
 * Uses a weighted running average: new_pref = (old * count + entity_emb * weight) / (count + weight)
 * Interaction weights: view=1, save=2, review=3, book=5
 */
export async function updateUserPreferences(
  userId: string,
  entityId: string,
  interactionType: 'view' | 'save' | 'book' | 'review',
): Promise<{ interaction_count: number; updated: boolean }> {
  const weight = INTERACTION_WEIGHTS[interactionType] ?? 1;

  // Get the entity's embedding
  const embResult = await query(
    pool,
    `SELECT vector FROM tg.tg_embedding
     WHERE entity_id = $1
     ORDER BY
       CASE embedding_type
         WHEN 'name' THEN 1
         WHEN 'description' THEN 2
         ELSE 3
       END
     LIMIT 1`,
    [entityId],
  );

  if (embResult.rows.length === 0) {
    // Entity has no embedding; generate one from its name
    const entityResult = await query(
      pool,
      `SELECT canonical_name, entity_type FROM tg.tg_entity WHERE entity_id = $1`,
      [entityId],
    );

    if (entityResult.rows.length === 0) {
      return { interaction_count: 0, updated: false };
    }

    const entity = entityResult.rows[0] as Record<string, unknown>;
    const text = `${entity.entity_type}: ${entity.canonical_name ?? ''}`;
    const mockEmb = generateMockEmbedding(text.toLowerCase().trim());

    // Store the generated embedding
    await query(
      pool,
      `INSERT INTO tg.tg_embedding (entity_id, embedding_type, vector, model)
       VALUES ($1, 'name', $2::vector, 'mock')`,
      [entityId, JSON.stringify(mockEmb)],
    );
  }

  // Check if user already has a preference vector
  const existingPref = await query(
    pool,
    `SELECT id, preference_vector, interaction_count
     FROM identity.identity_preference_vector
     WHERE user_id = $1`,
    [userId],
  );

  if (existingPref.rows.length === 0) {
    // No existing preference vector - initialize with entity embedding
    // scaled by the interaction weight
    const entityEmb = await query(
      pool,
      `SELECT vector FROM tg.tg_embedding
       WHERE entity_id = $1
       ORDER BY CASE embedding_type WHEN 'name' THEN 1 WHEN 'description' THEN 2 ELSE 3 END
       LIMIT 1`,
      [entityId],
    );

    if (entityEmb.rows.length === 0) {
      return { interaction_count: 0, updated: false };
    }

    await query(
      pool,
      `INSERT INTO identity.identity_preference_vector
         (user_id, preference_vector, interaction_count, last_computed_at)
       VALUES ($1, $2::vector, $3, NOW())`,
      [userId, entityEmb.rows[0].vector, weight],
    );

    return { interaction_count: weight, updated: true };
  }

  // Existing preference vector - update with weighted running average
  // new_pref = (old_pref * count + entity_embedding * weight) / (count + weight)
  const currentCount = existingPref.rows[0].interaction_count as number;
  const newCount = currentCount + weight;

  await query(
    pool,
    `UPDATE identity.identity_preference_vector
     SET preference_vector = (
       (preference_vector * $3 +
        (SELECT vector FROM tg.tg_embedding
         WHERE entity_id = $2
         ORDER BY CASE embedding_type WHEN 'name' THEN 1 WHEN 'description' THEN 2 ELSE 3 END
         LIMIT 1) * $4
       ) / $5
     )::vector(1536),
     interaction_count = $5,
     last_computed_at = NOW()
     WHERE user_id = $1`,
    [userId, entityId, currentCount, weight, newCount],
  );

  return { interaction_count: newCount, updated: true };
}

/**
 * Logs a recommendation that was shown to a user, for feedback loop tracking.
 */
export async function logRecommendation(
  userId: string,
  entityId: string,
  score: number,
  reason: string,
  algorithm: string,
): Promise<{ id: string }> {
  const result = await query(
    pool,
    `INSERT INTO tg.tg_recommendation_log
       (user_id, entity_id, score, reason, algorithm)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [userId, entityId, score, reason, algorithm],
  );
  return { id: result.rows[0].id as string };
}

/**
 * Updates a recommendation log entry with user feedback (clicked/booked).
 */
export async function updateRecommendationFeedback(
  recommendationId: string,
  feedback: { clicked?: boolean; booked?: boolean },
): Promise<Record<string, unknown> | null> {
  const updates: string[] = [];
  const params: unknown[] = [recommendationId];
  let paramIndex = 2;

  if (feedback.clicked !== undefined) {
    updates.push(`clicked = $${paramIndex}`);
    params.push(feedback.clicked);
    paramIndex++;
  }

  if (feedback.booked !== undefined) {
    updates.push(`booked = $${paramIndex}`);
    params.push(feedback.booked);
    paramIndex++;
  }

  if (updates.length === 0) {
    return null;
  }

  const result = await query(
    pool,
    `UPDATE tg.tg_recommendation_log
     SET ${updates.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params,
  );

  return result.rows[0] ?? null;
}
