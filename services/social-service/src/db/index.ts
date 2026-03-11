import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ════════════════════════════════════════════════════════════════════════════
//  FOLLOWING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Follow a user. Uses ON CONFLICT DO NOTHING so double-follows are idempotent.
 * Atomically increments follower_count on the followed user's profile and
 * following_count on the follower's profile.
 */
export async function followUser(followerId: string, followingId: string) {
  return transaction(pool, async (client: PoolClient) => {
    const result = await client.query(
      `INSERT INTO social.social_follow (follower_id, following_id)
       VALUES ($1, $2)
       ON CONFLICT (follower_id, following_id) DO NOTHING
       RETURNING *`,
      [followerId, followingId],
    );

    // Only update counts if a new row was actually inserted
    if (result.rowCount && result.rowCount > 0) {
      await client.query(
        `UPDATE social.social_profile
         SET following_count = following_count + 1
         WHERE user_id = $1`,
        [followerId],
      );
      await client.query(
        `UPDATE social.social_profile
         SET follower_count = follower_count + 1
         WHERE user_id = $1`,
        [followingId],
      );
    }

    return result.rows[0] ?? null;
  });
}

/**
 * Unfollow a user. Decrements counts atomically.
 */
export async function unfollowUser(followerId: string, followingId: string) {
  return transaction(pool, async (client: PoolClient) => {
    const result = await client.query(
      `DELETE FROM social.social_follow
       WHERE follower_id = $1 AND following_id = $2
       RETURNING *`,
      [followerId, followingId],
    );

    if (result.rowCount && result.rowCount > 0) {
      await client.query(
        `UPDATE social.social_profile
         SET following_count = GREATEST(following_count - 1, 0)
         WHERE user_id = $1`,
        [followerId],
      );
      await client.query(
        `UPDATE social.social_profile
         SET follower_count = GREATEST(follower_count - 1, 0)
         WHERE user_id = $1`,
        [followingId],
      );
    }

    return result.rowCount !== null && result.rowCount > 0;
  });
}

/**
 * Get paginated list of followers for a user, joined with their social profile.
 */
