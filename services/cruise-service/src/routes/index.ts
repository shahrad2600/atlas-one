import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  z,
  uuidSchema,
  validateBody,
  validateQuery,
  validateParams,
} from '@atlas/validation';
import {
  findAllCruiseLines,
  searchShips,
  findShipBySlug,
  findCabinTypesByShip,
  findItineraryBySlug,
  findPortCallsByItinerary,
  searchCruises,
  findSailingById,
  findCabinPricesForSailing,
  findPortByName,
  createCruiseBooking,
  findBookingsByUser,
  findBookingById,
  cancelCruiseBooking,
} from '../db/index.js';

// ── Param Schemas ───────────────────────────────────────────────

const shipSlugParamSchema = z.object({
  slug: z.string().min(1).max(300),
});

const itinerarySlugParamSchema = z.object({
  slug: z.string().min(1).max(300),
});

const sailingIdParamSchema = z.object({
  sailingId: uuidSchema,
});

const bookingIdParamSchema = z.object({
  bookingId: uuidSchema,
});

const portNameParamSchema = z.object({
  portName: z.string().min(1).max(200),
});

// ── Query Schemas ───────────────────────────────────────────────

const searchCruisesQuerySchema = z.object({
  region: z.enum([
    'caribbean', 'mediterranean', 'alaska', 'northern_europe',
    'asia', 'south_pacific', 'transatlantic',
  ]).optional(),
  line_id: uuidSchema.optional(),
  departure_from: z.string().date().optional(),
  departure_to: z.string().date().optional(),
  min_duration: z.coerce.number().int().min(1).optional(),
  max_duration: z.coerce.number().int().max(60).optional(),
  max_price: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const searchShipsQuerySchema = z.object({
  line_id: uuidSchema.optional(),
  min_capacity: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listBookingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Body Schemas ────────────────────────────────────────────────

const createBookingBodySchema = z.object({
  sailing_id: uuidSchema,
  cabin_type_id: uuidSchema.optional(),
  passengers: z.coerce.number().int().min(1).max(20).default(2),
  special_requests: z.string().max(2000).optional(),
});

// ── Helper: get authenticated user ID ───────────────────────────

function getUserId(request: FastifyRequest): string {
  const user = request.user;
  if (!user?.sub) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  return user.sub;
}

// ── Route Registration ──────────────────────────────────────────

export async function registerRoutes(server: FastifyInstance): Promise<void> {

  // ── Status (public) ─────────────────────────────────────────────
  server.get('/api/v1/cruises/status', async () => ({
    service: 'cruise-service',
    routes: [
      'search', 'lines', 'ships', 'ships/:slug',
      'itineraries/:slug', 'sailings/:sailingId',
      'ports/:portName', 'bookings', 'bookings/:bookingId',
      'bookings/:bookingId/cancel',
    ],
  }));

  // ════════════════════════════════════════════════════════════════
  // PUBLIC: SEARCH & BROWSE
  // ════════════════════════════════════════════════════════════════

  // ── GET /api/v1/cruises/search — Search cruises ────────────────
  server.get(
    '/api/v1/cruises/search',
    { preValidation: [validateQuery(searchCruisesQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const q = request.query as z.infer<typeof searchCruisesQuerySchema>;

      // Validate date range if both provided
      if (q.departure_from && q.departure_to) {
        if (new Date(q.departure_from) >= new Date(q.departure_to)) {
          return reply.code(400).send({
            error: {
              code: 'VALIDATION_ERROR',
              message: 'departure_from must be before departure_to',
            },
          });
        }
      }

      const { data, total } = await searchCruises({
        region: q.region,
        line_id: q.line_id,
        departure_from: q.departure_from,
        departure_to: q.departure_to,
        min_duration: q.min_duration,
        max_duration: q.max_duration,
        max_price: q.max_price,
        limit: q.limit,
        offset: q.offset,
      });

      return reply.send({
        data,
        pagination: {
          total,
          limit: q.limit,
          offset: q.offset,
          hasMore: q.offset + q.limit < total,
        },
      });
    },
  );

  // ── GET /api/v1/cruises/lines — List cruise lines ──────────────
  server.get(
    '/api/v1/cruises/lines',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const lines = await findAllCruiseLines();
      return reply.send({
        data: lines,
        count: lines.length,
      });
    },
  );

  // ── GET /api/v1/cruises/ships — List/search ships ──────────────
  server.get(
    '/api/v1/cruises/ships',
    { preValidation: [validateQuery(searchShipsQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const q = request.query as z.infer<typeof searchShipsQuerySchema>;

      const { data, total } = await searchShips({
        line_id: q.line_id,
        min_capacity: q.min_capacity,
        limit: q.limit,
        offset: q.offset,
      });

      return reply.send({
        data,
        pagination: {
          total,
          limit: q.limit,
          offset: q.offset,
          hasMore: q.offset + q.limit < total,
        },
      });
    },
  );

  // ── GET /api/v1/cruises/ships/:slug — Ship details ─────────────
  server.get(
    '/api/v1/cruises/ships/:slug',
    { preValidation: [validateParams(shipSlugParamSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { slug } = request.params as z.infer<typeof shipSlugParamSchema>;

      const ship = await findShipBySlug(slug);
      if (!ship) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Ship not found' },
        });
      }

      // Fetch cabin types in parallel
      const cabinTypes = await findCabinTypesByShip(ship.ship_id);

      return reply.send({
        ...ship,
        cabin_types: cabinTypes,
      });
    },
  );

  // ── GET /api/v1/cruises/itineraries/:slug — Itinerary with port calls ──
  server.get(
    '/api/v1/cruises/itineraries/:slug',
    { preValidation: [validateParams(itinerarySlugParamSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { slug } = request.params as z.infer<typeof itinerarySlugParamSchema>;

      const itinerary = await findItineraryBySlug(slug);
      if (!itinerary) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Itinerary not found' },
        });
      }

      const portCalls = await findPortCallsByItinerary(itinerary.itinerary_id);

      return reply.send({
        ...itinerary,
        port_calls: portCalls,
      });
    },
  );

  // ── GET /api/v1/cruises/sailings/:sailingId — Sailing details + cabin prices ──
  server.get(
    '/api/v1/cruises/sailings/:sailingId',
    { preValidation: [validateParams(sailingIdParamSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sailingId } = request.params as z.infer<typeof sailingIdParamSchema>;

      const sailing = await findSailingById(sailingId);
      if (!sailing) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Sailing not found' },
        });
      }

      // Get cabin pricing and port calls in parallel
      const [cabinPrices, portCalls] = await Promise.all([
        findCabinPricesForSailing(sailingId),
        findPortCallsByItinerary(sailing.itinerary_id),
      ]);

      return reply.send({
        ...sailing,
        cabin_prices: cabinPrices,
        port_calls: portCalls,
      });
    },
  );

  // ── GET /api/v1/cruises/ports/:portName — Port info ────────────
  server.get(
    '/api/v1/cruises/ports/:portName',
    { preValidation: [validateParams(portNameParamSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { portName } = request.params as z.infer<typeof portNameParamSchema>;

      const ports = await findPortByName(portName);
      if (ports.length === 0) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'No ports found matching that name' },
        });
      }

      return reply.send({
        data: ports,
        count: ports.length,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════
  // AUTHENTICATED: BOOKING ROUTES
  // ════════════════════════════════════════════════════════════════

  // ── POST /api/v1/cruises/bookings — Book cruise ────────────────
  server.post(
    '/api/v1/cruises/bookings',
    { preValidation: [validateBody(createBookingBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const body = request.body as z.infer<typeof createBookingBodySchema>;

      try {
        const booking = await createCruiseBooking({
          userId,
          sailingId: body.sailing_id,
          cabinTypeId: body.cabin_type_id,
          passengers: body.passengers,
          specialRequests: body.special_requests,
        });

        request.log.info(
          { bookingId: booking.booking_id, sailingId: body.sailing_id },
          'Cruise booking created',
        );

        return reply.code(201).send(booking);
      } catch (err: unknown) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 404) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: error.message },
          });
        }
        if (error.statusCode === 409) {
          return reply.code(409).send({
            error: { code: 'NOT_AVAILABLE', message: error.message },
          });
        }
        throw err;
      }
    },
  );

  // ── GET /api/v1/cruises/bookings — List user's bookings ────────
  server.get(
    '/api/v1/cruises/bookings',
    { preValidation: [validateQuery(listBookingsQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const q = request.query as z.infer<typeof listBookingsQuerySchema>;

      const { data, total } = await findBookingsByUser(userId, q.limit, q.offset);

      return reply.send({
        data,
        pagination: {
          total,
          limit: q.limit,
          offset: q.offset,
          hasMore: q.offset + q.limit < total,
        },
      });
    },
  );

  // ── GET /api/v1/cruises/bookings/:bookingId — Booking details ──
  server.get(
    '/api/v1/cruises/bookings/:bookingId',
    { preValidation: [validateParams(bookingIdParamSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { bookingId } = request.params as z.infer<typeof bookingIdParamSchema>;

      const booking = await findBookingById(bookingId);
      if (!booking) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Booking not found' },
        });
      }

      if (booking.user_id !== userId) {
        return reply.code(403).send({
          error: { code: 'FORBIDDEN', message: 'You do not have access to this booking' },
        });
      }

      return reply.send(booking);
    },
  );

  // ── POST /api/v1/cruises/bookings/:bookingId/cancel — Cancel ──
  server.post(
    '/api/v1/cruises/bookings/:bookingId/cancel',
    { preValidation: [validateParams(bookingIdParamSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { bookingId } = request.params as z.infer<typeof bookingIdParamSchema>;

      try {
        const result = await cancelCruiseBooking(bookingId, userId);

        request.log.info({ bookingId }, 'Cruise booking cancelled');

        return reply.send(result);
      } catch (err: unknown) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 404) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: error.message },
          });
        }
        if (error.statusCode === 409) {
          return reply.code(409).send({
            error: { code: 'CANCELLATION_NOT_ALLOWED', message: error.message },
          });
        }
        throw err;
      }
    },
  );
}
