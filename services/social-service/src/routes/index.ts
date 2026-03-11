import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z, validateBody, validateParams, validateQuery, uuidSchema } from '@atlas/validation';
import {
  // Following
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  isFollowing,
  // Lists
  createList,
  updateList,
  deleteList,
  getListsByUser,
  getListById,
  addToList,
  removeFromList,
  getListItems,
  // Favorites
  toggleFavorite,
  getFavorites,
  isFavorited,
  // Activity
  recordActivity,
  getUserActivity,
  getFeedForUser,
  getPublicActivity,
  // Travel Map
  addVisitedPlace,
  removeVisitedPlace,
  getVisitedPlaces,
  getPublicVisitedPlaces,
  getVisitedCountries,
  // Profile
  getPublicProfile,
  upsertProfile,
  getProfileStats,
  // Search History
  recordSearch,
  getSearchHistory,
  clearSearchHistory,
  // Recommendations
  getRecommendations,
  dismissRecommendation,
  // Traveler Type
  getTravelerProfile,
} from '../db/index.js';

// ── Validation Schemas ────────────────────────────────────────────────────

const userIdParamsSchema = z.object({
  userId: uuidSchema,
});

const listIdParamsSchema = z.object({
  listId: uuidSchema,
});

const listItemParamsSchema = z.object({
  listId: uuidSchema,
  entityId: uuidSchema,
});

const entityIdParamsSchema = z.object({
  entityId: uuidSchema,
});

const placeIdParamsSchema = z.object({
  placeId: uuidSchema,
});

const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const favoritesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  entity_type: z.string().max(50).optional(),
});

const recommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  entity_type: z.string().max(50).optional(),
});

const searchHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const updateProfileBodySchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  cover_photo_url: z.string().url().optional(),
  location: z.string().max(200).optional(),
  website_url: z.string().url().optional(),
  traveler_type: z.enum([
    'luxury', 'budget', 'adventure', 'family',
    'solo', 'business', 'foodie', 'cultural',
  ]).optional(),
  travel_style: z.record(z.unknown()).optional(),
  is_public: z.boolean().optional(),
});

const createListBodySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  is_public: z.boolean().optional(),
});

const updateListBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  is_public: z.boolean().optional(),
  cover_image_url: z.string().url().optional(),
});

const addListItemBodySchema = z.object({
  entity_id: uuidSchema,
  entity_type: z.string().min(1).max(50),
  notes: z.string().max(500).optional(),
});

const toggleFavoriteBodySchema = z.object({
  entity_id: uuidSchema,
  entity_type: z.string().min(1).max(50),
});

const addVisitedPlaceBodySchema = z.object({
  place_id: uuidSchema,
  country_code: z.string().max(3).optional(),
  visited_date: z.string().date().optional(),
  notes: z.string().max(500).optional(),
  is_public: z.boolean().optional(),
});

const recordSearchBodySchema = z.object({
  query: z.string().min(1).max(500),
  search_type: z.enum(['hotel', 'flight', 'restaurant', 'experience', 'general']).optional(),
  filters: z.record(z.unknown()).optional(),
  result_count: z.number().int().min(0).optional(),
  clicked_entity_id: uuidSchema.optional(),
});

// ── Route Registration ────────────────────────────────────────────────────

