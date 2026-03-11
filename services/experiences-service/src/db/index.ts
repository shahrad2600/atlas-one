import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ── Experience Product Queries ────────────────────────────────────

export async function findExperienceById(id: string) {
  const result = await query(
    pool,
    `SELECT p.*,
            tp.title, tp.description, tp.currency, tp.base_price, tp.attributes,
            o.company_name AS operator_name, o.logo_url AS operator_logo,
            o.verified AS operator_verified, o.quality_score AS operator_quality_score,
            rs.avg_rating, rs.review_count, rs.rating_distribution, rs.top_mentions
     FROM exp.exp_product p
     JOIN tg.tg_product tp ON tp.product_id = p.product_id
     JOIN exp.exp_operator o ON o.operator_id = p.operator_id
     LEFT JOIN exp.exp_review_summary rs ON rs.exp_product_id = p.exp_product_id
     WHERE p.exp_product_id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function findExperiencesByLocation(placeId: string) {
  const result = await query(
    pool,
    `SELECT p.*,
            tp.title, tp.description, tp.currency, tp.base_price
     FROM exp.exp_product p
     JOIN tg.tg_product tp ON tp.product_id = p.product_id
     JOIN exp.exp_operator o ON o.operator_id = p.operator_id
     JOIN tg.tg_supplier s ON s.supplier_id = o.supplier_id
     JOIN tg.tg_product tp2 ON tp2.product_id = p.product_id
     JOIN tg.tg_venue v ON v.venue_id = tp2.venue_id
     WHERE v.place_id = $1 AND p.active = TRUE`,
    [placeId],
  );
  return result.rows;
}

// ── Search Experiences ─────────────────────────────────────────────

export interface SearchExperiencesParams {
  location?: string;
  placeId?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  date?: string;
  minDuration?: number;
  maxDuration?: number;
  difficulty?: string;
  minRating?: number;
  limit: number;
  offset: number;
}

export async function searchExperiences(params: SearchExperiencesParams) {
  const conditions: string[] = ['p.active = TRUE'];
  const values: unknown[] = [];
  let idx = 1;

  if (params.placeId) {
    conditions.push(`v.place_id = $${idx}`);
    values.push(params.placeId);
    idx++;
  }

  if (params.location) {
    conditions.push(`(a.city ILIKE $${idx} OR a.region ILIKE $${idx} OR te.canonical_name ILIKE $${idx})`);
    values.push(`%${params.location}%`);
    idx++;
  }

  if (params.category) {
    conditions.push(`tp.attributes->>'category' ILIKE $${idx}`);
    values.push(`%${params.category}%`);
    idx++;
  }

  if (params.minPrice !== undefined) {
    conditions.push(`tp.base_price >= $${idx}`);
    values.push(params.minPrice);
    idx++;
  }

  if (params.maxPrice !== undefined) {
    conditions.push(`tp.base_price <= $${idx}`);
    values.push(params.maxPrice);
    idx++;
  }

  if (params.difficulty) {
    conditions.push(`p.difficulty_level = $${idx}`);
    values.push(params.difficulty);
    idx++;
  }

  if (params.minDuration !== undefined) {
    conditions.push(`p.duration_min >= $${idx}`);
    values.push(params.minDuration);
    idx++;
  }

  if (params.maxDuration !== undefined) {
    conditions.push(`COALESCE(p.duration_max_min, p.duration_min) <= $${idx}`);
    values.push(params.maxDuration);
    idx++;
  }

  if (params.minRating !== undefined) {
    conditions.push(`rs.avg_rating >= $${idx}`);
    values.push(params.minRating);
    idx++;
  }

  if (params.date) {
    conditions.push(`EXISTS (
      SELECT 1 FROM exp.exp_departure d
      JOIN tg.tg_inventory_slot sl ON sl.slot_id = d.slot_id
      WHERE d.exp_product_id = p.exp_product_id
        AND sl.start_at::date = $${idx}::date
        AND sl.availability_status = 'open'
        AND sl.capacity_available > 0
    )`);
    values.push(params.date);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const fromClause = `
    FROM exp.exp_product p
    JOIN tg.tg_product tp ON tp.product_id = p.product_id
    JOIN exp.exp_operator o ON o.operator_id = p.operator_id
    LEFT JOIN tg.tg_venue v ON v.venue_id = tp.venue_id
    LEFT JOIN tg.tg_address a ON a.address_id = v.address_id
    LEFT JOIN tg.tg_entity te ON te.entity_id = v.place_id
    LEFT JOIN exp.exp_review_summary rs ON rs.exp_product_id = p.exp_product_id
  `;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total ${fromClause} ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT p.exp_product_id, p.product_id, p.operator_id,
            p.duration_min, p.duration_max_min, p.max_group_size,
            p.min_participants, p.difficulty_level, p.languages,
            p.instant_confirmation, p.mobile_ticket,
            tp.title, tp.description, tp.currency, tp.base_price,
            tp.attributes,
            o.company_name AS operator_name, o.verified AS operator_verified,
            rs.avg_rating, rs.review_count,
            a.city, a.region, a.country_code, a.lat, a.lng
     ${fromClause}
     ${whereClause}
     ORDER BY rs.avg_rating DESC NULLS LAST, rs.review_count DESC NULLS LAST
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

// ── Departure Queries ──────────────────────────────────────────────

export async function findDepartures(productId: string, date: string) {
  const result = await query(
    pool,
    `SELECT d.*,
            sl.start_at, sl.end_at, sl.capacity_total, sl.capacity_available,
            sl.availability_status, sl.price_override
     FROM exp.exp_departure d
     JOIN tg.tg_inventory_slot sl ON sl.slot_id = d.slot_id
     WHERE d.exp_product_id = $1
       AND sl.start_at::date = $2::date
       AND sl.availability_status = 'open'
       AND sl.capacity_available > 0
     ORDER BY sl.start_at`,
    [productId, date],
  );
  return result.rows;
}

export interface FindDeparturesParams {
  productId: string;
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  offset: number;
}

export async function findDeparturesPaginated(params: FindDeparturesParams) {
  const conditions: string[] = [
    `d.exp_product_id = $1`,
    `sl.availability_status = 'open'`,
    `sl.capacity_available > 0`,
  ];
  const values: unknown[] = [params.productId];
  let idx = 2;

  if (params.dateFrom) {
    conditions.push(`sl.start_at::date >= $${idx}::date`);
    values.push(params.dateFrom);
    idx++;
  }

  if (params.dateTo) {
    conditions.push(`sl.start_at::date <= $${idx}::date`);
    values.push(params.dateTo);
    idx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM exp.exp_departure d
     JOIN tg.tg_inventory_slot sl ON sl.slot_id = d.slot_id
     ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT d.departure_id, d.exp_product_id, d.slot_id,
            d.language, d.guide_type, d.guide_name,
            d.meeting_notes, d.special_instructions,
            sl.start_at, sl.end_at, sl.capacity_total, sl.capacity_available,
            sl.price_override
     FROM exp.exp_departure d
     JOIN tg.tg_inventory_slot sl ON sl.slot_id = d.slot_id
     ${whereClause}
     ORDER BY sl.start_at
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findDepartureById(departureId: string) {
  const result = await query(
    pool,
    `SELECT d.*,
            sl.start_at, sl.end_at, sl.capacity_total, sl.capacity_available,
            sl.availability_status, sl.price_override
     FROM exp.exp_departure d
     JOIN tg.tg_inventory_slot sl ON sl.slot_id = d.slot_id
     WHERE d.departure_id = $1`,
    [departureId],
  );
  return result.rows[0] ?? null;
}

// ── Category Queries ───────────────────────────────────────────────

export async function findDistinctCategories() {
  const result = await query(
    pool,
    `SELECT DISTINCT tp.attributes->>'category' AS category,
            COUNT(*)::int AS count
     FROM exp.exp_product p
     JOIN tg.tg_product tp ON tp.product_id = p.product_id
     WHERE p.active = TRUE
       AND tp.attributes->>'category' IS NOT NULL
     GROUP BY tp.attributes->>'category'
     ORDER BY count DESC`,
    [],
  );
  return result.rows;
}

// ── Option Queries ─────────────────────────────────────────────────

export async function findOptionsByProduct(productId: string) {
  const result = await query(
    pool,
    `SELECT * FROM exp.exp_option
     WHERE exp_product_id = $1 AND active = TRUE
     ORDER BY price`,
    [productId],
  );
  return result.rows;
}

// ── Booking Queries (commerce.commerce_reservation) ────────────────

export interface CreateBookingParams {
  userId: string;
  experienceId: string;
  departureId: string;
  participants: number;
  contactEmail?: string;
  contactPhone?: string;
  tripId?: string;
}

export async function createBooking(params: CreateBookingParams) {
  return transaction(pool, async (client: PoolClient) => {
    // Lock and verify the departure slot is still available
    const depResult = await client.query(
      `SELECT d.departure_id, d.exp_product_id, d.slot_id,
              sl.capacity_available, sl.start_at, sl.end_at,
              sl.availability_status, sl.price_override
       FROM exp.exp_departure d
       JOIN tg.tg_inventory_slot sl ON sl.slot_id = d.slot_id
       WHERE d.departure_id = $1
       FOR UPDATE OF sl`,
      [params.departureId],
    );

    if (depResult.rows.length === 0) {
      throw Object.assign(new Error('Departure not found'), { statusCode: 404 });
    }

    const departure = depResult.rows[0];

    if (departure.availability_status !== 'open') {
      throw Object.assign(new Error('Departure is no longer available'), { statusCode: 409 });
    }

    if (departure.capacity_available < params.participants) {
      throw Object.assign(
        new Error(`Only ${departure.capacity_available} seats available, requested ${params.participants}`),
        { statusCode: 409 },
      );
    }

    // Verify experience matches the departure
    if (departure.exp_product_id !== params.experienceId) {
      throw Object.assign(
        new Error('Departure does not belong to the specified experience'),
        { statusCode: 400 },
      );
    }

    // Get experience product info for the reservation record
    const expResult = await client.query(
      `SELECT p.exp_product_id, p.product_id, p.operator_id,
              o.supplier_id,
              tp.base_price, tp.currency
       FROM exp.exp_product p
       JOIN exp.exp_operator o ON o.operator_id = p.operator_id
       JOIN tg.tg_product tp ON tp.product_id = p.product_id
       WHERE p.exp_product_id = $1`,
      [params.experienceId],
    );

    if (expResult.rows.length === 0) {
      throw Object.assign(new Error('Experience not found'), { statusCode: 404 });
    }

    const experience = expResult.rows[0];

    // Calculate price (use slot override or base price times participants)
    const unitPrice = departure.price_override ?? experience.base_price;
    const totalPrice = unitPrice ? parseFloat(unitPrice) * params.participants : null;

    // Create the reservation in commerce schema
    const resResult = await client.query(
      `INSERT INTO commerce.commerce_reservation
         (user_id, trip_id, reservation_type, supplier_id,
          product_id, slot_id, start_at, end_at,
          party_size, status, price_paid, currency)
       VALUES ($1, $2, 'experience', $3, $4, $5, $6, $7, $8, 'confirmed', $9, $10)
       RETURNING *`,
      [
        params.userId,
        params.tripId ?? null,
        experience.supplier_id,
        experience.product_id,
        departure.slot_id,
        departure.start_at,
        departure.end_at,
        params.participants,
        totalPrice,
        experience.currency ?? 'USD',
      ],
    );

    // Decrement available seats on the inventory slot
    const newAvailable = departure.capacity_available - params.participants;
    const newStatus = newAvailable <= 0 ? 'sold_out' : 'open';

    await client.query(
      `UPDATE tg.tg_inventory_slot
       SET capacity_available = $2,
           availability_status = $3
       WHERE slot_id = $1`,
      [departure.slot_id, Math.max(0, newAvailable), newStatus],
    );

    return resResult.rows[0];
  });
}

export async function findBookingsByUser(
  userId: string,
  options: { status?: string; upcoming?: boolean; limit: number; offset: number },
) {
  const conditions = [`cr.user_id = $1`, `cr.reservation_type = 'experience'`];
  const values: unknown[] = [userId];
  let idx = 2;

  if (options.status) {
    conditions.push(`cr.status = $${idx}`);
    values.push(options.status);
    idx++;
  }

  if (options.upcoming) {
    conditions.push(`cr.start_at >= NOW()`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM commerce.commerce_reservation cr
     ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT cr.*,
            tp.title AS experience_title, tp.description AS experience_description,
            o.company_name AS operator_name
     FROM commerce.commerce_reservation cr
     LEFT JOIN tg.tg_product tp ON tp.product_id = cr.product_id
     LEFT JOIN exp.exp_product ep ON ep.product_id = cr.product_id
     LEFT JOIN exp.exp_operator o ON o.operator_id = ep.operator_id
     ${whereClause}
     ORDER BY cr.start_at ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, options.limit, options.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findBookingById(bookingId: string) {
  const result = await query(
    pool,
    `SELECT cr.*,
            tp.title AS experience_title, tp.description AS experience_description,
            tp.attributes AS experience_attributes,
            ep.duration_min, ep.duration_max_min, ep.difficulty_level,
            ep.languages, ep.included, ep.excluded, ep.highlights,
            ep.instant_confirmation, ep.mobile_ticket,
            o.company_name AS operator_name, o.logo_url AS operator_logo,
            o.verified AS operator_verified
     FROM commerce.commerce_reservation cr
     LEFT JOIN tg.tg_product tp ON tp.product_id = cr.product_id
     LEFT JOIN exp.exp_product ep ON ep.product_id = cr.product_id
     LEFT JOIN exp.exp_operator o ON o.operator_id = ep.operator_id
     WHERE cr.reservation_id = $1 AND cr.reservation_type = 'experience'`,
    [bookingId],
  );
  return result.rows[0] ?? null;
}

export async function cancelBooking(reservationId: string, userId: string) {
  return transaction(pool, async (client: PoolClient) => {
    // Lock and verify ownership
    const existing = await client.query(
      `SELECT cr.*, sl.capacity_available, sl.capacity_total
       FROM commerce.commerce_reservation cr
       LEFT JOIN tg.tg_inventory_slot sl ON sl.slot_id = cr.slot_id
       WHERE cr.reservation_id = $1
         AND cr.user_id = $2
         AND cr.reservation_type = 'experience'
       FOR UPDATE OF cr`,
      [reservationId, userId],
    );

    if (existing.rows.length === 0) {
      throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    }

    const booking = existing.rows[0];

    if (booking.status === 'cancelled') {
      throw Object.assign(new Error('Booking is already cancelled'), { statusCode: 409 });
    }

    // Cancel the reservation
    await client.query(
      `UPDATE commerce.commerce_reservation
       SET status = 'cancelled'
       WHERE reservation_id = $1`,
      [reservationId],
    );

    // Release seats back to the inventory slot
    if (booking.slot_id && booking.party_size) {
      await client.query(
        `UPDATE tg.tg_inventory_slot
         SET capacity_available = LEAST(capacity_total, capacity_available + $2),
             availability_status = 'open'
         WHERE slot_id = $1`,
        [booking.slot_id, booking.party_size],
      );
    }
  });
}

export { transaction, getPool };
