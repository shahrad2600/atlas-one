import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  z,
  validateBody,
  validateQuery,
  validateParams,
  uuidSchema,
} from '@atlas/validation';
import {
  searchExperiences,
  findExperienceById,
  findDeparturesPaginated,
  findDistinctCategories,
  findOptionsByProduct,
  createBooking,
  findBookingsByUser,
  findBookingById,
  cancelBooking,
} from '../db/index.js';

// ── Param Schemas ──────────────────────────────────────────────

const experienceIdParamSchema = z.object({
  experienceId: uuidSchema,
});

const bookingIdParamSchema = z.object({
  bookingId: uuidSchema,
});

// ── Query Schemas ──────────────────────────────────────────────

const searchExperiencesQuerySchema = z.object({
  location: z.string().max(200).optional(),
  placeId: uuidSchema.optional(),
  category: z.string().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  date: z.string().optional(),
  minDuration: z.coerce.number().int().min(1).optional(),
  maxDuration: z.coerce.number().int().min(1).optional(),
  difficulty: z.enum(['easy', 'moderate', 'challenging', 'extreme']).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const departuresQuerySchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listBookingsQuerySchema = z.object({
  status: z.enum(['requested', 'confirmed', 'cancelled', 'completed', 'failed', 'modified']).optional(),
  upcoming: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Body Schemas ───────────────────────────────────────────────

const createBookingBodySchema = z.object({
  experienceId: uuidSchema,
  departureId: uuidSchema,
  participants: z.coerce.number().int().min(1).max(50),
  contactEmail: z.string().email().max(255).optional(),
  contactPhone: z.string().max(20).optional(),
  tripId: uuidSchema.optional(),
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

  server.get('/api/v1/experiences/status', async () => ({
    service: 'experiences-service',
    routes: [
      'search',
      'experiences/:experienceId',
      'experiences/:experienceId/departures',
      'categories',
      'bookings',
      'bookings/:bookingId',
      'bookings/:bookingId/cancel',
    ],
  }));

  // ────────────────────────────────────────────────────────────
  // PUBLIC: Search Experiences
  // GET /api/v1/experiences/search
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/experiences/search',
    { preValidation: [validateQuery(searchExperiencesQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof searchExperiencesQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const {
        location, placeId, category, minPrice, maxPrice,
        date, minDuration, maxDuration, difficulty, minRating,
        limit, offset,
      } = request.query as z.infer<typeof searchExperiencesQuerySchema>;

      const { data, total } = await searchExperiences({
        location,
        placeId,
        category,
        minPrice,
        maxPrice,
        date,
        minDuration,
        maxDuration,
        difficulty,
        minRating,
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
  // PUBLIC: Get Experience Details
  // GET /api/v1/experiences/:experienceId
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/experiences/:experienceId',
    { preValidation: [validateParams(experienceIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof experienceIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { experienceId } = request.params as z.infer<typeof experienceIdParamSchema>;

      const experience = await findExperienceById(experienceId);
      if (!experience) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Experience not found',
          },
        });
      }

      // Fetch options (ticket types) in parallel
      const options = await findOptionsByProduct(experienceId);

      return reply.send({
        ...experience,
        options,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // PUBLIC: List Available Departures
  // GET /api/v1/experiences/:experienceId/departures
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/experiences/:experienceId/departures',
    {
      preValidation: [
        validateParams(experienceIdParamSchema),
        validateQuery(departuresQuerySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof experienceIdParamSchema>;
        Querystring: z.infer<typeof departuresQuerySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { experienceId } = request.params as z.infer<typeof experienceIdParamSchema>;
      const { dateFrom, dateTo, limit, offset } =
        request.query as z.infer<typeof departuresQuerySchema>;

      // Verify the experience exists
      const experience = await findExperienceById(experienceId);
      if (!experience) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Experience not found',
          },
        });
      }

      const { data, total } = await findDeparturesPaginated({
        productId: experienceId,
        dateFrom,
        dateTo,
        limit,
        offset,
      });

      return reply.send({
        experience_id: experienceId,
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
  // PUBLIC: List Categories
  // GET /api/v1/experiences/categories
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/experiences/categories',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const categories = await findDistinctCategories();
      return reply.send({ data: categories });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Book an Experience
  // POST /api/v1/experiences/bookings
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/experiences/bookings',
    { preValidation: [validateBody(createBookingBodySchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createBookingBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { experienceId, departureId, participants, contactEmail, contactPhone, tripId } =
        request.body as z.infer<typeof createBookingBodySchema>;

      // Verify experience exists
      const experience = await findExperienceById(experienceId);
      if (!experience) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Experience not found',
          },
        });
      }

      // Validate participant count against product limits
      if (experience.max_group_size && participants > experience.max_group_size) {
        return reply.code(400).send({
          error: {
            code: 'GROUP_SIZE_EXCEEDED',
            message: `Party size exceeds maximum group size of ${experience.max_group_size}`,
          },
        });
      }

      if (participants < experience.min_participants) {
        return reply.code(400).send({
          error: {
            code: 'INSUFFICIENT_PARTICIPANTS',
            message: `Minimum ${experience.min_participants} participant(s) required`,
          },
        });
      }

      try {
        const booking = await createBooking({
          userId,
          experienceId,
          departureId,
          participants,
          contactEmail,
          contactPhone,
          tripId,
        });

        return reply.code(201).send(booking);
      } catch (err: unknown) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 409) {
          return reply.code(409).send({
            error: {
              code: 'BOOKING_UNAVAILABLE',
              message: error.message,
            },
          });
        }
        if (error.statusCode === 400) {
          return reply.code(400).send({
            error: {
              code: 'BAD_REQUEST',
              message: error.message,
            },
          });
        }
        throw err;
      }
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: List User's Experience Bookings
  // GET /api/v1/experiences/bookings
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/experiences/bookings',
    { preValidation: [validateQuery(listBookingsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listBookingsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { status, upcoming, limit, offset } =
        request.query as z.infer<typeof listBookingsQuerySchema>;

      const { data, total } = await findBookingsByUser(userId, {
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
  // AUTHENTICATED: Get Booking Details
  // GET /api/v1/experiences/bookings/:bookingId
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/experiences/bookings/:bookingId',
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
            message: 'Booking not found',
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

      return reply.send(booking);
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Cancel Booking
  // POST /api/v1/experiences/bookings/:bookingId/cancel
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/experiences/bookings/:bookingId/cancel',
    { preValidation: [validateParams(bookingIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof bookingIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { bookingId } = request.params as z.infer<typeof bookingIdParamSchema>;

      // Verify existence and ownership before attempting cancel
      const existing = await findBookingById(bookingId);
      if (!existing) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Booking not found',
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
              code: 'ALREADY_CANCELLED',
              message: error.message,
            },
          });
        }
        throw err;
      }
    },
  );
}
