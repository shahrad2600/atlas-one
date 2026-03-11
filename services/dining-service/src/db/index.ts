import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ── Restaurant Queries ─────────────────────────────────────────

export async function findRestaurantById(id: string) {
  const result = await query(
    pool,
    `SELECT r.*, e.canonical_name AS name,
            v.phone, v.website, v.price_tier, v.rating_avg, v.rating_count,
            v.hours, v.amenities,
            a.line1, a.line2, a.city, a.region, a.postal_code, a.country_code,
            a.lat, a.lng
     FROM dining.dining_restaurant r
     JOIN tg.tg_venue v ON v.venue_id = r.venue_id
     JOIN tg.tg_entity e ON e.entity_id = v.venue_id
     LEFT JOIN tg.tg_address a ON a.address_id = v.address_id
     WHERE r.restaurant_id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export interface SearchRestaurantsParams {
  location?: string;
  cuisine?: string;
  priceRange?: number;
  date?: string;
  partySize?: number;
  limit: number;
  offset: number;
}

export async function searchRestaurants(params: SearchRestaurantsParams) {
  const conditions: string[] = ['r.reservation_enabled = TRUE'];
  const values: unknown[] = [];
  let idx = 1;

  if (params.location) {
    conditions.push(`(a.city ILIKE $${idx} OR a.region ILIKE $${idx})`);
    values.push(`%${params.location}%`);
    idx++;
  }

  if (params.cuisine) {
    conditions.push(`r.settings->>'cuisine' ILIKE $${idx}`);
    values.push(`%${params.cuisine}%`);
    idx++;
  }

  if (params.priceRange) {
    conditions.push(`v.price_tier = $${idx}`);
    values.push(params.priceRange);
    idx++;
  }

  if (params.partySize) {
    conditions.push(`r.max_party_size >= $${idx}`);
    values.push(params.partySize);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM dining.dining_restaurant r
     JOIN tg.tg_venue v ON v.venue_id = r.venue_id
     JOIN tg.tg_entity e ON e.entity_id = v.venue_id
     LEFT JOIN tg.tg_address a ON a.address_id = v.address_id
     ${whereClause}`,
    values,
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT r.restaurant_id, r.venue_id, r.max_party_size, r.default_turn_time_min, r.settings,
            e.canonical_name AS name,
            v.phone, v.website, v.price_tier, v.rating_avg, v.rating_count, v.hours,
            a.city, a.region, a.country_code, a.lat, a.lng
     FROM dining.dining_restaurant r
     JOIN tg.tg_venue v ON v.venue_id = r.venue_id
     JOIN tg.tg_entity e ON e.entity_id = v.venue_id
     LEFT JOIN tg.tg_address a ON a.address_id = v.address_id
     ${whereClause}
     ORDER BY v.rating_avg DESC NULLS LAST
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

// ── Slot Queries ───────────────────────────────────────────────

export async function findSlotsByRestaurant(restaurantId: string, date: string) {
  const result = await query(
    pool,
    `SELECT s.*
     FROM dining.dining_slot s
     WHERE s.restaurant_id = $1
       AND s.start_at::date = $2::date
       AND s.availability_status = 'open'
     ORDER BY s.start_at`,
    [restaurantId, date],
  );
  return result.rows;
}

export async function findAvailableSlots(
  restaurantId: string,
  date: string,
  partySize: number,
  timePreference?: string,
) {
  const conditions = [
    `s.restaurant_id = $1`,
    `s.start_at::date = $2::date`,
    `s.availability_status = 'open'`,
    `s.party_size_min <= $3`,
    `s.party_size_max >= $3`,
  ];
  const values: unknown[] = [restaurantId, date, partySize];

  if (timePreference) {
    conditions.push(`s.start_at::time >= $4::time`);
    values.push(timePreference);
  }

  const result = await query(
    pool,
    `SELECT s.dining_slot_id, s.restaurant_id, s.shift_id, s.start_at,
            s.duration_min, s.party_size_min, s.party_size_max,
            s.availability_status, s.tables_available, s.price_tier
     FROM dining.dining_slot s
     WHERE ${conditions.join(' AND ')}
     ORDER BY s.start_at`,
    values,
  );
  return result.rows;
}

export async function findSlotById(slotId: string) {
  const result = await query(
    pool,
    `SELECT * FROM dining.dining_slot WHERE dining_slot_id = $1`,
    [slotId],
  );
  return result.rows[0] ?? null;
}

export async function updateSlotStatus(
  client: PoolClient,
  slotId: string,
  status: string,
) {
  const result = await client.query(
    `UPDATE dining.dining_slot
     SET availability_status = $2
     WHERE dining_slot_id = $1
     RETURNING *`,
    [slotId, status],
  );
  return result.rows[0] ?? null;
}

// ── Reservation Queries (commerce.commerce_reservation) ────────

export interface CreateReservationParams {
  userId: string;
  restaurantId: string;
  slotId: string;
  partySize: number;
  startAt: string;
  specialRequests?: string;
}

export async function createReservation(params: CreateReservationParams) {
  return transaction(pool, async (client) => {
    // Lock and verify slot is still available
    const slotResult = await client.query(
      `SELECT * FROM dining.dining_slot
       WHERE dining_slot_id = $1 AND availability_status = 'open'
       FOR UPDATE`,
      [params.slotId],
    );

    if (slotResult.rows.length === 0) {
      throw Object.assign(new Error('Slot is no longer available'), { statusCode: 409 });
    }

    const slot = slotResult.rows[0];

    // Get restaurant for venue_id/supplier_id
    const restResult = await client.query(
      `SELECT restaurant_id, venue_id, supplier_id FROM dining.dining_restaurant WHERE restaurant_id = $1`,
      [params.restaurantId],
    );
    const restaurant = restResult.rows[0];
    if (!restaurant) {
      throw Object.assign(new Error('Restaurant not found'), { statusCode: 404 });
    }

    // Create the reservation in commerce schema
    const resResult = await client.query(
      `INSERT INTO commerce.commerce_reservation
         (user_id, reservation_type, supplier_id, venue_id, slot_id,
          start_at, end_at, party_size, status)
       VALUES ($1, 'dining', $2, $3, $4, $5, $5::timestamptz + ($6 || ' minutes')::interval, $7, 'confirmed')
       RETURNING *`,
      [
        params.userId,
        restaurant.supplier_id,
        restaurant.venue_id,
        params.slotId,
        slot.start_at,
        String(slot.duration_min),
        params.partySize,
      ],
    );

    // Mark the slot as sold_out (simplified; a real system would track covers)
    await client.query(
      `UPDATE dining.dining_slot SET availability_status = 'hold' WHERE dining_slot_id = $1`,
      [params.slotId],
    );

    return resResult.rows[0];
  });
}

export async function findReservationsByUser(
  userId: string,
  options: { status?: string; upcoming?: boolean; limit: number; offset: number },
) {
  const conditions = [`cr.user_id = $1`, `cr.reservation_type = 'dining'`];
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

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM commerce.commerce_reservation cr
     WHERE ${conditions.join(' AND ')}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT cr.*,
            e.canonical_name AS restaurant_name,
            a.city, a.region
     FROM commerce.commerce_reservation cr
     LEFT JOIN tg.tg_venue v ON v.venue_id = cr.venue_id
     LEFT JOIN tg.tg_entity e ON e.entity_id = v.venue_id
     LEFT JOIN tg.tg_address a ON a.address_id = v.address_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY cr.start_at ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, options.limit, options.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findReservationById(reservationId: string) {
  const result = await query(
    pool,
    `SELECT cr.*,
            e.canonical_name AS restaurant_name,
            v.phone AS restaurant_phone, v.price_tier,
            a.line1, a.line2, a.city, a.region, a.postal_code, a.country_code
     FROM commerce.commerce_reservation cr
     LEFT JOIN tg.tg_venue v ON v.venue_id = cr.venue_id
     LEFT JOIN tg.tg_entity e ON e.entity_id = v.venue_id
     LEFT JOIN tg.tg_address a ON a.address_id = v.address_id
     WHERE cr.reservation_id = $1 AND cr.reservation_type = 'dining'`,
    [reservationId],
  );
  return result.rows[0] ?? null;
}

export async function updateReservation(
  reservationId: string,
  userId: string,
  updates: { partySize?: number; slotId?: string; startAt?: string },
) {
  return transaction(pool, async (client) => {
    // Lock the existing reservation and verify ownership
    const existing = await client.query(
      `SELECT * FROM commerce.commerce_reservation
       WHERE reservation_id = $1 AND user_id = $2 AND reservation_type = 'dining'
       FOR UPDATE`,
      [reservationId, userId],
    );

    if (existing.rows.length === 0) {
      throw Object.assign(new Error('Reservation not found'), { statusCode: 404 });
    }

    const current = existing.rows[0];

    // If changing slot, verify new slot availability and release old slot
    if (updates.slotId && updates.slotId !== current.slot_id) {
      const newSlot = await client.query(
        `SELECT * FROM dining.dining_slot
         WHERE dining_slot_id = $1 AND availability_status = 'open'
         FOR UPDATE`,
        [updates.slotId],
      );

      if (newSlot.rows.length === 0) {
        throw Object.assign(new Error('New slot is not available'), { statusCode: 409 });
      }

      // Release old slot
      if (current.slot_id) {
        await client.query(
          `UPDATE dining.dining_slot SET availability_status = 'open' WHERE dining_slot_id = $1`,
          [current.slot_id],
        );
      }

      // Hold new slot
      await client.query(
        `UPDATE dining.dining_slot SET availability_status = 'hold' WHERE dining_slot_id = $1`,
        [updates.slotId],
      );
    }

    const setClauses: string[] = [`status = 'modified'`];
    const vals: unknown[] = [];
    let pIdx = 1;

    if (updates.partySize !== undefined) {
      setClauses.push(`party_size = $${pIdx}`);
      vals.push(updates.partySize);
      pIdx++;
    }

    if (updates.slotId) {
      setClauses.push(`slot_id = $${pIdx}`);
      vals.push(updates.slotId);
      pIdx++;
    }

    if (updates.startAt) {
      setClauses.push(`start_at = $${pIdx}`);
      vals.push(updates.startAt);
      pIdx++;
    }

    const result = await client.query(
      `UPDATE commerce.commerce_reservation
       SET ${setClauses.join(', ')}
       WHERE reservation_id = $${pIdx} AND user_id = $${pIdx + 1}
       RETURNING *`,
      [...vals, reservationId, userId],
    );

    return result.rows[0];
  });
}

export async function cancelReservation(reservationId: string, userId: string) {
  return transaction(pool, async (client) => {
    // Lock and verify ownership
    const existing = await client.query(
      `SELECT * FROM commerce.commerce_reservation
       WHERE reservation_id = $1 AND user_id = $2 AND reservation_type = 'dining'
       FOR UPDATE`,
      [reservationId, userId],
    );

    if (existing.rows.length === 0) {
      throw Object.assign(new Error('Reservation not found'), { statusCode: 404 });
    }

    const current = existing.rows[0];

    if (current.status === 'cancelled') {
      throw Object.assign(new Error('Reservation is already cancelled'), { statusCode: 409 });
    }

    // Cancel the reservation
    await client.query(
      `UPDATE commerce.commerce_reservation SET status = 'cancelled' WHERE reservation_id = $1`,
      [reservationId],
    );

    // Release the slot back to available
    if (current.slot_id) {
      await client.query(
        `UPDATE dining.dining_slot SET availability_status = 'open' WHERE dining_slot_id = $1`,
        [current.slot_id],
      );
    }
  });
}

// ── Waitlist Queries ───────────────────────────────────────────

export async function findWaitlistByRestaurant(restaurantId: string) {
  const result = await query(
    pool,
    `SELECT * FROM dining.dining_waitlist
     WHERE restaurant_id = $1 AND status = 'waiting'
     ORDER BY created_at ASC`,
    [restaurantId],
  );
  return result.rows;
}

export interface CreateWaitlistParams {
  restaurantId: string;
  userId: string;
  name: string;
  partySize: number;
  phone?: string;
  email?: string;
  notes?: string;
}

export async function createWaitlistEntry(params: CreateWaitlistParams) {
  const result = await query(
    pool,
    `INSERT INTO dining.dining_waitlist
       (restaurant_id, user_id, name, party_size, phone, email, notes, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'waiting')
     RETURNING *`,
    [
      params.restaurantId,
      params.userId,
      params.name,
      params.partySize,
      params.phone ?? null,
      params.email ?? null,
      params.notes ?? null,
    ],
  );
  return result.rows[0];
}

export async function findWaitlistByUser(userId: string) {
  const result = await query(
    pool,
    `SELECT w.*, e.canonical_name AS restaurant_name
     FROM dining.dining_waitlist w
     JOIN dining.dining_restaurant r ON r.restaurant_id = w.restaurant_id
     JOIN tg.tg_entity e ON e.entity_id = r.venue_id
     WHERE w.user_id = $1 AND w.status = 'waiting'
     ORDER BY w.created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function findWaitlistEntryById(entryId: string) {
  const result = await query(
    pool,
    `SELECT * FROM dining.dining_waitlist WHERE waitlist_id = $1`,
    [entryId],
  );
  return result.rows[0] ?? null;
}

export async function deleteWaitlistEntry(entryId: string, userId: string) {
  const result = await query(
    pool,
    `DELETE FROM dining.dining_waitlist
     WHERE waitlist_id = $1 AND user_id = $2
     RETURNING waitlist_id`,
    [entryId, userId],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

// ── Notify Request Queries ─────────────────────────────────────

export async function findNotifyRequests(restaurantId: string, date: string) {
  const result = await query(
    pool,
    `SELECT * FROM dining.dining_notify_request
     WHERE restaurant_id = $1 AND target_date = $2::date AND status = 'active'`,
    [restaurantId, date],
  );
  return result.rows;
}

export interface CreateNotifyRequestParams {
  restaurantId: string;
  userId: string;
  partySize: number;
  targetDate: string;
  timeStart?: string;
  timeEnd?: string;
}

export async function createNotifyRequest(params: CreateNotifyRequestParams) {
  const result = await query(
    pool,
    `INSERT INTO dining.dining_notify_request
       (restaurant_id, user_id, party_size, target_date, time_window_start, time_window_end, status)
     VALUES ($1, $2, $3, $4::date, COALESCE($5::time, '00:00'), COALESCE($6::time, '23:59'), 'active')
     RETURNING *`,
    [
      params.restaurantId,
      params.userId,
      params.partySize,
      params.targetDate,
      params.timeStart ?? null,
      params.timeEnd ?? null,
    ],
  );
  return result.rows[0];
}

// ── Experience Queries ─────────────────────────────────────────

export async function findExperiencesByRestaurant(restaurantId: string) {
  const result = await query(
    pool,
    `SELECT * FROM dining.dining_experience
     WHERE restaurant_id = $1 AND active = TRUE
     ORDER BY name`,
    [restaurantId],
  );
  return result.rows;
}

// ── Service Period Queries ─────────────────────────────────────

export async function findServicePeriodsByRestaurant(restaurantId: string) {
  const result = await query(
    pool,
    `SELECT * FROM dining.dining_service_period
     WHERE restaurant_id = $1 AND active = TRUE
     ORDER BY start_time`,
    [restaurantId],
  );
  return result.rows;
}

export { transaction, getPool };
