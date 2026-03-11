import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ═══════════════════════════════════════════════════════════════════════════
// Destination Queries
// ═══════════════════════════════════════════════════════════════════════════

export interface ListDestinationsParams {
  country?: string;
  region?: string;
  featured?: boolean;
  status?: string;
  limit: number;
  offset: number;
}

export async function listDestinations(params: ListDestinationsParams) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.status) {
    conditions.push(`d.status = $${idx}`);
    values.push(params.status);
    idx++;
  } else {
    conditions.push(`d.status = 'published'`);
  }

  if (params.country) {
    conditions.push(`d.country_code = $${idx}`);
    values.push(params.country.toUpperCase());
    idx++;
  }

  if (params.region) {
    conditions.push(`d.region ILIKE $${idx}`);
    values.push(`%${params.region}%`);
    idx++;
  }

  if (params.featured !== undefined) {
    conditions.push(`d.is_featured = $${idx}`);
    values.push(params.featured);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM content.content_destination d ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT d.destination_id, d.place_id, d.slug, d.name, d.tagline,
            d.hero_image_url, d.country_code, d.region, d.coordinates,
            d.is_featured, d.status, d.published_at
     FROM content.content_destination d
     ${whereClause}
     ORDER BY d.is_featured DESC, d.name ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findDestinationBySlug(slug: string) {
  const result = await query(
    pool,
    `SELECT * FROM content.content_destination WHERE slug = $1`,
    [slug],
  );
  return result.rows[0] ?? null;
}

export async function findDestinationById(id: string) {
  const result = await query(
    pool,
    `SELECT * FROM content.content_destination WHERE destination_id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export interface CreateDestinationParams {
  place_id: string;
  slug: string;
  name: string;
  tagline?: string;
  description?: string;
  hero_image_url?: string;
  gallery_urls?: string[];
  overview_html?: string;
  best_time_to_visit?: string;
  getting_there?: string;
  local_tips?: string;
  weather_info?: Record<string, unknown>;
  quick_facts?: Record<string, unknown>;
  coordinates?: { lat: number; lng: number };
  country_code?: string;
  region?: string;
  is_featured?: boolean;
  status?: string;
}

export async function createDestination(params: CreateDestinationParams) {
  const result = await query(
    pool,
    `INSERT INTO content.content_destination
       (place_id, slug, name, tagline, description, hero_image_url,
        gallery_urls, overview_html, best_time_to_visit, getting_there,
        local_tips, weather_info, quick_facts, coordinates,
        country_code, region, is_featured, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
             CASE WHEN $18 = 'published' THEN NOW() ELSE NULL END)
     RETURNING *`,
    [
      params.place_id,
      params.slug,
      params.name,
      params.tagline ?? null,
      params.description ?? null,
      params.hero_image_url ?? null,
      params.gallery_urls ?? [],
      params.overview_html ?? null,
      params.best_time_to_visit ?? null,
      params.getting_there ?? null,
      params.local_tips ?? null,
      JSON.stringify(params.weather_info ?? {}),
      JSON.stringify(params.quick_facts ?? {}),
      params.coordinates ? JSON.stringify(params.coordinates) : null,
      params.country_code ?? null,
      params.region ?? null,
      params.is_featured ?? false,
      params.status ?? 'draft',
    ],
  );
  return result.rows[0];
}

export async function updateDestination(destinationId: string, updates: Partial<CreateDestinationParams>) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const fieldMap: Record<string, (v: unknown) => unknown> = {
    place_id: (v) => v,
    slug: (v) => v,
    name: (v) => v,
    tagline: (v) => v,
    description: (v) => v,
    hero_image_url: (v) => v,
    gallery_urls: (v) => v,
    overview_html: (v) => v,
    best_time_to_visit: (v) => v,
    getting_there: (v) => v,
    local_tips: (v) => v,
    weather_info: (v) => JSON.stringify(v),
    quick_facts: (v) => JSON.stringify(v),
    coordinates: (v) => v ? JSON.stringify(v) : null,
    country_code: (v) => v,
    region: (v) => v,
    is_featured: (v) => v,
    status: (v) => v,
  };

  for (const [key, transform] of Object.entries(fieldMap)) {
    if (updates[key as keyof CreateDestinationParams] !== undefined) {
      setClauses.push(`${key} = $${idx}`);
      values.push(transform(updates[key as keyof CreateDestinationParams]));
      idx++;
    }
  }

  // Auto-set published_at when status changes to published
  if (updates.status === 'published') {
    setClauses.push(`published_at = COALESCE(published_at, NOW())`);
  }

  if (setClauses.length === 0) return findDestinationById(destinationId);

  const result = await query(
    pool,
    `UPDATE content.content_destination
     SET ${setClauses.join(', ')}
     WHERE destination_id = $${idx}
     RETURNING *`,
    [...values, destinationId],
  );
  return result.rows[0] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Neighborhood Queries
// ═══════════════════════════════════════════════════════════════════════════

export async function listNeighborhoodsByDestination(destinationId: string) {
  const result = await query(
    pool,
    `SELECT * FROM content.content_neighborhood
     WHERE destination_id = $1 AND is_active = TRUE
     ORDER BY sort_order ASC, name ASC`,
    [destinationId],
  );
  return result.rows;
}

export async function findNeighborhoodBySlug(destinationId: string, nhSlug: string) {
  const result = await query(
    pool,
    `SELECT * FROM content.content_neighborhood
     WHERE destination_id = $1 AND slug = $2`,
    [destinationId, nhSlug],
  );
  return result.rows[0] ?? null;
}

export interface CreateNeighborhoodParams {
  destination_id: string;
  name: string;
  slug: string;
  description?: string;
  hero_image_url?: string;
  vibe?: string;
  highlights?: string[];
  coordinates?: Record<string, unknown>;
  boundaries?: Record<string, unknown>;
  top_restaurant_ids?: string[];
  top_hotel_ids?: string[];
  top_attraction_ids?: string[];
  sort_order?: number;
}

export async function createNeighborhood(params: CreateNeighborhoodParams) {
  const result = await query(
    pool,
    `INSERT INTO content.content_neighborhood
       (destination_id, name, slug, description, hero_image_url, vibe,
        highlights, coordinates, boundaries,
        top_restaurant_ids, top_hotel_ids, top_attraction_ids, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      params.destination_id,
      params.name,
      params.slug,
      params.description ?? null,
      params.hero_image_url ?? null,
      params.vibe ?? null,
      params.highlights ?? [],
      params.coordinates ? JSON.stringify(params.coordinates) : null,
      params.boundaries ? JSON.stringify(params.boundaries) : null,
      params.top_restaurant_ids ?? [],
      params.top_hotel_ids ?? [],
      params.top_attraction_ids ?? [],
      params.sort_order ?? 0,
    ],
  );
  return result.rows[0];
}

// ═══════════════════════════════════════════════════════════════════════════
// Guide Queries
// ═══════════════════════════════════════════════════════════════════════════

export interface ListGuidesParams {
  category?: string;
  destination_id?: string;
  tags?: string[];
  status?: string;
  featured?: boolean;
  limit: number;
  offset: number;
}

export async function listGuides(params: ListGuidesParams) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.status) {
    conditions.push(`g.status = $${idx}`);
    values.push(params.status);
    idx++;
  } else {
    conditions.push(`g.status = 'published'`);
  }

  if (params.category) {
    conditions.push(`g.category = $${idx}`);
    values.push(params.category);
    idx++;
  }

  if (params.destination_id) {
    conditions.push(`g.destination_id = $${idx}`);
    values.push(params.destination_id);
    idx++;
  }

  if (params.tags && params.tags.length > 0) {
    conditions.push(`g.tags && $${idx}`);
    values.push(params.tags);
    idx++;
  }

  if (params.featured !== undefined) {
    conditions.push(`g.is_featured = $${idx}`);
    values.push(params.featured);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM content.content_guide g ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT g.guide_id, g.title, g.slug, g.subtitle, g.author_name,
            g.destination_id, g.category, g.subcategory,
            g.hero_image_url, g.excerpt, g.reading_time_minutes,
            g.tags, g.is_featured, g.status, g.published_at,
            g.view_count, g.share_count
     FROM content.content_guide g
     ${whereClause}
     ORDER BY g.is_featured DESC, g.published_at DESC NULLS LAST
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

export async function listFeaturedGuides(limit: number) {
  const result = await query(
    pool,
    `SELECT g.guide_id, g.title, g.slug, g.subtitle, g.author_name,
            g.destination_id, g.category, g.hero_image_url, g.excerpt,
            g.reading_time_minutes, g.tags, g.published_at, g.view_count
     FROM content.content_guide g
     WHERE g.is_featured = TRUE AND g.status = 'published'
     ORDER BY g.published_at DESC NULLS LAST
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

export async function findGuideBySlug(slug: string) {
  const result = await query(
    pool,
    `SELECT g.*,
            d.name AS destination_name, d.slug AS destination_slug
     FROM content.content_guide g
     LEFT JOIN content.content_destination d ON d.destination_id = g.destination_id
     WHERE g.slug = $1`,
    [slug],
  );
  return result.rows[0] ?? null;
}

export async function findGuideById(guideId: string) {
  const result = await query(
    pool,
    `SELECT * FROM content.content_guide WHERE guide_id = $1`,
    [guideId],
  );
  return result.rows[0] ?? null;
}

export async function incrementGuideViewCount(guideId: string) {
  await query(
    pool,
    `UPDATE content.content_guide SET view_count = view_count + 1 WHERE guide_id = $1`,
    [guideId],
  );
}

export interface CreateGuideParams {
  title: string;
  slug: string;
  subtitle?: string;
  author_id?: string;
  author_name?: string;
  destination_id?: string;
  category: string;
  subcategory?: string;
  hero_image_url?: string;
  content_html: string;
  excerpt?: string;
  reading_time_minutes?: number;
  tags?: string[];
  related_entity_ids?: string[];
  is_featured?: boolean;
  status?: string;
}

export async function createGuide(params: CreateGuideParams) {
  const result = await query(
    pool,
    `INSERT INTO content.content_guide
       (title, slug, subtitle, author_id, author_name, destination_id,
        category, subcategory, hero_image_url, content_html, excerpt,
        reading_time_minutes, tags, related_entity_ids,
        is_featured, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
             CASE WHEN $16 = 'published' THEN NOW() ELSE NULL END)
     RETURNING *`,
    [
      params.title,
      params.slug,
      params.subtitle ?? null,
      params.author_id ?? null,
      params.author_name ?? null,
      params.destination_id ?? null,
      params.category,
      params.subcategory ?? null,
      params.hero_image_url ?? null,
      params.content_html,
      params.excerpt ?? null,
      params.reading_time_minutes ?? 5,
      params.tags ?? [],
      params.related_entity_ids ?? [],
      params.is_featured ?? false,
      params.status ?? 'draft',
    ],
  );
  return result.rows[0];
}

export async function updateGuide(guideId: string, updates: Partial<CreateGuideParams>) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const simpleFields = [
    'title', 'slug', 'subtitle', 'author_id', 'author_name',
    'destination_id', 'category', 'subcategory', 'hero_image_url',
    'content_html', 'excerpt', 'reading_time_minutes', 'tags',
    'related_entity_ids', 'is_featured', 'status',
  ];

  for (const field of simpleFields) {
    if (updates[field as keyof CreateGuideParams] !== undefined) {
      setClauses.push(`${field} = $${idx}`);
      values.push(updates[field as keyof CreateGuideParams]);
      idx++;
    }
  }

  if (updates.status === 'published') {
    setClauses.push(`published_at = COALESCE(published_at, NOW())`);
  }

  if (setClauses.length === 0) return findGuideById(guideId);

  const result = await query(
    pool,
    `UPDATE content.content_guide
     SET ${setClauses.join(', ')}
     WHERE guide_id = $${idx}
     RETURNING *`,
    [...values, guideId],
  );
  return result.rows[0] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Best-Of Queries
// ═══════════════════════════════════════════════════════════════════════════

export interface ListBestOfParams {
  category?: string;
  destination_id?: string;
  year?: number;
  status?: string;
  limit: number;
  offset: number;
}

export async function listBestOf(params: ListBestOfParams) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.status) {
    conditions.push(`b.status = $${idx}`);
    values.push(params.status);
    idx++;
  } else {
    conditions.push(`b.status = 'published'`);
  }

  if (params.category) {
    conditions.push(`b.category = $${idx}`);
    values.push(params.category);
    idx++;
  }

  if (params.destination_id) {
    conditions.push(`b.destination_id = $${idx}`);
    values.push(params.destination_id);
    idx++;
  }

  if (params.year) {
    conditions.push(`b.year = $${idx}`);
    values.push(params.year);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM content.content_best_of b ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT b.best_of_id, b.title, b.slug, b.description, b.category,
            b.subcategory, b.destination_id, b.hero_image_url,
            b.year, b.season, b.is_featured, b.status, b.published_at, b.view_count
     FROM content.content_best_of b
     ${whereClause}
     ORDER BY b.year DESC NULLS LAST, b.is_featured DESC, b.title ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findBestOfBySlug(slug: string) {
  const result = await query(
    pool,
    `SELECT * FROM content.content_best_of WHERE slug = $1`,
    [slug],
  );
  return result.rows[0] ?? null;
}

export async function findBestOfById(bestOfId: string) {
  const result = await query(
    pool,
    `SELECT * FROM content.content_best_of WHERE best_of_id = $1`,
    [bestOfId],
  );
  return result.rows[0] ?? null;
}

export async function findBestOfItems(bestOfId: string) {
  const result = await query(
    pool,
    `SELECT * FROM content.content_best_of_item
     WHERE best_of_id = $1
     ORDER BY rank ASC`,
    [bestOfId],
  );
  return result.rows;
}

export interface CreateBestOfParams {
  title: string;
  slug: string;
  description?: string;
  category: string;
  subcategory?: string;
  destination_id?: string;
  hero_image_url?: string;
  methodology?: string;
  year?: number;
  season?: string;
  is_featured?: boolean;
  status?: string;
}

export async function createBestOf(params: CreateBestOfParams) {
  const result = await query(
    pool,
    `INSERT INTO content.content_best_of
       (title, slug, description, category, subcategory, destination_id,
        hero_image_url, methodology, year, season,
        is_featured, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
             CASE WHEN $12 = 'published' THEN NOW() ELSE NULL END)
     RETURNING *`,
    [
      params.title,
      params.slug,
      params.description ?? null,
      params.category,
      params.subcategory ?? null,
      params.destination_id ?? null,
      params.hero_image_url ?? null,
      params.methodology ?? null,
      params.year ?? null,
      params.season ?? null,
      params.is_featured ?? false,
      params.status ?? 'draft',
    ],
  );
  return result.rows[0];
}

export async function updateBestOf(bestOfId: string, updates: Partial<CreateBestOfParams>) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const simpleFields = [
    'title', 'slug', 'description', 'category', 'subcategory',
    'destination_id', 'hero_image_url', 'methodology', 'year',
    'season', 'is_featured', 'status',
  ];

  for (const field of simpleFields) {
    if (updates[field as keyof CreateBestOfParams] !== undefined) {
      setClauses.push(`${field} = $${idx}`);
      values.push(updates[field as keyof CreateBestOfParams]);
      idx++;
    }
  }

  if (updates.status === 'published') {
    setClauses.push(`published_at = COALESCE(published_at, NOW())`);
  }

  if (setClauses.length === 0) return findBestOfById(bestOfId);

  const result = await query(
    pool,
    `UPDATE content.content_best_of
     SET ${setClauses.join(', ')}
     WHERE best_of_id = $${idx}
     RETURNING *`,
    [...values, bestOfId],
  );
  return result.rows[0] ?? null;
}

export interface AddBestOfItemParams {
  best_of_id: string;
  entity_id: string;
  entity_type: string;
  rank: number;
  title?: string;
  blurb?: string;
  image_url?: string;
  metadata?: Record<string, unknown>;
}

export async function addBestOfItems(items: AddBestOfItemParams[]) {
  if (items.length === 0) return [];

  const valuePlaceholders: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const item of items) {
    valuePlaceholders.push(
      `($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7})`,
    );
    values.push(
      item.best_of_id,
      item.entity_id,
      item.entity_type,
      item.rank,
      item.title ?? null,
      item.blurb ?? null,
      item.image_url ?? null,
      JSON.stringify(item.metadata ?? {}),
    );
    idx += 8;
  }

  const result = await query(
    pool,
    `INSERT INTO content.content_best_of_item
       (best_of_id, entity_id, entity_type, rank, title, blurb, image_url, metadata)
     VALUES ${valuePlaceholders.join(', ')}
     ON CONFLICT (best_of_id, rank) DO UPDATE SET
       entity_id = EXCLUDED.entity_id,
       entity_type = EXCLUDED.entity_type,
       title = EXCLUDED.title,
       blurb = EXCLUDED.blurb,
       image_url = EXCLUDED.image_url,
       metadata = EXCLUDED.metadata
     RETURNING *`,
    values,
  );
  return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// Award Queries
// ═══════════════════════════════════════════════════════════════════════════

export interface ListAwardsParams {
  year?: number;
  category?: string;
  status?: string;
  limit: number;
  offset: number;
}

export async function listAwards(params: ListAwardsParams) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.status) {
    conditions.push(`a.status = $${idx}`);
    values.push(params.status);
    idx++;
  } else {
    conditions.push(`a.status = 'published'`);
  }

  if (params.year) {
    conditions.push(`a.year = $${idx}`);
    values.push(params.year);
    idx++;
  }

  if (params.category) {
    conditions.push(`a.category = $${idx}`);
    values.push(params.category);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM content.content_award a ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT a.award_id, a.name, a.slug, a.description, a.badge_image_url,
            a.category, a.subcategory, a.tier, a.year,
            a.status, a.published_at
     FROM content.content_award a
     ${whereClause}
     ORDER BY a.year DESC, a.tier DESC, a.name ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findAwardBySlugAndYear(slug: string, year: number) {
  const result = await query(
    pool,
    `SELECT * FROM content.content_award WHERE slug = $1 AND year = $2`,
    [slug, year],
  );
  return result.rows[0] ?? null;
}

export async function findAwardById(awardId: string) {
  const result = await query(
    pool,
    `SELECT * FROM content.content_award WHERE award_id = $1`,
    [awardId],
  );
  return result.rows[0] ?? null;
}

export async function findAwardWinners(awardId: string) {
  const result = await query(
    pool,
    `SELECT * FROM content.content_award_winner
     WHERE award_id = $1
     ORDER BY rank ASC NULLS LAST`,
    [awardId],
  );
  return result.rows;
}

export async function findAwardsByEntity(entityId: string) {
  const result = await query(
    pool,
    `SELECT w.*, a.name AS award_name, a.slug AS award_slug,
            a.category AS award_category, a.tier, a.year,
            a.badge_image_url
     FROM content.content_award_winner w
     JOIN content.content_award a ON a.award_id = w.award_id
     WHERE w.entity_id = $1 AND a.status = 'published'
     ORDER BY a.year DESC, a.tier DESC`,
    [entityId],
  );
  return result.rows;
}

export interface CreateAwardParams {
  name: string;
  slug: string;
  description?: string;
  badge_image_url?: string;
  category: string;
  subcategory?: string;
  tier?: string;
  year: number;
  methodology?: string;
  status?: string;
}

export async function createAward(params: CreateAwardParams) {
  const result = await query(
    pool,
    `INSERT INTO content.content_award
       (name, slug, description, badge_image_url, category, subcategory,
        tier, year, methodology, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
             CASE WHEN $10 = 'published' THEN NOW() ELSE NULL END)
     RETURNING *`,
    [
      params.name,
      params.slug,
      params.description ?? null,
      params.badge_image_url ?? null,
      params.category,
      params.subcategory ?? null,
      params.tier ?? 'standard',
      params.year,
      params.methodology ?? null,
      params.status ?? 'draft',
    ],
  );
  return result.rows[0];
}

export interface AddAwardWinnerParams {
  award_id: string;
  entity_id: string;
  entity_type: string;
  rank?: number;
  region?: string;
  country_code?: string;
  blurb?: string;
  review_count?: number;
  average_rating?: number;
  metadata?: Record<string, unknown>;
}

export async function addAwardWinners(winners: AddAwardWinnerParams[]) {
  if (winners.length === 0) return [];

  const valuePlaceholders: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const w of winners) {
    valuePlaceholders.push(
      `($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6}, $${idx + 7}, $${idx + 8}, $${idx + 9})`,
    );
    values.push(
      w.award_id,
      w.entity_id,
      w.entity_type,
      w.rank ?? null,
      w.region ?? null,
      w.country_code ?? null,
      w.blurb ?? null,
      w.review_count ?? 0,
      w.average_rating ?? null,
      JSON.stringify(w.metadata ?? {}),
    );
    idx += 10;
  }

  const result = await query(
    pool,
    `INSERT INTO content.content_award_winner
       (award_id, entity_id, entity_type, rank, region, country_code,
        blurb, review_count, average_rating, metadata)
     VALUES ${valuePlaceholders.join(', ')}
     ON CONFLICT (award_id, entity_id) DO UPDATE SET
       rank = EXCLUDED.rank,
       region = EXCLUDED.region,
       country_code = EXCLUDED.country_code,
       blurb = EXCLUDED.blurb,
       review_count = EXCLUDED.review_count,
       average_rating = EXCLUDED.average_rating,
       metadata = EXCLUDED.metadata
     RETURNING *`,
    values,
  );
  return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// Collection Queries
// ═══════════════════════════════════════════════════════════════════════════

export interface ListCollectionsParams {
  theme?: string;
  featured?: boolean;
  status?: string;
  limit: number;
  offset: number;
}

export async function listCollections(params: ListCollectionsParams) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.status) {
    conditions.push(`c.status = $${idx}`);
    values.push(params.status);
    idx++;
  } else {
    conditions.push(`c.status = 'published'`);
  }

  if (params.theme) {
    conditions.push(`c.theme = $${idx}`);
    values.push(params.theme);
    idx++;
  }

  if (params.featured !== undefined) {
    conditions.push(`c.is_featured = $${idx}`);
    values.push(params.featured);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(
    pool,
    `SELECT COUNT(*) AS total FROM content.content_collection c ${whereClause}`,
    values,
  );
  const total = parseInt(countResult.rows[0]?.total ?? '0', 10);

  const dataResult = await query(
    pool,
    `SELECT c.collection_id, c.title, c.slug, c.description, c.theme,
            c.hero_image_url, c.is_featured, c.status, c.published_at, c.sort_order
     FROM content.content_collection c
     ${whereClause}
     ORDER BY c.sort_order ASC, c.is_featured DESC, c.title ASC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return { data: dataResult.rows, total };
}

