import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  z,
  validateBody,
  validateQuery,
  validateParams,
  searchAvailabilitySchema,
  createDiningReservationSchema,
  createNotifyRequestSchema,
  uuidSchema,
} from '@atlas/validation';
import {
  searchRestaurants,
  findRestaurantById,
  findAvailableSlots,
  findExperiencesByRestaurant,
  findServicePeriodsByRestaurant,
  createReservation,
  findReservationsByUser,
  findReservationById,
  updateReservation,
  cancelReservation,
  createWaitlistEntry,
  findWaitlistByUser,
  deleteWaitlistEntry,
  createNotifyRequest,
} from '../db/index.js';

// ── Param Schemas ──────────────────────────────────────────────

const restaurantIdParamSchema = z.object({
  restaurantId: uuidSchema,
});

const reservationIdParamSchema = z.object({
  reservationId: uuidSchema,
});

const waitlistEntryIdParamSchema = z.object({
  entryId: uuidSchema,
});

// ── Query Schemas ──────────────────────────────────────────────

const searchRestaurantsQuerySchema = z.object({
  location: z.string().max(200).optional(),
  cuisine: z.string().max(100).optional(),
  priceRange: z.coerce.number().int().min(1).max(4).optional(),
  date: z.string().optional(),
  partySize: z.coerce.number().int().min(1).max(50).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listReservationsQuerySchema = z.object({
  status: z.enum(['requested', 'confirmed', 'cancelled', 'completed', 'failed', 'modified']).optional(),
  upcoming: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Body Schemas ───────────────────────────────────────────────

const createWaitlistBodySchema = z.object({
  restaurant_id: uuidSchema,
  name: z.string().min(1).max(200),
  party_size: z.coerce.number().int().min(1).max(50),
  phone: z.string().max(20).optional(),
  email: z.string().email().max(255).optional(),
  notes: z.string().max(500).optional(),
});

const modifyReservationBodySchema = z.object({
  party_size: z.coerce.number().int().min(1).max(20).optional(),
  slot_id: uuidSchema.optional(),
  start_at: z.string().datetime({ offset: true }).optional(),
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

  server.get('/api/v1/dining/status', async () => ({
    service: 'dining-service',
    routes: [
      'search', 'search/availability',
      'restaurants/:restaurantId',
      'reservations', 'reservations/:reservationId',
      'waitlist', 'waitlist/:entryId',
      'notify',
    ],
  }));

  // ────────────────────────────────────────────────────────────
  // PUBLIC: Search Restaurants
  // GET /api/v1/dining/search
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/dining/search',
    { preValidation: [validateQuery(searchRestaurantsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof searchRestaurantsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { location, cuisine, priceRange, date, partySize, limit, offset } =
        request.query as z.infer<typeof searchRestaurantsQuerySchema>;

      const { data, total } = await searchRestaurants({
        location,
        cuisine,
        priceRange,
        date,
        partySize,
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
  // PUBLIC: Search Availability
  // GET /api/v1/dining/search/availability
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/dining/search/availability',
    { preValidation: [validateQuery(searchAvailabilitySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof searchAvailabilitySchema> }>,
      reply: FastifyReply,
    ) => {
      const { restaurant_id, date, party_size, time_preference } =
        request.query as z.infer<typeof searchAvailabilitySchema>;

      const slots = await findAvailableSlots(
        restaurant_id,
        date,
        party_size,
        time_preference,
      );

      return reply.send({
        restaurant_id,
        date,
        party_size,
        available_slots: slots,
        count: slots.length,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // Restaurant Details
  // GET /api/v1/dining/restaurants/:restaurantId
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/dining/restaurants/:restaurantId',
    { preValidation: [validateParams(restaurantIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof restaurantIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { restaurantId } = request.params as z.infer<typeof restaurantIdParamSchema>;

      const restaurant = await findRestaurantById(restaurantId);
      if (!restaurant) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Restaurant not found',
          },
        });
      }

      // Fetch related data in parallel
      const [experiences, servicePeriods] = await Promise.all([
        findExperiencesByRestaurant(restaurantId),
        findServicePeriodsByRestaurant(restaurantId),
      ]);

      return reply.send({
        ...restaurant,
        experiences,
        service_periods: servicePeriods,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Create Dining Reservation
  // POST /api/v1/dining/reservations
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/dining/reservations',
    { preValidation: [validateBody(createDiningReservationSchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createDiningReservationSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { restaurant_id, slot_id, party_size, special_requests } =
        request.body as z.infer<typeof createDiningReservationSchema>;

      // Verify restaurant exists
      const restaurant = await findRestaurantById(restaurant_id);
      if (!restaurant) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Restaurant not found',
          },
        });
      }

      // Verify party size within restaurant limits
      if (party_size > restaurant.max_party_size) {
        return reply.code(400).send({
          error: {
            code: 'PARTY_SIZE_EXCEEDED',
            message: `Party size exceeds restaurant maximum of ${restaurant.max_party_size}`,
          },
        });
      }

      try {
        const reservation = await createReservation({
          userId,
          restaurantId: restaurant_id,
          slotId: slot_id,
          partySize: party_size,
          startAt: '', // determined from slot
          specialRequests: special_requests,
        });

        return reply.code(201).send(reservation);
      } catch (err: unknown) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 409) {
          return reply.code(409).send({
            error: {
              code: 'SLOT_UNAVAILABLE',
              message: error.message,
            },
          });
        }
        throw err;
      }
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: List User's Dining Reservations
  // GET /api/v1/dining/reservations
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/dining/reservations',
    { preValidation: [validateQuery(listReservationsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listReservationsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { status, upcoming, limit, offset } =
        request.query as z.infer<typeof listReservationsQuerySchema>;

      const { data, total } = await findReservationsByUser(userId, {
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
  // AUTHENTICATED: Get Reservation Details
  // GET /api/v1/dining/reservations/:reservationId
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/dining/reservations/:reservationId',
    { preValidation: [validateParams(reservationIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof reservationIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { reservationId } = request.params as z.infer<typeof reservationIdParamSchema>;

      const reservation = await findReservationById(reservationId);
      if (!reservation) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Reservation not found',
          },
        });
      }

      // Ownership check
      if (reservation.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this reservation',
          },
        });
      }

      return reply.send(reservation);
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Modify Reservation
  // PATCH /api/v1/dining/reservations/:reservationId
  // ────────────────────────────────────────────────────────────

  server.patch(
    '/api/v1/dining/reservations/:reservationId',
    {
      preValidation: [
        validateParams(reservationIdParamSchema),
        validateBody(modifyReservationBodySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof reservationIdParamSchema>;
        Body: z.infer<typeof modifyReservationBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { reservationId } = request.params as z.infer<typeof reservationIdParamSchema>;
      const { party_size, slot_id, start_at } =
        request.body as z.infer<typeof modifyReservationBodySchema>;

      // Verify the reservation exists and belongs to the user
      const existing = await findReservationById(reservationId);
      if (!existing) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Reservation not found',
          },
        });
      }

      if (existing.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this reservation',
          },
        });
      }

      if (existing.status === 'cancelled') {
        return reply.code(409).send({
          error: {
            code: 'ALREADY_CANCELLED',
            message: 'Cannot modify a cancelled reservation',
          },
        });
      }

      try {
        const updated = await updateReservation(reservationId, userId, {
          partySize: party_size,
          slotId: slot_id,
          startAt: start_at,
        });

        return reply.send(updated);
      } catch (err: unknown) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 409) {
          return reply.code(409).send({
            error: {
              code: 'SLOT_UNAVAILABLE',
              message: error.message,
            },
          });
        }
        throw err;
      }
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Cancel Reservation
  // POST /api/v1/dining/reservations/:reservationId/cancel
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/dining/reservations/:reservationId/cancel',
    { preValidation: [validateParams(reservationIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof reservationIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { reservationId } = request.params as z.infer<typeof reservationIdParamSchema>;

      // Verify existence and ownership
      const existing = await findReservationById(reservationId);
      if (!existing) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Reservation not found',
          },
        });
      }

      if (existing.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this reservation',
          },
        });
      }

      try {
        await cancelReservation(reservationId, userId);
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

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Join Waitlist
  // POST /api/v1/dining/waitlist
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/dining/waitlist',
    { preValidation: [validateBody(createWaitlistBodySchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createWaitlistBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { restaurant_id, name, party_size, phone, email, notes } =
        request.body as z.infer<typeof createWaitlistBodySchema>;

      // Verify restaurant exists
      const restaurant = await findRestaurantById(restaurant_id);
      if (!restaurant) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Restaurant not found',
          },
        });
      }

      const entry = await createWaitlistEntry({
        restaurantId: restaurant_id,
        userId,
        name,
        partySize: party_size,
        phone,
        email,
        notes,
      });

      return reply.code(201).send(entry);
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Get User's Waitlist Entries
  // GET /api/v1/dining/waitlist
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/dining/waitlist',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const entries = await findWaitlistByUser(userId);
      return reply.send({ data: entries });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Leave Waitlist
  // DELETE /api/v1/dining/waitlist/:entryId
  // ────────────────────────────────────────────────────────────

  server.delete(
    '/api/v1/dining/waitlist/:entryId',
    { preValidation: [validateParams(waitlistEntryIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof waitlistEntryIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { entryId } = request.params as z.infer<typeof waitlistEntryIdParamSchema>;

      const deleted = await deleteWaitlistEntry(entryId, userId);
      if (!deleted) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Waitlist entry not found or not owned by you',
          },
        });
      }

      return reply.code(204).send();
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Request Availability Notification
  // POST /api/v1/dining/notify
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/dining/notify',
    { preValidation: [validateBody(createNotifyRequestSchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createNotifyRequestSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { restaurant_id, target_date, party_size, time_start, time_end } =
        request.body as z.infer<typeof createNotifyRequestSchema>;

      // Verify restaurant exists
      const restaurant = await findRestaurantById(restaurant_id);
      if (!restaurant) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Restaurant not found',
          },
        });
      }

      const notification = await createNotifyRequest({
        restaurantId: restaurant_id,
        userId,
        partySize: party_size,
        targetDate: target_date,
        timeStart: time_start,
        timeEnd: time_end,
      });

      return reply.code(201).send(notification);
    },
  );
}
