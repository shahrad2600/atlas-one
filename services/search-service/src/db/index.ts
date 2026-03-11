import { getPool, query } from '@atlas/database';
import type { Pool } from '@atlas/database';
import { generateMockEmbedding } from '@atlas/shared-types';

const pool: Pool = getPool();

// ── Types ──────────────────────────────────────────────────────────

export interface SearchParams {
  q: string;
  type?: string;
  location?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  limit: number;
  offset: number;
}

export interface AutocompleteParams {
  q: string;
  type?: string;
  limit: number;
}

export interface NearbySearchParams {
  lat: number;
  lng: number;
  radiusKm: number;
  type?: string;
  limit: number;
}

export interface SearchResult {
  entity_id: string;
  entity_type: string;
  canonical_name: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  // Joined fields (nullable depending on entity type)
  place_type?: string | null;
  venue_type?: string | null;
  price_tier?: number | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  product_title?: string | null;
  product_description?: string | null;
  base_price?: number | null;
  currency?: string | null;
  lat?: number | null;
  lng?: number | null;
  country_code?: string | null;
  distance_km?: number | null;
}

export interface FacetCount {
  entity_type: string;
  count: number;
}

export interface FilterOptions {
  entity_types: string[];
  venue_types: string[];
  place_types: string[];
  product_types: string[];
  price_tiers: number[];
  countries: string[];
}

// ── Unified Search ─────────────────────────────────────────────────