export async function findCollectionBySlug(slug: string) {
  const result = await query(
    pool,
    `SELECT * FROM content.content_collection WHERE slug = $1`,
    [slug],
  );
  return result.rows[0] ?? null;
}

export async function findCollectionById(collectionId: string) {
  const result = await query(
    pool,
    `SELECT * FROM content.content_collection WHERE collection_id = $1`,
    [collectionId],
  );
  return result.rows[0] ?? null;
}

export interface CreateCollectionParams {
  title: string;
  slug: string;
  description?: string;
  theme: string;
  hero_image_url?: string;
  destination_ids?: string[];
  entity_ids?: string[];
  guide_ids?: string[];
  best_of_ids?: string[];
  is_featured?: boolean;
  status?: string;
  sort_order?: number;
}

export async function createCollection(params: CreateCollectionParams) {
  const result = await query(
    pool,
    `INSERT INTO content.content_collection
       (title, slug, description, theme, hero_image_url,
        destination_ids, entity_ids, guide_ids, best_of_ids,
        is_featured, status, published_at, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
             CASE WHEN $11 = 'published' THEN NOW() ELSE NULL END, $12)
     RETURNING *`,
    [
      params.title,
      params.slug,
      params.description ?? null,
      params.theme,
      params.hero_image_url ?? null,
      params.destination_ids ?? [],
      params.entity_ids ?? [],
      params.guide_ids ?? [],
      params.best_of_ids ?? [],
      params.is_featured ?? false,
      params.status ?? 'draft',
      params.sort_order ?? 0,
    ],
  );
  return result.rows[0];
}

