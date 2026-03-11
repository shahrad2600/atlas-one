import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  z,
  validateBody,
  validateQuery,
  validateParams,
  uuidSchema,
  paginationSchema,
  isoDateSchema,
} from '@atlas/validation';
import { recommendationEngine } from '../recommendations.js';
import {
  searchPlaces,
  findPlaceById,
  countVenuesByPlaceId,
  findEdgesByPlaceEntityId,
  findVenuesByPlaceId,
  findVenueById,
  findMediaByEntityId,
  findProductsByVenueId,
  findProductById,
  findInventorySlots,
  findEntityById,
  findEdgesByEntityId,
  semanticSearch,
  findSupplierById,
  findVenuesBySupplierId,
  // UGC: Photos / Media
  createMedia,
  findMediaForEntity,
  findMediaById,
  deleteMediaById,
  incrementMediaHelpful,
  incrementMediaReport,
  // UGC: Q&A
  createQuestion,
  findQuestionsForEntity,
  findQuestionById,
  findAnswersByQuestionId,
  createAnswer,
  incrementAnswerHelpful,
  findAnswerById,
  acceptAnswer,
  // UGC: Forums
  findForums,
  findForumById,
  findTopicsByForumId,
  findTopicById,
  createTopic,
  findRepliesByTopicId,
  createReply,
  subscribeToForum,
  unsubscribeFromForum,
  // UGC: Destination Experts
  findExperts,
  findExpertById,
  // Maps & Geo
  findMapPins,
  findMapPinByEntity,
  findMapPinsByRadius,
  getLocationScore,
  findWalkingTours,
  findWalkingTourBySlug,
  findTourStops,
  findFavoritesMap,
  // AI Recommendations
  getPersonalizedRecommendations,
  getTrendingRecommendations,
  getSimilarEntities,
  updateUserPreferences,
  logRecommendation,
  updateRecommendationFeedback,
} from '../db/index.js';

// ════════════════════════════════════════════════════════════════════════════
//  LOCAL VALIDATION SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

// ── Param Schemas ─────────────────────────────────────────────────────────

const placeIdParamSchema = z.object({
  placeId: uuidSchema,
});

const venueIdParamSchema = z.object({
  venueId: uuidSchema,
});

const productIdParamSchema = z.object({
  productId: uuidSchema,
});

const entityIdParamSchema = z.object({
  entityId: uuidSchema,
});

const supplierIdParamSchema = z.object({
  supplierId: uuidSchema,
});

// ── Query Schemas ─────────────────────────────────────────────────────────

