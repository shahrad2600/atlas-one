import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  z,
  createTripSchema,
  addItineraryItemSchema,
  uuidSchema,
  paginationSchema,
  validateBody,
  validateQuery,
  validateParams,
} from '@atlas/validation';
import {
  findTripsByUserIdOrCollaborator,
  createTrip,
  updateTrip,
  cancelTrip,
  findItineraryItems,
  findItineraryItemById,
  createItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  findTripCollaborators,
  addCollaborator,
  removeCollaborator,
  checkTripAccess,
  countTripsByUserId,
} from '../db/index.js';

// ── Param Schemas ─────────────────────────────────────────────────────

const tripIdParamsSchema = z.object({
  tripId: uuidSchema,
});

const tripItemParamsSchema = z.object({
  tripId: uuidSchema,
  itemId: uuidSchema,
});

const tripCollaboratorParamsSchema = z.object({
  tripId: uuidSchema,
  userId: uuidSchema,
});

// ── Query Schemas ─────────────────────────────────────────────────────

const listTripsQuerySchema = paginationSchema.extend({
  status: z.enum(['draft', 'active', 'completed', 'cancelled']).optional(),
});

// ── Body Schemas ──────────────────────────────────────────────────────

const updateTripBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  start_date: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  end_date: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  status: z.enum(['draft', 'active', 'completed']).optional(),
  home_currency: z.string().length(3).toUpperCase().optional(),
});

const updateItineraryItemBodySchema = z.object({
  item_type: z.enum(['place', 'venue', 'reservation', 'note', 'transport', 'buffer']).optional(),
  entity_id: uuidSchema.optional(),
  reservation_id: uuidSchema.optional(),
  day_number: z.number().int().positive().optional(),
  position: z.number().int().nonnegative().optional(),
  start_at: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  end_at: z.string().datetime({ offset: true }).or(z.string().date()).optional(),
  notes: z.string().max(1000).optional(),
});

const addCollaboratorBodySchema = z.object({
  user_id: uuidSchema,
  permission: z.enum(['read', 'comment', 'edit', 'admin']).default('read'),
});

// ── Body type for itinerary item creation (sans trip_id) ──────────────

const createItineraryItemBodySchema = addItineraryItemSchema.omit({ trip_id: true });

// ── Explicit body interfaces (avoids index-signature TS issues) ───────

interface CreateTripBody {
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  traveler_count: number;
  budget_total?: number;
  budget_currency: string;
  pace: string;
}

interface UpdateTripBody {
  title?: string;
  start_date?: string;
  end_date?: string;
  status?: 'draft' | 'active' | 'completed';
  home_currency?: string;
}

interface CreateItineraryItemBody {
  item_type: 'place' | 'venue' | 'reservation' | 'note' | 'transport' | 'buffer';
  entity_id?: string;
  reservation_id?: string;
  day_number: number;
  position: number;
  start_at?: string;
  end_at?: string;
  notes?: string;
}

interface UpdateItineraryItemBody {
  item_type?: 'place' | 'venue' | 'reservation' | 'note' | 'transport' | 'buffer';
  entity_id?: string;
  reservation_id?: string;
  day_number?: number;
  position?: number;
  start_at?: string;
  end_at?: string;
  notes?: string;
}

interface AddCollaboratorBody {
  user_id: string;
  permission: 'read' | 'comment' | 'edit' | 'admin';
}

interface ListTripsQuery {
  cursor?: string;
  limit: number;
  status?: 'draft' | 'active' | 'completed' | 'cancelled';
}

interface TripIdParams {
  tripId: string;
}

interface TripItemParams {
  tripId: string;
  itemId: string;
}

interface TripCollaboratorParams {
  tripId: string;
  userId: string;
}

// ── Helper: extract authenticated user ID ─────────────────────────────

function getUserId(request: FastifyRequest): string {
  const user = request.user;
  if (!user?.sub) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  return user.sub;
}

// ── Route Registration ────────────────────────────────────────────────