export async function updateCollection(collectionId: string, updates: Partial<CreateCollectionParams>) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const simpleFields = [
    'title', 'slug', 'description', 'theme', 'hero_image_url',
    'destination_ids', 'entity_ids', 'guide_ids', 'best_of_ids',
    'is_featured', 'status', 'sort_order',
  ];

  for (const field of simpleFields) {
    if (updates[field as keyof CreateCollectionParams] !== undefined) {
      setClauses.push(`${field} = $${idx}`);
      values.push(updates[field as keyof CreateCollectionParams]);
      idx++;
    }
  }

  if (updates.status === 'published') {
    setClauses.push(`published_at = COALESCE(published_at, NOW())`);
  }

  if (setClauses.length === 0) return findCollectionById(collectionId);

  const result = await query(
    pool,
    `UPDATE content.content_collection
     SET ${setClauses.join(', ')}
     WHERE collection_id = $${idx}
     RETURNING *`,
    [...values, collectionId],
  );
  return result.rows[0] ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Trending Queries
// ═══════════════════════════════════════════════════════════════════════════

export interface ListTrendingParams {
  trend_type?: string;
  period?: string;
  limit: number;
  offset: number;
}

export async function listTrending(params: ListTrendingParams) {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params.trend_type) {
    conditions.push(`t.trend_type = $${idx}`);
    values.push(params.trend_type);
    idx++;
  }

  if (params.period) {
    conditions.push(`t.period = $${idx}`);
    values.push(params.period);
    idx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataResult = await query(
    pool,
    `SELECT t.trending_id, t.destination_id, t.entity_id, t.entity_type,
            t.trend_type, t.trend_score, t.growth_percent,
            t.period, t.data_source, t.metadata,
            t.period_start, t.period_end,
            d.name AS destination_name, d.slug AS destination_slug,
            d.hero_image_url AS destination_image
     FROM content.content_trending t
     LEFT JOIN content.content_destination d ON d.destination_id = t.destination_id
     ${whereClause}
     ORDER BY t.trend_score DESC
     LIMIT $${idx} OFFSET $${idx + 1}`,
    [...values, params.limit, params.offset],
  );

  return dataResult.rows;
}