export async function unifiedSearch(params: SearchParams): Promise<{
  results: SearchResult[];
  total: number;
  facets: FacetCount[];
}> {
  const { q, type, location, category, priceMin, priceMax, ratingMin, limit, offset } = params;

  const conditions: string[] = ['e.status = \'active\''];
  const queryParams: unknown[] = [];
  let paramIndex = 1;

  // Full-text search on canonical_name using pg_trgm (ILIKE)
  if (q) {
    conditions.push(`(e.canonical_name ILIKE $${paramIndex} OR a.alias ILIKE $${paramIndex})`);
    queryParams.push(`%${q}%`);
    paramIndex++;
  }

  // Entity type filter
  if (type) {
    conditions.push(`e.entity_type = $${paramIndex}`);
    queryParams.push(type);
    paramIndex++;
  }

  // Location filter (match place name or country code)
  if (location) {
    conditions.push(`(p.country_code ILIKE $${paramIndex} OR pl_entity.canonical_name ILIKE $${paramIndex})`);
    queryParams.push(`%${location}%`);
    paramIndex++;
  }

  // Category filter (venue_type or product_type)
  if (category) {
    conditions.push(`(v.venue_type = $${paramIndex} OR pr.product_type = $${paramIndex})`);
    queryParams.push(category);
    paramIndex++;
  }

  // Price range filter
  if (priceMin !== undefined) {
    conditions.push(`(v.price_tier >= $${paramIndex} OR pr.base_price >= $${paramIndex})`);
    queryParams.push(priceMin);
    paramIndex++;
  }
  if (priceMax !== undefined) {
    conditions.push(`(v.price_tier <= $${paramIndex} OR pr.base_price <= $${paramIndex})`);
    queryParams.push(priceMax);
    paramIndex++;
  }

  // Rating filter
  if (ratingMin !== undefined) {
    conditions.push(`v.rating_avg >= $${paramIndex}`);
    queryParams.push(ratingMin);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Main search query with LEFT JOINs to gather data from subtables
  const sql = `
    SELECT
      e.entity_id,
      e.entity_type,
      e.canonical_name,
      e.status,
      e.created_at,
      e.updated_at,
      p.place_type,
      p.lat,
      p.lng,
      p.country_code,
      p.popularity_score,
      v.venue_type,
      v.price_tier,
      v.rating_avg,
      v.rating_count,
      pr.product_type AS product_type,
      pr.title AS product_title,
      pr.description AS product_description,
      pr.base_price,
      pr.currency
    FROM tg.tg_entity e
    LEFT JOIN tg.tg_entity_alias a ON a.entity_id = e.entity_id
    LEFT JOIN tg.tg_place p ON p.place_id = e.entity_id
    LEFT JOIN tg.tg_venue v ON v.venue_id = e.entity_id
    LEFT JOIN tg.tg_product pr ON pr.product_id = e.entity_id
    LEFT JOIN tg.tg_place pl_entity ON v.place_id = pl_entity.place_id
    ${whereClause}
    GROUP BY e.entity_id, e.entity_type, e.canonical_name, e.status,
             e.created_at, e.updated_at,
             p.place_type, p.lat, p.lng, p.country_code, p.popularity_score,
             v.venue_type, v.price_tier, v.rating_avg, v.rating_count,
             pr.product_type, pr.title, pr.description, pr.base_price, pr.currency
    ORDER BY
      CASE
        WHEN e.canonical_name ILIKE $${paramIndex} THEN 0
        ELSE 1
      END,
      COALESCE(p.popularity_score, 0) DESC,
      COALESCE(v.rating_avg, 0) DESC,
      e.updated_at DESC
    LIMIT $${paramIndex + 1}
    OFFSET $${paramIndex + 2}
  `;

  // Add ordering/pagination params
  queryParams.push(q ? `${q}%` : '%');
  queryParams.push(limit);
  queryParams.push(offset);

  // Count query
  const countSql = `
    SELECT COUNT(DISTINCT e.entity_id) AS total
    FROM tg.tg_entity e
    LEFT JOIN tg.tg_entity_alias a ON a.entity_id = e.entity_id
    LEFT JOIN tg.tg_place p ON p.place_id = e.entity_id
    LEFT JOIN tg.tg_venue v ON v.venue_id = e.entity_id
    LEFT JOIN tg.tg_product pr ON pr.product_id = e.entity_id
    LEFT JOIN tg.tg_place pl_entity ON v.place_id = pl_entity.place_id
    ${whereClause}
  `;

  // Facet query (counts by entity_type)
  const facetSql = `
    SELECT e.entity_type, COUNT(DISTINCT e.entity_id)::int AS count
    FROM tg.tg_entity e
    LEFT JOIN tg.tg_entity_alias a ON a.entity_id = e.entity_id
    LEFT JOIN tg.tg_place p ON p.place_id = e.entity_id
    LEFT JOIN tg.tg_venue v ON v.venue_id = e.entity_id
    LEFT JOIN tg.tg_product pr ON pr.product_id = e.entity_id
    LEFT JOIN tg.tg_place pl_entity ON v.place_id = pl_entity.place_id
    ${whereClause}
    GROUP BY e.entity_type
    ORDER BY count DESC
  `;

  // Only pass the filter params (not the ordering/pagination params) to count and facet queries
  const filterParams = queryParams.slice(0, paramIndex - 1);

  const [resultsRes, countRes, facetRes] = await Promise.all([
    query(pool, sql, queryParams),
    query(pool, countSql, filterParams),
    query(pool, facetSql, filterParams),
  ]);

  return {
    results: resultsRes.rows as SearchResult[],
    total: parseInt(countRes.rows[0]?.total ?? '0', 10),
    facets: facetRes.rows as FacetCount[],
  };
}

// ── Autocomplete ───────────────────────────────────────────────────

export async function getAutocompleteSuggestions(params: AutocompleteParams): Promise<{
  entity_id: string;
  entity_type: string;
  name: string;
  similarity: number;
}[]> {
  const { q, type, limit } = params;

  const conditions: string[] = [
    `e.status = 'active'`,
    `e.canonical_name ILIKE $1`,
  ];
  const queryParams: unknown[] = [`${q}%`];
  let paramIndex = 2;

  if (type) {
    conditions.push(`e.entity_type = $${paramIndex}`);
    queryParams.push(type);
    paramIndex++;
  }

  queryParams.push(limit);

  const sql = `
    SELECT
      e.entity_id,
      e.entity_type,
      e.canonical_name AS name,
      similarity(e.canonical_name, $1) AS similarity
    FROM tg.tg_entity e
    WHERE ${conditions.join(' AND ')}
    ORDER BY similarity(e.canonical_name, $1) DESC, e.canonical_name ASC
    LIMIT $${paramIndex}
  `;

  const result = await query(pool, sql, queryParams);
  return result.rows as {
    entity_id: string;
    entity_type: string;
    name: string;
    similarity: number;
  }[];
}

// ── Nearby Search (Haversine) ──────────────────────────────────────

export async function nearbySearch(params: NearbySearchParams): Promise<SearchResult[]> {
  const { lat, lng, radiusKm, type, limit } = params;

  const conditions: string[] = [
    `e.status = 'active'`,
    `coords.lat IS NOT NULL`,
    `coords.lng IS NOT NULL`,
  ];
  const queryParams: unknown[] = [lat, lng, radiusKm];
  let paramIndex = 4;

  if (type) {
    conditions.push(`e.entity_type = $${paramIndex}`);
    queryParams.push(type);
    paramIndex++;
  }

  queryParams.push(limit);

  // Haversine formula for distance in km
  // Uses a CTE to compute distance and filter by radius
  const sql = `
    WITH coords AS (
      SELECT
        e.entity_id,
        COALESCE(p.lat, addr.lat) AS lat,
        COALESCE(p.lng, addr.lng) AS lng
      FROM tg.tg_entity e
      LEFT JOIN tg.tg_place p ON p.place_id = e.entity_id
      LEFT JOIN tg.tg_venue v ON v.venue_id = e.entity_id
      LEFT JOIN tg.tg_address addr ON addr.address_id = v.address_id
    ),
    with_distance AS (
      SELECT
        coords.entity_id,
        coords.lat,
        coords.lng,
        (
          6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians($1)) * cos(radians(coords.lat))
              * cos(radians(coords.lng) - radians($2))
              + sin(radians($1)) * sin(radians(coords.lat))
            ))
          )
        ) AS distance_km
      FROM coords
      WHERE coords.lat IS NOT NULL AND coords.lng IS NOT NULL
    )
    SELECT
      e.entity_id,
      e.entity_type,
      e.canonical_name,
      e.status,
      e.created_at,
      e.updated_at,
      p.place_type,
      wd.lat,
      wd.lng,
      p.country_code,
      v.venue_type,
      v.price_tier,
      v.rating_avg,
      v.rating_count,
      pr.title AS product_title,
      pr.description AS product_description,
      pr.base_price,
      pr.currency,
      ROUND(wd.distance_km::numeric, 2) AS distance_km
    FROM with_distance wd
    JOIN tg.tg_entity e ON e.entity_id = wd.entity_id
    LEFT JOIN tg.tg_place p ON p.place_id = e.entity_id
    LEFT JOIN tg.tg_venue v ON v.venue_id = e.entity_id
    LEFT JOIN tg.tg_product pr ON pr.product_id = e.entity_id
    WHERE ${conditions.join(' AND ')}
      AND wd.distance_km <= $3
    ORDER BY wd.distance_km ASC
    LIMIT $${paramIndex}
  `;

  const result = await query(pool, sql, queryParams);
  return result.rows as SearchResult[];
}

// ── Available Filters ──────────────────────────────────────────────

export async function getAvailableFilters(): Promise<FilterOptions> {
  const [entityTypes, venueTypes, placeTypes, productTypes, priceTiers, countries] =
    await Promise.all([
      query(
        pool,
        `SELECT DISTINCT entity_type FROM tg.tg_entity WHERE status = 'active' ORDER BY entity_type`,
      ),
      query(
        pool,
        `SELECT DISTINCT venue_type FROM tg.tg_venue ORDER BY venue_type`,
      ),
      query(
        pool,
        `SELECT DISTINCT place_type FROM tg.tg_place ORDER BY place_type`,
      ),
      query(
        pool,
        `SELECT DISTINCT product_type FROM tg.tg_product WHERE active = TRUE ORDER BY product_type`,
      ),
      query(
        pool,
        `SELECT DISTINCT price_tier FROM tg.tg_venue WHERE price_tier IS NOT NULL ORDER BY price_tier`,
      ),
      query(
        pool,
        `SELECT DISTINCT country_code FROM tg.tg_place WHERE country_code IS NOT NULL ORDER BY country_code`,
      ),
    ]);

  return {
    entity_types: entityTypes.rows.map((r: { entity_type: string }) => r.entity_type),
    venue_types: venueTypes.rows.map((r: { venue_type: string }) => r.venue_type),
    place_types: placeTypes.rows.map((r: { place_type: string }) => r.place_type),
    product_types: productTypes.rows.map((r: { product_type: string }) => r.product_type),
    price_tiers: priceTiers.rows.map((r: { price_tier: number }) => r.price_tier),
    countries: countries.rows.map((r: { country_code: string }) => r.country_code),
  };
}

// ── Faceted Counts ─────────────────────────────────────────────────

export async function getFacetedCounts(q?: string, type?: string): Promise<{
  by_type: FacetCount[];
  by_venue_type: { venue_type: string; count: number }[];
  by_place_type: { place_type: string; count: number }[];
  by_price_tier: { price_tier: number; count: number }[];
  by_country: { country_code: string; count: number }[];
}> {
  const conditions: string[] = [`e.status = 'active'`];
  const queryParams: unknown[] = [];
  let paramIndex = 1;

  if (q) {
    conditions.push(`e.canonical_name ILIKE $${paramIndex}`);
    queryParams.push(`%${q}%`);
    paramIndex++;
  }
  if (type) {
    conditions.push(`e.entity_type = $${paramIndex}`);
    queryParams.push(type);
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  const [byType, byVenueType, byPlaceType, byPriceTier, byCountry] = await Promise.all([
    query(
      pool,
      `SELECT e.entity_type, COUNT(*)::int AS count
       FROM tg.tg_entity e WHERE ${whereClause}
       GROUP BY e.entity_type ORDER BY count DESC`,
      queryParams,
    ),
    query(
      pool,
      `SELECT v.venue_type, COUNT(*)::int AS count
       FROM tg.tg_entity e
       JOIN tg.tg_venue v ON v.venue_id = e.entity_id
       WHERE ${whereClause}
       GROUP BY v.venue_type ORDER BY count DESC`,
      queryParams,
    ),
    query(
      pool,
      `SELECT p.place_type, COUNT(*)::int AS count
       FROM tg.tg_entity e
       JOIN tg.tg_place p ON p.place_id = e.entity_id
       WHERE ${whereClause}
       GROUP BY p.place_type ORDER BY count DESC`,
      queryParams,
    ),
    query(
      pool,
      `SELECT v.price_tier, COUNT(*)::int AS count
       FROM tg.tg_entity e
       JOIN tg.tg_venue v ON v.venue_id = e.entity_id
       WHERE ${whereClause} AND v.price_tier IS NOT NULL
       GROUP BY v.price_tier ORDER BY v.price_tier`,
      queryParams,
    ),
    query(
      pool,
      `SELECT p.country_code, COUNT(*)::int AS count
       FROM tg.tg_entity e
       JOIN tg.tg_place p ON p.place_id = e.entity_id
       WHERE ${whereClause} AND p.country_code IS NOT NULL
       GROUP BY p.country_code ORDER BY count DESC`,
      queryParams,
    ),
  ]);

  return {
    by_type: byType.rows as FacetCount[],
    by_venue_type: byVenueType.rows as { venue_type: string; count: number }[],
    by_place_type: byPlaceType.rows as { place_type: string; count: number }[],
    by_price_tier: byPriceTier.rows as { price_tier: number; count: number }[],
    by_country: byCountry.rows as { country_code: string; count: number }[],
  };
}

// ── Trending Entities ──────────────────────────────────────────────

export async function getTrendingEntities(type?: string, limit = 20): Promise<SearchResult[]> {
  const conditions: string[] = [`e.status = 'active'`];
  const queryParams: unknown[] = [];
  let paramIndex = 1;

  if (type) {
    conditions.push(`e.entity_type = $${paramIndex}`);
    queryParams.push(type);
    paramIndex++;
  }

  queryParams.push(limit);

  // Trending = high review count + high rating + high popularity score
  const sql = `
    SELECT
      e.entity_id,
      e.entity_type,
      e.canonical_name,
      e.status,
      e.created_at,
      e.updated_at,
      p.place_type,
      p.lat,
      p.lng,
      p.country_code,
      p.popularity_score,
      v.venue_type,
      v.price_tier,
      v.rating_avg,
      v.rating_count,
      pr.title AS product_title,
      pr.description AS product_description,
      pr.base_price,
      pr.currency,
      COALESCE(rc.review_count, 0) AS review_count
    FROM tg.tg_entity e
    LEFT JOIN tg.tg_place p ON p.place_id = e.entity_id
    LEFT JOIN tg.tg_venue v ON v.venue_id = e.entity_id
    LEFT JOIN tg.tg_product pr ON pr.product_id = e.entity_id
    LEFT JOIN (
      SELECT entity_id, COUNT(*)::int AS review_count
      FROM tg.tg_review
      WHERE status = 'published'
      GROUP BY entity_id
    ) rc ON rc.entity_id = e.entity_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY
      COALESCE(rc.review_count, 0) DESC,
      COALESCE(v.rating_avg, 0) DESC,
      COALESCE(p.popularity_score, 0) DESC,
      e.updated_at DESC
    LIMIT $${paramIndex}
  `;

  const result = await query(pool, sql, queryParams);
  return result.rows as SearchResult[];
}

// ── Search Entities (legacy, kept for backward compatibility) ──────

export async function searchEntities(searchTerm: string, entityType?: string) {
  const params: unknown[] = [`%${searchTerm}%`];
  let sql = `SELECT * FROM tg.tg_entity WHERE name ILIKE $1`;

  if (entityType) {
    sql += ' AND entity_type = $2';
    params.push(entityType);
  }

  sql += ' LIMIT 50';
  const result = await query(pool, sql, params);
  return result.rows;
}

// ── Semantic Search Types ─────────────────────────────────────────────

export interface SemanticSearchResult {
  entity_id: string;
  entity_type: string;
  canonical_name: string | null;
  status: string;
  embedding_type: string;
  model: string | null;
  similarity: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  place_type?: string | null;
  venue_type?: string | null;
  price_tier?: number | null;
  rating_avg?: number | null;
  rating_count?: number | null;
  product_title?: string | null;
  product_description?: string | null;
  base_price?: number | null;
  currency?: string | null;
  lat?: number | null;
  lng?: number | null;
  country_code?: string | null;
  popularity_score?: number | null;
}

export interface HybridSearchResult extends SearchResult {
  keyword_score: number;
  semantic_score: number;
  combined_score: number;
}

// ── Get Query Embedding ───────────────────────────────────────────────

/**
 * Generates an embedding vector for a search query string.
 *
 * In production this would call an external embeddings API (e.g. OpenAI).
 * For development, uses a deterministic mock embedding generator that
 * produces consistent 1536-dim vectors from text hashes.
 */
export async function getQueryEmbedding(text: string): Promise<number[]> {
  // Production: call OpenAI embeddings API
  // const response = await fetch('https://api.openai.com/v1/embeddings', { ... });
  // return response.data[0].embedding;

  // Development: deterministic mock embedding
  return generateMockEmbedding(text.toLowerCase().trim());
}

// ── Semantic Search ───────────────────────────────────────────────────

/**
 * Performs semantic search using cosine similarity between a query embedding
 * and stored entity embeddings. Returns entities ordered by similarity.
 */
export async function semanticSearchEntities(
  embedding: number[],
  entityTypes?: string[],
  limit = 20,
): Promise<SemanticSearchResult[]> {
  const conditions: string[] = ['ent.status = \'active\''];
  const params: unknown[] = [JSON.stringify(embedding)];
  let paramIndex = 2;

  if (entityTypes && entityTypes.length > 0) {
    conditions.push(`ent.entity_type = ANY($${paramIndex})`);
    params.push(entityTypes);
    paramIndex++;
  }

  params.push(limit);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      ent.entity_id,
      ent.entity_type,
      ent.canonical_name,
      ent.status,
      ent.created_at,
      ent.updated_at,
      emb.embedding_type,
      emb.model,
      1 - (emb.vector <=> $1::vector) AS similarity,
      p.place_type,
      p.lat,
      p.lng,
      p.country_code,
      p.popularity_score,
      v.venue_type,
      v.price_tier,
      v.rating_avg,
      v.rating_count,
      pr.title AS product_title,
      pr.description AS product_description,
      pr.base_price,
      pr.currency
    FROM tg.tg_embedding emb
    JOIN tg.tg_entity ent ON ent.entity_id = emb.entity_id
    LEFT JOIN tg.tg_place p ON p.place_id = ent.entity_id
    LEFT JOIN tg.tg_venue v ON v.venue_id = ent.entity_id
    LEFT JOIN tg.tg_product pr ON pr.product_id = ent.entity_id
    ${whereClause}
    ORDER BY emb.vector <=> $1::vector
    LIMIT $${paramIndex}
  `;

  const result = await query(pool, sql, params);
  return result.rows as SemanticSearchResult[];
}

// ── Hybrid Search ─────────────────────────────────────────────────────

/**
 * Combines keyword-based search (ILIKE on canonical_name and aliases) with
 * semantic vector similarity. Results are scored using configurable weights
 * and deduplicated by entity_id, keeping the highest combined score.
 */
export async function hybridSearchEntities(
  searchQuery: string,
  embedding: number[],
  weights: { keyword: number; semantic: number },
  filters: {
    entityTypes?: string[];
    location?: string;
    category?: string;
    priceMin?: number;
    priceMax?: number;
    ratingMin?: number;
  },
  limit = 20,
): Promise<HybridSearchResult[]> {
  const keywordConditions: string[] = ['e.status = \'active\''];
  const semanticConditions: string[] = ['ent.status = \'active\''];
  const keywordParams: unknown[] = [];
  const semanticParams: unknown[] = [JSON.stringify(embedding)];
  let kIdx = 1;
  let sIdx = 2;

  // Keyword search text condition
  if (searchQuery) {
    keywordConditions.push(`(e.canonical_name ILIKE $${kIdx} OR a.alias ILIKE $${kIdx})`);
    keywordParams.push(`%${searchQuery}%`);
    kIdx++;
  }

  // Shared entity type filter
  if (filters.entityTypes && filters.entityTypes.length > 0) {
    keywordConditions.push(`e.entity_type = ANY($${kIdx})`);
    keywordParams.push(filters.entityTypes);
    kIdx++;

    semanticConditions.push(`ent.entity_type = ANY($${sIdx})`);
    semanticParams.push(filters.entityTypes);
    sIdx++;
  }

  // Location filter (keyword only)
  if (filters.location) {
    keywordConditions.push(`(p.country_code ILIKE $${kIdx} OR pl_entity.canonical_name ILIKE $${kIdx})`);
    keywordParams.push(`%${filters.location}%`);
    kIdx++;
  }

  // Category filter (keyword only)
  if (filters.category) {
    keywordConditions.push(`(v.venue_type = $${kIdx} OR pr.product_type = $${kIdx})`);
    keywordParams.push(filters.category);
    kIdx++;
  }

  // Price filters (keyword only)
  if (filters.priceMin !== undefined) {
    keywordConditions.push(`(v.price_tier >= $${kIdx} OR pr.base_price >= $${kIdx})`);
    keywordParams.push(filters.priceMin);
    kIdx++;
  }
  if (filters.priceMax !== undefined) {
    keywordConditions.push(`(v.price_tier <= $${kIdx} OR pr.base_price <= $${kIdx})`);
    keywordParams.push(filters.priceMax);
    kIdx++;
  }

  // Rating filter (keyword only)
  if (filters.ratingMin !== undefined) {
    keywordConditions.push(`v.rating_avg >= $${kIdx}`);
    keywordParams.push(filters.ratingMin);
    kIdx++;
  }

  const keywordWhere = keywordConditions.join(' AND ');
  const semanticWhere = semanticConditions.join(' AND ');

  // Add limit + weight params
  keywordParams.push(searchQuery ? `${searchQuery}%` : '%');
  const kLimitIdx = kIdx + 1;
  keywordParams.push(limit);

  semanticParams.push(limit);

  // We use a two-CTE approach: keyword results scored by trigram similarity,
  // semantic results scored by cosine similarity, then UNION ALL with weighted
  // combination and deduplication.
  const sql = `
    WITH keyword_results AS (
      SELECT
        e.entity_id,
        e.entity_type,
        e.canonical_name,
        e.status,
        e.created_at,
        e.updated_at,
        p.place_type,
        p.lat,
        p.lng,
        p.country_code,
        p.popularity_score,
        v.venue_type,
        v.price_tier,
        v.rating_avg,
        v.rating_count,
        pr.title AS product_title,
        pr.description AS product_description,
        pr.base_price,
        pr.currency,
        similarity(e.canonical_name, $${kIdx}) AS keyword_score,
        0::real AS semantic_score
      FROM tg.tg_entity e
      LEFT JOIN tg.tg_entity_alias a ON a.entity_id = e.entity_id
      LEFT JOIN tg.tg_place p ON p.place_id = e.entity_id
      LEFT JOIN tg.tg_venue v ON v.venue_id = e.entity_id
      LEFT JOIN tg.tg_product pr ON pr.product_id = e.entity_id
      LEFT JOIN tg.tg_place pl_entity ON v.place_id = pl_entity.place_id
      WHERE ${keywordWhere}
      GROUP BY e.entity_id, e.entity_type, e.canonical_name, e.status,
               e.created_at, e.updated_at,
               p.place_type, p.lat, p.lng, p.country_code, p.popularity_score,
               v.venue_type, v.price_tier, v.rating_avg, v.rating_count,
               pr.title, pr.description, pr.base_price, pr.currency
      ORDER BY keyword_score DESC
      LIMIT $${kLimitIdx}
    ),
    semantic_results AS (
      SELECT
        ent.entity_id,
        ent.entity_type,
        ent.canonical_name,
        ent.status,
        ent.created_at,
        ent.updated_at,
        p.place_type,
        p.lat,
        p.lng,
        p.country_code,
        p.popularity_score,
        v.venue_type,
        v.price_tier,
        v.rating_avg,
        v.rating_count,
        pr.title AS product_title,
        pr.description AS product_description,
        pr.base_price,
        pr.currency,
        0::real AS keyword_score,
        (1 - (emb.vector <=> $1::vector))::real AS semantic_score
      FROM tg.tg_embedding emb
      JOIN tg.tg_entity ent ON ent.entity_id = emb.entity_id
      LEFT JOIN tg.tg_place p ON p.place_id = ent.entity_id
      LEFT JOIN tg.tg_venue v ON v.venue_id = ent.entity_id
      LEFT JOIN tg.tg_product pr ON pr.product_id = ent.entity_id
      WHERE ${semanticWhere}
      ORDER BY emb.vector <=> $1::vector
      LIMIT $${sIdx}
    ),
    combined AS (
      SELECT * FROM keyword_results
      UNION ALL
      SELECT * FROM semantic_results
    ),
    deduped AS (
      SELECT DISTINCT ON (entity_id)
        entity_id,
        entity_type,
        canonical_name,
        status,
        created_at,
        updated_at,
        place_type,
        lat,
        lng,
        country_code,
        popularity_score,
        venue_type,
        price_tier,
        rating_avg,
        rating_count,
        product_title,
        product_description,
        base_price,
        currency,
        MAX(keyword_score) OVER (PARTITION BY entity_id) AS keyword_score,
        MAX(semantic_score) OVER (PARTITION BY entity_id) AS semantic_score,
        (MAX(keyword_score) OVER (PARTITION BY entity_id) * ${weights.keyword}
         + MAX(semantic_score) OVER (PARTITION BY entity_id) * ${weights.semantic}) AS combined_score
      FROM combined
      ORDER BY entity_id, combined_score DESC
    )
    SELECT *
    FROM deduped
    ORDER BY combined_score DESC
    LIMIT ${limit}
  `;

  // Merge all params: keyword params first (with the similarity text and limit),
  // then semantic params (embedding vector, optional type filter, limit).
  // We need to construct a single parameterized query using numbered placeholders.
  // Since the two CTEs use different param sets, we rewrite using a flattened approach.

  // Actually, because we are embedding the weights and final limit as literals,
  // and each CTE has its own param set, we need to consolidate.
  // The keyword CTE uses $kIdx (search text for similarity) and $kLimitIdx (limit).
  // The semantic CTE uses $1 (embedding vector) and $sIdx (limit).
  // But $1 in keyword is different from $1 in semantic.
  // Solution: run them as separate queries and combine in application code.

  // Let's use a simpler approach: run both searches and merge results in TypeScript.
  const keywordSql = `
    SELECT
      e.entity_id,
      e.entity_type,
      e.canonical_name,
      e.status,
      e.created_at,
      e.updated_at,
      p.place_type,
      p.lat,
      p.lng,
      p.country_code,
      p.popularity_score,
      v.venue_type,
      v.price_tier,
      v.rating_avg,
      v.rating_count,
      pr.title AS product_title,
      pr.description AS product_description,
      pr.base_price,
      pr.currency,
      similarity(e.canonical_name, $${kIdx}) AS keyword_score
    FROM tg.tg_entity e
    LEFT JOIN tg.tg_entity_alias a ON a.entity_id = e.entity_id
    LEFT JOIN tg.tg_place p ON p.place_id = e.entity_id
    LEFT JOIN tg.tg_venue v ON v.venue_id = e.entity_id
    LEFT JOIN tg.tg_product pr ON pr.product_id = e.entity_id
    LEFT JOIN tg.tg_place pl_entity ON v.place_id = pl_entity.place_id
    WHERE ${keywordWhere}
    GROUP BY e.entity_id, e.entity_type, e.canonical_name, e.status,
             e.created_at, e.updated_at,
             p.place_type, p.lat, p.lng, p.country_code, p.popularity_score,
             v.venue_type, v.price_tier, v.rating_avg, v.rating_count,
             pr.title, pr.description, pr.base_price, pr.currency
    ORDER BY keyword_score DESC
    LIMIT $${kLimitIdx}
  `;

  const semanticSql = `
    SELECT
      ent.entity_id,
      ent.entity_type,
      ent.canonical_name,
      ent.status,
      ent.created_at,
      ent.updated_at,
      p.place_type,
      p.lat,
      p.lng,
      p.country_code,
      p.popularity_score,
      v.venue_type,
      v.price_tier,
      v.rating_avg,
      v.rating_count,
      pr.title AS product_title,
      pr.description AS product_description,
      pr.base_price,
      pr.currency,
      (1 - (emb.vector <=> $1::vector))::real AS semantic_score
    FROM tg.tg_embedding emb
    JOIN tg.tg_entity ent ON ent.entity_id = emb.entity_id
    LEFT JOIN tg.tg_place p ON p.place_id = ent.entity_id
    LEFT JOIN tg.tg_venue v ON v.venue_id = ent.entity_id
    LEFT JOIN tg.tg_product pr ON pr.product_id = ent.entity_id
    WHERE ${semanticWhere}
    ORDER BY emb.vector <=> $1::vector
    LIMIT $${sIdx}
  `;

  const [keywordRes, semanticRes] = await Promise.all([
    query(pool, keywordSql, keywordParams),
    query(pool, semanticSql, semanticParams),
  ]);

  // Merge and deduplicate results, keeping highest scores per entity
  const resultMap = new Map<string, HybridSearchResult>();

  for (const row of keywordRes.rows) {
    const r = row as Record<string, unknown>;
    const entityId = r.entity_id as string;
    const keywordScore = Number(r.keyword_score ?? 0);
    const existing = resultMap.get(entityId);
    if (existing) {
      existing.keyword_score = Math.max(existing.keyword_score, keywordScore);
      existing.combined_score = existing.keyword_score * weights.keyword + existing.semantic_score * weights.semantic;
    } else {
      resultMap.set(entityId, {
        ...(r as unknown as SearchResult),
        keyword_score: keywordScore,
        semantic_score: 0,
        combined_score: keywordScore * weights.keyword,
      });
    }
  }

  for (const row of semanticRes.rows) {
    const r = row as Record<string, unknown>;
    const entityId = r.entity_id as string;
    const semanticScore = Number(r.semantic_score ?? 0);
    const existing = resultMap.get(entityId);
    if (existing) {
      existing.semantic_score = Math.max(existing.semantic_score, semanticScore);
      existing.combined_score = existing.keyword_score * weights.keyword + existing.semantic_score * weights.semantic;
    } else {
      resultMap.set(entityId, {
        ...(r as unknown as SearchResult),
        keyword_score: 0,
        semantic_score: semanticScore,
        combined_score: semanticScore * weights.semantic,
      });
    }
  }

  // Sort by combined score descending and return top N
  return Array.from(resultMap.values())
    .sort((a, b) => b.combined_score - a.combined_score)
    .slice(0, limit);
}

// ── Store Entity Embedding ────────────────────────────────────────────

/**
 * Stores or updates an embedding vector for an entity. If an embedding
 * of the given type already exists for the entity, it is replaced.
 */
export async function storeEntityEmbedding(
  entityId: string,
  embeddingVector: number[],
  embeddingType: string,
  model = 'mock',
): Promise<{ embedding_id: string }> {
  // Upsert: delete existing embedding of the same type, then insert new
  await query(
    pool,
    `DELETE FROM tg.tg_embedding
     WHERE entity_id = $1 AND embedding_type = $2`,
    [entityId, embeddingType],
  );

  const result = await query(
    pool,
    `INSERT INTO tg.tg_embedding (entity_id, embedding_type, vector, model)
     VALUES ($1, $2, $3::vector, $4)
     RETURNING embedding_id`,
    [entityId, embeddingType, JSON.stringify(embeddingVector), model],
  );

  const embeddingId = result.rows[0].embedding_id as string;

  // Update the entity's embedding reference columns
  if (embeddingType === 'name') {
    await query(
      pool,
      `UPDATE tg.tg_entity SET name_embedding_id = $1 WHERE entity_id = $2`,
      [embeddingId, entityId],
    );
  } else if (embeddingType === 'description') {
    await query(
      pool,
      `UPDATE tg.tg_entity SET description_embedding_id = $1 WHERE entity_id = $2`,
      [embeddingId, entityId],
    );
  }

  return { embedding_id: embeddingId };
}

// ── Find Similar Entities ─────────────────────────────────────────────

/**
 * Finds entities similar to the given entity by comparing their embedding
 * vectors using cosine similarity. First checks the similarity cache for
 * precomputed results, then falls back to a live vector query.
 */
export async function findSimilarEntities(
  entityId: string,
  limit = 10,
): Promise<SemanticSearchResult[]> {
  // First try the precomputed similarity cache
  const cachedResult = await query(
    pool,
    `SELECT
       sc.entity_b AS entity_id,
       sc.similarity,
       ent.entity_type,
       ent.canonical_name,
       ent.status,
       ent.created_at,
       ent.updated_at,
       p.place_type,
       p.lat,
       p.lng,
       p.country_code,
       p.popularity_score,
       v.venue_type,
       v.price_tier,
       v.rating_avg,
       v.rating_count,
       pr.title AS product_title,
       pr.description AS product_description,
       pr.base_price,
       pr.currency
     FROM tg.tg_similarity_cache sc
     JOIN tg.tg_entity ent ON ent.entity_id = sc.entity_b
     LEFT JOIN tg.tg_place p ON p.place_id = ent.entity_id
     LEFT JOIN tg.tg_venue v ON v.venue_id = ent.entity_id
     LEFT JOIN tg.tg_product pr ON pr.product_id = ent.entity_id
     WHERE sc.entity_a = $1
       AND ent.status = 'active'
     ORDER BY sc.similarity DESC
     LIMIT $2`,
    [entityId, limit],
  );

  if (cachedResult.rows.length > 0) {
    return cachedResult.rows as SemanticSearchResult[];
  }

  // Fallback: live vector similarity query
  // Get the entity's embedding(s) first
  const embeddingResult = await query(
    pool,
    `SELECT vector FROM tg.tg_embedding
     WHERE entity_id = $1
     ORDER BY
       CASE embedding_type
         WHEN 'name' THEN 1
         WHEN 'description' THEN 2
         ELSE 3
       END
     LIMIT 1`,
    [entityId],
  );

  if (embeddingResult.rows.length === 0) {
    return [];
  }

  const entityVector = embeddingResult.rows[0].vector as string;

  const result = await query(
    pool,
    `SELECT
       ent.entity_id,
       ent.entity_type,
       ent.canonical_name,
       ent.status,
       ent.created_at,
       ent.updated_at,
       emb.embedding_type,
       emb.model,
       1 - (emb.vector <=> $1::vector) AS similarity,
       p.place_type,
       p.lat,
       p.lng,
       p.country_code,
       p.popularity_score,
       v.venue_type,
       v.price_tier,
       v.rating_avg,
       v.rating_count,
       pr.title AS product_title,
       pr.description AS product_description,
       pr.base_price,
       pr.currency
     FROM tg.tg_embedding emb
     JOIN tg.tg_entity ent ON ent.entity_id = emb.entity_id
     LEFT JOIN tg.tg_place p ON p.place_id = ent.entity_id
     LEFT JOIN tg.tg_venue v ON v.venue_id = ent.entity_id
     LEFT JOIN tg.tg_product pr ON pr.product_id = ent.entity_id
     WHERE ent.status = 'active'
       AND ent.entity_id != $2
     ORDER BY emb.vector <=> $1::vector
     LIMIT $3`,
    [entityVector, entityId, limit],
  );

  return result.rows as SemanticSearchResult[];
}

// ── Generate Entity Embedding ─────────────────────────────────────────

/**
 * Generates and stores embeddings for a given entity based on its
 * canonical_name and/or product description. Uses the mock embedding
 * generator in development mode.
 */
export async function generateEntityEmbedding(
  entityId: string,
): Promise<{ name_embedding_id: string | null; description_embedding_id: string | null }> {
  // Fetch entity data
  const entityResult = await query(
    pool,
    `SELECT e.entity_id, e.canonical_name, e.entity_type,
            pr.description AS product_description
     FROM tg.tg_entity e
     LEFT JOIN tg.tg_product pr ON pr.product_id = e.entity_id
     WHERE e.entity_id = $1`,
    [entityId],
  );

  if (entityResult.rows.length === 0) {
    throw Object.assign(new Error('Entity not found'), { statusCode: 404 });
  }

  const entity = entityResult.rows[0] as Record<string, unknown>;
  let nameEmbeddingId: string | null = null;
  let descriptionEmbeddingId: string | null = null;

  // Generate name embedding
  if (entity.canonical_name) {
    const nameText = `${entity.entity_type}: ${entity.canonical_name}`;
    const nameVector = await getQueryEmbedding(nameText);
    const result = await storeEntityEmbedding(entityId, nameVector, 'name', 'mock');
    nameEmbeddingId = result.embedding_id;
  }

  // Generate description embedding
  if (entity.product_description) {
    const descText = entity.product_description as string;
    const descVector = await getQueryEmbedding(descText);
    const result = await storeEntityEmbedding(entityId, descVector, 'description', 'mock');
    descriptionEmbeddingId = result.embedding_id;
  }

  return { name_embedding_id: nameEmbeddingId, description_embedding_id: descriptionEmbeddingId };
}

// ── Batch Generate Embeddings ─────────────────────────────────────────

/**
 * Generates embeddings for multiple entities in sequence. Returns a
 * summary of successes and failures for each entity.
 */
export async function batchGenerateEmbeddings(
  entityIds: string[],
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  results: Array<{
    entity_id: string;
    status: 'success' | 'error';
    name_embedding_id?: string | null;
    description_embedding_id?: string | null;
    error?: string;
  }>;
}> {
  const results: Array<{
    entity_id: string;
    status: 'success' | 'error';
    name_embedding_id?: string | null;
    description_embedding_id?: string | null;
    error?: string;
  }> = [];

  let succeeded = 0;
  let failed = 0;

  for (const entityId of entityIds) {
    try {
      const embeddings = await generateEntityEmbedding(entityId);
      results.push({
        entity_id: entityId,
        status: 'success',
        name_embedding_id: embeddings.name_embedding_id,
        description_embedding_id: embeddings.description_embedding_id,
      });
      succeeded++;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      results.push({
        entity_id: entityId,
        status: 'error',
        error: message,
      });
      failed++;
    }
  }

  return {
    processed: entityIds.length,
    succeeded,
    failed,
    results,
  };
}