export async function registerRoutes(server: FastifyInstance): Promise<void> {

  // ────────────────────────────────────────────────────────────────────
  // Status endpoint (unauthenticated -- listed in publicRoutes)
  // ────────────────────────────────────────────────────────────────────
  server.get('/api/v1/trips/status', async () => ({
    service: 'trip-service',
    routes: ['trips', 'itineraries', 'collaborators'],
  }));

  // ====================================================================
  // TRIP CRUD
  // ====================================================================

  // ── POST /api/v1/trips ──────────────────────────────────────────────
  // Create a new trip. Body validated against createTripSchema.
  // Returns 201 with the created trip.
  // ────────────────────────────────────────────────────────────────────
  server.post('/api/v1/trips', {
    preValidation: [validateBody(createTripSchema)],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const body = request.body as CreateTripBody;

    const trip = await createTrip({
      userId,
      title: body.title,
      destination: body.destination,
      startDate: body.start_date,
      endDate: body.end_date,
      travelerCount: body.traveler_count,
      budgetTotal: body.budget_total,
      budgetCurrency: body.budget_currency,
      pace: body.pace,
    });

    request.log.info({ tripId: trip.trip_id }, 'Trip created');

    return reply.code(201).send({
      data: trip,
    });
  });

  // ── GET /api/v1/trips ───────────────────────────────────────────────
  // List all trips for the authenticated user (owned + collaborating).
  // Supports query params: status, cursor, limit.
  // Returns paginated response with cursor.
  // ────────────────────────────────────────────────────────────────────
  server.get('/api/v1/trips', {
    preValidation: [validateQuery(listTripsQuerySchema)],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const q = request.query as ListTripsQuery;
    const limit = q.limit ?? 20;

    const trips = await findTripsByUserIdOrCollaborator(userId, {
      status: q.status,
      cursor: q.cursor,
      limit,
    });

    // If we got more rows than `limit`, there is a next page
    const hasNextPage = trips.length > limit;
    const data = hasNextPage ? trips.slice(0, limit) : trips;
    const lastRow = data[data.length - 1] as Record<string, unknown> | undefined;
    const nextCursor = hasNextPage && lastRow
      ? String(lastRow['created_at'])
      : null;

    // Get total count for the response
    const total = await countTripsByUserId(userId, q.status);

    return reply.send({
      data,
      cursor: {
        next: nextCursor,
        prev: null, // Forward-only cursor pagination
      },
      total,
    });
  });

  // ── GET /api/v1/trips/:tripId ───────────────────────────────────────
  // Get full trip details including itinerary and collaborators.
  // Checks ownership or collaborator access.
  // ────────────────────────────────────────────────────────────────────
  server.get('/api/v1/trips/:tripId', {
    preValidation: [validateParams(tripIdParamsSchema)],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const params = request.params as TripIdParams;
    const tripId = params.tripId;

    const { trip, hasAccess } = await checkTripAccess(tripId, userId);

    if (!trip) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
        },
      });
    }

    if (!hasAccess) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this trip',
        },
      });
    }

    // Fetch related data in parallel
    const [itineraryItems, collaborators] = await Promise.all([
      findItineraryItems(tripId),
      findTripCollaborators(tripId),
    ]);

    return reply.send({
      data: {
        ...trip,
        itinerary: itineraryItems,
        collaborators,
      },
    });
  });

  // ── PATCH /api/v1/trips/:tripId ─────────────────────────────────────
  // Update trip fields. Only the trip owner can update.
  // Cannot update cancelled trips.
  // ────────────────────────────────────────────────────────────────────
  server.patch('/api/v1/trips/:tripId', {
    preValidation: [
      validateParams(tripIdParamsSchema),
      validateBody(updateTripBodySchema),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const params = request.params as TripIdParams;
    const tripId = params.tripId;
    const body = request.body as UpdateTripBody;

    const { trip, isOwner } = await checkTripAccess(tripId, userId);

    if (!trip) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
        },
      });
    }

    if (!isOwner) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only the trip owner can update this trip',
        },
      });
    }

    if (trip.status === 'cancelled') {
      return reply.code(409).send({
        error: {
          code: 'CONFLICT',
          message: 'Cannot update a cancelled trip',
        },
      });
    }

    const updated = await updateTrip(tripId, {
      title: body.title,
      startDate: body.start_date,
      endDate: body.end_date,
      status: body.status,
      homeCurrency: body.home_currency,
    });

    request.log.info({ tripId }, 'Trip updated');

    return reply.send({
      data: updated,
    });
  });

  // ── DELETE /api/v1/trips/:tripId ────────────────────────────────────
  // Soft-delete: sets status to 'cancelled'. Only owner can cancel.
  // Returns 204 No Content on success.
  // ────────────────────────────────────────────────────────────────────
  server.delete('/api/v1/trips/:tripId', {
    preValidation: [validateParams(tripIdParamsSchema)],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const params = request.params as TripIdParams;
    const tripId = params.tripId;

    const { trip, isOwner } = await checkTripAccess(tripId, userId);

    if (!trip) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
        },
      });
    }

    if (!isOwner) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only the trip owner can cancel this trip',
        },
      });
    }

    if (trip.status === 'cancelled') {
      return reply.code(409).send({
        error: {
          code: 'CONFLICT',
          message: 'Trip is already cancelled',
        },
      });
    }

    await cancelTrip(tripId);

    request.log.info({ tripId }, 'Trip cancelled');

    return reply.code(204).send();
  });

  // ====================================================================
  // ITINERARY ITEMS
  // ====================================================================

  // ── POST /api/v1/trips/:tripId/itinerary ────────────────────────────
  // Add a new itinerary item to a trip.
  // Requires owner or edit/admin collaborator permission.
  // ────────────────────────────────────────────────────────────────────
  server.post('/api/v1/trips/:tripId/itinerary', {
    preValidation: [
      validateParams(tripIdParamsSchema),
      validateBody(createItineraryItemBodySchema),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const params = request.params as TripIdParams;
    const tripId = params.tripId;
    const body = request.body as CreateItineraryItemBody;

    const { trip, hasAccess, permission } = await checkTripAccess(tripId, userId);

    if (!trip) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
        },
      });
    }

    if (!hasAccess) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this trip',
        },
      });
    }

    // Collaborators need at least 'edit' permission to add items
    if (permission !== 'owner' && permission !== 'edit' && permission !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'You need edit permission to add itinerary items',
        },
      });
    }

    if (trip.status === 'cancelled') {
      return reply.code(409).send({
        error: {
          code: 'CONFLICT',
          message: 'Cannot add items to a cancelled trip',
        },
      });
    }

    const item = await createItineraryItem({
      tripId,
      itemType: body.item_type,
      entityId: body.entity_id,
      reservationId: body.reservation_id,
      dayNumber: body.day_number,
      position: body.position,
      startAt: body.start_at,
      endAt: body.end_at,
      notes: body.notes,
    });

    request.log.info({ tripId, itemId: item.item_id }, 'Itinerary item created');

    return reply.code(201).send({
      data: item,
    });
  });

  // ── GET /api/v1/trips/:tripId/itinerary ─────────────────────────────
  // Get all itinerary items for a trip, ordered by position.
  // Requires read access (owner or any collaborator).
  // ────────────────────────────────────────────────────────────────────
  server.get('/api/v1/trips/:tripId/itinerary', {
    preValidation: [validateParams(tripIdParamsSchema)],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const params = request.params as TripIdParams;
    const tripId = params.tripId;

    const { trip, hasAccess } = await checkTripAccess(tripId, userId);

    if (!trip) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
        },
      });
    }

    if (!hasAccess) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this trip',
        },
      });
    }

    const items = await findItineraryItems(tripId);

    return reply.send({
      data: items,
    });
  });

  // ── PATCH /api/v1/trips/:tripId/itinerary/:itemId ───────────────────
  // Update an itinerary item. Requires edit/admin or owner permission.
  // Validates item belongs to the specified trip.
  // ────────────────────────────────────────────────────────────────────
  server.patch('/api/v1/trips/:tripId/itinerary/:itemId', {
    preValidation: [
      validateParams(tripItemParamsSchema),
      validateBody(updateItineraryItemBodySchema),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const params = request.params as TripItemParams;
    const tripId = params.tripId;
    const itemId = params.itemId;
    const body = request.body as UpdateItineraryItemBody;

    const { trip, hasAccess, permission } = await checkTripAccess(tripId, userId);

    if (!trip) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
        },
      });
    }

    if (!hasAccess) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this trip',
        },
      });
    }

    if (permission !== 'owner' && permission !== 'edit' && permission !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'You need edit permission to update itinerary items',
        },
      });
    }

    // Verify the item exists and belongs to this trip
    const existingItem = await findItineraryItemById(itemId);
    if (!existingItem || existingItem.trip_id !== tripId) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Itinerary item not found',
        },
      });
    }

    const updated = await updateItineraryItem(itemId, {
      itemType: body.item_type,
      entityId: body.entity_id,
      reservationId: body.reservation_id,
      dayNumber: body.day_number,
      position: body.position,
      startAt: body.start_at,
      endAt: body.end_at,
      title: body.notes,
    });

    request.log.info({ tripId, itemId }, 'Itinerary item updated');

    return reply.send({
      data: updated,
    });
  });

  // ── DELETE /api/v1/trips/:tripId/itinerary/:itemId ──────────────────
  // Remove an itinerary item. Requires edit/admin or owner permission.
  // Returns 204 No Content.
  // ────────────────────────────────────────────────────────────────────
  server.delete('/api/v1/trips/:tripId/itinerary/:itemId', {
    preValidation: [validateParams(tripItemParamsSchema)],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const params = request.params as TripItemParams;
    const tripId = params.tripId;
    const itemId = params.itemId;

    const { trip, hasAccess, permission } = await checkTripAccess(tripId, userId);

    if (!trip) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
        },
      });
    }

    if (!hasAccess) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this trip',
        },
      });
    }

    if (permission !== 'owner' && permission !== 'edit' && permission !== 'admin') {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'You need edit permission to delete itinerary items',
        },
      });
    }

    // Verify the item exists and belongs to this trip
    const existingItem = await findItineraryItemById(itemId);
    if (!existingItem || existingItem.trip_id !== tripId) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Itinerary item not found',
        },
      });
    }

    await deleteItineraryItem(itemId);

    request.log.info({ tripId, itemId }, 'Itinerary item deleted');

    return reply.code(204).send();
  });

  // ====================================================================
  // COLLABORATORS
  // ====================================================================

  // ── POST /api/v1/trips/:tripId/collaborators ────────────────────────
  // Add a collaborator to a trip. Only the trip owner can add.
  // Uses upsert to handle re-adding with different permission level.
  // ────────────────────────────────────────────────────────────────────
  server.post('/api/v1/trips/:tripId/collaborators', {
    preValidation: [
      validateParams(tripIdParamsSchema),
      validateBody(addCollaboratorBodySchema),
    ],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const params = request.params as TripIdParams;
    const tripId = params.tripId;
    const body = request.body as AddCollaboratorBody;

    const { trip, isOwner } = await checkTripAccess(tripId, userId);

    if (!trip) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
        },
      });
    }

    if (!isOwner) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only the trip owner can add collaborators',
        },
      });
    }

    if (body.user_id === userId) {
      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Cannot add yourself as a collaborator',
        },
      });
    }

    const collaborator = await addCollaborator({
      tripId,
      userId: body.user_id,
      permission: body.permission,
    });

    request.log.info({ tripId, collaboratorUserId: body.user_id }, 'Collaborator added');

    return reply.code(201).send({
      data: collaborator,
    });
  });

  // ── GET /api/v1/trips/:tripId/collaborators ─────────────────────────
  // List all collaborators for a trip. Requires read access.
  // ────────────────────────────────────────────────────────────────────
  server.get('/api/v1/trips/:tripId/collaborators', {
    preValidation: [validateParams(tripIdParamsSchema)],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = getUserId(request);
    const params = request.params as TripIdParams;
    const tripId = params.tripId;

    const { trip, hasAccess } = await checkTripAccess(tripId, userId);

    if (!trip) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
        },
      });
    }

    if (!hasAccess) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this trip',
        },
      });
    }

    const collaborators = await findTripCollaborators(tripId);

    return reply.send({
      data: collaborators,
    });
  });

  // ── DELETE /api/v1/trips/:tripId/collaborators/:userId ──────────────
  // Remove a collaborator from a trip. Only the trip owner can remove.
  // Returns 204 No Content.
  // ────────────────────────────────────────────────────────────────────
  server.delete('/api/v1/trips/:tripId/collaborators/:userId', {
    preValidation: [validateParams(tripCollaboratorParamsSchema)],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const currentUserId = getUserId(request);
    const params = request.params as TripCollaboratorParams;
    const tripId = params.tripId;
    const targetUserId = params.userId;

    const { trip, isOwner } = await checkTripAccess(tripId, currentUserId);

    if (!trip) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Trip not found',
        },
      });
    }

    if (!isOwner) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only the trip owner can remove collaborators',
        },
      });
    }

    const removed = await removeCollaborator(tripId, targetUserId);

    if (!removed) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Collaborator not found',
        },
      });
    }

    request.log.info({ tripId, removedUserId: targetUserId }, 'Collaborator removed');

    return reply.code(204).send();
  });
}