export async function listTrendingDestinations(limit: number) {
  const result = await query(
    pool,
    `SELECT t.trending_id, t.destination_id, t.trend_score, t.growth_percent,
            t.period, t.data_source, t.period_start, t.period_end,
            d.name AS destination_name, d.slug AS destination_slug,
            d.hero_image_url AS destination_image, d.country_code, d.region,
            d.tagline
     FROM content.content_trending t
     JOIN content.content_destination d ON d.destination_id = t.destination_id
     WHERE t.trend_type = 'destination'
     ORDER BY t.trend_score DESC
     LIMIT $1`,
    [limit],
  );
  return result.rows;
}

// ═══════════════════════════════════════════════════════════════════════════
// Search Across Content Types
// ═══════════════════════════════════════════════════════════════════════════

export interface SearchContentParams {
  q: string;
  type?: string; // destination, guide, best_of, collection, award
  limit: number;
  offset: number;
}

export async function searchContent(params: SearchContentParams) {
  const searchTerm = `%${params.q}%`;
  const results: Array<{
    id: string;
    type: string;
    title: string;
    slug: string;
    description: string | null;
    image_url: string | null;
  }> = [];

  const types = params.type ? [params.type] : ['destination', 'guide', 'best_of', 'collection', 'award'];

  if (types.includes('destination')) {
    const destResult = await query(
      pool,
      `SELECT destination_id AS id, 'destination' AS type,
              name AS title, slug, description, hero_image_url AS image_url
       FROM content.content_destination
       WHERE status = 'published'
         AND (name ILIKE $1 OR description ILIKE $1 OR tagline ILIKE $1 OR region ILIKE $1)
       ORDER BY is_featured DESC, name ASC
       LIMIT $2`,
      [searchTerm, params.limit],
    );
    results.push(...destResult.rows);
  }

  if (types.includes('guide')) {
    const guideResult = await query(
      pool,
      `SELECT guide_id AS id, 'guide' AS type,
              title, slug, excerpt AS description, hero_image_url AS image_url
       FROM content.content_guide
       WHERE status = 'published'
         AND (title ILIKE $1 OR excerpt ILIKE $1 OR content_html ILIKE $1)
       ORDER BY is_featured DESC, published_at DESC
       LIMIT $2`,
      [searchTerm, params.limit],
    );
    results.push(...guideResult.rows);
  }

  if (types.includes('best_of')) {
    const bestOfResult = await query(
      pool,
      `SELECT best_of_id AS id, 'best_of' AS type,
              title, slug, description, hero_image_url AS image_url
       FROM content.content_best_of
       WHERE status = 'published'
         AND (title ILIKE $1 OR description ILIKE $1)
       ORDER BY is_featured DESC, year DESC
       LIMIT $2`,
      [searchTerm, params.limit],
    );
    results.push(...bestOfResult.rows);
  }

  if (types.includes('collection')) {
    const collResult = await query(
      pool,
      `SELECT collection_id AS id, 'collection' AS type,
              title, slug, description, hero_image_url AS image_url
       FROM content.content_collection
       WHERE status = 'published'
         AND (title ILIKE $1 OR description ILIKE $1)
       ORDER BY is_featured DESC, sort_order ASC
       LIMIT $2`,
      [searchTerm, params.limit],
    );
    results.push(...collResult.rows);
  }

  if (types.includes('award')) {
    const awardResult = await query(
      pool,
      `SELECT award_id AS id, 'award' AS type,
              name AS title, slug, description, badge_image_url AS image_url
       FROM content.content_award
       WHERE status = 'published'
         AND (name ILIKE $1 OR description ILIKE $1)
       ORDER BY year DESC, name ASC
       LIMIT $2`,
      [searchTerm, params.limit],
    );
    results.push(...awardResult.rows);
  }

  // Sort combined results and apply offset/limit
  const sliced = results.slice(params.offset, params.offset + params.limit);
  return { data: sliced, total: results.length };
}

export { transaction, getPool };
