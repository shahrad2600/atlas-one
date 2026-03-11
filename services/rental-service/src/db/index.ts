import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ── Helper: generate confirmation number ─────────────────────────

function generateConfirmation(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'RC-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ── Provider Queries ─────────────────────────────────────────────

export async function findAllProviders() {
  const result = await query(
    pool,
    `SELECT * FROM rental.rental_provider
     WHERE is_active = TRUE
     ORDER BY name ASC`,
    [],
  );
  return result.rows;
}

export async function findProviderById(providerId: string) {
  const result = await query(
    pool,
    `SELECT * FROM rental.rental_provider WHERE provider_id = $1`,
    [providerId],
  );
  return result.rows[0] ?? null;
}

// ── Location Queries ─────────────────────────────────────────────

export interface SearchLocationsParams {
  city?: string;
  airport_code?: string;
  provider_id?: string;
  limit: number;
  offset: number;
}

export async function searchLocations(params: SearchLocationsParams) {
  const conditions: string[] = ['rl.is_active = TRUE'];
  const values: unknown[] = [];
  let idx = 1;

  if (params.city) {
    conditions.push(`LOWER(rl.city) LIKE LOWER($${idx})`);
    values.push(`%${params.city}%`);
    idx++;
  }

  if (params.airport_code) {
    conditions.push(`UPPER(rl.airport_code) = UPPER($${idx})`);
    values.push(params.airport_code);
    idx++;
  }

  if (params.provider_id) {
    conditions.push(`rl.provider_id = $${idx}`);
    values.push(params.provider_id);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM rental.rental_location rl ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT rl.*, rp.name AS provider_name, rp.slug AS provider_slug
     FROM rental.rental_location rl
     JOIN rental.rental_provider rp ON rp.provider_id = rl.provider_id
     ${whereClause}
     ORDER BY rl.name ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

// ── Vehicle Class Queries ────────────────────────────────────────

export async function findAllVehicleClasses() {
  const result = await query(
    pool,
    `SELECT * FROM rental.rental_vehicle_class ORDER BY sort_order ASC, name ASC`,
    [],
  );
  return result.rows;
}

// ── Offer Queries ────────────────────────────────────────────────

export interface SearchOffersParams {
  pickup_location_id?: string;
  dropoff_location_id?: string;
  pickup_city?: string;
  pickup_airport?: string;
  pickup_date: string;
  dropoff_date: string;
  vehicle_category?: string;
  provider_id?: string;
  max_price?: number;
  limit: number;
  offset: number;
}

export async function searchOffers(params: SearchOffersParams) {
  const conditions: string[] = [
    `ro.status = 'available'`,
    `ro.pickup_date = $1`,
    `ro.dropoff_date = $2`,
  ];
  const values: unknown[] = [params.pickup_date, params.dropoff_date];
  let idx = 3;

  if (params.pickup_location_id) {
    conditions.push(`ro.pickup_location_id = $${idx}`);
    values.push(params.pickup_location_id);
    idx++;
  }

  if (params.dropoff_location_id) {
    conditions.push(`ro.dropoff_location_id = $${idx}`);
    values.push(params.dropoff_location_id);
    idx++;
  }

  if (params.pickup_city) {
    conditions.push(`LOWER(pl.city) LIKE LOWER($${idx})`);
    values.push(`%${params.pickup_city}%`);
    idx++;
  }

  if (params.pickup_airport) {
    conditions.push(`UPPER(pl.airport_code) = UPPER($${idx})`);
    values.push(params.pickup_airport);
    idx++;
  }

  if (params.vehicle_category) {
    conditions.push(`vc.category = $${idx}`);
    values.push(params.vehicle_category);
    idx++;
  }

  if (params.provider_id) {
    conditions.push(`ro.provider_id = $${idx}`);
    values.push(params.provider_id);
    idx++;
  }

  if (params.max_price !== undefined) {
    conditions.push(`ro.total_price_cents <= $${idx}`);
    values.push(params.max_price);
    idx++;
  }

  // Exclude expired offers
  conditions.push(`(ro.expires_at IS NULL OR ro.expires_at > NOW())`);

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM rental.rental_offer ro
     JOIN rental.rental_location pl ON pl.location_id = ro.pickup_location_id
     JOIN rental.rental_vehicle_class vc ON vc.class_id = ro.vehicle_class_id
     ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT ro.*,
            rp.name AS provider_name, rp.slug AS provider_slug,
            rp.logo_url AS provider_logo, rp.rating AS provider_rating,
            vc.name AS vehicle_class_name, vc.category AS vehicle_category,
            vc.passengers, vc.luggage_capacity, vc.doors, vc.transmission,
            vc.features AS vehicle_features, vc.image_url AS vehicle_image_url,
            pl.name AS pickup_location_name, pl.city AS pickup_city,
            pl.airport_code AS pickup_airport_code, pl.location_type AS pickup_location_type,
            dl.name AS dropoff_location_name, dl.city AS dropoff_city,
            dl.airport_code AS dropoff_airport_code, dl.location_type AS dropoff_location_type
     FROM rental.rental_offer ro
     JOIN rental.rental_provider rp ON rp.provider_id = ro.provider_id
     JOIN rental.rental_vehicle_class vc ON vc.class_id = ro.vehicle_class_id
     JOIN rental.rental_location pl ON pl.location_id = ro.pickup_location_id
     JOIN rental.rental_location dl ON dl.location_id = ro.dropoff_location_id
     ${whereClause}
     ORDER BY ro.total_price_cents ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findOfferById(offerId: string) {
  const result = await query(
    pool,
    `SELECT ro.*,
            rp.name AS provider_name, rp.slug AS provider_slug,
            rp.logo_url AS provider_logo, rp.rating AS provider_rating,
            rp.website_url AS provider_website,
            vc.name AS vehicle_class_name, vc.category AS vehicle_category,
            vc.passengers, vc.luggage_capacity, vc.doors, vc.transmission,
            vc.features AS vehicle_features, vc.image_url AS vehicle_image_url,
            pl.name AS pickup_location_name, pl.city AS pickup_city,
            pl.airport_code AS pickup_airport_code, pl.address AS pickup_address,
            pl.hours AS pickup_hours,
            dl.name AS dropoff_location_name, dl.city AS dropoff_city,
            dl.airport_code AS dropoff_airport_code, dl.address AS dropoff_address,
            dl.hours AS dropoff_hours
     FROM rental.rental_offer ro
     JOIN rental.rental_provider rp ON rp.provider_id = ro.provider_id
     JOIN rental.rental_vehicle_class vc ON vc.class_id = ro.vehicle_class_id
     JOIN rental.rental_location pl ON pl.location_id = ro.pickup_location_id
     JOIN rental.rental_location dl ON dl.location_id = ro.dropoff_location_id
     WHERE ro.offer_id = $1`,
    [offerId],
  );
  return result.rows[0] ?? null;
}

// ── Booking Queries ──────────────────────────────────────────────

export interface CreateRentalBookingParams {
  userId: string;
  offerId: string;
  driverName: string;
  driverLicense?: string;
  driverEmail?: string;
  extras: string[];
}

export async function createRentalBooking(params: CreateRentalBookingParams) {
  return transaction(pool, async (client: PoolClient) => {
    // Lock the offer and verify availability
    const offerResult = await client.query(
      `SELECT ro.*, vc.name AS vehicle_class_name
       FROM rental.rental_offer ro
       JOIN rental.rental_vehicle_class vc ON vc.class_id = ro.vehicle_class_id
       WHERE ro.offer_id = $1
       FOR UPDATE`,
      [params.offerId],
    );

    const offer = offerResult.rows[0];
    if (!offer) {
      throw Object.assign(new Error('Offer not found'), { statusCode: 404 });
    }

    if (offer.status !== 'available') {
      throw Object.assign(
        new Error('This offer is no longer available'),
        { statusCode: 409 },
      );
    }

    if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
      throw Object.assign(
        new Error('This offer has expired'),
        { statusCode: 409 },
      );
    }

    // Mark offer as booked
    await client.query(
      `UPDATE rental.rental_offer SET status = 'booked' WHERE offer_id = $1`,
      [params.offerId],
    );

    // Create booking
    const confirmation = generateConfirmation();
    const bookingResult = await client.query(
      `INSERT INTO rental.rental_booking
         (user_id, offer_id, confirmation_number, driver_name, driver_license,
          driver_email, extras, status, total_price_cents, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8, $9)
       RETURNING *`,
      [
        params.userId,
        params.offerId,
        confirmation,
        params.driverName,
        params.driverLicense ?? null,
        params.driverEmail ?? null,
        params.extras,
        offer.total_price_cents,
        offer.currency,
      ],
    );

    return bookingResult.rows[0];
  });
}

export async function findBookingsByUser(userId: string, limit: number, offset: number) {
  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM rental.rental_booking WHERE user_id = $1`,
    [userId],
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT rb.*,
            ro.pickup_date, ro.dropoff_date,
            ro.price_per_day_cents, ro.includes, ro.cancellation_policy,
            vc.name AS vehicle_class_name, vc.category AS vehicle_category,
            vc.image_url AS vehicle_image_url,
            rp.name AS provider_name, rp.slug AS provider_slug,
            pl.name AS pickup_location_name, pl.city AS pickup_city,
            dl.name AS dropoff_location_name, dl.city AS dropoff_city
     FROM rental.rental_booking rb
     JOIN rental.rental_offer ro ON ro.offer_id = rb.offer_id
     JOIN rental.rental_vehicle_class vc ON vc.class_id = ro.vehicle_class_id
     JOIN rental.rental_provider rp ON rp.provider_id = ro.provider_id
     JOIN rental.rental_location pl ON pl.location_id = ro.pickup_location_id
     JOIN rental.rental_location dl ON dl.location_id = ro.dropoff_location_id
     WHERE rb.user_id = $1
     ORDER BY rb.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  return { data: dataResult.rows, total };
}

export async function findBookingById(bookingId: string) {
  const result = await query(
    pool,
    `SELECT rb.*,
            ro.pickup_date, ro.dropoff_date,
            ro.price_per_day_cents, ro.includes, ro.cancellation_policy,
            vc.name AS vehicle_class_name, vc.category AS vehicle_category,
            vc.passengers, vc.luggage_capacity, vc.doors, vc.transmission,
            vc.features AS vehicle_features, vc.image_url AS vehicle_image_url,
            rp.name AS provider_name, rp.slug AS provider_slug,
            rp.logo_url AS provider_logo, rp.website_url AS provider_website,
            pl.name AS pickup_location_name, pl.city AS pickup_city,
            pl.airport_code AS pickup_airport_code, pl.address AS pickup_address,
            pl.hours AS pickup_hours,
            dl.name AS dropoff_location_name, dl.city AS dropoff_city,
            dl.airport_code AS dropoff_airport_code, dl.address AS dropoff_address,
            dl.hours AS dropoff_hours
     FROM rental.rental_booking rb
     JOIN rental.rental_offer ro ON ro.offer_id = rb.offer_id
     JOIN rental.rental_vehicle_class vc ON vc.class_id = ro.vehicle_class_id
     JOIN rental.rental_provider rp ON rp.provider_id = ro.provider_id
     JOIN rental.rental_location pl ON pl.location_id = ro.pickup_location_id
     JOIN rental.rental_location dl ON dl.location_id = ro.dropoff_location_id
     WHERE rb.booking_id = $1`,
    [bookingId],
  );
  return result.rows[0] ?? null;
}

export async function cancelRentalBooking(bookingId: string, userId: string) {
  return transaction(pool, async (client: PoolClient) => {
    // Lock the booking
    const existing = await client.query(
      `SELECT rb.*, ro.cancellation_policy, ro.pickup_date
       FROM rental.rental_booking rb
       JOIN rental.rental_offer ro ON ro.offer_id = rb.offer_id
       WHERE rb.booking_id = $1 AND rb.user_id = $2
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

    const cancellableStatuses = ['confirmed'];
    if (!cancellableStatuses.includes(booking.status)) {
      throw Object.assign(
        new Error(`Booking with status '${booking.status}' cannot be cancelled`),
        { statusCode: 409 },
      );
    }

    // Check if pickup date has passed
    if (new Date(booking.pickup_date) < new Date()) {
      throw Object.assign(
        new Error('Cannot cancel a booking for a past pickup date'),
        { statusCode: 409 },
      );
    }

    // Cancel the booking
    await client.query(
      `UPDATE rental.rental_booking SET status = 'cancelled' WHERE booking_id = $1`,
      [bookingId],
    );

    // Release the offer back to available
    await client.query(
      `UPDATE rental.rental_offer SET status = 'available' WHERE offer_id = $1`,
      [booking.offer_id],
    );

    return { cancelled: true, cancellation_policy: booking.cancellation_policy };
  });
}

export { transaction, getPool };