export async function getFollowers(userId: string, limit: number, offset: number) {
  const result = await query(
    pool,
    `SELECT f.follow_id, f.follower_id, f.created_at,
            p.display_name, p.avatar_url, p.bio, p.traveler_type
     FROM social.social_follow f
     LEFT JOIN social.social_profile p ON p.user_id = f.follower_id
     WHERE f.following_id = $1
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows;
}

/**
 * Get paginated list of users that a user is following, joined with profile.
 */
export async function getFollowing(userId: string, limit: number, offset: number) {
  const result = await query(
    pool,
    `SELECT f.follow_id, f.following_id, f.created_at,
            p.display_name, p.avatar_url, p.bio, p.traveler_type
     FROM social.social_follow f
     LEFT JOIN social.social_profile p ON p.user_id = f.following_id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows;
}

/**
 * Check whether followerId is following followingId.
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const result = await query(
    pool,
    `SELECT 1 FROM social.social_follow
     WHERE follower_id = $1 AND following_id = $2`,
    [followerId, followingId],
  );
  return (result.rowCount ?? 0) > 0;
}

// ════════════════════════════════════════════════════════════════════════════
//  LISTS / WISHLISTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Create a new list / wishlist.
 */
export async function createList(params: {
  userId: string;
  name: string;
  description?: string;
  isPublic?: boolean;
}) {
  // Generate a URL-safe slug from the name
  const slug = params.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 200);

  const result = await query(
    pool,
    `INSERT INTO social.social_list (user_id, name, description, slug, is_public)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [params.userId, params.name, params.description ?? null, slug, params.isPublic ?? false],
  );
  return result.rows[0];
}

/**
 * Update list metadata.
 */
export async function updateList(
  listId: string,
  data: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    coverImageUrl?: string;
  },
) {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    setClauses.push(`name = $${paramIndex}`);
    values.push(data.name);
    paramIndex++;
    // Regenerate slug
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 200);
    setClauses.push(`slug = $${paramIndex}`);
    values.push(slug);
    paramIndex++;
  }
  if (data.description !== undefined) {
    setClauses.push(`description = $${paramIndex}`);
    values.push(data.description);
    paramIndex++;
  }
  if (data.isPublic !== undefined) {
    setClauses.push(`is_public = $${paramIndex}`);
    values.push(data.isPublic);
    paramIndex++;
  }
  if (data.coverImageUrl !== undefined) {
    setClauses.push(`cover_image_url = $${paramIndex}`);
    values.push(data.coverImageUrl);
    paramIndex++;
  }

  if (setClauses.length === 0) return null;

  values.push(listId);
  const result = await query(
    pool,
    `UPDATE social.social_list
     SET ${setClauses.join(', ')}
     WHERE list_id = $${paramIndex}
     RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}

/**
 * Delete a list. Verifies ownership via userId.
 */
export async function deleteList(listId: string, userId: string): Promise<boolean> {
  const result = await query(
    pool,
    `DELETE FROM social.social_list
     WHERE list_id = $1 AND user_id = $2
     RETURNING list_id`,
    [listId, userId],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Get all lists for a user.
 */
export async function getListsByUser(userId: string, limit: number, offset: number) {
  const result = await query(
    pool,
    `SELECT * FROM social.social_list
     WHERE user_id = $1
     ORDER BY updated_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows;
}

/**
 * Get a single list by ID.
 */
export async function getListById(listId: string) {
  const result = await query(
    pool,
    `SELECT * FROM social.social_list WHERE list_id = $1`,
    [listId],
  );
  return result.rows[0] ?? null;
}

/**
 * Add an item to a list. Uses ON CONFLICT for idempotency.
 * Increments item_count on the list.
 */
export async function addToList(
  listId: string,
  entityId: string,
  entityType: string,
  notes?: string,
) {
  return transaction(pool, async (client: PoolClient) => {
    // Get next position
    const posResult = await client.query(
      `SELECT COALESCE(MAX(position), -1) + 1 AS next_pos
       FROM social.social_list_item
       WHERE list_id = $1`,
      [listId],
    );
    const nextPos = posResult.rows[0]?.next_pos ?? 0;

    const result = await client.query(
      `INSERT INTO social.social_list_item (list_id, entity_id, entity_type, notes, position)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (list_id, entity_id) DO NOTHING
       RETURNING *`,
      [listId, entityId, entityType, notes ?? null, nextPos],
    );

    if (result.rowCount && result.rowCount > 0) {
      await client.query(
        `UPDATE social.social_list SET item_count = item_count + 1 WHERE list_id = $1`,
        [listId],
      );
    }

    return result.rows[0] ?? null;
  });
}

/**
 * Remove an item from a list. Decrements item_count.
 */
export async function removeFromList(listId: string, entityId: string): Promise<boolean> {
  return transaction(pool, async (client: PoolClient) => {
    const result = await client.query(
      `DELETE FROM social.social_list_item
       WHERE list_id = $1 AND entity_id = $2
       RETURNING item_id`,
      [listId, entityId],
    );

    if (result.rowCount && result.rowCount > 0) {
      await client.query(
        `UPDATE social.social_list SET item_count = GREATEST(item_count - 1, 0) WHERE list_id = $1`,
        [listId],
      );
    }

    return (result.rowCount ?? 0) > 0;
  });
}

/**
 * Get items in a list, paginated.
 */
export async function getListItems(listId: string, limit: number, offset: number) {
  const result = await query(
    pool,
    `SELECT * FROM social.social_list_item
     WHERE list_id = $1
     ORDER BY position ASC
     LIMIT $2 OFFSET $3`,
    [listId, limit, offset],
  );
  return result.rows;
}

// ════════════════════════════════════════════════════════════════════════════
//  FAVORITES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Toggle a favorite. If already favorited, remove it; otherwise add it.
 * Returns { favorited: boolean, favorite?: row }.
 */
export async function toggleFavorite(
  userId: string,
  entityId: string,
  entityType: string,
): Promise<{ favorited: boolean; favorite: Record<string, unknown> | null }> {
  // Check if already favorited
  const existing = await query(
    pool,
    `SELECT * FROM social.social_favorite
     WHERE user_id = $1 AND entity_id = $2`,
    [userId, entityId],
  );

  if (existing.rows.length > 0) {
    // Remove
    await query(
      pool,
      `DELETE FROM social.social_favorite
       WHERE user_id = $1 AND entity_id = $2`,
      [userId, entityId],
    );
    return { favorited: false, favorite: null };
  }

  // Add
  const result = await query(
    pool,
    `INSERT INTO social.social_favorite (user_id, entity_id, entity_type)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, entityId, entityType],
  );
  return { favorited: true, favorite: result.rows[0] ?? null };
}

/**
 * Get user favorites, optionally filtered by entity type.
 */
export async function getFavorites(
  userId: string,
  entityType: string | undefined,
  limit: number,
  offset: number,
) {
  if (entityType) {
    const result = await query(
      pool,
      `SELECT * FROM social.social_favorite
       WHERE user_id = $1 AND entity_type = $2
       ORDER BY created_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, entityType, limit, offset],
    );
    return result.rows;
  }

  const result = await query(
    pool,
    `SELECT * FROM social.social_favorite
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows;
}

/**
 * Check if a specific entity is favorited by the user.
 */
export async function isFavorited(userId: string, entityId: string): Promise<boolean> {
  const result = await query(
    pool,
    `SELECT 1 FROM social.social_favorite
     WHERE user_id = $1 AND entity_id = $2`,
    [userId, entityId],
  );
  return (result.rowCount ?? 0) > 0;
}

// ════════════════════════════════════════════════════════════════════════════
//  ACTIVITY FEED
// ════════════════════════════════════════════════════════════════════════════

/**
 * Record a new activity event.
 */
export async function recordActivity(data: {
  userId: string;
  activityType: string;
  entityId?: string;
  entityType?: string;
  referenceId?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
  isPublic?: boolean;
}) {
  const result = await query(
    pool,
    `INSERT INTO social.social_activity
       (user_id, activity_type, entity_id, entity_type, reference_id, summary, metadata, is_public)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
     RETURNING *`,
    [
      data.userId,
      data.activityType,
      data.entityId ?? null,
      data.entityType ?? null,
      data.referenceId ?? null,
      data.summary ?? null,
      JSON.stringify(data.metadata ?? {}),
      data.isPublic ?? true,
    ],
  );
  return result.rows[0];
}

/**
 * Get all activity for a user (including private).
 */
export async function getUserActivity(userId: string, limit: number, offset: number) {
  const result = await query(
    pool,
    `SELECT * FROM social.social_activity
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows;
}

/**
 * Get the activity feed for a user (activities from people they follow).
 */
export async function getFeedForUser(userId: string, limit: number, offset: number) {
  const result = await query(
    pool,
    `SELECT a.*, p.display_name, p.avatar_url
     FROM social.social_activity a
     INNER JOIN social.social_follow f ON f.following_id = a.user_id
     LEFT JOIN social.social_profile p ON p.user_id = a.user_id
     WHERE f.follower_id = $1
       AND a.is_public = TRUE
     ORDER BY a.created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows;
}

/**
 * Get public activity for a user (for their profile page).
 */
export async function getPublicActivity(userId: string, limit: number, offset: number) {
  const result = await query(
    pool,
    `SELECT * FROM social.social_activity
     WHERE user_id = $1 AND is_public = TRUE
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );
  return result.rows;
}

// ════════════════════════════════════════════════════════════════════════════
//  TRAVEL MAP
// ════════════════════════════════════════════════════════════════════════════

/**
 * Add a visited place to the user's travel map.
 */
export async function addVisitedPlace(
  userId: string,
  placeId: string,
  data: {
    countryCode?: string;
    visitedDate?: string;
    notes?: string;
    isPublic?: boolean;
  },
) {
  return transaction(pool, async (client: PoolClient) => {
    const result = await client.query(
      `INSERT INTO social.social_visited_place
         (user_id, place_id, country_code, visited_date, notes, is_public)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, place_id) DO UPDATE SET
         country_code = COALESCE(EXCLUDED.country_code, social.social_visited_place.country_code),
         visited_date = COALESCE(EXCLUDED.visited_date, social.social_visited_place.visited_date),
         notes = COALESCE(EXCLUDED.notes, social.social_visited_place.notes),
         is_public = COALESCE(EXCLUDED.is_public, social.social_visited_place.is_public)
       RETURNING *`,
      [
        userId,
        placeId,
        data.countryCode ?? null,
        data.visitedDate ?? null,
        data.notes ?? null,
        data.isPublic ?? true,
      ],
    );

    // Update places_visited_count on the profile
    await client.query(
      `UPDATE social.social_profile
       SET places_visited_count = (
         SELECT COUNT(*) FROM social.social_visited_place WHERE user_id = $1
       )
       WHERE user_id = $1`,
      [userId],
    );

    return result.rows[0];
  });
}

/**
 * Remove a visited place.
 */
export async function removeVisitedPlace(userId: string, placeId: string): Promise<boolean> {
  return transaction(pool, async (client: PoolClient) => {
    const result = await client.query(
      `DELETE FROM social.social_visited_place
       WHERE user_id = $1 AND place_id = $2
       RETURNING visited_id`,
      [userId, placeId],
    );

    if (result.rowCount && result.rowCount > 0) {
      await client.query(
        `UPDATE social.social_profile
         SET places_visited_count = GREATEST(places_visited_count - 1, 0)
         WHERE user_id = $1`,
        [userId],
      );
    }

    return (result.rowCount ?? 0) > 0;
  });
}

/**
 * Get all visited places for a user.
 */
export async function getVisitedPlaces(userId: string) {
  const result = await query(
    pool,
    `SELECT * FROM social.social_visited_place
     WHERE user_id = $1
     ORDER BY visited_date DESC NULLS LAST, created_at DESC`,
    [userId],
  );
  return result.rows;
}

/**
 * Get visited places for a public profile (only public entries).
 */
export async function getPublicVisitedPlaces(userId: string) {
  const result = await query(
    pool,
    `SELECT * FROM social.social_visited_place
     WHERE user_id = $1 AND is_public = TRUE
     ORDER BY visited_date DESC NULLS LAST, created_at DESC`,
    [userId],
  );
  return result.rows;
}

/**
 * Get visited countries grouped by country code with count.
 */
export async function getVisitedCountries(userId: string) {
  const result = await query(
    pool,
    `SELECT country_code, COUNT(*) AS place_count,
            MIN(visited_date) AS first_visit,
            MAX(visited_date) AS last_visit
     FROM social.social_visited_place
     WHERE user_id = $1 AND country_code IS NOT NULL
     GROUP BY country_code
     ORDER BY place_count DESC`,
    [userId],
  );
  return result.rows;
}

// ════════════════════════════════════════════════════════════════════════════
//  PROFILE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get public profile for a user.
 */
export async function getPublicProfile(userId: string) {
  const result = await query(
    pool,
    `SELECT * FROM social.social_profile WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

/**
 * Upsert (create or update) a social profile.
 */
export async function upsertProfile(
  userId: string,
  data: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string;
    coverPhotoUrl?: string;
    location?: string;
    websiteUrl?: string;
    travelerType?: string;
    travelStyle?: Record<string, unknown>;
    isPublic?: boolean;
  },
) {
  const result = await query(
    pool,
    `INSERT INTO social.social_profile
       (user_id, display_name, bio, avatar_url, cover_photo_url,
        location, website_url, traveler_type, travel_style, is_public)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
     ON CONFLICT (user_id) DO UPDATE SET
       display_name = COALESCE(EXCLUDED.display_name, social.social_profile.display_name),
       bio = COALESCE(EXCLUDED.bio, social.social_profile.bio),
       avatar_url = COALESCE(EXCLUDED.avatar_url, social.social_profile.avatar_url),
       cover_photo_url = COALESCE(EXCLUDED.cover_photo_url, social.social_profile.cover_photo_url),
       location = COALESCE(EXCLUDED.location, social.social_profile.location),
       website_url = COALESCE(EXCLUDED.website_url, social.social_profile.website_url),
       traveler_type = COALESCE(EXCLUDED.traveler_type, social.social_profile.traveler_type),
       travel_style = COALESCE(EXCLUDED.travel_style, social.social_profile.travel_style),
       is_public = COALESCE(EXCLUDED.is_public, social.social_profile.is_public)
     RETURNING *`,
    [
      userId,
      data.displayName ?? null,
      data.bio ?? null,
      data.avatarUrl ?? null,
      data.coverPhotoUrl ?? null,
      data.location ?? null,
      data.websiteUrl ?? null,
      data.travelerType ?? null,
      JSON.stringify(data.travelStyle ?? {}),
      data.isPublic ?? true,
    ],
  );
  return result.rows[0];
}

/**
 * Get profile statistics for a user.
 */
export async function getProfileStats(userId: string) {
  const result = await query(
    pool,
    `SELECT
       follower_count,
       following_count,
       review_count,
       photo_count,
       places_visited_count,
       contribution_points
     FROM social.social_profile
     WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

// ════════════════════════════════════════════════════════════════════════════
//  SEARCH HISTORY
// ════════════════════════════════════════════════════════════════════════════

/**
 * Record a search query.
 */
export async function recordSearch(
  userId: string,
  data: {
    query: string;
    searchType?: string;
    filters?: Record<string, unknown>;
    resultCount?: number;
    clickedEntityId?: string;
  },
) {
  const result = await query(
    pool,
    `INSERT INTO social.social_search_history
       (user_id, query, search_type, filters, result_count, clicked_entity_id)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     RETURNING *`,
    [
      userId,
      data.query,
      data.searchType ?? null,
      JSON.stringify(data.filters ?? {}),
      data.resultCount ?? 0,
      data.clickedEntityId ?? null,
    ],
  );
  return result.rows[0];
}

/**
 * Get recent search history for a user.
 */
export async function getSearchHistory(userId: string, limit: number) {
  const result = await query(
    pool,
    `SELECT * FROM social.social_search_history
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return result.rows;
}

/**
 * Clear all search history for a user.
 */
export async function clearSearchHistory(userId: string): Promise<number> {
  const result = await query(
    pool,
    `DELETE FROM social.social_search_history WHERE user_id = $1`,
    [userId],
  );
  return result.rowCount ?? 0;
}

// ════════════════════════════════════════════════════════════════════════════
//  RECOMMENDATIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get personalized recommendations for a user, optionally filtered by entity type.
 */
export async function getRecommendations(
  userId: string,
  entityType: string | undefined,
  limit: number,
) {
  if (entityType) {
    const result = await query(
      pool,
      `SELECT * FROM social.social_recommendation
       WHERE user_id = $1
         AND entity_type = $2
         AND is_dismissed = FALSE
         AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY score DESC
       LIMIT $3`,
      [userId, entityType, limit],
    );
    return result.rows;
  }

  const result = await query(
    pool,
    `SELECT * FROM social.social_recommendation
     WHERE user_id = $1
       AND is_dismissed = FALSE
       AND (expires_at IS NULL OR expires_at > NOW())
     ORDER BY score DESC
     LIMIT $2`,
    [userId, limit],
  );
  return result.rows;
}

/**
 * Dismiss a recommendation.
 */
export async function dismissRecommendation(userId: string, entityId: string): Promise<boolean> {
  const result = await query(
    pool,
    `UPDATE social.social_recommendation
     SET is_dismissed = TRUE
     WHERE user_id = $1 AND entity_id = $2
     RETURNING recommendation_id`,
    [userId, entityId],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Upsert a recommendation (for batch processing / cron jobs).
 */
export async function upsertRecommendation(data: {
  userId: string;
  entityId: string;
  entityType: string;
  score: number;
  reason?: string;
  sourceData?: Record<string, unknown>;
  expiresAt?: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO social.social_recommendation
       (user_id, entity_id, entity_type, score, reason, source_data, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
     ON CONFLICT (user_id, entity_id) DO UPDATE SET
       score = EXCLUDED.score,
       reason = EXCLUDED.reason,
       source_data = EXCLUDED.source_data,
       expires_at = EXCLUDED.expires_at,
       is_dismissed = FALSE
     RETURNING *`,
    [
      data.userId,
      data.entityId,
      data.entityType,
      data.score,
      data.reason ?? null,
      JSON.stringify(data.sourceData ?? {}),
      data.expiresAt ?? null,
    ],
  );
  return result.rows[0];
}

// ════════════════════════════════════════════════════════════════════════════
//  TRAVELER TYPE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get the traveler type profile for a user.
 */
export async function getTravelerProfile(userId: string) {
  const result = await query(
    pool,
    `SELECT * FROM social.social_traveler_profile WHERE user_id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

/**
 * Upsert traveler type scores. Computes primary and secondary type from scores.
 */
export async function updateTravelerProfile(
  userId: string,
  scores: {
    luxury?: number;
    budget?: number;
    adventure?: number;
    family?: number;
    solo?: number;
    business?: number;
    foodie?: number;
    cultural?: number;
    nature?: number;
    beach?: number;
  },
) {
  // Determine primary and secondary type from the highest scores
  const scoreEntries: Array<[string, number]> = Object.entries(scores)
    .filter((entry): entry is [string, number] => entry[1] !== undefined)
    .sort((a, b) => b[1] - a[1]);

  const primaryType = scoreEntries[0]?.[0] ?? null;
  const secondaryType = scoreEntries[1]?.[0] ?? null;

  const result = await query(
    pool,
    `INSERT INTO social.social_traveler_profile
       (user_id, luxury_score, budget_score, adventure_score, family_score,
        solo_score, business_score, foodie_score, cultural_score,
        nature_score, beach_score, primary_type, secondary_type, last_computed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       luxury_score = COALESCE(EXCLUDED.luxury_score, social.social_traveler_profile.luxury_score),
       budget_score = COALESCE(EXCLUDED.budget_score, social.social_traveler_profile.budget_score),
       adventure_score = COALESCE(EXCLUDED.adventure_score, social.social_traveler_profile.adventure_score),
       family_score = COALESCE(EXCLUDED.family_score, social.social_traveler_profile.family_score),
       solo_score = COALESCE(EXCLUDED.solo_score, social.social_traveler_profile.solo_score),
       business_score = COALESCE(EXCLUDED.business_score, social.social_traveler_profile.business_score),
       foodie_score = COALESCE(EXCLUDED.foodie_score, social.social_traveler_profile.foodie_score),
       cultural_score = COALESCE(EXCLUDED.cultural_score, social.social_traveler_profile.cultural_score),
       nature_score = COALESCE(EXCLUDED.nature_score, social.social_traveler_profile.nature_score),
       beach_score = COALESCE(EXCLUDED.beach_score, social.social_traveler_profile.beach_score),
       primary_type = $12,
       secondary_type = $13,
       last_computed_at = NOW()
     RETURNING *`,
    [
      userId,
      scores.luxury ?? 0,
      scores.budget ?? 0,
      scores.adventure ?? 0,
      scores.family ?? 0,
      scores.solo ?? 0,
      scores.business ?? 0,
      scores.foodie ?? 0,
      scores.cultural ?? 0,
      scores.nature ?? 0,
      scores.beach ?? 0,
      primaryType,
      secondaryType,
    ],
  );
  return result.rows[0];
}

// Re-export pool for direct access if needed
export { pool };
