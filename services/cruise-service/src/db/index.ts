import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ── Helper: generate confirmation number ─────────────────────────

function generateConfirmation(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'CR-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ── Cruise Line Queries ──────────────────────────────────────────

export async function findAllCruiseLines() {
  const result = await query(
    pool,
    `SELECT * FROM cruise.cruise_line
     WHERE is_active = TRUE
     ORDER BY name ASC`,
    [],
  );
  return result.rows;
}

export async function findCruiseLineById(lineId: string) {
  const result = await query(
    pool,
    `SELECT * FROM cruise.cruise_line WHERE line_id = $1`,
    [lineId],
  );
  return result.rows[0] ?? null;
}

// ── Ship Queries ─────────────────────────────────────────────────

export interface SearchShipsParams {
  line_id?: string;
  min_capacity?: number;
  limit: number;
  offset: number;
}

export async function searchShips(params: SearchShipsParams) {
  const conditions: string[] = [`cs.status = 'active'`];
  const values: unknown[] = [];
  let idx = 1;

  if (params.line_id) {
    conditions.push(`cs.line_id = $${idx}`);
    values.push(params.line_id);
    idx++;
  }

  if (params.min_capacity !== undefined) {
    conditions.push(`cs.passenger_capacity >= $${idx}`);
    values.push(params.min_capacity);
    idx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM cruise.cruise_ship cs ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT cs.*, cl.name AS line_name, cl.slug AS line_slug, cl.logo_url AS line_logo
     FROM cruise.cruise_ship cs
     JOIN cruise.cruise_line cl ON cl.line_id = cs.line_id
     ${whereClause}
     ORDER BY cl.name ASC, cs.name ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findShipBySlug(slug: string) {
  const result = await query(
    pool,
    `SELECT cs.*, cl.name AS line_name, cl.slug AS line_slug,
            cl.logo_url AS line_logo, cl.website_url AS line_website
     FROM cruise.cruise_ship cs
     JOIN cruise.cruise_line cl ON cl.line_id = cs.line_id
     WHERE cs.slug = $1`,
    [slug],
  );
  return result.rows[0] ?? null;
}

export async function findCabinTypesByShip(shipId: string) {
  const result = await query(
    pool,
    `SELECT * FROM cruise.cruise_cabin_type
     WHERE ship_id = $1
     ORDER BY sort_order ASC, name ASC`,
    [shipId],
  );
  return result.rows;
}

// ── Itinerary Queries ────────────────────────────────────────────

export async function findItineraryBySlug(slug: string) {
  const result = await query(
    pool,
    `SELECT ci.*,
            cs.name AS ship_name, cs.slug AS ship_slug,
            cs.hero_image_url AS ship_image,
            cs.passenger_capacity, cs.year_built,
            cl.name AS line_name, cl.slug AS line_slug,
            cl.logo_url AS line_logo
     FROM cruise.cruise_itinerary ci
     JOIN cruise.cruise_ship cs ON cs.ship_id = ci.ship_id
     JOIN cruise.cruise_line cl ON cl.line_id = cs.line_id
     WHERE ci.slug = $1`,
    [slug],
  );
  return result.rows[0] ?? null;
}

export async function findPortCallsByItinerary(itineraryId: string) {
  const result = await query(
    pool,
    `SELECT * FROM cruise.cruise_port_call
     WHERE itinerary_id = $1
     ORDER BY day_number ASC`,
    [itineraryId],
  );
  return result.rows;
}

// ── Search Cruises ───────────────────────────────────────────────

export interface SearchCruisesParams {
  region?: string;
  line_id?: string;
  departure_from?: string;
  departure_to?: string;
  min_duration?: number;
  max_duration?: number;
  max_price?: number;
  limit: number;
  offset: number;
}

export async function searchCruises(params: SearchCruisesParams) {
  const conditions: string[] = [
    `cs.status = 'active'`,
    `ci.status = 'active'`,
  ];
  const values: unknown[] = [];
  let idx = 1;

  if (params.region) {
    conditions.push(`ci.region = $${idx}`);
    values.push(params.region);
    idx++;
  }

  if (params.line_id) {
    conditions.push(`ship.line_id = $${idx}`);
    values.push(params.line_id);
    idx++;
  }

  if (params.departure_from) {
    conditions.push(`cs.departure_date >= $${idx}::date`);
    values.push(params.departure_from);
    idx++;
  }

  if (params.departure_to) {
    conditions.push(`cs.departure_date <= $${idx}::date`);
    values.push(params.departure_to);
    idx++;
  }

  if (params.min_duration !== undefined) {
    conditions.push(`ci.duration_nights >= $${idx}`);
    values.push(params.min_duration);
    idx++;
  }

  if (params.max_duration !== undefined) {
    conditions.push(`ci.duration_nights <= $${idx}`);
    values.push(params.max_duration);
    idx++;
  }

  if (params.max_price !== undefined) {
    conditions.push(`cs.price_from_cents <= $${idx}`);
    values.push(params.max_price);
    idx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM cruise.cruise_sailing cs
     JOIN cruise.cruise_itinerary ci ON ci.itinerary_id = cs.itinerary_id
     JOIN cruise.cruise_ship ship ON ship.ship_id = ci.ship_id
     ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT cs.*,
            ci.name AS itinerary_name, ci.slug AS itinerary_slug,
            ci.region, ci.departure_port, ci.departure_port_code,
            ci.duration_nights, ci.highlights AS itinerary_highlights,
            ship.name AS ship_name, ship.slug AS ship_slug,
            ship.hero_image_url AS ship_image,
            ship.rating AS ship_rating, ship.passenger_capacity,
            cl.name AS line_name, cl.slug AS line_slug,
            cl.logo_url AS line_logo
     FROM cruise.cruise_sailing cs
     JOIN cruise.cruise_itinerary ci ON ci.itinerary_id = cs.itinerary_id
     JOIN cruise.cruise_ship ship ON ship.ship_id = ci.ship_id
     JOIN cruise.cruise_line cl ON cl.line_id = ship.line_id
     ${whereClause}
     ORDER BY cs.departure_date ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

// ── Sailing Queries ──────────────────────────────────────────────

export async function findSailingById(sailingId: string) {
  const result = await query(
    pool,
    `SELECT cs.*,
            ci.name AS itinerary_name, ci.slug AS itinerary_slug,
            ci.region, ci.departure_port, ci.departure_port_code,
            ci.duration_nights, ci.description AS itinerary_description,
            ci.highlights AS itinerary_highlights,
            ship.ship_id, ship.name AS ship_name, ship.slug AS ship_slug,
            ship.hero_image_url AS ship_image,
            ship.rating AS ship_rating, ship.passenger_capacity,
            ship.amenities AS ship_amenities, ship.dining_venues, ship.pools,
            cl.name AS line_name, cl.slug AS line_slug,
            cl.logo_url AS line_logo
     FROM cruise.cruise_sailing cs
     JOIN cruise.cruise_itinerary ci ON ci.itinerary_id = cs.itinerary_id
     JOIN cruise.cruise_ship ship ON ship.ship_id = ci.ship_id
     JOIN cruise.cruise_line cl ON cl.line_id = ship.line_id
     WHERE cs.sailing_id = $1`,
    [sailingId],
  );
  return result.rows[0] ?? null;
}

export async function findCabinPricesForSailing(sailingId: string) {
  // For now, return cabin types with base pricing from the sailing
  const sailing = await findSailingById(sailingId);
  if (!sailing) return [];

  const cabins = await findCabinTypesByShip(sailing.ship_id);

  // Price multipliers by cabin category relative to the base (inside) price
  const multipliers: Record<string, number> = {
    inside: 1.0,
    oceanview: 1.3,
    balcony: 1.6,
    suite: 2.5,
    penthouse: 4.0,
  };

  const basePrice = sailing.price_from_cents ?? 0;

  return cabins.map((cabin: { cabin_type_id: string; category: string; [key: string]: unknown }) => ({
    ...cabin,
    price_per_person_cents: Math.round(basePrice * (multipliers[cabin.category] ?? 1.5)),
    currency: sailing.currency,
  }));
}

// ── Port Queries ─────────────────────────────────────────────────

export async function findPortByName(portName: string) {
  const result = await query(
    pool,
    `SELECT pc.port_name, pc.country, pc.latitude, pc.longitude,
            pc.highlights,
            COUNT(DISTINCT ci.itinerary_id) AS itinerary_count,
            ARRAY_AGG(DISTINCT ci.region) AS regions
     FROM cruise.cruise_port_call pc
     JOIN cruise.cruise_itinerary ci ON ci.itinerary_id = pc.itinerary_id
     WHERE LOWER(pc.port_name) LIKE LOWER($1)
       AND pc.is_sea_day = FALSE
     GROUP BY pc.port_name, pc.country, pc.latitude, pc.longitude, pc.highlights
     LIMIT 10`,
    [`%${portName}%`],
  );
  return result.rows;
}

// ── Booking Queries ──────────────────────────────────────────────

export interface CreateCruiseBookingParams {
  userId: string;
  sailingId: string;
  cabinTypeId?: string;
  passengers: number;
  specialRequests?: string;
}

export async function createCruiseBooking(params: CreateCruiseBookingParams) {
  return transaction(pool, async (client: PoolClient) => {
    // Lock and verify sailing
    const sailingResult = await client.query(
      `SELECT cs.*, ci.duration_nights
       FROM cruise.cruise_sailing cs
       JOIN cruise.cruise_itinerary ci ON ci.itinerary_id = cs.itinerary_id
       WHERE cs.sailing_id = $1
       FOR UPDATE`,
      [params.sailingId],
    );

    const sailing = sailingResult.rows[0];
    if (!sailing) {
      throw Object.assign(new Error('Sailing not found'), { statusCode: 404 });
    }

    if (sailing.status !== 'active') {
      throw Object.assign(
        new Error('This sailing is no longer active'),
        { statusCode: 409 },
      );
    }

    if (sailing.availability === 'sold_out') {
      throw Object.assign(
        new Error('This sailing is sold out'),
        { statusCode: 409 },
      );
    }

    // Check sailing is in the future
    if (new Date(sailing.departure_date) < new Date()) {
      throw Object.assign(
        new Error('Cannot book a past sailing'),
        { statusCode: 409 },
      );
    }

    // Calculate price based on cabin type
    let totalPriceCents = (sailing.price_from_cents ?? 0) * params.passengers;

    if (params.cabinTypeId) {
      // Verify cabin type belongs to the ship
      const cabinResult = await client.query(
        `SELECT ct.*, ci.ship_id AS expected_ship_id
         FROM cruise.cruise_cabin_type ct
         JOIN cruise.cruise_itinerary ci ON ci.itinerary_id = $2
         WHERE ct.cabin_type_id = $1`,
        [params.cabinTypeId, params.sailingId],
      );

      const cabin = cabinResult.rows[0];
      if (!cabin) {
        throw Object.assign(
          new Error('Cabin type not found for this sailing'),
          { statusCode: 404 },
        );
      }

      // Apply category multiplier
      const multipliers: Record<string, number> = {
        inside: 1.0,
        oceanview: 1.3,
        balcony: 1.6,
        suite: 2.5,
        penthouse: 4.0,
      };
      const mult = multipliers[cabin.category] ?? 1.5;
      totalPriceCents = Math.round((sailing.price_from_cents ?? 0) * mult * params.passengers);
    }

    // Create the booking
    const confirmation = generateConfirmation();
    const bookingResult = await client.query(
      `INSERT INTO cruise.cruise_booking
         (user_id, sailing_id, cabin_type_id, confirmation_number,
          passengers, total_price_cents, currency, status, special_requests)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8)
       RETURNING *`,
      [
        params.userId,
        params.sailingId,
        params.cabinTypeId ?? null,
        confirmation,
        params.passengers,
        totalPriceCents,
        sailing.currency,
        params.specialRequests ?? null,
      ],
    );

    return bookingResult.rows[0];
  });
}

export async function findBookingsByUser(userId: string, limit: number, offset: number) {
  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM cruise.cruise_booking WHERE user_id = $1`,
    [userId],
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT cb.*,
            cs.departure_date, cs.return_date, cs.availability,
            ci.name AS itinerary_name, ci.slug AS itinerary_slug,
            ci.region, ci.departure_port, ci.duration_nights,
            ship.name AS ship_name, ship.slug AS ship_slug,
            ship.hero_image_url AS ship_image,
            cl.name AS line_name, cl.slug AS line_slug,
            cl.logo_url AS line_logo,
            ct.name AS cabin_type_name, ct.category AS cabin_category
     FROM cruise.cruise_booking cb
     JOIN cruise.cruise_sailing cs ON cs.sailing_id = cb.sailing_id
     JOIN cruise.cruise_itinerary ci ON ci.itinerary_id = cs.itinerary_id
     JOIN cruise.cruise_ship ship ON ship.ship_id = ci.ship_id
     JOIN cruise.cruise_line cl ON cl.line_id = ship.line_id
     LEFT JOIN cruise.cruise_cabin_type ct ON ct.cabin_type_id = cb.cabin_type_id
     WHERE cb.user_id = $1
     ORDER BY cb.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  return { data: dataResult.rows, total };
}

export async function findBookingById(bookingId: string) {
  const result = await query(
    pool,
    `SELECT cb.*,
            cs.departure_date, cs.return_date, cs.availability,
            ci.name AS itinerary_name, ci.slug AS itinerary_slug,
            ci.region, ci.departure_port, ci.departure_port_code,
            ci.duration_nights, ci.description AS itinerary_description,
            ci.highlights AS itinerary_highlights,
            ship.name AS ship_name, ship.slug AS ship_slug,
            ship.hero_image_url AS ship_image, ship.amenities AS ship_amenities,
            ship.dining_venues, ship.pools, ship.deck_count,
            cl.name AS line_name, cl.slug AS line_slug,
            cl.logo_url AS line_logo, cl.website_url AS line_website,
            ct.name AS cabin_type_name, ct.category AS cabin_category,
            ct.sqft AS cabin_sqft, ct.max_occupancy AS cabin_max_occupancy,
            ct.amenities AS cabin_amenities, ct.image_url AS cabin_image
     FROM cruise.cruise_booking cb
     JOIN cruise.cruise_sailing cs ON cs.sailing_id = cb.sailing_id
     JOIN cruise.cruise_itinerary ci ON ci.itinerary_id = cs.itinerary_id
     JOIN cruise.cruise_ship ship ON ship.ship_id = ci.ship_id
     JOIN cruise.cruise_line cl ON cl.line_id = ship.line_id
     LEFT JOIN cruise.cruise_cabin_type ct ON ct.cabin_type_id = cb.cabin_type_id
     WHERE cb.booking_id = $1`,
    [bookingId],
  );
  return result.rows[0] ?? null;
}

export async function cancelCruiseBooking(bookingId: string, userId: string) {
  return transaction(pool, async (client: PoolClient) => {
    // Lock the booking
    const existing = await client.query(
      `SELECT cb.*, cs.departure_date
       FROM cruise.cruise_booking cb
       JOIN cruise.cruise_sailing cs ON cs.sailing_id = cb.sailing_id
       WHERE cb.booking_id = $1 AND cb.user_id = $2
       FOR UPDATE`,
      [bookingId, userId],
    );

    if (existing.rows.length === 0) {
      throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    }

    const booking = existing.rows[0];

    if (booking.status === 'cancelled') {
      throw Object.assign(new Error('Booking is already cancelled'), { statusCode: 409 });
    }

    if (booking.status !== 'confirmed') {
      throw Object.assign(
        new Error(`Booking with status '${booking.status}' cannot be cancelled`),
        { statusCode: 409 },
      );
    }

    // Check departure date is in the future
    if (new Date(booking.departure_date) < new Date()) {
      throw Object.assign(
        new Error('Cannot cancel a booking for a past sailing'),
        { statusCode: 409 },
      );
    }

    // Cancel the booking
    await client.query(
      `UPDATE cruise.cruise_booking SET status = 'cancelled' WHERE booking_id = $1`,
      [bookingId],
    );

    return { cancelled: true };
  });
}

export { transaction, getPool };