const searchPlacesQuerySchema = z.object({
  name: z.string().max(200).optional(),
  type: z.enum([
    'country', 'region', 'state', 'city', 'neighborhood',
    'poi_area', 'airport_city',
  ]).optional(),
  country: z.string().length(2).toUpperCase().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const venuesByPlaceQuerySchema = z.object({
  type: z.enum([
    'restaurant', 'hotel', 'attraction', 'rental_property',
    'cruise_terminal', 'museum', 'spa',
  ]).optional(),
  status: z.enum(['active', 'inactive', 'deleted', 'pending']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const productsByVenueQuerySchema = z.object({
  type: z.enum([
    'dining_reservation', 'dining_experience', 'tour', 'ticket',
    'hotel_room', 'rental_night', 'cruise_cabin', 'flight',
    'insurance', 'ancillary',
  ]).optional(),
  category: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const availabilityQuerySchema = z.object({
  start_date: isoDateSchema,
  end_date: isoDateSchema,
  status: z.enum(['open', 'hold', 'closed', 'sold_out']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const edgesByEntityQuerySchema = z.object({
  direction: z.enum(['outgoing', 'incoming', 'both']).default('both'),
  rel_type: z.enum([
    'located_in', 'belongs_to_brand', 'offers_product',
    'has_category', 'nearby', 'operates_route', 'uses_aircraft',
  ]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const supplierVenuesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── UGC Param Schemas ───────────────────────────────────────────────────

const photoIdParamSchema = z.object({
  photoId: uuidSchema,
});

const questionIdParamSchema = z.object({
  questionId: uuidSchema,
});

const answerIdParamSchema = z.object({
  answerId: uuidSchema,
});

const forumIdParamSchema = z.object({
  forumId: uuidSchema,
});

const topicIdParamSchema = z.object({
  topicId: uuidSchema,
});

const expertIdParamSchema = z.object({
  expertId: uuidSchema,
});

// ── UGC Query Schemas ───────────────────────────────────────────────────

const listPhotosQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  media_type: z.enum(['image', 'video']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listQuestionsQuerySchema = z.object({
  status: z.enum(['open', 'answered', 'closed']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listForumsQuerySchema = z.object({
  category: z.enum(['destination', 'theme', 'general']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listTopicsQuerySchema = z.object({
  sort: z.enum(['recent', 'popular', 'unanswered']).default('recent'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listRepliesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listAnswersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listExpertsQuerySchema = z.object({
  place_id: uuidSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── UGC Body Schemas ────────────────────────────────────────────────────

const uploadPhotoBodySchema = z.object({
  media_type: z.enum(['image', 'video']).default('image'),
  url: z.string().url().max(2000),
  thumbnail_url: z.string().url().max(2000).optional(),
  caption: z.string().max(500).optional(),
  width: z.number().int().min(1).max(10000).optional(),
  height: z.number().int().min(1).max(10000).optional(),
  size_bytes: z.number().int().min(1).optional(),
  mime_type: z.string().max(100).optional(),
  entity_type: z.string().min(1).max(50),
  metadata: z.record(z.unknown()).optional(),
});

const createQuestionBodySchema = z.object({
  entity_type: z.string().min(1).max(50),
  title: z.string().min(3).max(300),
  body: z.string().max(5000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

const createAnswerBodySchema = z.object({
  body: z.string().min(1).max(5000),
  is_owner_response: z.boolean().optional(),
});

const createTopicBodySchema = z.object({
  title: z.string().min(3).max(300),
  body: z.string().min(10).max(10000),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

const createReplyBodySchema = z.object({
  body: z.string().min(1).max(5000),
  parent_reply_id: uuidSchema.optional(),
});

const subscribeForumBodySchema = z.object({
  notify_email: z.boolean().default(true),
  notify_push: z.boolean().default(true),
});

// ── Recommendation Schemas ──────────────────────────────────────────────

const recommendationEntityTypeEnum = z.enum([
  'place', 'venue', 'supplier', 'product', 'inventory_slot',
  'brand', 'category', 'tag', 'event', 'transport_node',
  'aircraft', 'route', 'policy', 'media',
]);

const forYouQuerySchema = z.object({
  types: z.string().transform((s) => s.split(',')).pipe(z.array(recommendationEntityTypeEnum)).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const similarRecommendationParamSchema = z.object({
  entityId: uuidSchema,
});

const similarRecommendationQuerySchema = z.object({
  type: recommendationEntityTypeEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const trendingRecommendationQuerySchema = z.object({
  types: z.string().transform((s) => s.split(',')).pipe(z.array(recommendationEntityTypeEnum)).optional(),
  timeWindow: z.enum(['1 day', '3 days', '7 days', '14 days', '30 days']).default('7 days'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const recommendationIdParamSchema = z.object({
  recommendationId: uuidSchema,
});

const recommendationFeedbackBodySchema = z.object({
  clicked: z.boolean().optional(),
  booked: z.boolean().optional(),
});

const trackInteractionBodySchema = z.object({
  entityId: uuidSchema,
  type: z.enum(['view', 'save', 'book', 'review']),
});

// ── Maps & Geo Param Schemas ─────────────────────────────────────────────

const tourSlugParamSchema = z.object({
  slug: z.string().min(1).max(300),
});

// ── Maps & Geo Query Schemas ─────────────────────────────────────────────

const mapPinsBoundsQuerySchema = z.object({
  north: z.coerce.number().min(-90).max(90),
  south: z.coerce.number().min(-90).max(90),
  east: z.coerce.number().min(-180).max(180),
  west: z.coerce.number().min(-180).max(180),
  category: z.enum([
    'fine_dining', 'casual', 'luxury_hotel', 'budget_hotel',
    'museum', 'park', 'beach', 'nightlife', 'shopping', 'spa',
  ]).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

const mapPinsNearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(100).default(5), // km
  category: z.enum([
    'fine_dining', 'casual', 'luxury_hotel', 'budget_hotel',
    'museum', 'park', 'beach', 'nightlife', 'shopping', 'spa',
  ]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

const listWalkingToursQuerySchema = z.object({
  place_id: uuidSchema.optional(),
  type: z.enum(['self_guided', 'guided', 'audio']).optional(),
  difficulty: z.enum(['easy', 'moderate', 'challenging']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const favoritesMapQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ── Body Schemas ──────────────────────────────────────────────────────────

const semanticSearchBodySchema = z.object({
  embedding: z.array(z.number()).min(1).max(1536),
  entity_type: z.enum([
    'place', 'venue', 'supplier', 'product', 'inventory_slot',
    'brand', 'category', 'tag', 'event', 'transport_node',
    'aircraft', 'route', 'policy', 'media',
  ]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════════════════

function buildPagination(total: number, limit: number, offset: number) {
  return {
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

function getUserId(request: FastifyRequest): string {
  const user = request.user;
  if (!user?.sub) {
    throw Object.assign(new Error('Authentication required'), { statusCode: 401 });
  }
  return user.sub;
}

// ════════════════════════════════════════════════════════════════════════════
//  ROUTE REGISTRATION
// ════════════════════════════════════════════════════════════════════════════

export async function registerRoutes(server: FastifyInstance): Promise<void> {

  // ── Status endpoint ───────────────────────────────────────────────────
  server.get('/api/v1/graph/status', async () => ({
    service: 'travel-graph-service',
    routes: [
      'places', 'places/:placeId', 'places/:placeId/venues',
      'venues/:venueId', 'venues/:venueId/products',
      'products/:productId', 'products/:productId/availability',
      'entities/:entityId', 'entities/:entityId/edges',
      'search/semantic',
      'suppliers/:supplierId',
      // UGC routes
      'entities/:entityId/photos', 'photos/:photoId',
      'photos/:photoId/helpful', 'photos/:photoId/report',
      'entities/:entityId/questions', 'questions/:questionId',
      'questions/:questionId/answers', 'answers/:answerId/helpful',
      'answers/:answerId/accept',
      'forums', 'forums/:forumId', 'forums/:forumId/topics',
      'forums/:forumId/subscribe',
      'topics/:topicId', 'topics/:topicId/replies',
      'experts',
      // Maps & Geo routes
      'map/pins', 'map/pins/nearby', 'map/pins/:entityId',
      'map/location-score/:entityId',
      'map/tours', 'map/tours/:slug',
      'map/favorites',
      // AI Recommendation routes
      'recommendations/for-you',
      'recommendations/similar/:entityId',
      'recommendations/trending',
      'recommendations/:recommendationId/feedback',
      'recommendations/track-interaction',
    ],
  }));

  // ════════════════════════════════════════════════════════════════════════
  //  1. GET /api/v1/graph/places -- List/search places (PUBLIC)
  // ════════════════════════════════════════════════════════════════════════

  server.get(
    '/api/v1/graph/places',
    { preValidation: [validateQuery(searchPlacesQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof searchPlacesQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { name, type, country, limit, offset } =
        request.query as z.infer<typeof searchPlacesQuerySchema>;

      const { data, total } = await searchPlaces({
        name,
        placeType: type,
        countryCode: country,
        limit,
        offset,
      });

      return reply.send({
        data,
        pagination: buildPagination(total, limit, offset),
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  2. GET /api/v1/graph/places/:placeId -- Get place details (PUBLIC)
  // ════════════════════════════════════════════════════════════════════════

  server.get(
    '/api/v1/graph/places/:placeId',
    { preValidation: [validateParams(placeIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof placeIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { placeId } = request.params as z.infer<typeof placeIdParamSchema>;

      const place = await findPlaceById(placeId);
      if (!place) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Place not found',
          },
        });
      }

      // Fetch enrichment data in parallel
      const [venuesCount, edges] = await Promise.all([
        countVenuesByPlaceId(placeId),
        findEdgesByPlaceEntityId(placeId),
      ]);

      return reply.send({
        ...place,
        venues_count: venuesCount,
        edges,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  3. GET /api/v1/graph/places/:placeId/venues -- Venues in a place (PUBLIC)
  // ════════════════════════════════════════════════════════════════════════

  server.get(
    '/api/v1/graph/places/:placeId/venues',
    {
      preValidation: [
        validateParams(placeIdParamSchema),
        validateQuery(venuesByPlaceQuerySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof placeIdParamSchema>;
        Querystring: z.infer<typeof venuesByPlaceQuerySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { placeId } = request.params as z.infer<typeof placeIdParamSchema>;
      const { type, status, limit, offset } =
        request.query as z.infer<typeof venuesByPlaceQuerySchema>;

      // Verify the place exists
      const place = await findPlaceById(placeId);
      if (!place) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Place not found',
          },
        });
      }

      const { data, total } = await findVenuesByPlaceId(placeId, {
        venueType: type,
        status,
        limit,
        offset,
      });

      return reply.send({
        data,
        pagination: buildPagination(total, limit, offset),
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  4. GET /api/v1/graph/venues/:venueId -- Get venue details (PUBLIC)
  // ════════════════════════════════════════════════════════════════════════

  server.get(
    '/api/v1/graph/venues/:venueId',
    { preValidation: [validateParams(venueIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof venueIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { venueId } = request.params as z.infer<typeof venueIdParamSchema>;

      const venue = await findVenueById(venueId);
      if (!venue) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Venue not found',
          },
        });
      }

      // Fetch media for the venue
      const media = await findMediaByEntityId(venueId);

      // Restructure the address from flat columns
      const address = venue.address_lat != null ? {
        line1: venue.line1,
        line2: venue.line2,
        city: venue.city,
        region: venue.region,
        postal_code: venue.postal_code,
        country_code: venue.address_country_code,
        lat: venue.address_lat,
        lng: venue.address_lng,
      } : null;

      // Restructure supplier info
      const supplier = venue.supplier_id ? {
        supplier_id: venue.supplier_id,
        supplier_type: venue.supplier_type,
        name: venue.supplier_name,
      } : null;

      // Remove flat joined columns and return structured data
      const {
        line1, line2, city, region, postal_code,
        address_country_code, address_lat, address_lng,
        supplier_id, supplier_type, supplier_name,
        ...venueFields
      } = venue;

      return reply.send({
        ...venueFields,
        address,
        supplier,
        media,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  5. GET /api/v1/graph/venues/:venueId/products -- Venue products (PUBLIC)
  // ════════════════════════════════════════════════════════════════════════

  server.get(
    '/api/v1/graph/venues/:venueId/products',
    {
      preValidation: [
        validateParams(venueIdParamSchema),
        validateQuery(productsByVenueQuerySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof venueIdParamSchema>;
        Querystring: z.infer<typeof productsByVenueQuerySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { venueId } = request.params as z.infer<typeof venueIdParamSchema>;
      const { type, category, limit, offset } =
        request.query as z.infer<typeof productsByVenueQuerySchema>;

      // Verify the venue exists
      const venue = await findVenueById(venueId);
      if (!venue) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Venue not found',
          },
        });
      }

      const { data, total } = await findProductsByVenueId(venueId, {
        productType: type,
        category,
        limit,
        offset,
      });

      return reply.send({
        data,
        pagination: buildPagination(total, limit, offset),
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  6. GET /api/v1/graph/products/:productId -- Product details (PUBLIC)
  // ════════════════════════════════════════════════════════════════════════

  server.get(
    '/api/v1/graph/products/:productId',
    { preValidation: [validateParams(productIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof productIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { productId } = request.params as z.infer<typeof productIdParamSchema>;

      const product = await findProductById(productId);
      if (!product) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found',
          },
        });
      }

      // Fetch media for the product entity
      const media = await findMediaByEntityId(productId);

      // Restructure supplier
      const supplier = {
        supplier_id: product.supplier_id,
        supplier_type: product.supplier_type,
        name: product.supplier_name,
        email: product.supplier_email,
        risk_tier: product.supplier_risk_tier,
      };

      // Restructure venue reference
      const venue = product.venue_id ? {
        venue_id: product.venue_id,
        venue_type: product.venue_type,
      } : null;

      // Restructure policy
      const policy = product.policy_type ? {
        policy_id: product.policy_id,
        policy_type: product.policy_type,
        name: product.policy_name,
        rules: product.policy_rules,
        jurisdiction: product.jurisdiction,
      } : null;

      // Remove flat joined columns
      const {
        supplier_type, supplier_name, supplier_email, supplier_risk_tier,
        venue_type,
        policy_type, policy_name, policy_rules, jurisdiction,
        ...productFields
      } = product;

      return reply.send({
        ...productFields,
        supplier,
        venue,
        policy,
        media,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  7. GET /api/v1/graph/products/:productId/availability (PUBLIC)
  // ════════════════════════════════════════════════════════════════════════

  server.get(
    '/api/v1/graph/products/:productId/availability',
    {
      preValidation: [
        validateParams(productIdParamSchema),
        validateQuery(availabilityQuerySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof productIdParamSchema>;
        Querystring: z.infer<typeof availabilityQuerySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { productId } = request.params as z.infer<typeof productIdParamSchema>;
      const { start_date, end_date, status, limit, offset } =
        request.query as z.infer<typeof availabilityQuerySchema>;

      // Verify the product exists
      const product = await findProductById(productId);
      if (!product) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found',
          },
        });
      }

      const { data, total } = await findInventorySlots(productId, {
        startDate: start_date,
        endDate: end_date,
        status,
        limit,
        offset,
      });

      return reply.send({
        product_id: productId,
        start_date,
        end_date,
        slots: data,
        pagination: buildPagination(total, limit, offset),
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  8. GET /api/v1/graph/entities/:entityId -- Entity details (PUBLIC)
  // ════════════════════════════════════════════════════════════════════════

  server.get(
    '/api/v1/graph/entities/:entityId',
    { preValidation: [validateParams(entityIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof entityIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { entityId } = request.params as z.infer<typeof entityIdParamSchema>;

      const entity = await findEntityById(entityId);
      if (!entity) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Entity not found',
          },
        });
      }

      return reply.send(entity);
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  9. GET /api/v1/graph/entities/:entityId/edges -- Entity relationships (PUBLIC)
  // ════════════════════════════════════════════════════════════════════════

  server.get(
    '/api/v1/graph/entities/:entityId/edges',
    {
      preValidation: [
        validateParams(entityIdParamSchema),
        validateQuery(edgesByEntityQuerySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof entityIdParamSchema>;
        Querystring: z.infer<typeof edgesByEntityQuerySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { entityId } = request.params as z.infer<typeof entityIdParamSchema>;
      const { direction, rel_type, limit, offset } =
        request.query as z.infer<typeof edgesByEntityQuerySchema>;

      // Verify the entity exists
      const entity = await findEntityById(entityId);
      if (!entity) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Entity not found',
          },
        });
      }

      const { data, total } = await findEdgesByEntityId(entityId, {
        direction,
        relType: rel_type,
        limit,
        offset,
      });

      return reply.send({
        entity_id: entityId,
        data,
        pagination: buildPagination(total, limit, offset),
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  10. POST /api/v1/graph/search/semantic -- Semantic vector search (PUBLIC)
  // ════════════════════════════════════════════════════════════════════════

  server.post(
    '/api/v1/graph/search/semantic',
    { preValidation: [validateBody(semanticSearchBodySchema)] },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof semanticSearchBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const { embedding, entity_type, limit } =
        request.body as z.infer<typeof semanticSearchBodySchema>;

      const results = await semanticSearch(embedding, {
        entityType: entity_type,
        limit,
      });

      return reply.send({
        results,
        count: results.length,
        limit,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  11. GET /api/v1/graph/suppliers/:supplierId -- Supplier info (PUBLIC)
  // ════════════════════════════════════════════════════════════════════════

  server.get(
    '/api/v1/graph/suppliers/:supplierId',
    {
      preValidation: [
        validateParams(supplierIdParamSchema),
        validateQuery(supplierVenuesQuerySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof supplierIdParamSchema>;
        Querystring: z.infer<typeof supplierVenuesQuerySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { supplierId } = request.params as z.infer<typeof supplierIdParamSchema>;
      const { limit, offset } =
        request.query as z.infer<typeof supplierVenuesQuerySchema>;

      const supplier = await findSupplierById(supplierId);
      if (!supplier) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Supplier not found',
          },
        });
      }

      // Fetch supplier's venues
      const { data: venues, total: venuesTotal } = await findVenuesBySupplierId(
        supplierId,
        { limit, offset },
      );

      return reply.send({
        ...supplier,
        venues: {
          data: venues,
          pagination: buildPagination(venuesTotal, limit, offset),
        },
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  UGC: PHOTO / MEDIA ROUTES
  // ════════════════════════════════════════════════════════════════════════

  // 1. POST /api/v1/graph/entities/:entityId/photos -- Upload photo metadata
  server.post(
    '/api/v1/graph/entities/:entityId/photos',
    {
      preValidation: [
        validateParams(entityIdParamSchema),
        validateBody(uploadPhotoBodySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof entityIdParamSchema>;
        Body: z.infer<typeof uploadPhotoBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { entityId } = request.params as z.infer<typeof entityIdParamSchema>;
      const body = request.body as z.infer<typeof uploadPhotoBodySchema>;

      const media = await createMedia({
        entityId,
        entityType: body.entity_type,
        userId,
        mediaType: body.media_type,
        url: body.url,
        thumbnailUrl: body.thumbnail_url,
        caption: body.caption,
        width: body.width,
        height: body.height,
        sizeBytes: body.size_bytes,
        mimeType: body.mime_type,
        metadata: body.metadata,
      });

      request.log.info(
        { userId, mediaId: media.media_id, entityId },
        'Photo uploaded',
      );

      return reply.code(201).send(media);
    },
  );

  // 2. GET /api/v1/graph/entities/:entityId/photos -- List photos for entity
  server.get(
    '/api/v1/graph/entities/:entityId/photos',
    {
      preValidation: [
        validateParams(entityIdParamSchema),
        validateQuery(listPhotosQuerySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof entityIdParamSchema>;
        Querystring: z.infer<typeof listPhotosQuerySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { entityId } = request.params as z.infer<typeof entityIdParamSchema>;
      const { status, media_type, limit, offset } =
        request.query as z.infer<typeof listPhotosQuerySchema>;

      const { data, total } = await findMediaForEntity(entityId, {
        status,
        mediaType: media_type,
        limit,
        offset,
      });

      return reply.send({
        data,
        pagination: buildPagination(total, limit, offset),
      });
    },
  );

  // 3. GET /api/v1/graph/photos/:photoId -- Get photo details
  server.get(
    '/api/v1/graph/photos/:photoId',
    { preValidation: [validateParams(photoIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof photoIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { photoId } = request.params as z.infer<typeof photoIdParamSchema>;

      const photo = await findMediaById(photoId);
      if (!photo) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Photo not found',
          },
        });
      }

      return reply.send(photo);
    },
  );

  // 4. DELETE /api/v1/graph/photos/:photoId -- Remove user's photo
  server.delete(
    '/api/v1/graph/photos/:photoId',
    { preValidation: [validateParams(photoIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof photoIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { photoId } = request.params as z.infer<typeof photoIdParamSchema>;

      const photo = await findMediaById(photoId);
      if (!photo) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Photo not found',
          },
        });
      }

      if (photo.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only delete your own photos',
          },
        });
      }

      await deleteMediaById(photoId);

      request.log.info({ userId, photoId }, 'Photo deleted');

      return reply.code(204).send();
    },
  );

  // 5. POST /api/v1/graph/photos/:photoId/helpful -- Vote helpful
  server.post(
    '/api/v1/graph/photos/:photoId/helpful',
    { preValidation: [validateParams(photoIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof photoIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      getUserId(request); // Ensure authenticated
      const { photoId } = request.params as z.infer<typeof photoIdParamSchema>;

      const photo = await findMediaById(photoId);
      if (!photo) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Photo not found',
          },
        });
      }

      const updated = await incrementMediaHelpful(photoId);

      return reply.send({
        media_id: photoId,
        helpful_count: updated.helpful_count,
      });
    },
  );

  // 6. POST /api/v1/graph/photos/:photoId/report -- Report photo
  server.post(
    '/api/v1/graph/photos/:photoId/report',
    { preValidation: [validateParams(photoIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof photoIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      getUserId(request); // Ensure authenticated
      const { photoId } = request.params as z.infer<typeof photoIdParamSchema>;

      const photo = await findMediaById(photoId);
      if (!photo) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Photo not found',
          },
        });
      }

      const updated = await incrementMediaReport(photoId);

      request.log.info({ photoId, reportCount: updated.report_count }, 'Photo reported');

      return reply.send({
        media_id: photoId,
        report_count: updated.report_count,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  UGC: Q&A ROUTES
  // ════════════════════════════════════════════════════════════════════════

  // 7. POST /api/v1/graph/entities/:entityId/questions -- Ask a question
  server.post(
    '/api/v1/graph/entities/:entityId/questions',
    {
      preValidation: [
        validateParams(entityIdParamSchema),
        validateBody(createQuestionBodySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof entityIdParamSchema>;
        Body: z.infer<typeof createQuestionBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { entityId } = request.params as z.infer<typeof entityIdParamSchema>;
      const body = request.body as z.infer<typeof createQuestionBodySchema>;

      const question = await createQuestion({
        entityId,
        entityType: body.entity_type,
        userId,
        title: body.title,
        body: body.body,
        tags: body.tags,
      });

      request.log.info(
        { userId, questionId: question.question_id, entityId },
        'Question asked',
      );

      return reply.code(201).send(question);
    },
  );

  // 8. GET /api/v1/graph/entities/:entityId/questions -- List questions for entity
  server.get(
    '/api/v1/graph/entities/:entityId/questions',
    {
      preValidation: [
        validateParams(entityIdParamSchema),
        validateQuery(listQuestionsQuerySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof entityIdParamSchema>;
        Querystring: z.infer<typeof listQuestionsQuerySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { entityId } = request.params as z.infer<typeof entityIdParamSchema>;
      const { status, limit, offset } =
        request.query as z.infer<typeof listQuestionsQuerySchema>;

      const { data, total } = await findQuestionsForEntity(entityId, {
        status,
        limit,
        offset,
      });

      return reply.send({
        data,
        pagination: buildPagination(total, limit, offset),
      });
    },
  );

  // 9. GET /api/v1/graph/questions/:questionId -- Get question with answers
  server.get(
    '/api/v1/graph/questions/:questionId',
    {
      preValidation: [
        validateParams(questionIdParamSchema),
        validateQuery(listAnswersQuerySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof questionIdParamSchema>;
        Querystring: z.infer<typeof listAnswersQuerySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { questionId } = request.params as z.infer<typeof questionIdParamSchema>;
      const { limit, offset } =
        request.query as z.infer<typeof listAnswersQuerySchema>;

      const question = await findQuestionById(questionId);
      if (!question || question.status === 'removed') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Question not found',
          },
        });
      }

      const { data: answers, total: answersTotal } = await findAnswersByQuestionId(
        questionId,
        { limit, offset },
      );

      return reply.send({
        ...question,
        answers: {
          data: answers,
          pagination: buildPagination(answersTotal, limit, offset),
        },
      });
    },
  );

  // 10. POST /api/v1/graph/questions/:questionId/answers -- Answer a question
  server.post(
    '/api/v1/graph/questions/:questionId/answers',
    {
      preValidation: [
        validateParams(questionIdParamSchema),
        validateBody(createAnswerBodySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof questionIdParamSchema>;
        Body: z.infer<typeof createAnswerBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { questionId } = request.params as z.infer<typeof questionIdParamSchema>;
      const body = request.body as z.infer<typeof createAnswerBodySchema>;

      const question = await findQuestionById(questionId);
      if (!question || question.status === 'removed') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Question not found',
          },
        });
      }

      if (question.status === 'closed') {
        return reply.code(409).send({
          error: {
            code: 'QUESTION_CLOSED',
            message: 'This question has been closed and no longer accepts answers',
          },
        });
      }

      const answer = await createAnswer({
        questionId,
        userId,
        body: body.body,
        isOwnerResponse: body.is_owner_response,
      });

      request.log.info(
        { userId, answerId: answer.answer_id, questionId },
        'Answer submitted',
      );

      return reply.code(201).send(answer);
    },
  );

  // 11. POST /api/v1/graph/answers/:answerId/helpful -- Vote answer helpful
  server.post(
    '/api/v1/graph/answers/:answerId/helpful',
    { preValidation: [validateParams(answerIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof answerIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      getUserId(request); // Ensure authenticated
      const { answerId } = request.params as z.infer<typeof answerIdParamSchema>;

      const answer = await findAnswerById(answerId);
      if (!answer || answer.status === 'removed') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Answer not found',
          },
        });
      }

      const updated = await incrementAnswerHelpful(answerId);

      return reply.send({
        answer_id: answerId,
        helpful_count: updated?.helpful_count ?? answer.helpful_count + 1,
      });
    },
  );

  // 12. POST /api/v1/graph/answers/:answerId/accept -- Accept answer (question owner only)
  server.post(
    '/api/v1/graph/answers/:answerId/accept',
    { preValidation: [validateParams(answerIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof answerIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { answerId } = request.params as z.infer<typeof answerIdParamSchema>;

      const answer = await findAnswerById(answerId);
      if (!answer || answer.status === 'removed') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Answer not found',
          },
        });
      }

      // Verify the current user is the question owner
      const question = await findQuestionById(answer.question_id);
      if (!question) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Question not found',
          },
        });
      }

      if (question.user_id !== userId) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'Only the question author can accept an answer',
          },
        });
      }

      const accepted = await acceptAnswer(answerId, answer.question_id);

      return reply.send(accepted);
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  UGC: FORUM ROUTES
  // ════════════════════════════════════════════════════════════════════════

  // 13. GET /api/v1/graph/forums -- List forums
  server.get(
    '/api/v1/graph/forums',
    { preValidation: [validateQuery(listForumsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listForumsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { category, limit, offset } =
        request.query as z.infer<typeof listForumsQuerySchema>;

      const { data, total } = await findForums({
        category,
        limit,
        offset,
      });

      return reply.send({
        data,
        pagination: buildPagination(total, limit, offset),
      });
    },
  );

  // 14. GET /api/v1/graph/forums/:forumId -- Get forum with recent topics
  server.get(
    '/api/v1/graph/forums/:forumId',
    { preValidation: [validateParams(forumIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof forumIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { forumId } = request.params as z.infer<typeof forumIdParamSchema>;

      const forum = await findForumById(forumId);
      if (!forum) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Forum not found',
          },
        });
      }

      // Include the 10 most recent topics
      const { data: recentTopics, total: topicsTotal } = await findTopicsByForumId(
        forumId,
        { sort: 'recent', limit: 10, offset: 0 },
      );

      return reply.send({
        ...forum,
        recent_topics: {
          data: recentTopics,
          total: topicsTotal,
        },
      });
    },
  );

  // 15. GET /api/v1/graph/forums/:forumId/topics -- List topics (paginated, sortable)
  server.get(
    '/api/v1/graph/forums/:forumId/topics',
    {
      preValidation: [
        validateParams(forumIdParamSchema),
        validateQuery(listTopicsQuerySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof forumIdParamSchema>;
        Querystring: z.infer<typeof listTopicsQuerySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { forumId } = request.params as z.infer<typeof forumIdParamSchema>;
      const { sort, limit, offset } =
        request.query as z.infer<typeof listTopicsQuerySchema>;

      const forum = await findForumById(forumId);
      if (!forum) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Forum not found',
          },
        });
      }

      const { data, total } = await findTopicsByForumId(forumId, {
        sort,
        limit,
        offset,
      });

      return reply.send({
        data,
        pagination: buildPagination(total, limit, offset),
      });
    },
  );

  // 16. POST /api/v1/graph/forums/:forumId/topics -- Create topic
  server.post(
    '/api/v1/graph/forums/:forumId/topics',
    {
      preValidation: [
        validateParams(forumIdParamSchema),
        validateBody(createTopicBodySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof forumIdParamSchema>;
        Body: z.infer<typeof createTopicBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { forumId } = request.params as z.infer<typeof forumIdParamSchema>;
      const body = request.body as z.infer<typeof createTopicBodySchema>;

      const forum = await findForumById(forumId);
      if (!forum) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Forum not found',
          },
        });
      }

      const topic = await createTopic({
        forumId,
        userId,
        title: body.title,
        body: body.body,
        tags: body.tags,
      });

      request.log.info(
        { userId, topicId: topic.topic_id, forumId },
        'Forum topic created',
      );

      return reply.code(201).send(topic);
    },
  );

  // 17. GET /api/v1/graph/topics/:topicId -- Get topic with replies
  server.get(
    '/api/v1/graph/topics/:topicId',
    {
      preValidation: [
        validateParams(topicIdParamSchema),
        validateQuery(listRepliesQuerySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof topicIdParamSchema>;
        Querystring: z.infer<typeof listRepliesQuerySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { topicId } = request.params as z.infer<typeof topicIdParamSchema>;
      const { limit, offset } =
        request.query as z.infer<typeof listRepliesQuerySchema>;

      const topic = await findTopicById(topicId);
      if (!topic || topic.status === 'removed') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Topic not found',
          },
        });
      }

      const { data: replies, total: repliesTotal } = await findRepliesByTopicId(
        topicId,
        { limit, offset },
      );

      return reply.send({
        ...topic,
        replies: {
          data: replies,
          pagination: buildPagination(repliesTotal, limit, offset),
        },
      });
    },
  );

  // 18. POST /api/v1/graph/topics/:topicId/replies -- Reply to topic
  server.post(
    '/api/v1/graph/topics/:topicId/replies',
    {
      preValidation: [
        validateParams(topicIdParamSchema),
        validateBody(createReplyBodySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof topicIdParamSchema>;
        Body: z.infer<typeof createReplyBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { topicId } = request.params as z.infer<typeof topicIdParamSchema>;
      const body = request.body as z.infer<typeof createReplyBodySchema>;

      const topic = await findTopicById(topicId);
      if (!topic || topic.status === 'removed') {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Topic not found',
          },
        });
      }

      if (topic.is_locked) {
        return reply.code(409).send({
          error: {
            code: 'TOPIC_LOCKED',
            message: 'This topic is locked and no longer accepts replies',
          },
        });
      }

      const forumReply = await createReply({
        topicId,
        userId,
        body: body.body,
        parentReplyId: body.parent_reply_id,
      });

      request.log.info(
        { userId, replyId: forumReply.reply_id, topicId },
        'Forum reply posted',
      );

      return reply.code(201).send(forumReply);
    },
  );

  // 19. POST /api/v1/graph/forums/:forumId/subscribe -- Subscribe to forum
  server.post(
    '/api/v1/graph/forums/:forumId/subscribe',
    {
      preValidation: [
        validateParams(forumIdParamSchema),
        validateBody(subscribeForumBodySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof forumIdParamSchema>;
        Body: z.infer<typeof subscribeForumBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { forumId } = request.params as z.infer<typeof forumIdParamSchema>;
      const body = request.body as z.infer<typeof subscribeForumBodySchema>;

      const forum = await findForumById(forumId);
      if (!forum) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Forum not found',
          },
        });
      }

      const subscription = await subscribeToForum({
        userId,
        forumId,
        notifyEmail: body.notify_email,
        notifyPush: body.notify_push,
      });

      request.log.info({ userId, forumId }, 'Forum subscribed');

      return reply.code(201).send(subscription);
    },
  );

  // 20. DELETE /api/v1/graph/forums/:forumId/subscribe -- Unsubscribe from forum
  server.delete(
    '/api/v1/graph/forums/:forumId/subscribe',
    { preValidation: [validateParams(forumIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof forumIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { forumId } = request.params as z.infer<typeof forumIdParamSchema>;

      const removed = await unsubscribeFromForum(userId, forumId);
      if (!removed) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Subscription not found',
          },
        });
      }

      request.log.info({ userId, forumId }, 'Forum unsubscribed');

      return reply.code(204).send();
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  UGC: DESTINATION EXPERT ROUTES
  // ════════════════════════════════════════════════════════════════════════

  // 25. GET /api/v1/graph/experts -- List destination experts
  server.get(
    '/api/v1/graph/experts',
    { preValidation: [validateQuery(listExpertsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listExpertsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { place_id, limit, offset } =
        request.query as z.infer<typeof listExpertsQuerySchema>;

      const { data, total } = await findExperts({
        placeId: place_id,
        limit,
        offset,
      });

      return reply.send({
        data,
        pagination: buildPagination(total, limit, offset),
      });
    },
  );

  // 26. GET /api/v1/graph/experts/:expertId -- Get expert profile with stats
  server.get(
    '/api/v1/graph/experts/:expertId',
    { preValidation: [validateParams(expertIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof expertIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { expertId } = request.params as z.infer<typeof expertIdParamSchema>;

      const expert = await findExpertById(expertId);
      if (!expert) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Destination expert not found',
          },
        });
      }

      return reply.send(expert);
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  MAPS & GEO ROUTES
  // ════════════════════════════════════════════════════════════════════════

  // 27. GET /api/v1/graph/map/pins -- Get map pins within bounds (PUBLIC)
  server.get(
    '/api/v1/graph/map/pins',
    { preValidation: [validateQuery(mapPinsBoundsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof mapPinsBoundsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { north, south, east, west, category, limit } =
        request.query as z.infer<typeof mapPinsBoundsQuerySchema>;

      // Validate that north > south (basic sanity check)
      if (north <= south) {
        return reply.code(400).send({
          error: {
            code: 'INVALID_BOUNDS',
            message: 'North latitude must be greater than south latitude',
          },
        });
      }

      const pins = await findMapPins({
        category,
        bounds: { north, south, east, west },
        limit,
      });

      return reply.send({
        data: pins,
        bounds: { north, south, east, west },
        count: pins.length,
      });
    },
  );

  // 28. GET /api/v1/graph/map/pins/nearby -- Get pins near a point (PUBLIC)
  server.get(
    '/api/v1/graph/map/pins/nearby',
    { preValidation: [validateQuery(mapPinsNearbyQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof mapPinsNearbyQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { lat, lng, radius, category, limit } =
        request.query as z.infer<typeof mapPinsNearbyQuerySchema>;

      const pins = await findMapPinsByRadius(lat, lng, radius, category, limit);

      return reply.send({
        data: pins,
        center: { lat, lng },
        radius_km: radius,
        count: pins.length,
      });
    },
  );

  // 29. GET /api/v1/graph/map/pins/:entityId -- Get single pin details (PUBLIC)
  server.get(
    '/api/v1/graph/map/pins/:entityId',
    { preValidation: [validateParams(entityIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof entityIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { entityId } = request.params as z.infer<typeof entityIdParamSchema>;

      const pin = await findMapPinByEntity(entityId);
      if (!pin) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Map pin not found for this entity',
          },
        });
      }

      return reply.send(pin);
    },
  );

  // 30. GET /api/v1/graph/map/location-score/:entityId -- Get location score (PUBLIC)
  server.get(
    '/api/v1/graph/map/location-score/:entityId',
    { preValidation: [validateParams(entityIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof entityIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { entityId } = request.params as z.infer<typeof entityIdParamSchema>;

      const score = await getLocationScore(entityId);
      if (!score) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Location score not found for this entity',
          },
        });
      }

      return reply.send({
        entity_id: score.entity_id,
        entity_type: score.entity_type,
        overall_score: score.overall_score,
        breakdown: {
          walkability: score.walkability_score,
          transit: score.transit_score,
          dining: score.dining_score,
          attractions: score.attractions_score,
          nightlife: score.nightlife_score,
          shopping: score.shopping_score,
          safety: score.safety_score,
        },
        nearby: {
          restaurants: score.nearby_restaurants,
          attractions: score.nearby_attractions,
          transit_stops: score.nearby_transit_stops,
        },
        distances: {
          nearest_airport_km: score.nearest_airport_km,
          nearest_beach_km: score.nearest_beach_km,
          nearest_city_center_km: score.nearest_city_center_km,
        },
        computed_at: score.computed_at,
      });
    },
  );

  // 31. GET /api/v1/graph/map/tours -- List walking tours (PUBLIC)
  server.get(
    '/api/v1/graph/map/tours',
    { preValidation: [validateQuery(listWalkingToursQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listWalkingToursQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { place_id, type, difficulty, limit, offset } =
        request.query as z.infer<typeof listWalkingToursQuerySchema>;

      const { data, total } = await findWalkingTours({
        placeId: place_id,
        tourType: type,
        difficulty,
        limit,
        offset,
      });

      return reply.send({
        data,
        pagination: buildPagination(total, limit, offset),
      });
    },
  );

  // 32. GET /api/v1/graph/map/tours/:slug -- Get tour with all stops (PUBLIC)
  server.get(
    '/api/v1/graph/map/tours/:slug',
    { preValidation: [validateParams(tourSlugParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof tourSlugParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { slug } = request.params as z.infer<typeof tourSlugParamSchema>;

      const tour = await findWalkingTourBySlug(slug);
      if (!tour) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Walking tour not found',
          },
        });
      }

      const stops = await findTourStops(tour.tour_id);

      return reply.send({
        ...tour,
        stops,
        stop_count: stops.length,
      });
    },
  );

  // 33. GET /api/v1/graph/map/favorites -- Get user's favorites on map (AUTHENTICATED)
  server.get(
    '/api/v1/graph/map/favorites',
    { preValidation: [validateQuery(favoritesMapQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof favoritesMapQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { limit, offset } =
        request.query as z.infer<typeof favoritesMapQuerySchema>;

      const { data, total } = await findFavoritesMap(userId, { limit, offset });

      return reply.send({
        data,
        pagination: buildPagination(total, limit, offset),
      });
    },
  );

  // ════════════════════════════════════════════════════════════════════════
  //  AI RECOMMENDATION ROUTES
  // ════════════════════════════════════════════════════════════════════════

  // 34. GET /api/v1/recommendations/for-you -- Personalized recommendations (AUTHENTICATED)
  server.get(
    '/api/v1/recommendations/for-you',
    { preValidation: [validateQuery(forYouQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof forYouQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const userId = getUserId(request);
      const { types, limit } = request.query as z.infer<typeof forYouQuerySchema>;

      try {
        let results = await getPersonalizedRecommendations(userId, types, limit);

        // Fall back to trending if no preference vector exists
        if (results.length === 0) {
          results = await getTrendingRecommendations(types, '7 days', limit);

          // If DB is empty, use the RecommendationEngine mock data
          if (results.length === 0) {
            const mockItems = await recommendationEngine.getPersonalized(userId, limit);
            return reply.send({
              data: mockItems,
              meta: {
                total: mockItems.length,
                generated_at: new Date().toISOString(),
                algorithm: 'personalized_mock',
                fallback: true,
                message: 'Showing curated recommendations. Personalized results will improve as you interact with more content.',
              },
            });
          }

          return reply.send({
            data: results.map(formatRecommendation),
            meta: {
              total: results.length,
              generated_at: new Date().toISOString(),
              algorithm: 'trending',
              fallback: true,
              message: 'Showing trending results. Personalized recommendations will improve as you interact with more content.',
            },
          });
        }

        // Log the recommendations for feedback tracking
        for (const rec of results) {
          const r = rec as Record<string, unknown>;
          await logRecommendation(
            userId,
            r.entity_id as string,
            Number(r.similarity ?? 0),
            'Personalized based on your travel preferences',
            'personalized',
          );
        }

        return reply.send({
          data: results.map(formatRecommendation),
          meta: {
            total: results.length,
            generated_at: new Date().toISOString(),
            algorithm: 'personalized',
            fallback: false,
          },
        });
      } catch (err) {
        request.log.error({ err }, 'Personalized recommendations failed');
        reply.code(500).send({
          error: {
            code: 'RECOMMENDATION_ERROR',
            message: 'An error occurred while fetching recommendations',
          },
        });
      }
    },
  );

  // 35. GET /api/v1/recommendations/similar/:entityId -- Similar entities (PUBLIC)
  server.get(
    '/api/v1/recommendations/similar/:entityId',
    {
      preValidation: [
        validateParams(similarRecommendationParamSchema),
        validateQuery(similarRecommendationQuerySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof similarRecommendationParamSchema>;
        Querystring: z.infer<typeof similarRecommendationQuerySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { entityId } = request.params as z.infer<typeof similarRecommendationParamSchema>;
      const { type: entityType, limit } = request.query as z.infer<typeof similarRecommendationQuerySchema>;

      try {
        const results = await getSimilarEntities(entityId, limit);

        // If DB has no embeddings, fall back to RecommendationEngine mock data
        if (results.length === 0) {
          const mockItems = await recommendationEngine.getSimilar(
            entityId,
            entityType ?? 'venue',
            limit,
          );
          return reply.send({
            data: mockItems,
            meta: {
              total: mockItems.length,
              generated_at: new Date().toISOString(),
              source_entity_id: entityId,
              algorithm: 'content_similarity_mock',
            },
          });
        }

        return reply.send({
          data: results.map(formatRecommendation),
          meta: {
            total: results.length,
            generated_at: new Date().toISOString(),
            source_entity_id: entityId,
            algorithm: 'content_similarity',
          },
        });
      } catch (err) {
        request.log.error({ err }, 'Similar entities recommendation failed');
        reply.code(500).send({
          error: {
            code: 'SIMILAR_RECOMMENDATION_ERROR',
            message: 'An error occurred while finding similar entities',
          },
        });
      }
    },
  );

  // 36. GET /api/v1/recommendations/trending -- Trending entities (PUBLIC)
  server.get(
    '/api/v1/recommendations/trending',
    { preValidation: [validateQuery(trendingRecommendationQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof trendingRecommendationQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { types, timeWindow, limit } =
        request.query as z.infer<typeof trendingRecommendationQuerySchema>;

      try {
        const results = await getTrendingRecommendations(types, timeWindow, limit);

        // If DB has no trending data, fall back to RecommendationEngine mock data
        if (results.length === 0) {
          const mockItems = await recommendationEngine.getTrending(limit);
          return reply.send({
            data: mockItems,
            meta: {
              total: mockItems.length,
              generated_at: new Date().toISOString(),
              algorithm: 'trending_mock',
              time_window: timeWindow,
            },
          });
        }

        return reply.send({
          data: results.map((r) => ({
            ...formatRecommendation(r),
            trending_score: Number(Number((r as Record<string, unknown>).trending_score ?? 0).toFixed(4)),
            recent_review_count: (r as Record<string, unknown>).recent_review_count ?? 0,
            total_review_count: (r as Record<string, unknown>).total_review_count ?? 0,
          })),
          meta: {
            total: results.length,
            generated_at: new Date().toISOString(),
            algorithm: 'trending',
            time_window: timeWindow,
          },
        });
      } catch (err) {
        request.log.error({ err }, 'Trending recommendations failed');
        reply.code(500).send({
          error: {
            code: 'TRENDING_RECOMMENDATION_ERROR',
            message: 'An error occurred while fetching trending recommendations',
          },
        });
      }
    },
  );

  // 37. POST /api/v1/recommendations/:recommendationId/feedback -- Update feedback (AUTHENTICATED)
  server.post(
    '/api/v1/recommendations/:recommendationId/feedback',
    {
      preValidation: [
        validateParams(recommendationIdParamSchema),
        validateBody(recommendationFeedbackBodySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof recommendationIdParamSchema>;
        Body: z.infer<typeof recommendationFeedbackBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      // Ensure authenticated
      getUserId(request);

      const { recommendationId } = request.params as z.infer<typeof recommendationIdParamSchema>;
      const feedback = request.body as z.infer<typeof recommendationFeedbackBodySchema>;

      try {
        const updated = await updateRecommendationFeedback(recommendationId, feedback);

        if (!updated) {
          return reply.code(404).send({
            error: {
              code: 'NOT_FOUND',
              message: 'Recommendation not found or no updates provided',
            },
          });
        }

        return reply.send({
          data: updated,
          meta: {
            updated: true,
          },
        });
      } catch (err) {
        request.log.error({ err }, 'Recommendation feedback update failed');
        reply.code(500).send({
          error: {
            code: 'FEEDBACK_ERROR',
            message: 'An error occurred while updating recommendation feedback',
          },
        });
      }
    },
  );

  // 38. POST /api/v1/recommendations/track-interaction -- Track user interaction (AUTHENTICATED)
  server.post(
    '/api/v1/recommendations/track-interaction',
    { preValidation: [validateBody(trackInteractionBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const body = request.body as z.infer<typeof trackInteractionBodySchema>;

      try {
        const result = await updateUserPreferences(
          userId,
          body.entityId,
          body.type,
        );

        return reply.send({
          data: {
            entity_id: body.entityId,
            interaction_type: body.type,
            interaction_count: result.interaction_count,
            preference_updated: result.updated,
          },
          meta: {
            message: result.updated
              ? 'Preference vector updated successfully'
              : 'Interaction recorded but preference vector could not be updated',
          },
        });
      } catch (err) {
        request.log.error({ err }, 'Interaction tracking failed');
        reply.code(500).send({
          error: {
            code: 'INTERACTION_TRACKING_ERROR',
            message: 'An error occurred while tracking the interaction',
          },
        });
      }
    },
  );
}

// ── Recommendation Helper ────────────────────────────────────────────

/**
 * Formats a recommendation result row into a consistent API response shape.
 */
function formatRecommendation(row: Record<string, unknown>) {
  return {
    id: row.entity_id,
    type: row.entity_type,
    name: row.canonical_name ?? row.product_title ?? null,
    description: row.product_description ?? null,
    status: row.status,
    similarity: row.similarity != null
      ? Number((Number(row.similarity) * 100).toFixed(2))
      : null,
    location: row.lat != null && row.lng != null
      ? { lat: Number(row.lat), lng: Number(row.lng) }
      : null,
    country_code: row.country_code ?? null,
    details: buildRecommendationDetails(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Builds recommendation-specific details from the row data.
 */
function buildRecommendationDetails(row: Record<string, unknown>) {
  const details: Record<string, unknown> = {};

  if (row.place_type != null) details.place_type = row.place_type;
  if (row.venue_type != null) details.venue_type = row.venue_type;
  if (row.price_tier != null) details.price_tier = row.price_tier;
  if (row.rating_avg != null) details.rating_avg = Number(row.rating_avg);
  if (row.rating_count != null) details.rating_count = row.rating_count;
  if (row.base_price != null) {
    details.base_price = Number(row.base_price);
    details.currency = row.currency;
  }
  if (row.popularity_score != null) details.popularity_score = Number(row.popularity_score);

  return Object.keys(details).length > 0 ? details : null;
}
