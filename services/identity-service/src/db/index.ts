import { getPool, query, transaction } from '@atlas/database';
import type { Pool, PoolClient } from '@atlas/database';

const pool: Pool = getPool();

// ── User Queries ───────────────────────────────────────────────────

export async function findUserById(id: string) {
  const result = await query(
    pool,
    'SELECT * FROM identity.identity_user WHERE user_id = $1',
    [id],
  );
  return result.rows[0] ?? null;
}

export async function findUserByEmail(email: string) {
  const result = await query(
    pool,
    'SELECT * FROM identity.identity_user WHERE email = $1',
    [email],
  );
  return result.rows[0] ?? null;
}

export async function createUser(params: {
  email: string;
  password_hash: string;
  phone?: string;
  status?: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO identity.identity_user (email, password_hash, phone, status)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [params.email, params.password_hash, params.phone ?? null, params.status ?? 'active'],
  );
  return result.rows[0];
}

export async function findUserWithProfile(userId: string) {
  const result = await query(
    pool,
    `SELECT
       u.user_id, u.email, u.phone, u.status, u.created_at, u.updated_at,
       p.first_name, p.last_name, p.dob, p.home_place_id,
       p.preferences, p.travel_style_vector_id,
       p.updated_at AS profile_updated_at
     FROM identity.identity_user u
     LEFT JOIN identity.identity_profile p ON p.user_id = u.user_id
     WHERE u.user_id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

// ── Profile Queries ────────────────────────────────────────────────

export async function findUserProfile(userId: string) {
  const result = await query(
    pool,
    'SELECT * FROM identity.identity_profile WHERE user_id = $1',
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function createProfile(params: {
  user_id: string;
  first_name?: string;
  last_name?: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO identity.identity_profile (user_id, first_name, last_name)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [params.user_id, params.first_name ?? null, params.last_name ?? null],
  );
  return result.rows[0];
}

export async function updateProfile(
  userId: string,
  fields: {
    first_name?: string;
    last_name?: string;
    dob?: string;
    home_place_id?: string;
    preferences?: Record<string, unknown>;
  },
) {
  // Build SET clause dynamically from provided fields
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      if (key === 'preferences') {
        setClauses.push(`${key} = $${paramIndex}::jsonb`);
      } else {
        setClauses.push(`${key} = $${paramIndex}`);
      }
      values.push(key === 'preferences' ? JSON.stringify(value) : value);
      paramIndex++;
    }
  }

  if (setClauses.length === 0) {
    return findUserProfile(userId);
  }

  values.push(userId);
  const result = await query(
    pool,
    `UPDATE identity.identity_profile
     SET ${setClauses.join(', ')}
     WHERE user_id = $${paramIndex}
     RETURNING *`,
    values,
  );
  return result.rows[0] ?? null;
}

// ── Session Queries ────────────────────────────────────────────────

export async function findSessionsByUserId(userId: string) {
  const result = await query(
    pool,
    `SELECT session_id, user_id, created_at, expires_at, ip, user_agent
     FROM identity.identity_session
     WHERE user_id = $1 AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function findSessionById(sessionId: string) {
  const result = await query(
    pool,
    `SELECT * FROM identity.identity_session
     WHERE session_id = $1 AND expires_at > NOW()`,
    [sessionId],
  );
  return result.rows[0] ?? null;
}

export async function createSession(params: {
  user_id: string;
  expires_at: string;
  ip?: string;
  user_agent?: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO identity.identity_session (user_id, expires_at, ip, user_agent)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [params.user_id, params.expires_at, params.ip ?? null, params.user_agent ?? null],
  );
  return result.rows[0];
}

export async function deleteSession(sessionId: string, userId: string) {
  const result = await query(
    pool,
    `DELETE FROM identity.identity_session
     WHERE session_id = $1 AND user_id = $2
     RETURNING session_id`,
    [sessionId, userId],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function deleteAllUserSessions(userId: string) {
  const result = await query(
    pool,
    'DELETE FROM identity.identity_session WHERE user_id = $1',
    [userId],
  );
  return result.rowCount ?? 0;
}

// ── Transactional Helpers ──────────────────────────────────────────

/**
 * Creates a user and their profile atomically in a single transaction.
 * Returns both the user row and profile row.
 */
export async function createUserWithProfile(params: {
  email: string;
  password_hash: string;
  phone?: string;
  display_name: string;
}) {
  return transaction(pool, async (client: PoolClient) => {
    // Parse display_name into first/last
    const nameParts = params.display_name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? '';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;

    // Insert user
    const userResult = await client.query(
      `INSERT INTO identity.identity_user (email, password_hash, phone, status)
       VALUES ($1, $2, $3, 'active')
       RETURNING *`,
      [params.email, params.password_hash, params.phone ?? null],
    );
    const user = userResult.rows[0];

    // Insert profile
    const profileResult = await client.query(
      `INSERT INTO identity.identity_profile (user_id, first_name, last_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user.user_id, firstName, lastName],
    );
    const profile = profileResult.rows[0];

    return { user, profile };
  });
}

// ════════════════════════════════════════════════════════════════════
// DEVICE QUERIES (Mobile Push Notifications)
// ════════════════════════════════════════════════════════════════════

export async function registerDevice(params: {
  user_id: string;
  platform: string;
  push_token?: string;
  device_model?: string;
  os_version?: string;
  app_version?: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO identity.identity_device
       (user_id, platform, push_token, device_model, os_version, app_version)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      params.user_id,
      params.platform,
      params.push_token ?? null,
      params.device_model ?? null,
      params.os_version ?? null,
      params.app_version ?? null,
    ],
  );
  return result.rows[0];
}

export async function findDevicesByUser(userId: string) {
  const result = await query(
    pool,
    `SELECT * FROM identity.identity_device
     WHERE user_id = $1 AND is_active = TRUE
     ORDER BY last_active_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function findDeviceById(deviceId: string) {
  const result = await query(
    pool,
    'SELECT * FROM identity.identity_device WHERE device_id = $1',
    [deviceId],
  );
  return result.rows[0] ?? null;
}

export async function updateDeviceToken(deviceId: string, userId: string, updates: {
  push_token?: string;
  app_version?: string;
  os_version?: string;
}) {
  const setClauses: string[] = ['last_active_at = NOW()'];
  const params: unknown[] = [deviceId, userId];
  let paramIdx = 3;

  if (updates.push_token !== undefined) {
    setClauses.push(`push_token = $${paramIdx}`);
    params.push(updates.push_token);
    paramIdx++;
  }
  if (updates.app_version !== undefined) {
    setClauses.push(`app_version = $${paramIdx}`);
    params.push(updates.app_version);
    paramIdx++;
  }
  if (updates.os_version !== undefined) {
    setClauses.push(`os_version = $${paramIdx}`);
    params.push(updates.os_version);
    paramIdx++;
  }

  const result = await query(
    pool,
    `UPDATE identity.identity_device
     SET ${setClauses.join(', ')}
     WHERE device_id = $1 AND user_id = $2
     RETURNING *`,
    params,
  );
  return result.rows[0] ?? null;
}

export async function deactivateDevice(deviceId: string, userId: string) {
  const result = await query(
    pool,
    `UPDATE identity.identity_device
     SET is_active = FALSE
     WHERE device_id = $1 AND user_id = $2
     RETURNING *`,
    [deviceId, userId],
  );
  return result.rows[0] ?? null;
}

// ════════════════════════════════════════════════════════════════════
// SOCIAL AUTH QUERIES (Google / Apple / Facebook)
// ════════════════════════════════════════════════════════════════════

export async function linkSocialAuth(params: {
  user_id: string;
  provider: string;
  provider_user_id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  access_token_hash?: string;
  refresh_token_hash?: string;
  token_expires_at?: string;
}) {
  const result = await query(
    pool,
    `INSERT INTO identity.identity_social_auth
       (user_id, provider, provider_user_id, email, display_name, avatar_url,
        access_token_hash, refresh_token_hash, token_expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (provider, provider_user_id) DO UPDATE SET
       email = EXCLUDED.email,
       display_name = EXCLUDED.display_name,
       avatar_url = EXCLUDED.avatar_url,
       access_token_hash = EXCLUDED.access_token_hash,
       refresh_token_hash = EXCLUDED.refresh_token_hash,
       token_expires_at = EXCLUDED.token_expires_at
     RETURNING *`,
    [
      params.user_id,
      params.provider,
      params.provider_user_id,
      params.email ?? null,
      params.display_name ?? null,
      params.avatar_url ?? null,
      params.access_token_hash ?? null,
      params.refresh_token_hash ?? null,
      params.token_expires_at ?? null,
    ],
  );
  return result.rows[0];
}

export async function findSocialAuth(userId: string) {
  const result = await query(
    pool,
    `SELECT social_auth_id, user_id, provider, provider_user_id, email, display_name, avatar_url, created_at
     FROM identity.identity_social_auth
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function findSocialAuthByProvider(provider: string, providerUserId: string) {
  const result = await query(
    pool,
    `SELECT * FROM identity.identity_social_auth
     WHERE provider = $1 AND provider_user_id = $2`,
    [provider, providerUserId],
  );
  return result.rows[0] ?? null;
}

export async function findSocialAuthByUserAndProvider(userId: string, provider: string) {
  const result = await query(
    pool,
    `SELECT * FROM identity.identity_social_auth
     WHERE user_id = $1 AND provider = $2`,
    [userId, provider],
  );
  return result.rows[0] ?? null;
}

export async function unlinkSocialAuth(userId: string, provider: string) {
  const result = await query(
    pool,
    `DELETE FROM identity.identity_social_auth
     WHERE user_id = $1 AND provider = $2
     RETURNING social_auth_id`,
    [userId, provider],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

// ════════════════════════════════════════════════════════════════════
// OFFLINE PACK QUERIES
// ════════════════════════════════════════════════════════════════════

export async function findOfflinePacks(destinationId?: string) {
  if (destinationId) {
    const result = await query(
      pool,
      `SELECT * FROM identity.identity_offline_pack
       WHERE destination_id = $1 AND is_active = TRUE
       ORDER BY name ASC`,
      [destinationId],
    );
    return result.rows;
  }
  const result = await query(
    pool,
    `SELECT * FROM identity.identity_offline_pack
     WHERE is_active = TRUE
     ORDER BY name ASC`,
  );
  return result.rows;
}

export async function findOfflinePackById(packId: string) {
  const result = await query(
    pool,
    'SELECT * FROM identity.identity_offline_pack WHERE pack_id = $1 AND is_active = TRUE',
    [packId],
  );
  return result.rows[0] ?? null;
}

export async function getUserOfflineDownloads(userId: string) {
  const result = await query(
    pool,
    `SELECT d.*, p.name, p.version AS latest_version, p.size_bytes, p.content_hash, p.data_url, p.includes
     FROM identity.identity_user_offline d
     JOIN identity.identity_offline_pack p ON p.pack_id = d.pack_id
     WHERE d.user_id = $1
     ORDER BY d.downloaded_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function recordOfflineDownload(userId: string, packId: string, version: number) {
  const result = await query(
    pool,
    `INSERT INTO identity.identity_user_offline (user_id, pack_id, downloaded_version)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, pack_id) DO UPDATE SET
       downloaded_version = EXCLUDED.downloaded_version,
       downloaded_at = NOW()
     RETURNING *`,
    [userId, packId, version],
  );
  return result.rows[0];
}

// Re-export pool and transaction for direct access if needed
export { pool, transaction };
