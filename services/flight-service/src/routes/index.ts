import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  z,
  validateBody,
  validateQuery,
  validateParams,
  searchFlightSchema,
  uuidSchema,
  isoDateSchema,
} from '@atlas/validation';
import {
  searchFlights,
  findOfferById,
  searchAirports,
  searchAirlines,
  findRouteById,
  findDisruptionsByRouteId,
  findDisruptionsByTicketId,
  findDisruptionsForUser,
  createBooking,
  findBookingsByUser,
  findBookingById,
  cancelBooking,
} from '../db/index.js';

// ── Param Schemas ──────────────────────────────────────────────

const offerIdParamSchema = z.object({
  offerId: uuidSchema,
});

const bookingIdParamSchema = z.object({
  bookingId: uuidSchema,
});

const routeIdParamSchema = z.object({
  routeId: uuidSchema,
});

// ── Query Schemas ──────────────────────────────────────────────

const searchFlightsQuerySchema = searchFlightSchema.extend({
  max_stops: z.coerce.number().int().min(0).max(3).optional(),
  price_max: z.coerce.number().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const airportSearchQuerySchema = z.object({
  q: z.string().min(1).max(50),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const airlineSearchQuerySchema = z.object({
  q: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const listBookingsQuerySchema = z.object({
  status: z.enum(['requested', 'confirmed', 'cancelled', 'completed', 'failed', 'modified']).optional(),
  upcoming: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Body Schemas ───────────────────────────────────────────────

const passengerSchema = z.object({
  name: z.string().min(1).max(200),
  dob: isoDateSchema,
  passport: z.string().max(50).optional(),
  frequent_flyer: z.string().max(50).optional(),
});

const createBookingBodySchema = z.object({
  offer_id: uuidSchema,
  passengers: z.array(passengerSchema).min(1).max(9),
  trip_id: uuidSchema.optional(),
});

// ── Helper: get authenticated user ID ──────────────────────────

function getUserId(request: FastifyRequest): string {
  const user = request.user;
  if (!user?.sub) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  return user.sub;
}

// ── Route Registration ─────────────────────────────────────────

export async function registerRoutes(server: FastifyInstance): Promise<void> {

  // ────────────────────────────────────────────────────────────
  // Status
  // ────────────────────────────────────────────────────────────

  server.get('/api/v1/flights/status', async () => ({
    service: 'flight-service',
    routes: [
      'search', 'offers/:offerId',
      'airports', 'airlines',
      'bookings', 'bookings/:bookingId', 'bookings/:bookingId/cancel',
      'disruptions', 'routes/:routeId', 'routes/:routeId/disruptions',
    ],
  }));

  // ────────────────────────────────────────────────────────────
  // 1. PUBLIC: Search Flights
  // GET /api/v1/flights/search
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/flights/search',
    { preValidation: [validateQuery(searchFlightsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof searchFlightsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const {
        origin,
        destination,
        departure_date,
        return_date,
        passengers,
        cabin_class,
        max_stops,
        price_max,
        limit,
        offset,
      } = request.query as z.infer<typeof searchFlightsQuerySchema>;

      const { data, total } = await searchFlights({
        origin,
        destination,
        departureDate: departure_date,
        returnDate: return_date,
        passengers,
        cabinClass: cabin_class,
        maxStops: max_stops,
        priceMax: price_max,
        limit,
        offset,
      });

      return reply.send({
        data,
        search: {
          origin,
          destination,
          departure_date,
          return_date,
          passengers,
          cabin_class,
        },
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // 2. PUBLIC: Get Offer Details
  // GET /api/v1/flights/offers/:offerId
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/flights/offers/:offerId',
    { preValidation: [validateParams(offerIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof offerIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { offerId } = request.params as z.infer<typeof offerIdParamSchema>;

      const offer = await findOfferById(offerId);
      if (!offer) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Flight offer not found',
          },
        });
      }

      // Check if offer has expired
      if (new Date(offer.expires_at) < new Date()) {
        return reply.code(410).send({
          error: {
            code: 'OFFER_EXPIRED',
            message: 'This flight offer has expired',
          },
        });
      }

      return reply.send(offer);
    },
  );

  // ────────────────────────────────────────────────────────────
  // 3. PUBLIC: Search Airports
  // GET /api/v1/flights/airports
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/flights/airports',
    { preValidation: [validateQuery(airportSearchQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof airportSearchQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { q, limit } = request.query as z.infer<typeof airportSearchQuerySchema>;

      const airports = await searchAirports(q, limit);

      return reply.send({
        data: airports,
        count: airports.length,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // 4. AUTHENTICATED: Book a Flight
  // POST /api/v1/flights/bookings
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/flights/bookings',
    { preValidation: [validateBody(createBookingBodySchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createBookingBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { offer_id, passengers, trip_id } =
        request.body as z.infer<typeof createBookingBodySchema>;

      // Verify the offer exists and is still valid
      const offer = await findOfferById(offer_id);
      if (!offer) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Flight offer not found',
          },
        });
      }

      if (new Date(offer.expires_at) < new Date()) {
        return reply.code(410).send({
          error: {
            code: 'OFFER_EXPIRED',
            message: 'This flight offer has expired. Please search for new flights.',
          },
        });
      }

      try {
        const booking = await createBooking({
          userId,
          offerId: offer_id,
          passengers,
          tripId: trip_id,
        });

        return reply.code(201).send({
          reservation: booking.reservation,
          ticket: {
            ticket_id: booking.ticket.ticket_id,
            pnr: booking.ticket.pnr,
            passengers: booking.ticket.passengers,
            segments: booking.ticket.segments,
            fare_paid: booking.ticket.fare_paid,
            currency: booking.ticket.currency,
            status: booking.ticket.status,
          },
        });
      } catch (err: unknown) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 410) {
          return reply.code(410).send({
            error: {
              code: 'OFFER_EXPIRED',
              message: error.message,
            },
          });
        }
        if (error.statusCode === 422) {
          return reply.code(422).send({
            error: {
              code: 'UNPROCESSABLE',
              message: error.message,
            },
          });
        }
        throw err;
      }
    },
  );

  // ────────────────────────────────────────────────────────────
  // 5. AUTHENTICATED: List User's Flight Bookings
  // GET /api/v1/flights/bookings
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/flights/bookings',
    { preValidation: [validateQuery(listBookingsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listBookingsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { status, upcoming, limit, offset } =
        request.query as z.infer<typeof listBookingsQuerySchema>;

      const { data, total } = await findBookingsByUser({
        userId,
        status,
        upcoming: upcoming ?? false,
        limit,
        offset,
      });

      return reply.send({
        data,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // 6. AUTHENTICATED: Get Booking Details
  // GET /api/v1/flights/bookings/:bookingId
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/flights/bookings/:bookingId',
    { preValidation: [validateParams(bookingIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof bookingIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { bookingId } = request.params as z.infer<typeof bookingIdParamSchema>;

      const booking = await findBookingById(bookingId);
      if (!booking) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Flight booking not found',
          },
        });
      }

      // Ownership check
      if (booking.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this booking',
          },
        });
      }

      // Fetch disruptions for this booking's ticket if it exists
      let disruptions: unknown[] = [];
      if (booking.ticket_id) {
        disruptions = await findDisruptionsByTicketId(booking.ticket_id);
      }

      return reply.send({
        ...booking,
        disruptions,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // 7. AUTHENTICATED: Cancel Flight Booking
  // POST /api/v1/flights/bookings/:bookingId/cancel
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/flights/bookings/:bookingId/cancel',
    { preValidation: [validateParams(bookingIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof bookingIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { bookingId } = request.params as z.infer<typeof bookingIdParamSchema>;

      // Verify existence and ownership before cancellation attempt
      const existing = await findBookingById(bookingId);
      if (!existing) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Flight booking not found',
          },
        });
      }

      if (existing.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this booking',
          },
        });
      }

      try {
        await cancelBooking(bookingId, userId);
        return reply.code(204).send();
      } catch (err: unknown) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 409) {
          return reply.code(409).send({
            error: {
              code: 'CANCELLATION_FAILED',
              message: error.message,
            },
          });
        }
        throw err;
      }
    },
  );

  // ────────────────────────────────────────────────────────────
  // 8. AUTHENTICATED: Get Disruptions for User's Flights
  // GET /api/v1/flights/disruptions
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/flights/disruptions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);

      const disruptions = await findDisruptionsForUser(userId);

      return reply.send({
        data: disruptions,
        count: disruptions.length,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // 9. PUBLIC: Get Route Disruptions
  // GET /api/v1/flights/routes/:routeId/disruptions
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/flights/routes/:routeId/disruptions',
    { preValidation: [validateParams(routeIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof routeIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { routeId } = request.params as z.infer<typeof routeIdParamSchema>;

      // Verify route exists
      const route = await findRouteById(routeId);
      if (!route) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Route not found',
          },
        });
      }

      const disruptions = await findDisruptionsByRouteId(routeId);

      return reply.send({
        route_id: routeId,
        data: disruptions,
        count: disruptions.length,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // 10. PUBLIC: List Airlines
  // GET /api/v1/flights/airlines
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/flights/airlines',
    { preValidation: [validateQuery(airlineSearchQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof airlineSearchQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { q, limit } = request.query as z.infer<typeof airlineSearchQuerySchema>;

      const airlines = await searchAirlines(q, limit);

      return reply.send({
        data: airlines,
        count: airlines.length,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // 11. PUBLIC: Get Route Info
  // GET /api/v1/flights/routes/:routeId
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/flights/routes/:routeId',
    { preValidation: [validateParams(routeIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof routeIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { routeId } = request.params as z.infer<typeof routeIdParamSchema>;

      const route = await findRouteById(routeId);
      if (!route) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Route not found',
          },
        });
      }

      return reply.send({
        route_id: route.route_id,
        origin: {
          airport_id: route.origin_airport_id,
          iata: route.origin_iata,
          name: route.origin_name,
          timezone: route.origin_timezone,
          lat: route.origin_lat,
          lng: route.origin_lng,
        },
        destination: {
          airport_id: route.dest_airport_id,
          iata: route.dest_iata,
          name: route.dest_name,
          timezone: route.dest_timezone,
          lat: route.dest_lat,
          lng: route.dest_lng,
        },
        airline: {
          airline_id: route.airline_id,
          iata: route.airline_iata,
          name: route.airline_name,
          logo_url: route.airline_logo,
        },
        typical_duration_min: route.typical_duration_min,
        distance_km: route.distance_km,
        frequency_per_week: route.frequency_per_week,
        active: route.active,
      });
    },
  );
}
