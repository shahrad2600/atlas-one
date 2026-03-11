import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  z,
  validateBody,
  validateQuery,
  validateParams,
  uuidSchema,
} from '@atlas/validation';
import { requireAnyRole } from '@atlas/auth';
import {
  // Destinations
  listDestinations,
  findDestinationBySlug,
  createDestination,
  updateDestination,
  // Neighborhoods
  listNeighborhoodsByDestination,
  findNeighborhoodBySlug,
  // Guides
  listGuides,
  listFeaturedGuides,
  findGuideBySlug,
  incrementGuideViewCount,
  createGuide,
  updateGuide,
  // Best-Of
  listBestOf,
  findBestOfBySlug,
  findBestOfItems,
  createBestOf,
  updateBestOf,
  addBestOfItems,
  // Awards
  listAwards,
  findAwardBySlugAndYear,
  findAwardWinners,
  findAwardsByEntity,
  createAward,
  addAwardWinners,
  // Collections
  listCollections,
  findCollectionBySlug,
  createCollection,
  updateCollection,
  // Trending
  listTrending,
  listTrendingDestinations,
  // Search
  searchContent,
} from '../db/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// Zod Schemas — Params
// ═══════════════════════════════════════════════════════════════════════════

const slugParamSchema = z.object({
  slug: z.string().min(1).max(500),
});

const destinationIdParamSchema = z.object({
  destinationId: uuidSchema,
});

const destinationSlugNeighborhoodSlugSchema = z.object({
  slug: z.string().min(1).max(300),
  nhSlug: z.string().min(1).max(200),
});

const guideIdParamSchema = z.object({
  guideId: uuidSchema,
});

const bestOfIdParamSchema = z.object({
  bestOfId: uuidSchema,
});

const awardSlugYearParamSchema = z.object({
  slug: z.string().min(1).max(300),
  year: z.coerce.number().int().min(2000).max(2100),
});

const awardIdParamSchema = z.object({
  awardId: uuidSchema,
});

const entityIdParamSchema = z.object({
  entityId: uuidSchema,
});

const collectionIdParamSchema = z.object({
  collectionId: uuidSchema,
});

// ═══════════════════════════════════════════════════════════════════════════
// Zod Schemas — Query
// ═══════════════════════════════════════════════════════════════════════════

