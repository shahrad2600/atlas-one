import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  z,
  searchStaySchema,
  uuidSchema,
  validateBody,
  validateQuery,
  validateParams,
} from '@atlas/validation';
import {
  findPropertyById,
  searchProperties,
  findRoomTypesByProperty,
  findAvailabilityForProperty,
  findRatePlansByProperty,
  findRatePlanForRoomType,
  checkRatePlanAvailability,
  findReviewsByProperty,
  getReviewSummary,
  findStayBookingsByUser,
  findStayBookingById,
  createStayBooking,
  cancelStayBooking,
  findPropertiesByHost,
  findPropertyIntelligence,
  checkPropertyOwnership,
  searchVacationRentals,
  findVacationRentalById,
  createVacationRentalBooking,
} from '../db/index.js';

// ── Param Schemas ───────────────────────────────────────────────

const propertyIdParamSchema = z.object({
  propertyId: uuidSchema,
});

const bookingIdParamSchema = z.object({
  bookingId: uuidSchema,
});

const hostPropertyIdParamSchema = z.object({
  propertyId: uuidSchema,
});

const rentalIdParamSchema = z.object({
  rentalId: uuidSchema,
});

// ── Query Schemas ───────────────────────────────────────────────

const searchQuerySchema = searchStaySchema.extend({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const availabilityQuerySchema = z.object({
  check_in: z.string().date(),
  check_out: z.string().date(),
});

const listBookingsQuerySchema = z.object({
  status: z.enum(['requested', 'confirmed', 'cancelled', 'completed', 'failed', 'modified']).optional(),
  upcoming: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Vacation Rental Query Schemas ────────────────────────────────

const searchVacationRentalsQuerySchema = z.object({
  rental_type: z.enum([
    'entire_home', 'private_room', 'shared_room', 'villa', 'cabin',
    'cottage', 'apartment', 'condo', 'townhouse',
  ]).optional(),
  min_guests: z.coerce.number().int().min(1).optional(),
  min_bedrooms: z.coerce.number().int().min(0).optional(),
  min_bathrooms: z.coerce.number().min(0).optional(),
  max_price: z.coerce.number().int().positive().optional(),
  instant_book: z.coerce.boolean().optional(),
  city: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Body Schemas ────────────────────────────────────────────────

const createBookingBodySchema = z.object({
  property_id: uuidSchema,
  room_type_id: uuidSchema,
  check_in: z.string().date(),
  check_out: z.string().date(),
  guests: z.coerce.number().int().min(1).max(30),
});

const createVacationRentalBookingBodySchema = z.object({
  check_in: z.string().date(),
  check_out: z.string().date(),
  guests: z.coerce.number().int().min(1).max(30),
});

// ── Helper: get authenticated user ID ───────────────────────────

function getUserId(request: FastifyRequest): string {
  const user = request.user;
  if (!user?.sub) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  return user.sub;
}

/**
 * Check if the user has the Partner role (host).
 * In Atlas, hosts are users with the 'partner' role.
 */
function requireHostRole(request: FastifyRequest): string {
  const userId = getUserId(request);
  const roles = request.user?.roles ?? [];
  if (!roles.includes('partner' as never) && !roles.includes('admin' as never)) {
    throw Object.assign(new Error('Host access required'), { statusCode: 403 });
  }
  return userId;
}

// ── Route Registration ──────────────────────────────────────────

export async function registerRoutes(server: FastifyInstance): Promise<void> {

  // ──────────────────────────────────────────────────────────────
  // Status
  // ──────────────────────────────────────────────────────────────

  server.get('/api/v1/stays/status', async () => ({
    service: 'stay-service',
    routes: [
      'search', 'properties/:propertyId', 'properties/:propertyId/rooms',
      'properties/:propertyId/availability', 'bookings', 'bookings/:bookingId',
      'bookings/:bookingId/cancel', 'host/properties',
      'host/properties/:propertyId/intelligence',
      'vacation-rentals/search', 'vacation-rentals/:rentalId',
      'vacation-rentals/:rentalId/book',
    ],
  }));

  // ════════════════════════════════════════════════════════════════
  // PUBLIC: PROPERTY SEARCH & DETAILS
  // ════════════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/stays/search — Search properties
  // ──────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/stays/search',
    { preValidation: [validateQuery(searchQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof searchQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const q = request.query as z.infer<typeof searchQuerySchema>;

      const { data, total } = await searchProperties({
        placeId: q.place_id,
        checkIn: q.check_in,
        checkOut: q.check_out,
        guests: q.guests,
        rooms: q.rooms,
        minPrice: q.min_price,
        maxPrice: q.max_price,
        propertyType: q.property_type,
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

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/stays/properties/:propertyId — Property details
  // ──────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/stays/properties/:propertyId',
    { preValidation: [validateParams(propertyIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof propertyIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { propertyId } = request.params as z.infer<typeof propertyIdParamSchema>;

      const property = await findPropertyById(propertyId);
      if (!property) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Property not found',
          },
        });
      }

      // Fetch related data in parallel
      const [roomTypes, ratePlans, reviewSummary, reviews] = await Promise.all([
        findRoomTypesByProperty(propertyId),
        findRatePlansByProperty(propertyId),
        getReviewSummary(propertyId),
        findReviewsByProperty(propertyId),
      ]);

      return reply.send({
        ...property,
        room_types: roomTypes,
        rate_plans: ratePlans,
        review_summary: reviewSummary,
        recent_reviews: reviews.slice(0, 10),
      });
    },
  );

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/stays/properties/:propertyId/rooms — List rooms
  // ──────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/stays/properties/:propertyId/rooms',
    { preValidation: [validateParams(propertyIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof propertyIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { propertyId } = request.params as z.infer<typeof propertyIdParamSchema>;

      // Verify property exists
      const property = await findPropertyById(propertyId);
      if (!property) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Property not found',
          },
        });
      }

      const roomTypes = await findRoomTypesByProperty(propertyId);

      return reply.send({
        property_id: propertyId,
        room_types: roomTypes,
        count: roomTypes.length,
      });
    },
  );

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/stays/properties/:propertyId/availability
  // — Check availability for a date range
  // ──────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/stays/properties/:propertyId/availability',
    {
      preValidation: [
        validateParams(propertyIdParamSchema),
        validateQuery(availabilityQuerySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof propertyIdParamSchema>;
        Querystring: z.infer<typeof availabilityQuerySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { propertyId } = request.params as z.infer<typeof propertyIdParamSchema>;
      const { check_in, check_out } = request.query as z.infer<typeof availabilityQuerySchema>;

      // Verify property exists
      const property = await findPropertyById(propertyId);
      if (!property) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Property not found',
          },
        });
      }

      // Validate date range
      if (new Date(check_in) >= new Date(check_out)) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'check_in must be before check_out',
          },
        });
      }

      const inventoryNights = await findAvailabilityForProperty(propertyId, check_in, check_out);

      // Group by room_type_id + rate_plan for easier consumption
      const grouped: Record<string, {
        room_type_id: string | null;
        room_type_name: string | null;
        rate_plan_id: string;
        rate_plan_name: string;
        refundable: boolean;
        meal_plan: string | null;
        nights: Array<{
          date: string;
          available: number;
          price: string;
          currency: string;
          closed: boolean;
        }>;
      }> = {};

      for (const row of inventoryNights) {
        const key = row.rate_plan_id;
        if (!grouped[key]) {
          grouped[key] = {
            room_type_id: row.room_type_id,
            room_type_name: row.room_type_name,
            rate_plan_id: row.rate_plan_id,
            rate_plan_name: row.rate_plan_name,
            refundable: row.refundable,
            meal_plan: row.meal_plan,
            nights: [],
          };
        }
        grouped[key].nights.push({
          date: row.date,
          available: row.available,
          price: row.price,
          currency: row.currency,
          closed: row.closed,
        });
      }

      return reply.send({
        property_id: propertyId,
        check_in,
        check_out,
        availability: Object.values(grouped),
      });
    },
  );

  // ════════════════════════════════════════════════════════════════
  // AUTHENTICATED: BOOKING ROUTES
  // ════════════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────────
  // POST /api/v1/stays/bookings — Create stay booking
  // ──────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/stays/bookings',
    { preValidation: [validateBody(createBookingBodySchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createBookingBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { property_id, room_type_id, check_in, check_out, guests } =
        request.body as z.infer<typeof createBookingBodySchema>;

      // Validate date range
      if (new Date(check_in) >= new Date(check_out)) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'check_in must be before check_out',
          },
        });
      }

      // Check-in must be today or in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(check_in) < today) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'check_in cannot be in the past',
          },
        });
      }

      // Verify property exists
      const property = await findPropertyById(property_id);
      if (!property) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Property not found',
          },
        });
      }

      // Verify guest count
      if (property.max_guests && guests > property.max_guests) {
        return reply.code(400).send({
          error: {
            code: 'GUEST_LIMIT_EXCEEDED',
            message: `Guest count exceeds property maximum of ${property.max_guests}`,
          },
        });
      }

      // Verify night count within property limits
      const startDate = new Date(check_in);
      const endDate = new Date(check_out);
      const numNights = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      if (numNights < property.min_nights) {
        return reply.code(400).send({
          error: {
            code: 'MIN_NIGHTS_NOT_MET',
            message: `Minimum stay is ${property.min_nights} night(s)`,
          },
        });
      }

      if (numNights > property.max_nights) {
        return reply.code(400).send({
          error: {
            code: 'MAX_NIGHTS_EXCEEDED',
            message: `Maximum stay is ${property.max_nights} night(s)`,
          },
        });
      }

      // Find a rate plan for the specified room type
      const ratePlan = await findRatePlanForRoomType(property_id, room_type_id);
      if (!ratePlan) {
        return reply.code(404).send({
          error: {
            code: 'NO_RATE_PLAN',
            message: 'No active rate plan found for this room type',
          },
        });
      }

      // Check availability for the full date range
      const { available, nights } = await checkRatePlanAvailability(
        ratePlan.rate_plan_id,
        check_in,
        check_out,
      );

      if (!available) {
        return reply.code(409).send({
          error: {
            code: 'NOT_AVAILABLE',
            message: 'The selected room is not available for all requested nights',
          },
        });
      }

      // Calculate total price from nightly inventory
      const totalPrice = nights.reduce(
        (sum: number, n: { price: string | number }) => sum + Number(n.price),
        0,
      );
      const currency = nights[0]?.currency ?? 'USD';

      try {
        const booking = await createStayBooking({
          userId,
          propertyId: property_id,
          roomTypeId: room_type_id,
          ratePlanId: ratePlan.rate_plan_id,
          checkIn: check_in,
          checkOut: check_out,
          guests,
          totalPrice,
          currency,
          supplierId: property.supplier_id,
          venueId: property.venue_id,
        });

        request.log.info(
          { bookingId: booking.reservation_id, propertyId: property_id },
          'Stay booking created',
        );

        return reply.code(201).send({
          ...booking,
          nights_count: numNights,
          total_price: totalPrice,
          currency,
        });
      } catch (err: unknown) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 409) {
          return reply.code(409).send({
            error: {
              code: 'NOT_AVAILABLE',
              message: error.message,
            },
          });
        }
        throw err;
      }
    },
  );

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/stays/bookings — List user's stay bookings
  // ──────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/stays/bookings',
    { preValidation: [validateQuery(listBookingsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listBookingsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { status, upcoming, limit, offset } =
        request.query as z.infer<typeof listBookingsQuerySchema>;

      const { data, total } = await findStayBookingsByUser(userId, {
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

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/stays/bookings/:bookingId — Get booking details
  // ──────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/stays/bookings/:bookingId',
    { preValidation: [validateParams(bookingIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof bookingIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { bookingId } = request.params as z.infer<typeof bookingIdParamSchema>;

      const booking = await findStayBookingById(bookingId);
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

  // ──────────────────────────────────────────────────────────────
  // POST /api/v1/stays/bookings/:bookingId/cancel — Cancel booking
  // ──────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/stays/bookings/:bookingId/cancel',
    { preValidation: [validateParams(bookingIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof bookingIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { bookingId } = request.params as z.infer<typeof bookingIdParamSchema>;

      // Verify booking exists and belongs to user before attempting cancel
      const booking = await findStayBookingById(bookingId);
      if (!booking) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Booking not found',
          },
        });
      }

      if (booking.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this booking',
          },
        });
      }

      // Check if check-in date has passed (basic cancellation policy)
      if (booking.start_at && new Date(booking.start_at) < new Date()) {
        return reply.code(409).send({
          error: {
            code: 'CANCELLATION_NOT_ALLOWED',
            message: 'Cannot cancel a booking that has already started or passed',
          },
        });
      }

      try {
        await cancelStayBooking(bookingId, userId);

        request.log.info({ bookingId }, 'Stay booking cancelled');

        return reply.code(204).send();
      } catch (err: unknown) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 409) {
          return reply.code(409).send({
            error: {
              code: 'CANCELLATION_NOT_ALLOWED',
              message: error.message,
            },
          });
        }
        if (error.statusCode === 404) {
          return reply.code(404).send({
            error: {
              code: 'NOT_FOUND',
              message: error.message,
            },
          });
        }
        throw err;
      }
    },
  );

  // ════════════════════════════════════════════════════════════════
  // AUTHENTICATED (HOST): HOST MANAGEMENT ROUTES
  // ════════════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/stays/host/properties — List host's properties
  // ──────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/stays/host/properties',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = requireHostRole(request);

      const properties = await findPropertiesByHost(userId);

      return reply.send({
        data: properties,
        count: properties.length,
      });
    },
  );

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/stays/host/properties/:propertyId/intelligence
  // — Get AI insights for a property
  // ──────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/stays/host/properties/:propertyId/intelligence',
    { preValidation: [validateParams(hostPropertyIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof hostPropertyIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = requireHostRole(request);
      const { propertyId } = request.params as z.infer<typeof hostPropertyIdParamSchema>;

      // Verify the host owns this property
      const isOwner = await checkPropertyOwnership(propertyId, userId);
      if (!isOwner) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not own this property',
          },
        });
      }

      const intelligence = await findPropertyIntelligence(propertyId);
      if (!intelligence) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Intelligence data not yet available for this property',
          },
        });
      }

      return reply.send(intelligence);
    },
  );

  // ════════════════════════════════════════════════════════════════
  // VACATION RENTALS
  // ════════════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/stays/vacation-rentals/search — Search vacation rentals
  // ──────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/stays/vacation-rentals/search',
    { preValidation: [validateQuery(searchVacationRentalsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof searchVacationRentalsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const q = request.query as z.infer<typeof searchVacationRentalsQuerySchema>;

      const { data, total } = await searchVacationRentals({
        rental_type: q.rental_type,
        min_guests: q.min_guests,
        min_bedrooms: q.min_bedrooms,
        min_bathrooms: q.min_bathrooms,
        max_price: q.max_price,
        instant_book: q.instant_book,
        city: q.city,
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

  // ──────────────────────────────────────────────────────────────
  // GET /api/v1/stays/vacation-rentals/:rentalId — Rental details
  // ──────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/stays/vacation-rentals/:rentalId',
    { preValidation: [validateParams(rentalIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof rentalIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { rentalId } = request.params as z.infer<typeof rentalIdParamSchema>;

      const rental = await findVacationRentalById(rentalId);
      if (!rental) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Vacation rental not found',
          },
        });
      }

      return reply.send(rental);
    },
  );

  // ──────────────────────────────────────────────────────────────
  // POST /api/v1/stays/vacation-rentals/:rentalId/book — Book rental
  // ──────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/stays/vacation-rentals/:rentalId/book',
    {
      preValidation: [
        validateParams(rentalIdParamSchema),
        validateBody(createVacationRentalBookingBodySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof rentalIdParamSchema>;
        Body: z.infer<typeof createVacationRentalBookingBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { rentalId } = request.params as z.infer<typeof rentalIdParamSchema>;
      const { check_in, check_out, guests } =
        request.body as z.infer<typeof createVacationRentalBookingBodySchema>;

      // Validate date range
      if (new Date(check_in) >= new Date(check_out)) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'check_in must be before check_out',
          },
        });
      }

      // Check-in must be today or in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(check_in) < today) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'check_in cannot be in the past',
          },
        });
      }

      try {
        const booking = await createVacationRentalBooking({
          userId,
          rentalId,
          checkIn: check_in,
          checkOut: check_out,
          guests,
        });

        request.log.info(
          { reservationId: booking.reservation_id, rentalId },
          'Vacation rental booking created',
        );

        return reply.code(201).send(booking);
      } catch (err: unknown) {
        const error = err as Error & { statusCode?: number };
        if (error.statusCode === 404) {
          return reply.code(404).send({
            error: { code: 'NOT_FOUND', message: error.message },
          });
        }
        if (error.statusCode === 400) {
          return reply.code(400).send({
            error: { code: 'VALIDATION_ERROR', message: error.message },
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
}
