import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  z,
  uuidSchema,
  validateBody,
  validateQuery,
  validateParams,
} from '@atlas/validation';
import {
  findAllProviders,
  searchLocations,
  findAllVehicleClasses,
  searchOffers,
  findOfferById,
  createRentalBooking,
  findBookingsByUser,
  findBookingById,
  cancelRentalBooking,
} from '../db/index.js';

// ── Param Schemas ───────────────────────────────────────────────

const offerIdParamSchema = z.object({
  offerId: uuidSchema,
});

const bookingIdParamSchema = z.object({
  bookingId: uuidSchema,
});

// ── Query Schemas ───────────────────────────────────────────────

const searchOffersQuerySchema = z.object({
  pickup_location_id: uuidSchema.optional(),
  dropoff_location_id: uuidSchema.optional(),
  pickup_city: z.string().max(100).optional(),
  pickup_airport: z.string().max(10).optional(),
  pickup_date: z.string().date(),
  dropoff_date: z.string().date(),
  vehicle_category: z.enum([
    'economy', 'compact', 'midsize', 'fullsize', 'premium',
    'luxury', 'suv', 'minivan', 'convertible', 'truck',
  ]).optional(),
  provider_id: uuidSchema.optional(),
  max_price: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const searchLocationsQuerySchema = z.object({
  city: z.string().max(100).optional(),
  airport_code: z.string().max(10).optional(),
  provider_id: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listBookingsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Body Schemas ────────────────────────────────────────────────

const createBookingBodySchema = z.object({
  offer_id: uuidSchema,
  driver_name: z.string().min(1).max(200),
  driver_license: z.string().max(50).optional(),
  driver_email: z.string().email().max(255).optional(),
  extras: z.array(z.string().max(50)).max(20).default([]),
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
  server.get('/api/v1/rentals/status', async () => ({
    service: 'rental-service',
    routes: [
      'search', 'locations', 'providers', 'classes',
      'offers/:offerId', 'bookings', 'bookings/:bookingId',
      'bookings/:bookingId/cancel',
    ],
  }));

  // ════════════════════════════════════════════════════════════════
  // PUBLIC: SEARCH & BROWSE
  // ════════════════════════════════════════════════════════════════

  // ── GET /api/v1/rentals/search — Search rental car offers ──────
  server.get(
    '/api/v1/rentals/search',
    { preValidation: [validateQuery(searchOffersQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const q = request.query as z.infer<typeof searchOffersQuerySchema>;

      // Validate date range
      if (new Date(q.pickup_date) >= new Date(q.dropoff_date)) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'pickup_date must be before dropoff_date',
          },
        });
      }

      // Pickup date cannot be in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(q.pickup_date) < today) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'pickup_date cannot be in the past',
          },
        });
      }

      const { data, total } = await searchOffers({
        pickup_location_id: q.pickup_location_id,
        dropoff_location_id: q.dropoff_location_id,
        pickup_city: q.pickup_city,
        pickup_airport: q.pickup_airport,
        pickup_date: q.pickup_date,
        dropoff_date: q.dropoff_date,
        vehicle_category: q.vehicle_category,
        provider_id: q.provider_id,
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

  // ── GET /api/v1/rentals/locations — Search pickup/dropoff locations ──
  server.get(
    '/api/v1/rentals/locations',
    { preValidation: [validateQuery(searchLocationsQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const q = request.query as z.infer<typeof searchLocationsQuerySchema>;

      const { data, total } = await searchLocations({
        city: q.city,
        airport_code: q.airport_code,
        provider_id: q.provider_id,
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

  // ── GET /api/v1/rentals/providers — List rental car providers ──
  server.get(
    '/api/v1/rentals/providers',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const providers = await findAllProviders();
      return reply.send({
        data: providers,
        count: providers.length,
      });
    },
  );

  // ── GET /api/v1/rentals/classes — List vehicle classes ─────────
  server.get(
    '/api/v1/rentals/classes',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const classes = await findAllVehicleClasses();
      return reply.send({
        data: classes,
        count: classes.length,
      });
    },
  );

  // ── GET /api/v1/rentals/offers/:offerId — Offer details ───────
  server.get(
    '/api/v1/rentals/offers/:offerId',
    { preValidation: [validateParams(offerIdParamSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { offerId } = request.params as z.infer<typeof offerIdParamSchema>;

      const offer = await findOfferById(offerId);
      if (!offer) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Offer not found' },
        });
      }

      return reply.send(offer);
    },
  );

  // ════════════════════════════════════════════════════════════════
  // AUTHENTICATED: BOOKING ROUTES
  // ════════════════════════════════════════════════════════════════

  // ── POST /api/v1/rentals/bookings — Create rental booking ─────
  server.post(
    '/api/v1/rentals/bookings',
    { preValidation: [validateBody(createBookingBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const body = request.body as z.infer<typeof createBookingBodySchema>;

      try {
        const booking = await createRentalBooking({
          userId,
          offerId: body.offer_id,
          driverName: body.driver_name,
          driverLicense: body.driver_license,
          driverEmail: body.driver_email,
          extras: body.extras,
        });

        request.log.info(
          { bookingId: booking.booking_id, offerId: body.offer_id },
          'Rental booking created',
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

  // ── GET /api/v1/rentals/bookings — List user's bookings ───────
  server.get(
    '/api/v1/rentals/bookings',
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

  // ── GET /api/v1/rentals/bookings/:bookingId — Booking details ─
  server.get(
    '/api/v1/rentals/bookings/:bookingId',
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

  // ── POST /api/v1/rentals/bookings/:bookingId/cancel — Cancel ──
  server.post(
    '/api/v1/rentals/bookings/:bookingId/cancel',
    { preValidation: [validateParams(bookingIdParamSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const { bookingId } = request.params as z.infer<typeof bookingIdParamSchema>;

      try {
        const result = await cancelRentalBooking(bookingId, userId);

        request.log.info({ bookingId }, 'Rental booking cancelled');

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
