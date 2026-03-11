import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z, validateQuery, validateBody, validateParams, uuidSchema } from '@atlas/validation';
import type { AuthenticatedRequest } from '@atlas/auth';
import { getPool, query } from '@atlas/database';
import {
  unifiedSearch,
  getAutocompleteSuggestions,
  nearbySearch,
  getAvailableFilters,
  getFacetedCounts,
  getTrendingEntities,
  semanticSearchEntities,
  hybridSearchEntities,
  findSimilarEntities,
  generateEntityEmbedding,
  batchGenerateEmbeddings,
  getQueryEmbedding,
} from '../db/index.js';
import { embeddingService } from '../embeddings.js';

// ── Zod Schemas for Query Validation ────────────────────────────────

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200).optional().default(''),
  type: z
    .enum([
      'place', 'venue', 'supplier', 'product', 'inventory_slot',
      'brand', 'category', 'tag', 'event', 'transport_node',
      'aircraft', 'route', 'policy', 'media',
    ])
    .optional(),
  location: z.string().max(100).optional(),
  category: z.string().max(50).optional(),
  priceMin: z.coerce.number().nonnegative().optional(),
  priceMax: z.coerce.number().positive().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
});

const autocompleteQuerySchema = z.object({
  q: z.string().min(1).max(200),
  type: z
    .enum([
      'place', 'venue', 'supplier', 'product', 'inventory_slot',
      'brand', 'category', 'tag', 'event', 'transport_node',
      'aircraft', 'route', 'policy', 'media',
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().positive().max(500).default(25),
  type: z
    .enum([
      'place', 'venue', 'supplier', 'product', 'inventory_slot',
      'brand', 'category', 'tag', 'event', 'transport_node',
      'aircraft', 'route', 'policy', 'media',
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const facetsQuerySchema = z.object({
  q: z.string().max(200).optional(),
  type: z
    .enum([
      'place', 'venue', 'supplier', 'product', 'inventory_slot',
      'brand', 'category', 'tag', 'event', 'transport_node',
      'aircraft', 'route', 'policy', 'media',
    ])
    .optional(),
});

const trendingQuerySchema = z.object({
  type: z
    .enum([
      'place', 'venue', 'supplier', 'product', 'inventory_slot',
      'brand', 'category', 'tag', 'event', 'transport_node',
      'aircraft', 'route', 'policy', 'media',
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ── Semantic Search Schemas ──────────────────────────────────────────

const entityTypeEnum = z.enum([
  'place', 'venue', 'supplier', 'product', 'inventory_slot',
  'brand', 'category', 'tag', 'event', 'transport_node',
  'aircraft', 'route', 'policy', 'media',
]);

const semanticSearchBodySchema = z.object({
  query: z.string().min(1).max(500),
  types: z.array(entityTypeEnum).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const hybridSearchBodySchema = z.object({
  query: z.string().min(1).max(500),
  types: z.array(entityTypeEnum).optional(),
  filters: z.object({
    location: z.string().max(100).optional(),
    category: z.string().max(50).optional(),
    priceMin: z.number().nonnegative().optional(),
    priceMax: z.number().positive().optional(),
    ratingMin: z.number().min(0).max(5).optional(),
  }).optional(),
  weights: z.object({
    keyword: z.number().min(0).max(1).default(0.4),
    semantic: z.number().min(0).max(1).default(0.6),
  }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const similarEntityParamSchema = z.object({
  entityId: uuidSchema,
});

const similarEntityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

const generateEmbeddingBodySchema = z.object({
  entityId: uuidSchema,
});

const batchEmbeddingBodySchema = z.object({
  entityIds: z.array(uuidSchema).min(1).max(100),
});

// ── Index / Upsert Schema ──────────────────────────────────────────

const indexEntityBodySchema = z.object({
  entityType: z.string().min(1).max(100),
  entityId: uuidSchema,
  entityName: z.string().min(1).max(500),
  description: z.string().min(1).max(5000),
  metadata: z.record(z.unknown()).optional(),
});

// ── Hybrid GET Query Schema ────────────────────────────────────────

const hybridGetQuerySchema = z.object({
  q: z.string().min(1).max(500),
  types: z
    .string()
    .transform((s) => s.split(','))
    .pipe(z.array(entityTypeEnum))
    .optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Type aliases for validated query objects ─────────────────────────

type SearchQuery = z.infer<typeof searchQuerySchema>;
type AutocompleteQuery = z.infer<typeof autocompleteQuerySchema>;
type NearbyQuery = z.infer<typeof nearbyQuerySchema>;
type FacetsQuery = z.infer<typeof facetsQuerySchema>;
type TrendingQuery = z.infer<typeof trendingQuerySchema>;

// ── Route Registration ──────────────────────────────────────────────

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // ────────────────────────────────────────────────────────────────
  // GET /api/v1/search/status - Service status
  // ────────────────────────────────────────────────────────────────
  server.get('/api/v1/search/status', async () => ({
    service: 'search-service',
    routes: [
      'GET /api/v1/search',
      'GET /api/v1/search/autocomplete',
      'GET /api/v1/search/nearby',
      'GET /api/v1/search/filters',
      'GET /api/v1/search/facets',
      'GET /api/v1/search/trending',
      'GET /api/v1/search/recent',
      'POST /api/v1/search/semantic',
      'POST /api/v1/search/hybrid',
      'GET /api/v1/search/hybrid',
      'GET /api/v1/search/similar/:entityId',
      'POST /api/v1/search/index',
      'POST /api/v1/embeddings/generate',
      'POST /api/v1/embeddings/batch',
    ],
  }));

  // ────────────────────────────────────────────────────────────────
  // GET /api/v1/search - Unified search across all entities
  // ────────────────────────────────────────────────────────────────
  server.get<{ Querystring: SearchQuery }>(
    '/api/v1/search',
    { preValidation: validateQuery(searchQuerySchema) },
    async (request, reply) => {
      const { q, type, location, category, priceMin, priceMax, rating, limit, offset } =
        request.query;

      try {
        const { results, total, facets } = await unifiedSearch({
          q: q ?? '',
          type,
          location,
          category,
          priceMin,
          priceMax,
          ratingMin: rating,
          limit,
          offset,
        });

        return {
          data: results.map(formatSearchResult),
          meta: {
            total,
            limit,
            offset,
            hasMore: offset + limit < total,
          },
          facets: facets.map((f) => ({
            type: f.entity_type,
            count: f.count,
          })),
        };
      } catch (err) {
        request.log.error({ err }, 'Unified search failed');
        reply.code(500).send({
          error: {
            code: 'SEARCH_ERROR',
            message: 'An error occurred while performing the search',
          },
        });
      }
    },
  );

  // ────────────────────────────────────────────────────────────────
  // GET /api/v1/search/autocomplete - Fast autocomplete suggestions
  // ────────────────────────────────────────────────────────────────
  server.get<{ Querystring: AutocompleteQuery }>(
    '/api/v1/search/autocomplete',
    { preValidation: validateQuery(autocompleteQuerySchema) },
    async (request, reply) => {
      const { q, type, limit } = request.query;

      try {
        const suggestions = await getAutocompleteSuggestions({ q, type, limit });

        return {
          data: suggestions.map((s) => ({
            id: s.entity_id,
            name: s.name,
            type: s.entity_type,
            similarity: s.similarity,
          })),
        };
      } catch (err) {
        request.log.error({ err }, 'Autocomplete search failed');
        reply.code(500).send({
          error: {
            code: 'AUTOCOMPLETE_ERROR',
            message: 'An error occurred while fetching autocomplete suggestions',
          },
        });
      }
    },
  );

  // ────────────────────────────────────────────────────────────────
  // GET /api/v1/search/nearby - Geo-proximity search
  // ────────────────────────────────────────────────────────────────
  server.get<{ Querystring: NearbyQuery }>(
    '/api/v1/search/nearby',
    { preValidation: validateQuery(nearbyQuerySchema) },
    async (request, reply) => {
      const { lat, lng, radius, type, limit } = request.query;

      try {
        const results = await nearbySearch({
          lat,
          lng,
          radiusKm: radius,
          type,
          limit,
        });

        return {
          data: results.map((r) => ({
            ...formatSearchResult(r),
            distance_km: r.distance_km,
          })),
          meta: {
            center: { lat, lng },
            radius_km: radius,
            count: results.length,
          },
        };
      } catch (err) {
        request.log.error({ err }, 'Nearby search failed');
        reply.code(500).send({
          error: {
            code: 'NEARBY_SEARCH_ERROR',
            message: 'An error occurred while performing the nearby search',
          },
        });
      }
    },
  );

  // ────────────────────────────────────────────────────────────────
  // GET /api/v1/search/filters - Available filter options
  // ────────────────────────────────────────────────────────────────
  server.get(
    '/api/v1/search/filters',
    async (request, reply) => {
      try {
        const filters = await getAvailableFilters();

        return {
          data: {
            entity_types: filters.entity_types,
            venue_types: filters.venue_types,
            place_types: filters.place_types,
            product_types: filters.product_types,
            price_tiers: filters.price_tiers.map((tier) => ({
              value: tier,
              label: priceTierLabel(tier),
            })),
            countries: filters.countries,
          },
        };
      } catch (err) {
        request.log.error({ err }, 'Failed to fetch filter options');
        reply.code(500).send({
          error: {
            code: 'FILTERS_ERROR',
            message: 'An error occurred while fetching available filters',
          },
        });
      }
    },
  );

  // ────────────────────────────────────────────────────────────────
  // GET /api/v1/search/facets - Search with faceted counts
  // ────────────────────────────────────────────────────────────────
  server.get<{ Querystring: FacetsQuery }>(
    '/api/v1/search/facets',
    { preValidation: validateQuery(facetsQuerySchema) },
    async (request, reply) => {
      const { q, type } = request.query;

      try {
        const facets = await getFacetedCounts(q, type);

        return {
          data: {
            by_type: facets.by_type.map((f) => ({
              type: f.entity_type,
              count: f.count,
            })),
            by_venue_type: facets.by_venue_type.map((f) => ({
              venue_type: f.venue_type,
              count: f.count,
            })),
            by_place_type: facets.by_place_type.map((f) => ({
              place_type: f.place_type,
              count: f.count,
            })),
            by_price_tier: facets.by_price_tier.map((f) => ({
              price_tier: f.price_tier,
              label: priceTierLabel(f.price_tier),
              count: f.count,
            })),
            by_country: facets.by_country.map((f) => ({
              country_code: f.country_code,
              count: f.count,
            })),
          },
        };
      } catch (err) {
        request.log.error({ err }, 'Faceted counts failed');
        reply.code(500).send({
          error: {
            code: 'FACETS_ERROR',
            message: 'An error occurred while computing faceted counts',
          },
        });
      }
    },
  );

  // ────────────────────────────────────────────────────────────────
  // GET /api/v1/search/trending - Trending destinations/venues
  // ────────────────────────────────────────────────────────────────
  server.get<{ Querystring: TrendingQuery }>(
    '/api/v1/search/trending',
    { preValidation: validateQuery(trendingQuerySchema) },
    async (request, reply) => {
      const { type, limit } = request.query;

      try {
        const results = await getTrendingEntities(type, limit);

        return {
          data: results.map((r) => ({
            ...formatSearchResult(r),
            review_count: (r as any).review_count ?? 0,
          })),
          meta: {
            count: results.length,
          },
        };
      } catch (err) {
        request.log.error({ err }, 'Trending search failed');
        reply.code(500).send({
          error: {
            code: 'TRENDING_ERROR',
            message: 'An error occurred while fetching trending results',
          },
        });
      }
    },
  );

  // ────────────────────────────────────────────────────────────────
  // GET /api/v1/search/recent - User's recent searches (AUTHENTICATED)
  // ────────────────────────────────────────────────────────────────
  server.get(
    '/api/v1/search/recent',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // This endpoint requires authentication. The auth plugin will have
      // already verified the token and set request.user.
      const user = request.user;
      if (!user) {
        reply.code(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required to access recent searches',
          },
        });
        return;
      }

      // Note: A search_history table does not yet exist in the tg schema.
      // When it is created, wire up the query here. For now, return an
      // empty list with a message indicating the feature is pending.
      return {
        data: [] as never[],
        meta: {
          user_id: user.sub,
          message: 'Search history tracking is not yet available. Results will appear here once the search_history table is provisioned.',
        },
      };
    },
  );

  // ────────────────────────────────────────────────────────────────
  // POST /api/v1/search/semantic - Semantic vector search
  // ────────────────────────────────────────────────────────────────
  server.post(
    '/api/v1/search/semantic',
    { preValidation: validateBody(semanticSearchBodySchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof semanticSearchBodySchema>;

      try {
        const embedding = await getQueryEmbedding(body.query);
        const results = await semanticSearchEntities(
          embedding,
          body.types,
          body.limit,
        );

        return {
          data: results.map((r) => ({
            ...formatSearchResult(r),
            similarity: Number((Number(r.similarity) * 100).toFixed(2)),
            embedding_type: r.embedding_type,
          })),
          meta: {
            query: body.query,
            count: results.length,
            search_type: 'semantic',
          },
        };
      } catch (err) {
        request.log.error({ err }, 'Semantic search failed');
        reply.code(500).send({
          error: {
            code: 'SEMANTIC_SEARCH_ERROR',
            message: 'An error occurred while performing semantic search',
          },
        });
      }
    },
  );

  // ────────────────────────────────────────────────────────────────
  // POST /api/v1/search/hybrid - Hybrid keyword + semantic search
  // ────────────────────────────────────────────────────────────────
  server.post(
    '/api/v1/search/hybrid',
    { preValidation: validateBody(hybridSearchBodySchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof hybridSearchBodySchema>;
      const weights: { keyword: number; semantic: number } = body.weights
        ? { keyword: body.weights.keyword, semantic: body.weights.semantic }
        : { keyword: 0.4, semantic: 0.6 };
      const filters = body.filters ?? {};

      try {
        const embedding = await getQueryEmbedding(body.query);
        const results = await hybridSearchEntities(
          body.query,
          embedding,
          weights,
          {
            entityTypes: body.types,
            location: filters.location,
            category: filters.category,
            priceMin: filters.priceMin,
            priceMax: filters.priceMax,
            ratingMin: filters.ratingMin,
          },
          body.limit,
        );

        return {
          data: results.map((r) => ({
            ...formatSearchResult(r),
            scoring: {
              keyword_score: Number(Number(r.keyword_score).toFixed(4)),
              semantic_score: Number(Number(r.semantic_score).toFixed(4)),
              combined_score: Number(Number(r.combined_score).toFixed(4)),
              weights,
            },
          })),
          meta: {
            query: body.query,
            count: results.length,
            search_type: 'hybrid',
            weights,
          },
        };
      } catch (err) {
        request.log.error({ err }, 'Hybrid search failed');
        reply.code(500).send({
          error: {
            code: 'HYBRID_SEARCH_ERROR',
            message: 'An error occurred while performing hybrid search',
          },
        });
      }
    },
  );

  // ────────────────────────────────────────────────────────────────
  // GET /api/v1/search/similar/:entityId - Find similar entities
  // ────────────────────────────────────────────────────────────────
  server.get(
    '/api/v1/search/similar/:entityId',
    {
      preValidation: [
        validateParams(similarEntityParamSchema),
        validateQuery(similarEntityQuerySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof similarEntityParamSchema>;
        Querystring: z.infer<typeof similarEntityQuerySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const { entityId } = request.params as z.infer<typeof similarEntityParamSchema>;
      const { limit } = request.query as z.infer<typeof similarEntityQuerySchema>;

      try {
        const results = await findSimilarEntities(entityId, limit);

        return {
          data: results.map((r) => ({
            ...formatSearchResult(r),
            similarity: Number((Number(r.similarity) * 100).toFixed(2)),
          })),
          meta: {
            source_entity_id: entityId,
            count: results.length,
          },
        };
      } catch (err) {
        request.log.error({ err }, 'Similar entity search failed');
        reply.code(500).send({
          error: {
            code: 'SIMILAR_SEARCH_ERROR',
            message: 'An error occurred while finding similar entities',
          },
        });
      }
    },
  );

  // ────────────────────────────────────────────────────────────────
  // POST /api/v1/embeddings/generate - Generate embedding for entity (ADMIN)
  // ────────────────────────────────────────────────────────────────
  server.post(
    '/api/v1/embeddings/generate',
    { preValidation: validateBody(generateEmbeddingBodySchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const body = request.body as z.infer<typeof generateEmbeddingBodySchema>;

      try {
        const result = await generateEntityEmbedding(body.entityId);

        return {
          data: {
            entity_id: body.entityId,
            name_embedding_id: result.name_embedding_id,
            description_embedding_id: result.description_embedding_id,
          },
          meta: {
            model: 'mock',
            dimensions: 1536,
          },
        };
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
        const message = err instanceof Error ? err.message : 'Unknown error';
        request.log.error({ err }, 'Embedding generation failed');
        reply.code(statusCode).send({
          error: {
            code: 'EMBEDDING_GENERATION_ERROR',
            message: statusCode === 404 ? message : 'An error occurred while generating embeddings',
          },
        });
      }
    },
  );

  // ────────────────────────────────────────────────────────────────
  // POST /api/v1/embeddings/batch - Batch generate embeddings (ADMIN)
  // ────────────────────────────────────────────────────────────────
  server.post(
    '/api/v1/embeddings/batch',
    { preValidation: validateBody(batchEmbeddingBodySchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const body = request.body as z.infer<typeof batchEmbeddingBodySchema>;

      try {
        const result = await batchGenerateEmbeddings(body.entityIds);

        return {
          data: result.results,
          meta: {
            processed: result.processed,
            succeeded: result.succeeded,
            failed: result.failed,
            model: 'mock',
            dimensions: 1536,
          },
        };
      } catch (err) {
        request.log.error({ err }, 'Batch embedding generation failed');
        reply.code(500).send({
          error: {
            code: 'BATCH_EMBEDDING_ERROR',
            message: 'An error occurred while batch generating embeddings',
          },
        });
      }
    },
  );

  // ────────────────────────────────────────────────────────────────
  // POST /api/v1/search/index - Index an entity for semantic search
  // ────────────────────────────────────────────────────────────────
  server.post(
    '/api/v1/search/index',
    { preValidation: validateBody(indexEntityBodySchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof indexEntityBodySchema>;

      try {
        const textToEmbed = `${body.entityName} ${body.description}`;
        const embedding = await embeddingService.generateEmbedding(textToEmbed);
        const pool = getPool();

        // Upsert: delete any existing embedding for this entity, then insert
        await query(
          pool,
          `DELETE FROM search.embeddings
           WHERE entity_type = $1 AND entity_id = $2`,
          [body.entityType, body.entityId],
        );

        const result = await query(
          pool,
          `INSERT INTO search.embeddings
             (entity_type, entity_id, entity_name, embedding, metadata)
           VALUES ($1, $2, $3, $4::vector, $5)
           RETURNING id, created_at`,
          [
            body.entityType,
            body.entityId,
            body.entityName,
            JSON.stringify(embedding),
            JSON.stringify(body.metadata ?? {}),
          ],
        );

        const row = result.rows[0] as { id: string; created_at: string };

        return {
          data: {
            id: row.id,
            entity_type: body.entityType,
            entity_id: body.entityId,
            entity_name: body.entityName,
            indexed_at: row.created_at,
          },
          meta: {
            dimensions: embeddingService.dimensions,
            model: 'mock',
          },
        };
      } catch (err) {
        request.log.error({ err }, 'Entity indexing failed');
        reply.code(500).send({
          error: {
            code: 'INDEX_ERROR',
            message: 'An error occurred while indexing the entity',
          },
        });
      }
    },
  );

  // ────────────────────────────────────────────────────────────────
  // GET /api/v1/search/hybrid - Hybrid keyword + semantic search
  // ────────────────────────────────────────────────────────────────
  server.get(
    '/api/v1/search/hybrid',
    { preValidation: validateQuery(hybridGetQuerySchema) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.query as z.infer<typeof hybridGetQuerySchema>;
      const keywordWeight = 0.4;
      const semanticWeight = 0.6;

      try {
        // Run keyword search (via existing unified search) and semantic
        // search in parallel, then merge and re-rank results.
        const queryEmbedding = await embeddingService.generateEmbedding(params.q);

        const [keywordResults, semanticResults] = await Promise.all([
          unifiedSearch({
            q: params.q,
            type: params.types?.[0],
            limit: params.limit,
            offset: 0,
          }),
          semanticSearchEntities(
            queryEmbedding,
            params.types,
            params.limit,
          ),
        ]);

        // Build a map to merge results by entity_id
        const mergedMap = new Map<string, {
          row: Record<string, unknown>;
          keywordScore: number;
          semanticScore: number;
        }>();

        // Score keyword results: normalise position-based relevance to [0, 1]
        const kwRows = keywordResults.results;
        for (let i = 0; i < kwRows.length; i++) {
          const row = kwRows[i]!;
          const entityId = row.entity_id;
          // Simple inverse-rank scoring: top result = 1.0, decaying linearly
          const score = 1 - i / Math.max(kwRows.length, 1);
          mergedMap.set(entityId, {
            row: row as unknown as Record<string, unknown>,
            keywordScore: score,
            semanticScore: 0,
          });
        }

        // Merge semantic results
        for (const semRow of semanticResults) {
          const entityId = semRow.entity_id;
          const semScore = Number(semRow.similarity ?? 0);
          const existing = mergedMap.get(entityId);

          if (existing) {
            existing.semanticScore = Math.max(existing.semanticScore, semScore);
          } else {
            mergedMap.set(entityId, {
              row: semRow as unknown as Record<string, unknown>,
              keywordScore: 0,
              semanticScore: semScore,
            });
          }
        }

        // Compute combined scores and sort
        const ranked = Array.from(mergedMap.values())
          .map((entry) => ({
            ...formatSearchResult(entry.row),
            scoring: {
              keyword_score: Number(entry.keywordScore.toFixed(4)),
              semantic_score: Number(entry.semanticScore.toFixed(4)),
              combined_score: Number(
                (entry.keywordScore * keywordWeight + entry.semanticScore * semanticWeight).toFixed(4),
              ),
              weights: { keyword: keywordWeight, semantic: semanticWeight },
            },
          }))
          .sort((a, b) => b.scoring.combined_score - a.scoring.combined_score)
          .slice(0, params.limit);

        return {
          data: ranked,
          meta: {
            query: params.q,
            count: ranked.length,
            search_type: 'hybrid',
            weights: { keyword: keywordWeight, semantic: semanticWeight },
          },
        };
      } catch (err) {
        request.log.error({ err }, 'Hybrid GET search failed');
        reply.code(500).send({
          error: {
            code: 'HYBRID_SEARCH_ERROR',
            message: 'An error occurred while performing hybrid search',
          },
        });
      }
    },
  );
}

// ── Helper Functions ────────────────────────────────────────────────

/**
 * Formats a raw database search result into a consistent API response shape.
 */
function formatSearchResult(row: any) {
  return {
    id: row.entity_id,
    type: row.entity_type,
    name: row.canonical_name ?? row.product_title ?? null,
    description: row.product_description ?? null,
    status: row.status,
    location: row.lat != null && row.lng != null
      ? { lat: Number(row.lat), lng: Number(row.lng) }
      : null,
    country_code: row.country_code ?? null,
    details: buildDetails(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Builds a type-specific details object from the row data.
 */
function buildDetails(row: any) {
  const details: Record<string, unknown> = {};

  if (row.place_type != null) details.place_type = row.place_type;
  if (row.venue_type != null) details.venue_type = row.venue_type;
  if (row.price_tier != null) {
    details.price_tier = row.price_tier;
    details.price_tier_label = priceTierLabel(Number(row.price_tier));
  }
  if (row.rating_avg != null) details.rating_avg = Number(row.rating_avg);
  if (row.rating_count != null) details.rating_count = row.rating_count;
  if (row.base_price != null) {
    details.base_price = Number(row.base_price);
    details.currency = row.currency;
  }
  if (row.popularity_score != null) details.popularity_score = Number(row.popularity_score);

  return Object.keys(details).length > 0 ? details : null;
}

/**
 * Converts a numeric price tier (1-4) to a human-readable label.
 */
function priceTierLabel(tier: number): string {
  switch (tier) {
    case 1:
      return 'Budget';
    case 2:
      return 'Moderate';
    case 3:
      return 'Upscale';
    case 4:
      return 'Luxury';
    default:
      return 'Unknown';
  }
}
