import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ── Trip Queries ──────────────────────────────────────────────────────

export async function findTripById(tripId: string) {
  const result = await query(
    pool,
    'SELECT * FROM trip.trip_trip WHERE trip_id = $1',
    [tripId],
  );
  return result.rows[0] ?? null;
}

export async function findTripsByUserId(
  userId: string,
  options: { status?: string; cursor?: string; limit: number },
) {
  const params: unknown[] = [userId, options.limit + 1]; // fetch one extra for cursor
  let sql = `
    SELECT * FROM trip.trip_trip
    WHERE user_id = $1
  `;

  let paramIndex = 3;

  if (options.status) {
    sql += ` AND status = $${paramIndex}`;
    params.push(options.status);
    paramIndex++;
  }

  if (options.cursor) {
    sql += ` AND created_at < $${paramIndex}`;
    params.push(options.cursor);
    paramIndex++;
  }

  sql += ` ORDER BY created_at DESC LIMIT $2`;

  const result = await query(pool, sql, params);
  return result.rows;
}

export async function findTripsByUserIdOrCollaborator(
  userId: string,
  options: { status?: string; cursor?: string; limit: number },
) {
  const params: unknown[] = [userId, options.limit + 1];
  let sql = `
    SELECT DISTINCT t.* FROM trip.trip_trip t
    LEFT JOIN trip.trip_collaborator c ON c.trip_id = t.trip_id
    WHERE (t.user_id = $1 OR c.user_id = $1)
  `;

  let paramIndex = 3;

  if (options.status) {
    sql += ` AND t.status = $${paramIndex}`;
    params.push(options.status);
    paramIndex++;
  }

  if (options.cursor) {
    sql += ` AND t.created_at < $${paramIndex}`;
    params.push(options.cursor);
    paramIndex++;
  }

  sql += ` ORDER BY t.created_at DESC LIMIT $2`;

  const result = await query(pool, sql, params);
  return result.rows;
}

export async function createTrip(data: {
  userId: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelerCount: number;
  budgetTotal?: number;
  budgetCurrency: string;
  pace: string;
}) {
  return transaction(pool, async (client: PoolClient) => {
    const tripResult = await client.query(
      `INSERT INTO trip.trip_trip (user_id, title, start_date, end_date, home_currency, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING *`,
      [data.userId, data.title, data.startDate, data.endDate, data.budgetCurrency],
    );

    const trip = tripResult.rows[0];

    // Create budget record if budget was provided
    if (data.budgetTotal != null) {
      await client.query(
        `INSERT INTO trip.trip_budget (trip_id, total_budget, currency, categories)
         VALUES ($1, $2, $3, $4)`,
        [
          trip.trip_id,
          data.budgetTotal,
          data.budgetCurrency,
          JSON.stringify({
            destination: data.destination,
            traveler_count: data.travelerCount,
            pace: data.pace,
          }),
        ],
      );
    }

    // Store extended attributes in the trip's details via trip_trip_health as initial state
    // (destination, traveler_count, pace are planning metadata)
    // We also create the owner as a traveler
    await client.query(
      `INSERT INTO trip.trip_traveler (trip_id, user_id, role, first_name)
       VALUES ($1, $2, 'owner', '')`,
      [trip.trip_id, data.userId],
    );

    return trip;
  });
}