const listDestinationsQuerySchema = z.object({
  country: z.string().max(3).optional(),
  region: z.string().max(100).optional(),
  featured: z.coerce.boolean().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listGuidesQuerySchema = z.object({
  category: z.string().max(50).optional(),
  destination_id: uuidSchema.optional(),
  tags: z.string().optional(), // comma-separated
  status: z.enum(['draft', 'published', 'archived']).optional(),
  featured: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listFeaturedGuidesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const listBestOfQuerySchema = z.object({
  category: z.string().max(50).optional(),
  destination_id: uuidSchema.optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listAwardsQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  category: z.string().max(50).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listCollectionsQuerySchema = z.object({
  theme: z.string().max(50).optional(),
  featured: z.coerce.boolean().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const listTrendingQuerySchema = z.object({
  trend_type: z.string().max(30).optional(),
  period: z.string().max(20).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const trendingDestinationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const searchContentQuerySchema = z.object({
  q: z.string().min(1).max(500),
  type: z.enum(['destination', 'guide', 'best_of', 'collection', 'award']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// ═══════════════════════════════════════════════════════════════════════════
// Zod Schemas — Body
// ═══════════════════════════════════════════════════════════════════════════

const createDestinationBodySchema = z.object({
  place_id: uuidSchema,
  slug: z.string().min(1).max(300),
  name: z.string().min(1).max(300),
  tagline: z.string().max(500).optional(),
  description: z.string().optional(),
  hero_image_url: z.string().url().optional(),
  gallery_urls: z.array(z.string().url()).max(50).optional(),
  overview_html: z.string().optional(),
  best_time_to_visit: z.string().max(1000).optional(),
  getting_there: z.string().max(2000).optional(),
  local_tips: z.string().max(2000).optional(),
  weather_info: z.record(z.unknown()).optional(),
  quick_facts: z.record(z.unknown()).optional(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  country_code: z.string().max(3).optional(),
  region: z.string().max(100).optional(),
  is_featured: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

const updateDestinationBodySchema = createDestinationBodySchema.partial();

const createGuideBodySchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(500),
  subtitle: z.string().max(500).optional(),
  author_id: uuidSchema.optional(),
  author_name: z.string().max(200).optional(),
  destination_id: uuidSchema.optional(),
  category: z.enum([
    'destination', 'theme', 'how_to', 'tips', 'seasonal',
    'food', 'adventure', 'budget', 'luxury',
  ]),
  subcategory: z.string().max(50).optional(),
  hero_image_url: z.string().url().optional(),
  content_html: z.string().min(1),
  excerpt: z.string().max(1000).optional(),
  reading_time_minutes: z.number().int().min(1).max(120).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  related_entity_ids: z.array(uuidSchema).max(50).optional(),
  is_featured: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

const updateGuideBodySchema = createGuideBodySchema.partial();

const createBestOfBodySchema = z.object({
  title: z.string().min(1).max(500),
  slug: z.string().min(1).max(500),
  description: z.string().optional(),
  category: z.enum([
    'restaurants', 'hotels', 'attractions', 'experiences',
    'beaches', 'museums', 'nightlife', 'shopping', 'spas',
  ]),
  subcategory: z.string().max(50).optional(),
  destination_id: uuidSchema.optional(),
  hero_image_url: z.string().url().optional(),
  methodology: z.string().max(2000).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  season: z.enum(['spring', 'summer', 'fall', 'winter']).optional(),
  is_featured: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

const updateBestOfBodySchema = createBestOfBodySchema.partial();

const addBestOfItemsBodySchema = z.object({
  items: z.array(z.object({
    entity_id: uuidSchema,
    entity_type: z.string().min(1).max(50),
    rank: z.number().int().min(1),
    title: z.string().max(300).optional(),
    blurb: z.string().max(2000).optional(),
    image_url: z.string().url().optional(),
    metadata: z.record(z.unknown()).optional(),
  })).min(1).max(100),
});

const createAwardBodySchema = z.object({
  name: z.string().min(1).max(300),
  slug: z.string().min(1).max(300),
  description: z.string().optional(),
  badge_image_url: z.string().url().optional(),
  category: z.enum(['destination', 'hotel', 'restaurant', 'attraction', 'experience']),
  subcategory: z.string().max(50).optional(),
  tier: z.enum(['standard', 'best_of_best']).optional(),
  year: z.number().int().min(2000).max(2100),
  methodology: z.string().max(2000).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

const addAwardWinnersBodySchema = z.object({
  winners: z.array(z.object({
    entity_id: uuidSchema,
    entity_type: z.string().min(1).max(50),
    rank: z.number().int().min(1).optional(),
    region: z.string().max(100).optional(),
    country_code: z.string().max(3).optional(),
    blurb: z.string().max(2000).optional(),
    review_count: z.number().int().min(0).optional(),
    average_rating: z.number().min(0).max(5).optional(),
    metadata: z.record(z.unknown()).optional(),
  })).min(1).max(100),
});

const createCollectionBodySchema = z.object({
  title: z.string().min(1).max(300),
  slug: z.string().min(1).max(300),
  description: z.string().optional(),
  theme: z.enum([
    'solo_travel', 'honeymoon', 'family', 'business', 'road_trip',
    'luxury', 'budget', 'food', 'adventure', 'wellness',
    'cultural', 'beach', 'winter', 'summer',
  ]),
  hero_image_url: z.string().url().optional(),
  destination_ids: z.array(uuidSchema).max(100).optional(),
  entity_ids: z.array(uuidSchema).max(200).optional(),
  guide_ids: z.array(uuidSchema).max(50).optional(),
  best_of_ids: z.array(uuidSchema).max(50).optional(),
  is_featured: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  sort_order: z.number().int().min(0).optional(),
});

const updateCollectionBodySchema = createCollectionBodySchema.partial();

// ═══════════════════════════════════════════════════════════════════════════
// Admin guard shorthand
// ═══════════════════════════════════════════════════════════════════════════

const adminOnly = requireAnyRole('admin' as never, 'super_admin' as never);
const editorOrAdmin = requireAnyRole('admin' as never, 'super_admin' as never, 'concierge' as never);

// ═══════════════════════════════════════════════════════════════════════════
// Route Registration
// ═══════════════════════════════════════════════════════════════════════════

export async function registerRoutes(server: FastifyInstance): Promise<void> {

  // ─────────────────────────────────────────────────────────────────────────
  // Status
  // ─────────────────────────────────────────────────────────────────────────

  server.get('/api/v1/content/status', async () => ({
    service: 'content-service',
    routes: [
      'destinations', 'destinations/:slug', 'destinations/:slug/neighborhoods',
      'guides', 'guides/featured', 'guides/:slug',
      'best-of', 'best-of/:slug',
      'awards', 'awards/:slug/:year', 'awards/entity/:entityId',
      'collections', 'collections/:slug',
      'trending', 'trending/destinations',
      'search',
    ],
  }));

  // ═════════════════════════════════════════════════════════════════════════
  // DESTINATION PAGES
  // ═════════════════════════════════════════════════════════════════════════

  // ── 1. GET /api/v1/content/destinations ──────────────────────────────
  server.get(
    '/api/v1/content/destinations',
    { preValidation: [validateQuery(listDestinationsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listDestinationsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { country, region, featured, status, limit, offset } =
        request.query as z.infer<typeof listDestinationsQuerySchema>;

      const { data, total } = await listDestinations({
        country,
        region,
        featured,
        status,
        limit,
        offset,
      });

      return reply.send({
        data,
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      });
    },
  );

  // ── 2. GET /api/v1/content/destinations/:slug ───────────────────────
  server.get(
    '/api/v1/content/destinations/:slug',
    { preValidation: [validateParams(slugParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof slugParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { slug } = request.params as z.infer<typeof slugParamSchema>;
      const destination = await findDestinationBySlug(slug);

      if (!destination) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Destination not found' },
        });
      }

      // Only serve published content to public (non-admin) users
      if (destination.status !== 'published' && !request.user?.roles?.includes('admin' as never)) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Destination not found' },
        });
      }

      // Fetch neighborhoods
      const neighborhoods = await listNeighborhoodsByDestination(destination.destination_id);

      return reply.send({ ...destination, neighborhoods });
    },
  );

  // ── 3. GET /api/v1/content/destinations/:slug/neighborhoods ─────────
  server.get(
    '/api/v1/content/destinations/:slug/neighborhoods',
    { preValidation: [validateParams(slugParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof slugParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { slug } = request.params as z.infer<typeof slugParamSchema>;
      const destination = await findDestinationBySlug(slug);

      if (!destination) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Destination not found' },
        });
      }

      const neighborhoods = await listNeighborhoodsByDestination(destination.destination_id);
      return reply.send({ data: neighborhoods });
    },
  );

  // ── 4. GET /api/v1/content/destinations/:slug/neighborhoods/:nhSlug ─
  server.get(
    '/api/v1/content/destinations/:slug/neighborhoods/:nhSlug',
    { preValidation: [validateParams(destinationSlugNeighborhoodSlugSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof destinationSlugNeighborhoodSlugSchema> }>,
      reply: FastifyReply,
    ) => {
      const { slug, nhSlug } = request.params as z.infer<typeof destinationSlugNeighborhoodSlugSchema>;
      const destination = await findDestinationBySlug(slug);

      if (!destination) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Destination not found' },
        });
      }

      const neighborhood = await findNeighborhoodBySlug(destination.destination_id, nhSlug);
      if (!neighborhood) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Neighborhood not found' },
        });
      }

      return reply.send(neighborhood);
    },
  );

  // ── 5. POST /api/v1/content/destinations (admin) ────────────────────
  server.post(
    '/api/v1/content/destinations',
    {
      preValidation: [validateBody(createDestinationBodySchema)],
      preHandler: [adminOnly],
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createDestinationBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const body = request.body as z.infer<typeof createDestinationBodySchema>;

      try {
        const destination = await createDestination(body);
        return reply.code(201).send(destination);
      } catch (err: unknown) {
        const error = err as Error & { code?: string };
        if (error.code === '23505') {
          return reply.code(409).send({
            error: { code: 'DUPLICATE', message: 'A destination with this slug already exists' },
          });
        }
        throw err;
      }
    },
  );

  // ── 6. PATCH /api/v1/content/destinations/:destinationId (admin) ────
  server.patch(
    '/api/v1/content/destinations/:destinationId',
    {
      preValidation: [
        validateParams(destinationIdParamSchema),
        validateBody(updateDestinationBodySchema),
      ],
      preHandler: [adminOnly],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof destinationIdParamSchema>;
        Body: z.infer<typeof updateDestinationBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { destinationId } = request.params as z.infer<typeof destinationIdParamSchema>;
      const body = request.body as z.infer<typeof updateDestinationBodySchema>;

      const updated = await updateDestination(destinationId, body);
      if (!updated) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Destination not found' },
        });
      }

      return reply.send(updated);
    },
  );

  // ═════════════════════════════════════════════════════════════════════════
  // TRAVEL GUIDES
  // ═════════════════════════════════════════════════════════════════════════

  // ── 7. GET /api/v1/content/guides ───────────────────────────────────
  server.get(
    '/api/v1/content/guides',
    { preValidation: [validateQuery(listGuidesQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listGuidesQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { category, destination_id, tags, status, featured, limit, offset } =
        request.query as z.infer<typeof listGuidesQuerySchema>;

      const parsedTags = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined;

      const { data, total } = await listGuides({
        category,
        destination_id,
        tags: parsedTags,
        status,
        featured,
        limit,
        offset,
      });

      return reply.send({
        data,
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      });
    },
  );

  // ── 8. GET /api/v1/content/guides/featured ──────────────────────────
  server.get(
    '/api/v1/content/guides/featured',
    { preValidation: [validateQuery(listFeaturedGuidesQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listFeaturedGuidesQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { limit } = request.query as z.infer<typeof listFeaturedGuidesQuerySchema>;
      const data = await listFeaturedGuides(limit);
      return reply.send({ data });
    },
  );

  // ── 9. GET /api/v1/content/guides/:slug ─────────────────────────────
  server.get(
    '/api/v1/content/guides/:slug',
    { preValidation: [validateParams(slugParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof slugParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { slug } = request.params as z.infer<typeof slugParamSchema>;
      const guide = await findGuideBySlug(slug);

      if (!guide) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Guide not found' },
        });
      }

      if (guide.status !== 'published' && !request.user?.roles?.includes('admin' as never)) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Guide not found' },
        });
      }

      // Increment view count (fire and forget)
      void incrementGuideViewCount(guide.guide_id);

      return reply.send(guide);
    },
  );

  // ── 10. POST /api/v1/content/guides (admin/editor) ─────────────────
  server.post(
    '/api/v1/content/guides',
    {
      preValidation: [validateBody(createGuideBodySchema)],
      preHandler: [editorOrAdmin],
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createGuideBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const body = request.body as z.infer<typeof createGuideBodySchema>;

      try {
        const guide = await createGuide(body);
        return reply.code(201).send(guide);
      } catch (err: unknown) {
        const error = err as Error & { code?: string };
        if (error.code === '23505') {
          return reply.code(409).send({
            error: { code: 'DUPLICATE', message: 'A guide with this slug already exists' },
          });
        }
        throw err;
      }
    },
  );

  // ── 11. PATCH /api/v1/content/guides/:guideId (admin/editor) ───────
  server.patch(
    '/api/v1/content/guides/:guideId',
    {
      preValidation: [
        validateParams(guideIdParamSchema),
        validateBody(updateGuideBodySchema),
      ],
      preHandler: [editorOrAdmin],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof guideIdParamSchema>;
        Body: z.infer<typeof updateGuideBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { guideId } = request.params as z.infer<typeof guideIdParamSchema>;
      const body = request.body as z.infer<typeof updateGuideBodySchema>;

      const updated = await updateGuide(guideId, body);
      if (!updated) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Guide not found' },
        });
      }

      return reply.send(updated);
    },
  );

  // ═════════════════════════════════════════════════════════════════════════
  // BEST-OF LISTS
  // ═════════════════════════════════════════════════════════════════════════

  // ── 12. GET /api/v1/content/best-of ─────────────────────────────────
  server.get(
    '/api/v1/content/best-of',
    { preValidation: [validateQuery(listBestOfQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listBestOfQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { category, destination_id, year, status, limit, offset } =
        request.query as z.infer<typeof listBestOfQuerySchema>;

      const { data, total } = await listBestOf({
        category,
        destination_id,
        year,
        status,
        limit,
        offset,
      });

      return reply.send({
        data,
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      });
    },
  );

  // ── 13. GET /api/v1/content/best-of/:slug ──────────────────────────
  server.get(
    '/api/v1/content/best-of/:slug',
    { preValidation: [validateParams(slugParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof slugParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { slug } = request.params as z.infer<typeof slugParamSchema>;
      const bestOf = await findBestOfBySlug(slug);

      if (!bestOf) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Best-of list not found' },
        });
      }

      if (bestOf.status !== 'published' && !request.user?.roles?.includes('admin' as never)) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Best-of list not found' },
        });
      }

      const items = await findBestOfItems(bestOf.best_of_id);
      return reply.send({ ...bestOf, items });
    },
  );

  // ── 14. POST /api/v1/content/best-of (admin) ──────────────────────
  server.post(
    '/api/v1/content/best-of',
    {
      preValidation: [validateBody(createBestOfBodySchema)],
      preHandler: [adminOnly],
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createBestOfBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const body = request.body as z.infer<typeof createBestOfBodySchema>;

      try {
        const bestOf = await createBestOf(body);
        return reply.code(201).send(bestOf);
      } catch (err: unknown) {
        const error = err as Error & { code?: string };
        if (error.code === '23505') {
          return reply.code(409).send({
            error: { code: 'DUPLICATE', message: 'A best-of list with this slug already exists' },
          });
        }
        throw err;
      }
    },
  );

  // ── 15. PATCH /api/v1/content/best-of/:bestOfId (admin) ────────────
  server.patch(
    '/api/v1/content/best-of/:bestOfId',
    {
      preValidation: [
        validateParams(bestOfIdParamSchema),
        validateBody(updateBestOfBodySchema),
      ],
      preHandler: [adminOnly],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof bestOfIdParamSchema>;
        Body: z.infer<typeof updateBestOfBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { bestOfId } = request.params as z.infer<typeof bestOfIdParamSchema>;
      const body = request.body as z.infer<typeof updateBestOfBodySchema>;

      const updated = await updateBestOf(bestOfId, body);
      if (!updated) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Best-of list not found' },
        });
      }

      return reply.send(updated);
    },
  );

  // ── 16. POST /api/v1/content/best-of/:bestOfId/items (admin) ──────
  server.post(
    '/api/v1/content/best-of/:bestOfId/items',
    {
      preValidation: [
        validateParams(bestOfIdParamSchema),
        validateBody(addBestOfItemsBodySchema),
      ],
      preHandler: [adminOnly],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof bestOfIdParamSchema>;
        Body: z.infer<typeof addBestOfItemsBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { bestOfId } = request.params as z.infer<typeof bestOfIdParamSchema>;
      const { items } = request.body as z.infer<typeof addBestOfItemsBodySchema>;

      // Verify the best-of list exists
      const { findBestOfById } = await import('../db/index.js');
      const bestOfRecord = await findBestOfById(bestOfId);

      if (!bestOfRecord) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Best-of list not found' },
        });
      }

      const savedItems = await addBestOfItems(
        items.map((item) => ({ ...item, best_of_id: bestOfId })),
      );

      return reply.code(201).send({ data: savedItems });
    },
  );

  // ═════════════════════════════════════════════════════════════════════════
  // AWARDS
  // ═════════════════════════════════════════════════════════════════════════

  // ── 17. GET /api/v1/content/awards ──────────────────────────────────
  server.get(
    '/api/v1/content/awards',
    { preValidation: [validateQuery(listAwardsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listAwardsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { year, category, status, limit, offset } =
        request.query as z.infer<typeof listAwardsQuerySchema>;

      const { data, total } = await listAwards({ year, category, status, limit, offset });

      return reply.send({
        data,
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      });
    },
  );

  // ── 18. GET /api/v1/content/awards/:slug/:year ─────────────────────
  server.get(
    '/api/v1/content/awards/:slug/:year',
    { preValidation: [validateParams(awardSlugYearParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof awardSlugYearParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { slug, year } = request.params as z.infer<typeof awardSlugYearParamSchema>;
      const award = await findAwardBySlugAndYear(slug, year);

      if (!award) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Award not found' },
        });
      }

      if (award.status !== 'published' && !request.user?.roles?.includes('admin' as never)) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Award not found' },
        });
      }

      const winners = await findAwardWinners(award.award_id);
      return reply.send({ ...award, winners });
    },
  );

  // ── 19. GET /api/v1/content/awards/entity/:entityId ────────────────
  server.get(
    '/api/v1/content/awards/entity/:entityId',
    { preValidation: [validateParams(entityIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof entityIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { entityId } = request.params as z.infer<typeof entityIdParamSchema>;
      const awards = await findAwardsByEntity(entityId);
      return reply.send({ data: awards });
    },
  );

  // ── 20. POST /api/v1/content/awards (admin) ────────────────────────
  server.post(
    '/api/v1/content/awards',
    {
      preValidation: [validateBody(createAwardBodySchema)],
      preHandler: [adminOnly],
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createAwardBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const body = request.body as z.infer<typeof createAwardBodySchema>;

      try {
        const award = await createAward(body);
        return reply.code(201).send(award);
      } catch (err: unknown) {
        const error = err as Error & { code?: string };
        if (error.code === '23505') {
          return reply.code(409).send({
            error: { code: 'DUPLICATE', message: 'An award with this slug and year already exists' },
          });
        }
        throw err;
      }
    },
  );

  // ── 21. POST /api/v1/content/awards/:awardId/winners (admin) ──────
  server.post(
    '/api/v1/content/awards/:awardId/winners',
    {
      preValidation: [
        validateParams(awardIdParamSchema),
        validateBody(addAwardWinnersBodySchema),
      ],
      preHandler: [adminOnly],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof awardIdParamSchema>;
        Body: z.infer<typeof addAwardWinnersBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { awardId } = request.params as z.infer<typeof awardIdParamSchema>;
      const { winners } = request.body as z.infer<typeof addAwardWinnersBodySchema>;

      // Verify award exists
      const { findAwardById } = await import('../db/index.js');
      const awardRecord = await findAwardById(awardId);

      if (!awardRecord) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Award not found' },
        });
      }

      const savedWinners = await addAwardWinners(
        winners.map((w) => ({ ...w, award_id: awardId })),
      );

      return reply.code(201).send({ data: savedWinners });
    },
  );

  // ═════════════════════════════════════════════════════════════════════════
  // THEMED COLLECTIONS
  // ═════════════════════════════════════════════════════════════════════════

  // ── 22. GET /api/v1/content/collections ─────────────────────────────
  server.get(
    '/api/v1/content/collections',
    { preValidation: [validateQuery(listCollectionsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listCollectionsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { theme, featured, status, limit, offset } =
        request.query as z.infer<typeof listCollectionsQuerySchema>;

      const { data, total } = await listCollections({ theme, featured, status, limit, offset });

      return reply.send({
        data,
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      });
    },
  );

  // ── 23. GET /api/v1/content/collections/:slug ──────────────────────
  server.get(
    '/api/v1/content/collections/:slug',
    { preValidation: [validateParams(slugParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof slugParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const { slug } = request.params as z.infer<typeof slugParamSchema>;
      const collection = await findCollectionBySlug(slug);

      if (!collection) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Collection not found' },
        });
      }

      if (collection.status !== 'published' && !request.user?.roles?.includes('admin' as never)) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Collection not found' },
        });
      }

      return reply.send(collection);
    },
  );

  // ── 24. POST /api/v1/content/collections (admin) ──────────────────
  server.post(
    '/api/v1/content/collections',
    {
      preValidation: [validateBody(createCollectionBodySchema)],
      preHandler: [adminOnly],
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof createCollectionBodySchema> }>,
      reply: FastifyReply,
    ) => {
      const body = request.body as z.infer<typeof createCollectionBodySchema>;

      try {
        const collection = await createCollection(body);
        return reply.code(201).send(collection);
      } catch (err: unknown) {
        const error = err as Error & { code?: string };
        if (error.code === '23505') {
          return reply.code(409).send({
            error: { code: 'DUPLICATE', message: 'A collection with this slug already exists' },
          });
        }
        throw err;
      }
    },
  );

  // ── 25. PATCH /api/v1/content/collections/:collectionId (admin) ────
  server.patch(
    '/api/v1/content/collections/:collectionId',
    {
      preValidation: [
        validateParams(collectionIdParamSchema),
        validateBody(updateCollectionBodySchema),
      ],
      preHandler: [adminOnly],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof collectionIdParamSchema>;
        Body: z.infer<typeof updateCollectionBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { collectionId } = request.params as z.infer<typeof collectionIdParamSchema>;
      const body = request.body as z.infer<typeof updateCollectionBodySchema>;

      const updated = await updateCollection(collectionId, body);
      if (!updated) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Collection not found' },
        });
      }

      return reply.send(updated);
    },
  );

  // ═════════════════════════════════════════════════════════════════════════
  // TRENDING
  // ═════════════════════════════════════════════════════════════════════════

  // ── 26. GET /api/v1/content/trending ────────────────────────────────
  server.get(
    '/api/v1/content/trending',
    { preValidation: [validateQuery(listTrendingQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof listTrendingQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { trend_type, period, limit, offset } =
        request.query as z.infer<typeof listTrendingQuerySchema>;

      const data = await listTrending({ trend_type, period, limit, offset });
      return reply.send({ data });
    },
  );

  // ── 27. GET /api/v1/content/trending/destinations ──────────────────
  server.get(
    '/api/v1/content/trending/destinations',
    { preValidation: [validateQuery(trendingDestinationsQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof trendingDestinationsQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { limit } = request.query as z.infer<typeof trendingDestinationsQuerySchema>;
      const data = await listTrendingDestinations(limit);
      return reply.send({ data });
    },
  );

  // ═════════════════════════════════════════════════════════════════════════
  // SEARCH
  // ═════════════════════════════════════════════════════════════════════════

  // ── 28. GET /api/v1/content/search ──────────────────────────────────
  server.get(
    '/api/v1/content/search',
    { preValidation: [validateQuery(searchContentQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof searchContentQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const { q, type, limit, offset } =
        request.query as z.infer<typeof searchContentQuerySchema>;

      const { data, total } = await searchContent({ q, type, limit, offset });

      return reply.send({
        data,
        pagination: { total, limit, offset, hasMore: offset + limit < total },
      });
    },
  );
}
