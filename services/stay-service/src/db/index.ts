import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ── Property Queries ────────────────────────────────────────────

export async function findPropertyById(id: string) {
  const result = await query(
    pool,
    `SELECT p.*,
            hp.host_id, hp.user_id AS host_user_id, hp.bio AS host_bio,
            hp.photo_url AS host_photo_url, hp.response_rate AS host_response_rate,
            hp.superhost_score AS host_superhost_score,
            hp.verification_status AS host_verification_status,
            hp.total_reviews AS host_total_reviews
     FROM stay.stay_property p
     LEFT JOIN stay.stay_host_profile hp ON hp.supplier_id = p.supplier_id
     WHERE p.property_id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export interface SearchPropertiesParams {
  placeId?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  limit: number;
  offset: number;
}

export async function searchProperties(params: SearchPropertiesParams) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  // Guest capacity filter
  conditions.push(`p.max_guests >= $${idx}`);
  values.push(params.guests);
  idx++;

  // Property type filter
  if (params.propertyType) {
    conditions.push(`p.property_type = $${idx}`);
    values.push(params.propertyType);
    idx++;
  }

  // Price range filter: join inventory to check pricing
  if (params.minPrice !== undefined) {
    conditions.push(`EXISTS (
      SELECT 1 FROM stay.stay_rate_plan rp
      JOIN stay.stay_inventory_night inv ON inv.rate_plan_id = rp.rate_plan_id
      WHERE rp.property_id = p.property_id
        AND inv.date >= $${idx}::date AND inv.date < $${idx + 1}::date
        AND inv.price >= $${idx + 2}
        AND inv.closed = FALSE AND inv.available > 0
    )`);
    values.push(params.checkIn, params.checkOut, params.minPrice);
    idx += 3;
  }

  if (params.maxPrice !== undefined) {
    conditions.push(`EXISTS (
      SELECT 1 FROM stay.stay_rate_plan rp
      JOIN stay.stay_inventory_night inv ON inv.rate_plan_id = rp.rate_plan_id
      WHERE rp.property_id = p.property_id
        AND inv.date >= $${idx}::date AND inv.date < $${idx + 1}::date
        AND inv.price <= $${idx + 2}
        AND inv.closed = FALSE AND inv.available > 0
    )`);
    values.push(params.checkIn, params.checkOut, params.maxPrice);
    idx += 3;
  }

  // Only show properties that have at least some inventory for the date range
  conditions.push(`EXISTS (
    SELECT 1 FROM stay.stay_rate_plan rp
    JOIN stay.stay_inventory_night inv ON inv.rate_plan_id = rp.rate_plan_id
    WHERE rp.property_id = p.property_id
      AND rp.active = TRUE
      AND inv.date >= $${idx}::date AND inv.date < $${idx + 1}::date
      AND inv.closed = FALSE AND inv.available > 0
  )`);
  values.push(params.checkIn, params.checkOut);
  idx += 2;

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count query
  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM stay.stay_property p
     ${whereClause}`,
    values,
  );

  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  // Data query with avg nightly price
  const dataResult = await query(
    pool,
    `SELECT p.property_id, p.venue_id, p.supplier_id, p.property_type,
            p.check_in_time, p.check_out_time, p.max_guests, p.bedrooms,
            p.bathrooms, p.amenities, p.instant_book, p.min_nights, p.max_nights,
            p.created_at,
            (
              SELECT ROUND(AVG(inv.price), 2)
              FROM stay.stay_rate_plan rp
              JOIN stay.stay_inventory_night inv ON inv.rate_plan_id = rp.rate_plan_id
              WHERE rp.property_id = p.property_id
                AND rp.active = TRUE
                AND inv.date >= $${idx}::date AND inv.date < $${idx + 1}::date
                AND inv.closed = FALSE AND inv.available > 0
            ) AS avg_nightly_price,
            pi.demand_score, pi.walkability_score, pi.luxury_fit_score
     FROM stay.stay_property p
     LEFT JOIN stay.stay_property_intelligence pi ON pi.property_id = p.property_id
     ${whereClause}
     ORDER BY pi.demand_score DESC NULLS LAST, p.created_at DESC
     LIMIT $${idx + 2} OFFSET $${idx + 3}`,
    [...values, params.checkIn, params.checkOut, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

// ── Room Type Queries ───────────────────────────────────────────

export async function findRoomTypesByProperty(propertyId: string) {
  const result = await query(
    pool,
    `SELECT rt.*
     FROM stay.stay_room_type rt
     WHERE rt.property_id = $1 AND rt.active = TRUE
     ORDER BY rt.max_occupancy ASC`,
    [propertyId],
  );
  return result.rows;
}

export async function findRoomTypeById(roomTypeId: string) {
  const result = await query(
    pool,
    `SELECT * FROM stay.stay_room_type WHERE room_type_id = $1`,
    [roomTypeId],
  );
  return result.rows[0] ?? null;
}

export async function findAvailableRooms(propertyId: string, checkIn: string, checkOut: string) {
  const result = await query(
    pool,
    `SELECT rt.* FROM stay.stay_room_type rt
     WHERE rt.property_id = $1
     AND rt.active = TRUE
     AND rt.room_type_id NOT IN (
       SELECT DISTINCT rp.room_type_id
       FROM stay.stay_rate_plan rp
       JOIN stay.stay_inventory_night inv ON inv.rate_plan_id = rp.rate_plan_id
       WHERE rp.property_id = $1
         AND rp.room_type_id IS NOT NULL
         AND inv.date >= $2::date AND inv.date < $3::date
         AND (inv.available <= 0 OR inv.closed = TRUE)
     )`,
    [propertyId, checkIn, checkOut],
  );
  return result.rows;
}

// ── Availability Queries ────────────────────────────────────────

export async function findAvailabilityForProperty(
  propertyId: string,
  checkIn: string,
  checkOut: string,
) {
  const result = await query(
    pool,
    `SELECT inv.night_id, inv.rate_plan_id, inv.date, inv.available,
            inv.price, inv.currency, inv.closed, inv.min_stay_override,
            rp.room_type_id, rp.name AS rate_plan_name, rp.refundable, rp.meal_plan,
            rt.name AS room_type_name, rt.max_occupancy
     FROM stay.stay_inventory_night inv
     JOIN stay.stay_rate_plan rp ON rp.rate_plan_id = inv.rate_plan_id
     LEFT JOIN stay.stay_room_type rt ON rt.room_type_id = rp.room_type_id
     WHERE rp.property_id = $1
       AND rp.active = TRUE
       AND inv.date >= $2::date AND inv.date < $3::date
     ORDER BY rt.room_type_id, rp.rate_plan_id, inv.date`,
    [propertyId, checkIn, checkOut],
  );
  return result.rows;
}

/**
 * Check if all nights in a date range are available for a specific rate plan.
 * Returns { available: boolean, nights: row[] } so callers can inspect details.
 */
export async function checkRatePlanAvailability(
  ratePlanId: string,
  checkIn: string,
  checkOut: string,
) {
  const result = await query(
    pool,
    `SELECT inv.night_id, inv.date, inv.available, inv.price, inv.currency,
            inv.closed, inv.min_stay_override
     FROM stay.stay_inventory_night inv
     WHERE inv.rate_plan_id = $1
       AND inv.date >= $2::date AND inv.date < $3::date
     ORDER BY inv.date`,
    [ratePlanId, checkIn, checkOut],
  );

  // Calculate expected number of nights
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const expectedNights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  const nights = result.rows;
  const allAvailable =
    nights.length === expectedNights &&
    nights.every(
      (n: { available: number; closed: boolean }) => n.available > 0 && !n.closed,
    );

  return { available: allAvailable, nights, expectedNights };
}

// ── Rate Plan Queries ───────────────────────────────────────────

export async function findRatePlansByProperty(propertyId: string) {
  const result = await query(
    pool,
    `SELECT rp.*, rt.name AS room_type_name, rt.max_occupancy
     FROM stay.stay_rate_plan rp
     LEFT JOIN stay.stay_room_type rt ON rt.room_type_id = rp.room_type_id
     WHERE rp.property_id = $1 AND rp.active = TRUE
     ORDER BY rp.name`,
    [propertyId],
  );
  return result.rows;
}

export async function findRatePlanById(ratePlanId: string) {
  const result = await query(
    pool,
    `SELECT rp.*, rt.name AS room_type_name, rt.max_occupancy,
            p.property_id, p.supplier_id, p.venue_id
     FROM stay.stay_rate_plan rp
     LEFT JOIN stay.stay_room_type rt ON rt.room_type_id = rp.room_type_id
     JOIN stay.stay_property p ON p.property_id = rp.property_id
     WHERE rp.rate_plan_id = $1`,
    [ratePlanId],
  );
  return result.rows[0] ?? null;
}

export async function findRatePlanForRoomType(propertyId: string, roomTypeId: string) {
  const result = await query(
    pool,
    `SELECT rp.*
     FROM stay.stay_rate_plan rp
     WHERE rp.property_id = $1 AND rp.room_type_id = $2 AND rp.active = TRUE
     ORDER BY rp.created_at ASC
     LIMIT 1`,
    [propertyId, roomTypeId],
  );
  return result.rows[0] ?? null;
}

// ── Review Queries ──────────────────────────────────────────────

export async function findReviewsByProperty(propertyId: string) {
  const result = await query(
    pool,
    `SELECT mr.review_id, mr.guest_rating, mr.guest_review, mr.host_rating,
            mr.guest_reviewed_at, mr.host_reviewed_at, mr.visible_after,
            mr.created_at
     FROM stay.stay_mutual_review mr
     JOIN stay.stay_host_profile hp ON hp.host_id = mr.host_id
     JOIN stay.stay_property p ON p.supplier_id = hp.supplier_id
     WHERE p.property_id = $1
       AND (mr.visible_after IS NULL OR mr.visible_after <= NOW())
     ORDER BY mr.created_at DESC
     LIMIT 50`,
    [propertyId],
  );
  return result.rows;
}

export async function getReviewSummary(propertyId: string) {
  const result = await query(
    pool,
    `SELECT
       COUNT(*)::int AS total_reviews,
       ROUND(AVG(mr.guest_rating), 2) AS avg_guest_rating,
       ROUND(AVG(mr.host_rating), 2) AS avg_host_rating
     FROM stay.stay_mutual_review mr
     JOIN stay.stay_host_profile hp ON hp.host_id = mr.host_id
     JOIN stay.stay_property p ON p.supplier_id = hp.supplier_id
     WHERE p.property_id = $1
       AND (mr.visible_after IS NULL OR mr.visible_after <= NOW())
       AND mr.guest_rating IS NOT NULL`,
    [propertyId],
  );
  return result.rows[0] ?? { total_reviews: 0, avg_guest_rating: null, avg_host_rating: null };
}

// ── Host Profile Queries ────────────────────────────────────────

export async function findHostProfile(userId: string) {
  const result = await query(
    pool,
    `SELECT * FROM stay.stay_host_profile WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function findHostProfileBySupplierId(supplierId: string) {
  const result = await query(
    pool,
    `SELECT * FROM stay.stay_host_profile WHERE supplier_id = $1`,
    [supplierId],
  );
  return result.rows[0] ?? null;
}

// ── Property Intelligence Queries ───────────────────────────────

export async function findPropertyIntelligence(propertyId: string) {
  const result = await query(
    pool,
    `SELECT * FROM stay.stay_property_intelligence WHERE property_id = $1`,
    [propertyId],
  );
  return result.rows[0] ?? null;
}

// ── Booking Queries ─────────────────────────────────────────────

export interface CreateStayBookingParams {
  userId: string;
  propertyId: string;
  roomTypeId: string;
  ratePlanId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  currency: string;
  supplierId: string;
  venueId: string;
}

/**
 * Create a stay booking within a transaction:
 * 1. Lock and verify inventory for all nights
 * 2. Decrement available counts
 * 3. Create a commerce reservation
 * Returns the created reservation row.
 */
export async function createStayBooking(params: CreateStayBookingParams) {
  return transaction(pool, async (client: PoolClient) => {
    // Lock inventory rows for the date range
    const invResult = await client.query(
      `SELECT inv.night_id, inv.date, inv.available, inv.price, inv.currency, inv.closed
       FROM stay.stay_inventory_night inv
       WHERE inv.rate_plan_id = $1
         AND inv.date >= $2::date AND inv.date < $3::date
       ORDER BY inv.date
       FOR UPDATE`,
      [params.ratePlanId, params.checkIn, params.checkOut],
    );

    const nights = invResult.rows;

    // Calculate expected number of nights
    const start = new Date(params.checkIn);
    const end = new Date(params.checkOut);
    const expectedNights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (nights.length !== expectedNights) {
      throw Object.assign(
        new Error(`Inventory not available for all ${expectedNights} nights in the requested range`),
        { statusCode: 409 },
      );
    }

    // Verify all nights are available
    for (const night of nights) {
      if (night.available <= 0 || night.closed) {
        throw Object.assign(
          new Error(`No availability for ${night.date}`),
          { statusCode: 409 },
        );
      }
    }

    // Decrement inventory for each night
    for (const night of nights) {
      await client.query(
        `UPDATE stay.stay_inventory_night
         SET available = available - 1
         WHERE night_id = $1`,
        [night.night_id],
      );
    }

    // Create the reservation in commerce schema
    const resResult = await client.query(
      `INSERT INTO commerce.commerce_reservation
         (user_id, reservation_type, supplier_id, venue_id,
          start_at, end_at, party_size, price_paid, currency, status, metadata)
       VALUES ($1, 'stay', $2, $3, $4::date, $5::date, $6, $7, $8, 'confirmed',
               jsonb_build_object(
                 'property_id', $9::text,
                 'room_type_id', $10::text,
                 'rate_plan_id', $11::text
               ))
       RETURNING *`,
      [
        params.userId,
        params.supplierId,
        params.venueId,
        params.checkIn,
        params.checkOut,
        params.guests,
        params.totalPrice,
        params.currency,
        params.propertyId,
        params.roomTypeId,
        params.ratePlanId,
      ],
    );

    return resResult.rows[0];
  });
}

export interface FindBookingsParams {
  status?: string;
  upcoming?: boolean;
  limit: number;
  offset: number;
}

export async function findStayBookingsByUser(userId: string, params: FindBookingsParams) {
  const conditions = [`cr.user_id = $1`, `cr.reservation_type = 'stay'`];
  const values: unknown[] = [userId];
  let idx = 2;

  if (params.status) {
    conditions.push(`cr.status = $${idx}`);
    values.push(params.status);
    idx++;
  }

  if (params.upcoming) {
    conditions.push(`cr.start_at >= CURRENT_DATE`);
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
            p.property_type, p.check_in_time, p.check_out_time,
            rt.name AS room_type_name, rt.max_occupancy
     FROM commerce.commerce_reservation cr
     LEFT JOIN stay.stay_property p
       ON p.property_id = (cr.metadata->>'property_id')::uuid
     LEFT JOIN stay.stay_room_type rt
       ON rt.room_type_id = (cr.metadata->>'room_type_id')::uuid
     WHERE ${conditions.join(' AND ')}
     ORDER BY cr.start_at ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findStayBookingById(bookingId: string) {
  const result = await query(
    pool,
    `SELECT cr.*,
            p.property_id, p.property_type, p.check_in_time, p.check_out_time,
            p.max_guests, p.bedrooms, p.bathrooms, p.amenities AS property_amenities,
            p.house_rules,
            rt.name AS room_type_name, rt.max_occupancy, rt.bed_configuration,
            rt.room_size_sqm, rt.amenities AS room_amenities,
            hp.bio AS host_bio, hp.photo_url AS host_photo_url,
            hp.response_rate AS host_response_rate, hp.superhost_score AS host_superhost_score
     FROM commerce.commerce_reservation cr
     LEFT JOIN stay.stay_property p
       ON p.property_id = (cr.metadata->>'property_id')::uuid
     LEFT JOIN stay.stay_room_type rt
       ON rt.room_type_id = (cr.metadata->>'room_type_id')::uuid
     LEFT JOIN stay.stay_host_profile hp
       ON hp.supplier_id = p.supplier_id
     WHERE cr.reservation_id = $1 AND cr.reservation_type = 'stay'`,
    [bookingId],
  );
  return result.rows[0] ?? null;
}

/**
 * Cancel a stay booking:
 * 1. Update reservation status to 'cancelled'
 * 2. Release inventory (increment available counts)
 */
export async function cancelStayBooking(bookingId: string, userId: string) {
  return transaction(pool, async (client: PoolClient) => {
    // Lock and verify reservation
    const existing = await client.query(
      `SELECT * FROM commerce.commerce_reservation
       WHERE reservation_id = $1 AND user_id = $2 AND reservation_type = 'stay'
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

    const cancellableStatuses = ['requested', 'confirmed'];
    if (!cancellableStatuses.includes(booking.status)) {
      throw Object.assign(
        new Error(`Booking with status '${booking.status}' cannot be cancelled`),
        { statusCode: 409 },
      );
    }

    // Cancel the reservation
    await client.query(
      `UPDATE commerce.commerce_reservation SET status = 'cancelled' WHERE reservation_id = $1`,
      [bookingId],
    );

    // Release inventory: increment available count for each night
    const ratePlanId = booking.metadata?.rate_plan_id;
    if (ratePlanId) {
      await client.query(
        `UPDATE stay.stay_inventory_night
         SET available = available + 1
         WHERE rate_plan_id = $1
           AND date >= $2::date AND date < $3::date`,
        [ratePlanId, booking.start_at, booking.end_at],
      );
    }

    return { cancelled: true };
  });
}

// ── Host Property Queries ───────────────────────────────────────

export async function findPropertiesByHost(userId: string) {
  const result = await query(
    pool,
    `SELECT p.*
     FROM stay.stay_property p
     JOIN stay.stay_host_profile hp ON hp.supplier_id = p.supplier_id
     WHERE hp.user_id = $1
     ORDER BY p.created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function checkPropertyOwnership(propertyId: string, userId: string) {
  const result = await query(
    pool,
    `SELECT p.property_id
     FROM stay.stay_property p
     JOIN stay.stay_host_profile hp ON hp.supplier_id = p.supplier_id
     WHERE p.property_id = $1 AND hp.user_id = $2`,
    [propertyId, userId],
  );
  return result.rows.length > 0;
}

// ── Vacation Rental Queries ───────────────────────────────────

export interface SearchVacationRentalsParams {
  rental_type?: string;
  min_guests?: number;
  min_bedrooms?: number;
  min_bathrooms?: number;
  max_price?: number;
  instant_book?: boolean;
  city?: string;
  limit: number;
  offset: number;
}

export async function searchVacationRentals(params: SearchVacationRentalsParams) {
  const conditions: string[] = ['vr.is_active = TRUE'];
  const values: unknown[] = [];
  let idx = 1;

  if (params.rental_type) {
    conditions.push(`vr.rental_type = $${idx}`);
    values.push(params.rental_type);
    idx++;
  }

  if (params.min_guests !== undefined) {
    conditions.push(`vr.max_guests >= $${idx}`);
    values.push(params.min_guests);
    idx++;
  }

  if (params.min_bedrooms !== undefined) {
    conditions.push(`vr.bedrooms >= $${idx}`);
    values.push(params.min_bedrooms);
    idx++;
  }

  if (params.min_bathrooms !== undefined) {
    conditions.push(`vr.bathrooms >= $${idx}`);
    values.push(params.min_bathrooms);
    idx++;
  }

  if (params.max_price !== undefined) {
    conditions.push(`vr.cleaning_fee_cents <= $${idx}`);
    values.push(params.max_price);
    idx++;
  }

  if (params.instant_book !== undefined) {
    conditions.push(`vr.instant_book = $${idx}`);
    values.push(params.instant_book);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM stay.stay_vacation_rental vr
     JOIN stay.stay_property p ON p.property_id = vr.property_id
     ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT vr.*,
            p.property_type, p.check_in_time AS property_check_in,
            p.check_out_time AS property_check_out, p.max_guests AS property_max_guests,
            p.amenities AS property_amenities, p.instant_book AS property_instant_book,
            p.min_nights, p.max_nights,
            pi.demand_score, pi.walkability_score, pi.luxury_fit_score
     FROM stay.stay_vacation_rental vr
     JOIN stay.stay_property p ON p.property_id = vr.property_id
     LEFT JOIN stay.stay_property_intelligence pi ON pi.property_id = p.property_id
     ${whereClause}
     ORDER BY pi.demand_score DESC NULLS LAST, vr.created_at DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findVacationRentalById(rentalId: string) {
  const result = await query(
    pool,
    `SELECT vr.*,
            p.property_id, p.venue_id, p.supplier_id, p.property_type,
            p.check_in_time AS property_check_in, p.check_out_time AS property_check_out,
            p.max_guests AS property_max_guests, p.bedrooms AS property_bedrooms,
            p.bathrooms AS property_bathrooms, p.amenities AS property_amenities,
            p.house_rules AS property_house_rules, p.instant_book AS property_instant_book,
            p.min_nights, p.max_nights,
            hp.bio AS host_bio, hp.photo_url AS host_photo_url,
            hp.response_rate AS host_response_rate, hp.superhost_score AS host_superhost_score
     FROM stay.stay_vacation_rental vr
     JOIN stay.stay_property p ON p.property_id = vr.property_id
     LEFT JOIN stay.stay_host_profile hp ON hp.supplier_id = p.supplier_id
     WHERE vr.rental_id = $1`,
    [rentalId],
  );
  return result.rows[0] ?? null;
}

export interface CreateVacationRentalBookingParams {
  userId: string;
  rentalId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export async function createVacationRentalBooking(params: CreateVacationRentalBookingParams) {
  return transaction(pool, async (client: PoolClient) => {
    // Lock and verify the rental
    const rentalResult = await client.query(
      `SELECT vr.*, p.property_id, p.venue_id, p.supplier_id,
              p.min_nights, p.max_nights, p.max_guests AS property_max_guests
       FROM stay.stay_vacation_rental vr
       JOIN stay.stay_property p ON p.property_id = vr.property_id
       WHERE vr.rental_id = $1
       FOR UPDATE`,
      [params.rentalId],
    );

    const rental = rentalResult.rows[0];
    if (!rental) {
      throw Object.assign(new Error('Vacation rental not found'), { statusCode: 404 });
    }

    if (!rental.is_active) {
      throw Object.assign(new Error('This rental is no longer active'), { statusCode: 409 });
    }

    // Validate guest count
    const maxGuests = rental.max_guests ?? rental.property_max_guests ?? 99;
    if (params.guests > maxGuests) {
      throw Object.assign(
        new Error(`Guest count exceeds maximum of ${maxGuests}`),
        { statusCode: 400 },
      );
    }

    // Validate night count
    const startDate = new Date(params.checkIn);
    const endDate = new Date(params.checkOut);
    const numNights = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const minStay = rental.min_stay_nights ?? rental.min_nights ?? 1;
    if (numNights < minStay) {
      throw Object.assign(
        new Error(`Minimum stay is ${minStay} night(s)`),
        { statusCode: 400 },
      );
    }

    if (rental.max_nights && numNights > rental.max_nights) {
      throw Object.assign(
        new Error(`Maximum stay is ${rental.max_nights} night(s)`),
        { statusCode: 400 },
      );
    }

    // Look for rate plan availability
    const ratePlanResult = await client.query(
      `SELECT rp.rate_plan_id
       FROM stay.stay_rate_plan rp
       WHERE rp.property_id = $1 AND rp.active = TRUE
       ORDER BY rp.created_at ASC
       LIMIT 1`,
      [rental.property_id],
    );

    let totalPrice = rental.cleaning_fee_cents ?? 0;
    let currency = 'USD';

    if (ratePlanResult.rows.length > 0) {
      const ratePlanId = ratePlanResult.rows[0].rate_plan_id;

      // Check nightly inventory
      const invResult = await client.query(
        `SELECT inv.night_id, inv.date, inv.available, inv.price, inv.currency, inv.closed
         FROM stay.stay_inventory_night inv
         WHERE inv.rate_plan_id = $1
           AND inv.date >= $2::date AND inv.date < $3::date
         ORDER BY inv.date
         FOR UPDATE`,
        [ratePlanId, params.checkIn, params.checkOut],
      );

      const nights = invResult.rows;

      // Verify all nights available
      if (nights.length === numNights) {
        for (const night of nights) {
          if (night.available <= 0 || night.closed) {
            throw Object.assign(
              new Error(`No availability for ${night.date}`),
              { statusCode: 409 },
            );
          }
        }

        // Calculate nightly total
        const nightlyTotal = nights.reduce(
          (sum: number, n: { price: string | number }) => sum + Number(n.price),
          0,
        );
        totalPrice += nightlyTotal;
        currency = nights[0]?.currency ?? 'USD';

        // Decrement inventory
        for (const night of nights) {
          await client.query(
            `UPDATE stay.stay_inventory_night SET available = available - 1 WHERE night_id = $1`,
            [night.night_id],
          );
        }
      }
    }

    // Add security deposit to metadata, not to price
    const securityDeposit = rental.security_deposit_cents ?? 0;

    // Create reservation
    const resResult = await client.query(
      `INSERT INTO commerce.commerce_reservation
         (user_id, reservation_type, supplier_id, venue_id,
          start_at, end_at, party_size, price_paid, currency, status, metadata)
       VALUES ($1, 'stay', $2, $3, $4::date, $5::date, $6, $7, $8, 'confirmed',
               jsonb_build_object(
                 'property_id', $9::text,
                 'rental_id', $10::text,
                 'rental_type', 'vacation_rental',
                 'cleaning_fee_cents', $11,
                 'security_deposit_cents', $12
               ))
       RETURNING *`,
      [
        params.userId,
        rental.supplier_id,
        rental.venue_id,
        params.checkIn,
        params.checkOut,
        params.guests,
        totalPrice,
        currency,
        rental.property_id,
        params.rentalId,
        rental.cleaning_fee_cents ?? 0,
        securityDeposit,
      ],
    );

    return {
      ...resResult.rows[0],
      nights_count: numNights,
      total_price: totalPrice,
      cleaning_fee_cents: rental.cleaning_fee_cents ?? 0,
      security_deposit_cents: securityDeposit,
      currency,
    };
  });
}

export { transaction, getPool };