export async function registerRoutes(server: FastifyInstance): Promise<void> {

  // ── Status endpoint ──────────────────────────────────────────────
  server.get('/api/v1/social/status', async () => ({
    service: 'social-service',
    routes: [
      'profile', 'follow', 'lists', 'favorites',
      'activity', 'travel-map', 'search-history',
      'recommendations', 'traveler-type',
    ],
  }));

  // ════════════════════════════════════════════════════════════════
  //  PROFILE ROUTES
  // ════════════════════════════════════════════════════════════════

  // ── 1. GET /api/v1/social/profile — Get own profile ────────────
  server.get(
    '/api/v1/social/profile',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const profile = await getPublicProfile(user.sub);
      if (!profile) {
        // Return empty profile with defaults
        return reply.code(200).send({
          profile: null,
          stats: null,
          message: 'No profile found. Use PATCH to create one.',
        });
      }

      const stats = await getProfileStats(user.sub);
      return reply.code(200).send({ profile, stats });
    },
  );

  // ── 2. PATCH /api/v1/social/profile — Update own profile ──────
  server.patch(
    '/api/v1/social/profile',
    { preValidation: [validateBody(updateProfileBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as z.infer<typeof updateProfileBodySchema>;

      const profile = await upsertProfile(user.sub, {
        displayName: body.display_name,
        bio: body.bio,
        avatarUrl: body.avatar_url,
        coverPhotoUrl: body.cover_photo_url,
        location: body.location,
        websiteUrl: body.website_url,
        travelerType: body.traveler_type,
        travelStyle: body.travel_style,
        isPublic: body.is_public,
      });

      request.log.info({ userId: user.sub }, 'Social profile updated');
      return reply.code(200).send({ profile });
    },
  );

  // ── 3. GET /api/v1/social/users/:userId/profile — Public profile ──
  server.get(
    '/api/v1/social/users/:userId/profile',
    { preValidation: [validateParams(userIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as z.infer<typeof userIdParamsSchema>;
      const profile = await getPublicProfile(params.userId);

      if (!profile) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
        });
      }

      // If profile is not public and requester is not the owner, deny
      if (!profile.is_public && request.user?.sub !== params.userId) {
        return reply.code(403).send({
          error: { code: 'FORBIDDEN', message: 'This profile is private' },
        });
      }

      const stats = await getProfileStats(params.userId);

      // Check if the current user is following this user
      let following = false;
      if (request.user) {
        following = await isFollowing(request.user.sub, params.userId);
      }

      return reply.code(200).send({ profile, stats, following });
    },
  );

  // ── 4. GET /api/v1/social/users/:userId/activity — Public activity ──
  server.get(
    '/api/v1/social/users/:userId/activity',
    {
      preValidation: [
        validateParams(userIdParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as z.infer<typeof userIdParamsSchema>;
      const qry = request.query as z.infer<typeof paginationQuerySchema>;

      const activity = await getPublicActivity(params.userId, qry.limit, qry.offset);
      return reply.code(200).send({ activity, count: activity.length });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  FOLLOW ROUTES
  // ════════════════════════════════════════════════════════════════

  // ── 5. POST /api/v1/social/users/:userId/follow — Follow user ──
  server.post(
    '/api/v1/social/users/:userId/follow',
    { preValidation: [validateParams(userIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const params = request.params as z.infer<typeof userIdParamsSchema>;

      // Cannot follow yourself
      if (user.sub === params.userId) {
        return reply.code(400).send({
          error: { code: 'VALIDATION_ERROR', message: 'Cannot follow yourself' },
        });
      }

      const follow = await followUser(user.sub, params.userId);

      // Record activity
      await recordActivity({
        userId: user.sub,
        activityType: 'follow',
        entityId: params.userId,
        entityType: 'user',
        summary: `Started following a user`,
      });

      request.log.info({ followerId: user.sub, followingId: params.userId }, 'User followed');
      return reply.code(201).send({ follow });
    },
  );

  // ── 6. DELETE /api/v1/social/users/:userId/follow — Unfollow ──
  server.delete(
    '/api/v1/social/users/:userId/follow',
    { preValidation: [validateParams(userIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const params = request.params as z.infer<typeof userIdParamsSchema>;
      const removed = await unfollowUser(user.sub, params.userId);

      if (!removed) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Follow relationship not found' },
        });
      }

      request.log.info({ followerId: user.sub, followingId: params.userId }, 'User unfollowed');
      return reply.code(204).send();
    },
  );

  // ── 7. GET /api/v1/social/users/:userId/followers — Followers ──
  server.get(
    '/api/v1/social/users/:userId/followers',
    {
      preValidation: [
        validateParams(userIdParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as z.infer<typeof userIdParamsSchema>;
      const qry = request.query as z.infer<typeof paginationQuerySchema>;

      const followers = await getFollowers(params.userId, qry.limit, qry.offset);
      return reply.code(200).send({ followers, count: followers.length });
    },
  );

  // ── 8. GET /api/v1/social/users/:userId/following — Following ──
  server.get(
    '/api/v1/social/users/:userId/following',
    {
      preValidation: [
        validateParams(userIdParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as z.infer<typeof userIdParamsSchema>;
      const qry = request.query as z.infer<typeof paginationQuerySchema>;

      const following = await getFollowing(params.userId, qry.limit, qry.offset);
      return reply.code(200).send({ following, count: following.length });
    },
  );

  // ── 9. GET /api/v1/social/feed — Activity feed from followed users ──
  server.get(
    '/api/v1/social/feed',
    { preValidation: [validateQuery(paginationQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const qry = request.query as z.infer<typeof paginationQuerySchema>;
      const feed = await getFeedForUser(user.sub, qry.limit, qry.offset);
      return reply.code(200).send({ feed, count: feed.length });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  LIST / WISHLIST ROUTES
  // ════════════════════════════════════════════════════════════════

  // ── 10. POST /api/v1/social/lists — Create list ────────────────
  server.post(
    '/api/v1/social/lists',
    { preValidation: [validateBody(createListBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as z.infer<typeof createListBodySchema>;
      const list = await createList({
        userId: user.sub,
        name: body.name,
        description: body.description,
        isPublic: body.is_public,
      });

      // Record activity
      await recordActivity({
        userId: user.sub,
        activityType: 'list',
        entityId: list.list_id,
        entityType: 'list',
        referenceId: list.list_id,
        summary: `Created list "${body.name}"`,
      });

      request.log.info({ userId: user.sub, listId: list.list_id }, 'List created');
      return reply.code(201).send({ list });
    },
  );

  // ── 11. GET /api/v1/social/lists — Get user's lists ────────────
  server.get(
    '/api/v1/social/lists',
    { preValidation: [validateQuery(paginationQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const qry = request.query as z.infer<typeof paginationQuerySchema>;
      const lists = await getListsByUser(user.sub, qry.limit, qry.offset);
      return reply.code(200).send({ lists, count: lists.length });
    },
  );

  // ── 12. GET /api/v1/social/lists/:listId — Get list with items ──
  server.get(
    '/api/v1/social/lists/:listId',
    {
      preValidation: [
        validateParams(listIdParamsSchema),
        validateQuery(paginationQuerySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as z.infer<typeof listIdParamsSchema>;
      const qry = request.query as z.infer<typeof paginationQuerySchema>;

      const list = await getListById(params.listId);
      if (!list) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'List not found' },
        });
      }

      // If the list is private and the requester is not the owner, deny
      if (!list.is_public && request.user?.sub !== list.user_id) {
        return reply.code(403).send({
          error: { code: 'FORBIDDEN', message: 'This list is private' },
        });
      }

      const items = await getListItems(params.listId, qry.limit, qry.offset);
      return reply.code(200).send({ list, items, item_count: items.length });
    },
  );

  // ── 13. PATCH /api/v1/social/lists/:listId — Update list ──────
  server.patch(
    '/api/v1/social/lists/:listId',
    {
      preValidation: [
        validateParams(listIdParamsSchema),
        validateBody(updateListBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const params = request.params as z.infer<typeof listIdParamsSchema>;
      const body = request.body as z.infer<typeof updateListBodySchema>;

      // Verify ownership
      const existing = await getListById(params.listId);
      if (!existing) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'List not found' },
        });
      }
      if (existing.user_id !== user.sub) {
        return reply.code(403).send({
          error: { code: 'FORBIDDEN', message: 'Not authorized to update this list' },
        });
      }

      const updated = await updateList(params.listId, {
        name: body.name,
        description: body.description,
        isPublic: body.is_public,
        coverImageUrl: body.cover_image_url,
      });

      request.log.info({ userId: user.sub, listId: params.listId }, 'List updated');
      return reply.code(200).send({ list: updated });
    },
  );

  // ── 14. DELETE /api/v1/social/lists/:listId — Delete list ──────
  server.delete(
    '/api/v1/social/lists/:listId',
    { preValidation: [validateParams(listIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const params = request.params as z.infer<typeof listIdParamsSchema>;
      const deleted = await deleteList(params.listId, user.sub);

      if (!deleted) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'List not found or not owned by you' },
        });
      }

      request.log.info({ userId: user.sub, listId: params.listId }, 'List deleted');
      return reply.code(204).send();
    },
  );

  // ── 15. POST /api/v1/social/lists/:listId/items — Add item ────
  server.post(
    '/api/v1/social/lists/:listId/items',
    {
      preValidation: [
        validateParams(listIdParamsSchema),
        validateBody(addListItemBodySchema),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const params = request.params as z.infer<typeof listIdParamsSchema>;
      const body = request.body as z.infer<typeof addListItemBodySchema>;

      // Verify ownership
      const list = await getListById(params.listId);
      if (!list) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'List not found' },
        });
      }
      if (list.user_id !== user.sub) {
        return reply.code(403).send({
          error: { code: 'FORBIDDEN', message: 'Not authorized to modify this list' },
        });
      }

      const item = await addToList(params.listId, body.entity_id, body.entity_type, body.notes);

      request.log.info(
        { userId: user.sub, listId: params.listId, entityId: body.entity_id },
        'Item added to list',
      );
      return reply.code(201).send({ item });
    },
  );

  // ── 16. DELETE /api/v1/social/lists/:listId/items/:entityId — Remove item ──
  server.delete(
    '/api/v1/social/lists/:listId/items/:entityId',
    { preValidation: [validateParams(listItemParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const params = request.params as z.infer<typeof listItemParamsSchema>;

      // Verify ownership
      const list = await getListById(params.listId);
      if (!list) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'List not found' },
        });
      }
      if (list.user_id !== user.sub) {
        return reply.code(403).send({
          error: { code: 'FORBIDDEN', message: 'Not authorized to modify this list' },
        });
      }

      const removed = await removeFromList(params.listId, params.entityId);
      if (!removed) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Item not found in list' },
        });
      }

      request.log.info(
        { userId: user.sub, listId: params.listId, entityId: params.entityId },
        'Item removed from list',
      );
      return reply.code(204).send();
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  FAVORITES ROUTES
  // ════════════════════════════════════════════════════════════════

  // ── 17. POST /api/v1/social/favorites — Toggle favorite ────────
  server.post(
    '/api/v1/social/favorites',
    { preValidation: [validateBody(toggleFavoriteBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as z.infer<typeof toggleFavoriteBodySchema>;
      const result = await toggleFavorite(user.sub, body.entity_id, body.entity_type);

      request.log.info(
        { userId: user.sub, entityId: body.entity_id, favorited: result.favorited },
        'Favorite toggled',
      );
      return reply.code(200).send(result);
    },
  );

  // ── 18. GET /api/v1/social/favorites — Get favorites ───────────
  server.get(
    '/api/v1/social/favorites',
    { preValidation: [validateQuery(favoritesQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const qry = request.query as z.infer<typeof favoritesQuerySchema>;
      const favorites = await getFavorites(user.sub, qry.entity_type, qry.limit, qry.offset);
      return reply.code(200).send({ favorites, count: favorites.length });
    },
  );

  // ── 19. GET /api/v1/social/favorites/check/:entityId — Check if favorited ──
  server.get(
    '/api/v1/social/favorites/check/:entityId',
    { preValidation: [validateParams(entityIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const params = request.params as z.infer<typeof entityIdParamsSchema>;
      const favorited = await isFavorited(user.sub, params.entityId);
      return reply.code(200).send({ entity_id: params.entityId, favorited });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  TRAVEL MAP ROUTES
  // ════════════════════════════════════════════════════════════════

  // ── 20. POST /api/v1/social/travel-map — Add visited place ─────
  server.post(
    '/api/v1/social/travel-map',
    { preValidation: [validateBody(addVisitedPlaceBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as z.infer<typeof addVisitedPlaceBodySchema>;
      const visited = await addVisitedPlace(user.sub, body.place_id, {
        countryCode: body.country_code,
        visitedDate: body.visited_date,
        notes: body.notes,
        isPublic: body.is_public,
      });

      // Record activity
      await recordActivity({
        userId: user.sub,
        activityType: 'trip',
        entityId: body.place_id,
        entityType: 'place',
        summary: 'Visited a new place',
      });

      request.log.info({ userId: user.sub, placeId: body.place_id }, 'Visited place added');
      return reply.code(201).send({ visited });
    },
  );

  // ── 21. DELETE /api/v1/social/travel-map/:placeId — Remove visited place ──
  server.delete(
    '/api/v1/social/travel-map/:placeId',
    { preValidation: [validateParams(placeIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const params = request.params as z.infer<typeof placeIdParamsSchema>;
      const removed = await removeVisitedPlace(user.sub, params.placeId);

      if (!removed) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Visited place not found' },
        });
      }

      request.log.info({ userId: user.sub, placeId: params.placeId }, 'Visited place removed');
      return reply.code(204).send();
    },
  );

  // ── 22. GET /api/v1/social/travel-map — Get own travel map ─────
  server.get(
    '/api/v1/social/travel-map',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const places = await getVisitedPlaces(user.sub);
      return reply.code(200).send({ places, count: places.length });
    },
  );

  // ── 23. GET /api/v1/social/users/:userId/travel-map — Public travel map ──
  server.get(
    '/api/v1/social/users/:userId/travel-map',
    { preValidation: [validateParams(userIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as z.infer<typeof userIdParamsSchema>;

      // Only return public places
      const places = await getPublicVisitedPlaces(params.userId);
      return reply.code(200).send({ places, count: places.length });
    },
  );

  // ── 24. GET /api/v1/social/travel-map/countries — Visited countries summary ──
  server.get(
    '/api/v1/social/travel-map/countries',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const countries = await getVisitedCountries(user.sub);
      return reply.code(200).send({
        countries,
        total_countries: countries.length,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  SEARCH HISTORY ROUTES
  // ════════════════════════════════════════════════════════════════

  // ── 25. GET /api/v1/social/search-history — Get search history ──
  server.get(
    '/api/v1/social/search-history',
    { preValidation: [validateQuery(searchHistoryQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const qry = request.query as z.infer<typeof searchHistoryQuerySchema>;
      const history = await getSearchHistory(user.sub, qry.limit);
      return reply.code(200).send({ history, count: history.length });
    },
  );

  // ── 26. POST /api/v1/social/search-history — Record a search ──
  server.post(
    '/api/v1/social/search-history',
    { preValidation: [validateBody(recordSearchBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as z.infer<typeof recordSearchBodySchema>;
      const search = await recordSearch(user.sub, {
        query: body.query,
        searchType: body.search_type,
        filters: body.filters,
        resultCount: body.result_count,
        clickedEntityId: body.clicked_entity_id,
      });

      return reply.code(201).send({ search });
    },
  );

  // ── 27. DELETE /api/v1/social/search-history — Clear search history ──
  server.delete(
    '/api/v1/social/search-history',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const count = await clearSearchHistory(user.sub);
      request.log.info({ userId: user.sub, deletedCount: count }, 'Search history cleared');
      return reply.code(200).send({ cleared: count });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  RECOMMENDATIONS ROUTES
  // ════════════════════════════════════════════════════════════════

  // ── 28. GET /api/v1/social/recommendations — Get recommendations ──
  server.get(
    '/api/v1/social/recommendations',
    { preValidation: [validateQuery(recommendationsQuerySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const qry = request.query as z.infer<typeof recommendationsQuerySchema>;
      const recommendations = await getRecommendations(user.sub, qry.entity_type, qry.limit);
      return reply.code(200).send({ recommendations, count: recommendations.length });
    },
  );

  // ── 29. POST /api/v1/social/recommendations/:entityId/dismiss — Dismiss ──
  server.post(
    '/api/v1/social/recommendations/:entityId/dismiss',
    { preValidation: [validateParams(entityIdParamsSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const params = request.params as z.infer<typeof entityIdParamsSchema>;
      const dismissed = await dismissRecommendation(user.sub, params.entityId);

      if (!dismissed) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Recommendation not found' },
        });
      }

      request.log.info({ userId: user.sub, entityId: params.entityId }, 'Recommendation dismissed');
      return reply.code(200).send({ dismissed: true });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  TRAVELER TYPE ROUTES
  // ════════════════════════════════════════════════════════════════

  // ── 30. GET /api/v1/social/traveler-type — Get traveler type profile ──
  server.get(
    '/api/v1/social/traveler-type',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const profile = await getTravelerProfile(user.sub);
      if (!profile) {
        return reply.code(200).send({
          profile: null,
          message: 'Traveler type not yet computed. Travel more to build your profile!',
        });
      }

      return reply.code(200).send({ profile });
    },
  );
}