export async function updateTrip(
  tripId: string,
  data: {
    title?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    homeCurrency?: string;
  },
) {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    setClauses.push(`title = $${paramIndex}`);
    params.push(data.title);
    paramIndex++;
  }
  if (data.startDate !== undefined) {
    setClauses.push(`start_date = $${paramIndex}`);
    params.push(data.startDate);
    paramIndex++;
  }
  if (data.endDate !== undefined) {
    setClauses.push(`end_date = $${paramIndex}`);
    params.push(data.endDate);
    paramIndex++;
  }
  if (data.status !== undefined) {
    setClauses.push(`status = $${paramIndex}`);
    params.push(data.status);
    paramIndex++;
  }
  if (data.homeCurrency !== undefined) {
    setClauses.push(`home_currency = $${paramIndex}`);
    params.push(data.homeCurrency);
    paramIndex++;
  }

  if (setClauses.length === 0) {
    return findTripById(tripId);
  }

  params.push(tripId);
  const sql = `
    UPDATE trip.trip_trip
    SET ${setClauses.join(', ')}
    WHERE trip_id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(pool, sql, params);
  return result.rows[0] ?? null;
}

export async function cancelTrip(tripId: string) {
  const result = await query(
    pool,
    `UPDATE trip.trip_trip SET status = 'cancelled' WHERE trip_id = $1 RETURNING *`,
    [tripId],
  );
  return result.rows[0] ?? null;
}

// ── Itinerary Item Queries ────────────────────────────────────────────

export async function findItineraryItems(tripId: string) {
  const result = await query(
    pool,
    `SELECT * FROM trip.trip_itinerary_item
     WHERE trip_id = $1
     ORDER BY position ASC, created_at ASC`,
    [tripId],
  );
  return result.rows;
}

export async function findItineraryItemById(itemId: string) {
  const result = await query(
    pool,
    'SELECT * FROM trip.trip_itinerary_item WHERE item_id = $1',
    [itemId],
  );
  return result.rows[0] ?? null;
}

export async function createItineraryItem(data: {
  tripId: string;
  itemType: string;
  entityId?: string;
  reservationId?: string;
  dayNumber: number;
  position: number;
  startAt?: string;
  endAt?: string;
  notes?: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO trip.trip_itinerary_item
       (trip_id, item_type, entity_id, reservation_id, position, start_at, end_at, title, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.tripId,
      data.itemType,
      data.entityId ?? null,
      data.reservationId ?? null,
      data.position,
      data.startAt ?? null,
      data.endAt ?? null,
      data.notes ?? null,
      JSON.stringify({ day_number: data.dayNumber }),
    ],
  );
  return result.rows[0];
}

export async function updateItineraryItem(
  itemId: string,
  data: {
    itemType?: string;
    entityId?: string;
    reservationId?: string;
    position?: number;
    startAt?: string;
    endAt?: string;
    title?: string;
    dayNumber?: number;
  },
) {
  const setClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.itemType !== undefined) {
    setClauses.push(`item_type = $${paramIndex}`);
    params.push(data.itemType);
    paramIndex++;
  }
  if (data.entityId !== undefined) {
    setClauses.push(`entity_id = $${paramIndex}`);
    params.push(data.entityId);
    paramIndex++;
  }
  if (data.reservationId !== undefined) {
    setClauses.push(`reservation_id = $${paramIndex}`);
    params.push(data.reservationId);
    paramIndex++;
  }
  if (data.position !== undefined) {
    setClauses.push(`position = $${paramIndex}`);
    params.push(data.position);
    paramIndex++;
  }
  if (data.startAt !== undefined) {
    setClauses.push(`start_at = $${paramIndex}`);
    params.push(data.startAt);
    paramIndex++;
  }
  if (data.endAt !== undefined) {
    setClauses.push(`end_at = $${paramIndex}`);
    params.push(data.endAt);
    paramIndex++;
  }
  if (data.title !== undefined) {
    setClauses.push(`title = $${paramIndex}`);
    params.push(data.title);
    paramIndex++;
  }
  if (data.dayNumber !== undefined) {
    setClauses.push(`details = jsonb_set(COALESCE(details, '{}'::jsonb), '{day_number}', $${paramIndex}::jsonb)`);
    params.push(JSON.stringify(data.dayNumber));
    paramIndex++;
  }

  if (setClauses.length === 0) {
    return findItineraryItemById(itemId);
  }

  params.push(itemId);
  const sql = `
    UPDATE trip.trip_itinerary_item
    SET ${setClauses.join(', ')}
    WHERE item_id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(pool, sql, params);
  return result.rows[0] ?? null;
}

export async function deleteItineraryItem(itemId: string) {
  const result = await query(
    pool,
    'DELETE FROM trip.trip_itinerary_item WHERE item_id = $1 RETURNING item_id',
    [itemId],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

// ── Collaborator Queries ──────────────────────────────────────────────

export async function findTripCollaborators(tripId: string) {
  const result = await query(
    pool,
    `SELECT c.*, u.display_name, u.email
     FROM trip.trip_collaborator c
     LEFT JOIN identity.identity_user u ON u.user_id = c.user_id
     WHERE c.trip_id = $1
     ORDER BY c.created_at ASC`,
    [tripId],
  );
  return result.rows;
}

export async function checkCollaboratorAccess(tripId: string, userId: string) {
  const result = await query(
    pool,
    `SELECT permission FROM trip.trip_collaborator
     WHERE trip_id = $1 AND user_id = $2`,
    [tripId, userId],
  );
  return result.rows[0] ?? null;
}

export async function addCollaborator(data: {
  tripId: string;
  userId: string;
  permission: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO trip.trip_collaborator (trip_id, user_id, permission)
     VALUES ($1, $2, $3)
     ON CONFLICT (trip_id, user_id) DO UPDATE SET permission = EXCLUDED.permission
     RETURNING *`,
    [data.tripId, data.userId, data.permission],
  );
  return result.rows[0];
}

export async function removeCollaborator(tripId: string, userId: string) {
  const result = await query(
    pool,
    'DELETE FROM trip.trip_collaborator WHERE trip_id = $1 AND user_id = $2 RETURNING trip_id',
    [tripId, userId],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

// ── Authorization Helpers ─────────────────────────────────────────────

/**
 * Check if a user has access to a trip (as owner or collaborator).
 * Returns { hasAccess: boolean; isOwner: boolean; permission: string | null }
 */
export async function checkTripAccess(tripId: string, userId: string) {
  const trip = await findTripById(tripId);
  if (!trip) {
    return { trip: null, hasAccess: false, isOwner: false, permission: null };
  }

  if (trip.user_id === userId) {
    return { trip, hasAccess: true, isOwner: true, permission: 'owner' };
  }

  const collab = await checkCollaboratorAccess(tripId, userId);
  if (collab) {
    return { trip, hasAccess: true, isOwner: false, permission: collab.permission };
  }

  return { trip, hasAccess: false, isOwner: false, permission: null };
}

// ── Count Queries ─────────────────────────────────────────────────────

export async function countTripsByUserId(userId: string, status?: string) {
  const params: unknown[] = [userId];
  let sql = 'SELECT COUNT(*)::int AS count FROM trip.trip_trip WHERE user_id = $1';

  if (status) {
    sql += ' AND status = $2';
    params.push(status);
  }

  const result = await query(pool, sql, params);
  return result.rows[0]?.count ?? 0;
}
