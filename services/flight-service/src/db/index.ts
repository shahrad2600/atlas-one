import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ── Airport Queries ──────────────────────────────────────────────

export async function searchAirports(q: string, limit: number = 20) {
  const result = await query(
    pool,
    `SELECT airport_id, entity_id, iata, icao, name, lat, lng, timezone, terminal_count
     FROM flight.flight_airport
     WHERE iata ILIKE $1 OR name ILIKE $2
     ORDER BY
       CASE WHEN iata ILIKE $1 THEN 0 ELSE 1 END,
       name ASC
     LIMIT $3`,
    [q.toUpperCase(), `%${q}%`, limit],
  );
  return result.rows;
}

export async function findAirportById(airportId: string) {
  const result = await query(
    pool,
    `SELECT airport_id, entity_id, iata, icao, name, lat, lng, timezone, terminal_count,
            created_at, updated_at
     FROM flight.flight_airport
     WHERE airport_id = $1`,
    [airportId],
  );
  return result.rows[0] ?? null;
}

// ── Airline Queries ──────────────────────────────────────────────

export async function searchAirlines(q?: string, limit: number = 50) {
  if (q) {
    const result = await query(
      pool,
      `SELECT airline_id, supplier_id, iata, icao, name, logo_url, alliance, active
       FROM flight.flight_airline
       WHERE active = TRUE
         AND (iata ILIKE $1 OR name ILIKE $2)
       ORDER BY
         CASE WHEN iata ILIKE $1 THEN 0 ELSE 1 END,
         name ASC
       LIMIT $3`,
      [q.toUpperCase(), `%${q}%`, limit],
    );
    return result.rows;
  }

  const result = await query(
    pool,
    `SELECT airline_id, supplier_id, iata, icao, name, logo_url, alliance, active
     FROM flight.flight_airline
     WHERE active = TRUE
     ORDER BY name ASC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export async function findAirlineById(airlineId: string) {
  const result = await query(
    pool,
    `SELECT airline_id, supplier_id, iata, icao, name, logo_url, alliance, active,
            created_at, updated_at
     FROM flight.flight_airline
     WHERE airline_id = $1`,
    [airlineId],
  );
  return result.rows[0] ?? null;
}

// ── Route Queries ────────────────────────────────────────────────

export async function findRouteById(routeId: string) {
  const result = await query(
    pool,
    `SELECT fr.route_id, fr.entity_id,
            fr.origin_airport_id, fr.dest_airport_id, fr.airline_id,
            fr.typical_duration_min, fr.distance_km, fr.frequency_per_week, fr.active,
            fr.created_at,
            orig.iata AS origin_iata, orig.name AS origin_name, orig.timezone AS origin_timezone,
            orig.lat AS origin_lat, orig.lng AS origin_lng,
            dest.iata AS dest_iata, dest.name AS dest_name, dest.timezone AS dest_timezone,
            dest.lat AS dest_lat, dest.lng AS dest_lng,
            al.iata AS airline_iata, al.name AS airline_name, al.logo_url AS airline_logo
     FROM flight.flight_route fr
     JOIN flight.flight_airport orig ON orig.airport_id = fr.origin_airport_id
     JOIN flight.flight_airport dest ON dest.airport_id = fr.dest_airport_id
     JOIN flight.flight_airline al ON al.airline_id = fr.airline_id
     WHERE fr.route_id = $1`,
    [routeId],
  );
  return result.rows[0] ?? null;
}

export async function findRouteCarriers(originAirportId: string, destAirportId: string) {
  const result = await query(
    pool,
    `SELECT DISTINCT al.airline_id, al.iata, al.name, al.logo_url, al.alliance
     FROM flight.flight_route fr
     JOIN flight.flight_airline al ON al.airline_id = fr.airline_id
     WHERE fr.origin_airport_id = $1 AND fr.dest_airport_id = $2 AND fr.active = TRUE
     ORDER BY al.name`,
    [originAirportId, destAirportId],
  );
  return result.rows;
}

// ── Offer Queries ────────────────────────────────────────────────

export interface SearchFlightsParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
  maxStops?: number;
  priceMax?: number;
  limit: number;
  offset: number;
}

export async function searchFlights(params: SearchFlightsParams) {
  const conditions: string[] = [
    `orig.iata = $1`,
    `dest.iata = $2`,
    `fo.expires_at > NOW()`,
  ];
  const values: unknown[] = [params.origin.toUpperCase(), params.destination.toUpperCase()];
  let idx = 3;

  // Filter by departure date
  conditions.push(`(fo.segments->0->>'departure')::date = $${idx}::date`);
  values.push(params.departureDate);
  idx++;

  // Filter by cabin class in search params
  conditions.push(`fo.search_params->>'cabin_class' = $${idx}`);
  values.push(params.cabinClass);
  idx++;

  if (params.priceMax !== undefined) {
    conditions.push(`fo.total_price <= $${idx}`);
    values.push(params.priceMax);
    idx++;
  }

  const whereClause = conditions.join(' AND ');

  // Count total matching offers
  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM flight.flight_offer fo
     JOIN flight.flight_route fr ON fr.route_id = (fo.search_params->>'route_id')::uuid
     JOIN flight.flight_airport orig ON orig.airport_id = fr.origin_airport_id
     JOIN flight.flight_airport dest ON dest.airport_id = fr.dest_airport_id
     WHERE ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  // Fetch paginated offers sorted by price
  const dataResult = await query(
    pool,
    `SELECT fo.offer_id, fo.user_id, fo.trip_id,
            fo.search_params, fo.total_price, fo.currency,
            fo.segments, fo.baggage, fo.fare_rules,
            fo.fare_class, fo.booking_class,
            fo.provider, fo.provider_offer_id, fo.expires_at, fo.created_at,
            orig.iata AS origin_iata, orig.name AS origin_name,
            dest.iata AS dest_iata, dest.name AS dest_name,
            al.iata AS airline_iata, al.name AS airline_name, al.logo_url AS airline_logo
     FROM flight.flight_offer fo
     JOIN flight.flight_route fr ON fr.route_id = (fo.search_params->>'route_id')::uuid
     JOIN flight.flight_airport orig ON orig.airport_id = fr.origin_airport_id
     JOIN flight.flight_airport dest ON dest.airport_id = fr.dest_airport_id
     LEFT JOIN flight.flight_airline al ON al.airline_id = fr.airline_id
     WHERE ${whereClause}
     ORDER BY fo.total_price ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findOfferById(offerId: string) {
  const result = await query(
    pool,
    `SELECT fo.*,
            orig.iata AS origin_iata, orig.name AS origin_name,
            orig.timezone AS origin_timezone,
            dest.iata AS dest_iata, dest.name AS dest_name,
            dest.timezone AS dest_timezone,
            al.iata AS airline_iata, al.name AS airline_name, al.logo_url AS airline_logo
     FROM flight.flight_offer fo
     LEFT JOIN flight.flight_route fr ON fr.route_id = (fo.search_params->>'route_id')::uuid
     LEFT JOIN flight.flight_airport orig ON orig.airport_id = fr.origin_airport_id
     LEFT JOIN flight.flight_airport dest ON dest.airport_id = fr.dest_airport_id
     LEFT JOIN flight.flight_airline al ON al.airline_id = fr.airline_id
     WHERE fo.offer_id = $1`,
    [offerId],
  );
  return result.rows[0] ?? null;
}

// ── Ticket / Booking Queries ─────────────────────────────────────

export async function findTicketById(ticketId: string) {
  const result = await query(
    pool,
    `SELECT ft.*,
            al.iata AS airline_iata, al.name AS airline_name, al.logo_url AS airline_logo
     FROM flight.flight_ticket ft
     JOIN flight.flight_airline al ON al.airline_id = ft.airline_id
     WHERE ft.ticket_id = $1`,
    [ticketId],
  );
  return result.rows[0] ?? null;
}

export async function findTicketByReservationId(reservationId: string) {
  const result = await query(
    pool,
    `SELECT ft.*,
            al.iata AS airline_iata, al.name AS airline_name, al.logo_url AS airline_logo
     FROM flight.flight_ticket ft
     JOIN flight.flight_airline al ON al.airline_id = ft.airline_id
     WHERE ft.reservation_id = $1`,
    [reservationId],
  );
  return result.rows[0] ?? null;
}

export interface CreateBookingParams {
  userId: string;
  offerId: string;
  passengers: Array<{
    name: string;
    dob: string;
    passport?: string;
    frequent_flyer?: string;
  }>;
  tripId?: string;
}

export async function createBooking(params: CreateBookingParams) {
  return transaction(pool, async (client: PoolClient) => {
    // Lock and verify offer is still valid
    const offerResult = await client.query(
      `SELECT fo.*, fr.airline_id, fr.origin_airport_id, fr.dest_airport_id
       FROM flight.flight_offer fo
       LEFT JOIN flight.flight_route fr ON fr.route_id = (fo.search_params->>'route_id')::uuid
       WHERE fo.offer_id = $1 AND fo.expires_at > NOW()
       FOR UPDATE`,
      [params.offerId],
    );

    if (offerResult.rows.length === 0) {
      throw Object.assign(
        new Error('Offer has expired or does not exist'),
        { statusCode: 410 },
      );
    }

    const offer = offerResult.rows[0];

    // Determine airline_id: from route join or first segment
    const airlineId = offer.airline_id;
    if (!airlineId) {
      throw Object.assign(
        new Error('Unable to determine airline for this offer'),
        { statusCode: 422 },
      );
    }

    // Create a commerce reservation for the flight
    const reservationResult = await client.query(
      `INSERT INTO commerce.commerce_reservation
         (user_id, trip_id, reservation_type, supplier_id, start_at, party_size,
          status, price_paid, currency, external_provider, external_reservation_id)
       VALUES ($1, $2, 'flight', $3, (($4::jsonb)->0->>'departure')::timestamptz,
               $5, 'confirmed', $6, $7, $8, $9)
       RETURNING *`,
      [
        params.userId,
        params.tripId ?? null,
        airlineId,
        JSON.stringify(offer.segments),
        params.passengers.length,
        offer.total_price,
        offer.currency,
        offer.provider,
        offer.provider_offer_id,
      ],
    );

    const reservation = reservationResult.rows[0];

    // Generate PNR (6-character alphanumeric)
    const pnr = generatePNR();

    // Create the flight ticket
    const ticketResult = await client.query(
      `INSERT INTO flight.flight_ticket
         (reservation_id, offer_id, airline_id, pnr, passengers, segments,
          fare_paid, currency, status)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, 'issued')
       RETURNING *`,
      [
        reservation.reservation_id,
        params.offerId,
        airlineId,
        pnr,
        JSON.stringify(params.passengers),
        JSON.stringify(offer.segments),
        offer.total_price,
        offer.currency,
      ],
    );

    return {
      reservation,
      ticket: ticketResult.rows[0],
    };
  });
}

function generatePNR(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pnr = '';
  for (let i = 0; i < 6; i++) {
    pnr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pnr;
}

export interface ListBookingsParams {
  userId: string;
  status?: string;
  upcoming?: boolean;
  limit: number;
  offset: number;
}

export async function findBookingsByUser(params: ListBookingsParams) {
  const conditions: string[] = [`cr.user_id = $1`, `cr.reservation_type = 'flight'`];
  const values: unknown[] = [params.userId];
  let idx = 2;

  if (params.status) {
    conditions.push(`cr.status = $${idx}`);
    values.push(params.status);
    idx++;
  }

  if (params.upcoming) {
    conditions.push(`cr.start_at >= NOW()`);
  }

  const whereClause = conditions.join(' AND ');

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total
     FROM commerce.commerce_reservation cr
     WHERE ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT cr.reservation_id, cr.order_id, cr.user_id, cr.trip_id,
            cr.reservation_type, cr.start_at, cr.end_at, cr.party_size,
            cr.status, cr.price_paid, cr.currency,
            cr.external_confirmation_code, cr.external_provider,
            cr.created_at, cr.updated_at,
            ft.ticket_id, ft.pnr, ft.ticket_number, ft.passengers,
            ft.segments, ft.fare_paid, ft.status AS ticket_status
     FROM commerce.commerce_reservation cr
     LEFT JOIN flight.flight_ticket ft ON ft.reservation_id = cr.reservation_id
     WHERE ${whereClause}
     ORDER BY cr.start_at ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findBookingById(reservationId: string) {
  const result = await query(
    pool,
    `SELECT cr.reservation_id, cr.order_id, cr.user_id, cr.trip_id,
            cr.reservation_type, cr.start_at, cr.end_at, cr.party_size,
            cr.status, cr.price_paid, cr.currency,
            cr.external_confirmation_code, cr.external_provider,
            cr.created_at, cr.updated_at,
            ft.ticket_id, ft.pnr, ft.ticket_number, ft.passengers,
            ft.segments AS ticket_segments, ft.fare_paid AS ticket_fare,
            ft.fare_class, ft.status AS ticket_status, ft.e_ticket_url,
            al.iata AS airline_iata, al.name AS airline_name, al.logo_url AS airline_logo
     FROM commerce.commerce_reservation cr
     LEFT JOIN flight.flight_ticket ft ON ft.reservation_id = cr.reservation_id
     LEFT JOIN flight.flight_airline al ON al.airline_id = ft.airline_id
     WHERE cr.reservation_id = $1 AND cr.reservation_type = 'flight'`,
    [reservationId],
  );
  return result.rows[0] ?? null;
}

export async function cancelBooking(reservationId: string, userId: string) {
  return transaction(pool, async (client: PoolClient) => {
    // Lock and verify ownership
    const existing = await client.query(
      `SELECT cr.*, ft.ticket_id, ft.status AS ticket_status, ft.offer_id
       FROM commerce.commerce_reservation cr
       LEFT JOIN flight.flight_ticket ft ON ft.reservation_id = cr.reservation_id
       WHERE cr.reservation_id = $1 AND cr.user_id = $2 AND cr.reservation_type = 'flight'
       FOR UPDATE`,
      [reservationId, userId],
    );

    if (existing.rows.length === 0) {
      throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
    }

    const booking = existing.rows[0];

    if (booking.status === 'cancelled') {
      throw Object.assign(new Error('Booking is already cancelled'), { statusCode: 409 });
    }

    if (booking.status === 'completed') {
      throw Object.assign(new Error('Cannot cancel a completed booking'), { statusCode: 409 });
    }

    // Check if departure is in the past
    if (booking.start_at && new Date(booking.start_at) < new Date()) {
      throw Object.assign(
        new Error('Cannot cancel a booking for a flight that has already departed'),
        { statusCode: 409 },
      );
    }

    // Check fare rules for cancellation eligibility
    if (booking.offer_id) {
      const offerResult = await client.query(
        `SELECT fare_rules FROM flight.flight_offer WHERE offer_id = $1`,
        [booking.offer_id],
      );
      const fareRules = offerResult.rows[0]?.fare_rules;
      if (fareRules && fareRules.refundable === false) {
        // Non-refundable fares can still be cancelled, but we note it
        // The actual refund logic would be handled by the finance service
      }
    }

    // Cancel the reservation
    await client.query(
      `UPDATE commerce.commerce_reservation
       SET status = 'cancelled', updated_at = NOW()
       WHERE reservation_id = $1`,
      [reservationId],
    );

    // Cancel the ticket
    if (booking.ticket_id) {
      await client.query(
        `UPDATE flight.flight_ticket
         SET status = 'cancelled', updated_at = NOW()
         WHERE ticket_id = $1`,
        [booking.ticket_id],
      );

      // Create a servicing case for the cancellation
      await client.query(
        `INSERT INTO flight.flight_servicing_case
           (ticket_id, case_type, status, notes)
         VALUES ($1, 'cancel', 'resolved', 'User-initiated cancellation')`,
        [booking.ticket_id],
      );
    }
  });
}

// ── Disruption Queries ───────────────────────────────────────────

export async function findDisruptions(routeId: string) {
  // Find disruptions for tickets on a given route
  const result = await query(
    pool,
    `SELECT fd.disruption_id, fd.ticket_id, fd.flight_number,
            fd.disruption_type, fd.severity, fd.delay_minutes,
            fd.description, fd.source, fd.recommended_actions,
            fd.auto_rebooked, fd.created_at
     FROM flight.flight_disruption fd
     WHERE fd.ticket_id IN (
       SELECT ft.ticket_id
       FROM flight.flight_ticket ft
       JOIN flight.flight_offer fo ON fo.offer_id = ft.offer_id
       WHERE (fo.search_params->>'route_id')::uuid = $1
     )
     ORDER BY fd.created_at DESC`,
    [routeId],
  );
  return result.rows;
}

export async function findDisruptionsByRouteId(routeId: string) {
  // Find all disruptions related to flights on this route via flight numbers
  const result = await query(
    pool,
    `SELECT fd.disruption_id, fd.ticket_id, fd.flight_number,
            fd.disruption_type, fd.severity, fd.delay_minutes,
            fd.description, fd.source, fd.recommended_actions,
            fd.auto_rebooked, fd.created_at
     FROM flight.flight_disruption fd
     WHERE fd.ticket_id IN (
       SELECT ft.ticket_id
       FROM flight.flight_ticket ft
       JOIN flight.flight_offer fo ON fo.offer_id = ft.offer_id
       JOIN flight.flight_route fr ON fr.route_id = (fo.search_params->>'route_id')::uuid
       WHERE fr.route_id = $1
     )
     ORDER BY fd.created_at DESC`,
    [routeId],
  );
  return result.rows;
}

export async function findDisruptionsForUser(userId: string) {
  const result = await query(
    pool,
    `SELECT fd.disruption_id, fd.ticket_id, fd.flight_number,
            fd.disruption_type, fd.severity, fd.delay_minutes,
            fd.description, fd.source, fd.recommended_actions,
            fd.auto_rebooked, fd.created_at,
            ft.pnr, ft.ticket_number,
            cr.reservation_id, cr.start_at
     FROM flight.flight_disruption fd
     JOIN flight.flight_ticket ft ON ft.ticket_id = fd.ticket_id
     JOIN commerce.commerce_reservation cr ON cr.reservation_id = ft.reservation_id
     WHERE cr.user_id = $1
       AND cr.status IN ('confirmed', 'modified')
       AND cr.start_at >= NOW()
     ORDER BY fd.created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function findDisruptionsByTicketId(ticketId: string) {
  const result = await query(
    pool,
    `SELECT disruption_id, ticket_id, flight_number,
            disruption_type, severity, delay_minutes,
            description, source, recommended_actions,
            auto_rebooked, created_at
     FROM flight.flight_disruption
     WHERE ticket_id = $1
     ORDER BY created_at DESC`,
    [ticketId],
  );
  return result.rows;
}

export { transaction, getPool };
