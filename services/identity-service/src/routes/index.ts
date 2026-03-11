import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'crypto';
import { z, validateBody, validateParams, validateQuery, uuidSchema } from '@atlas/validation';
import { signToken } from '@atlas/auth';
import { requireRole } from '@atlas/auth';
import { UserRole } from '@atlas/shared-types';
import {
  findUserByEmail,
  findUserById,
  findUserWithProfile,
  findUserProfile,
  findSessionsByUserId,
  createUserWithProfile,
  createSession,
  updateProfile,
  deleteSession,
  // Device queries
  registerDevice,
  findDevicesByUser,
  findDeviceById,
  updateDeviceToken,
  deactivateDevice,
  // Social auth queries
  linkSocialAuth,
  findSocialAuth,
  findSocialAuthByProvider,
  findSocialAuthByUserAndProvider,
  unlinkSocialAuth,
  // Offline pack queries
  findOfflinePacks,
  findOfflinePackById,
  getUserOfflineDownloads,
  recordOfflineDownload,
} from '../db/index.js';

// ── Local Validation Schemas ───────────────────────────────────────
// The shared createUserSchema does not include password (it's for admin/internal use).
// Auth routes need password, so we define registration and login schemas here.

const registerBodySchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  display_name: z.string().min(1).max(100),
  phone: z.string().max(20).optional(),
});

const loginBodySchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

const updateProfileBodySchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  first_name: z.string().min(1).max(50).optional(),
  last_name: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  phone: z.string().max(20).optional(),
  locale: z.string().max(10).optional(),
  timezone: z.string().max(50).optional(),
  dob: z.string().date().optional(),
});

const userIdParamsSchema = z.object({
  id: uuidSchema,
});

// ── Mobile: Device Schemas ─────────────────────────────────────────

const registerDeviceBodySchema = z.object({
  platform: z.enum(['ios', 'android', 'web']),
  push_token: z.string().min(1).max(500).optional(),
  device_model: z.string().max(100).optional(),
  os_version: z.string().max(50).optional(),
  app_version: z.string().max(20).optional(),
});

const deviceIdParamSchema = z.object({
  deviceId: uuidSchema,
});

const updateDeviceBodySchema = z.object({
  push_token: z.string().min(1).max(500).optional(),
  app_version: z.string().max(20).optional(),
  os_version: z.string().max(50).optional(),
});

// ── Mobile: Social Auth Schemas ────────────────────────────────────

const socialSignInBodySchema = z.object({
  provider: z.enum(['google', 'apple', 'facebook']),
  provider_token: z.string().min(1).max(2000), // OAuth token from provider
  provider_user_id: z.string().min(1).max(255),
  email: z.string().email().max(255).optional(),
  display_name: z.string().max(200).optional(),
  avatar_url: z.string().url().optional(),
});

const linkSocialBodySchema = z.object({
  provider: z.enum(['google', 'apple', 'facebook']),
  provider_token: z.string().min(1).max(2000),
  provider_user_id: z.string().min(1).max(255),
  email: z.string().email().max(255).optional(),
  display_name: z.string().max(200).optional(),
  avatar_url: z.string().url().optional(),
});

const providerParamSchema = z.object({
  provider: z.enum(['google', 'apple', 'facebook']),
});

// ── Mobile: Offline Pack Schemas ───────────────────────────────────

const offlinePacksQuerySchema = z.object({
  destination_id: uuidSchema.optional(),
});

const packIdParamSchema = z.object({
  packId: uuidSchema,
});

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Hash a password using SHA-256. This is a placeholder -- in production
 * this should be replaced with bcrypt or argon2id.
 */
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/**
 * Hash a token for storage. Never store raw OAuth tokens.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Strip password_hash from a user row before returning it to the client.
 */
function stripPasswordHash(user: Record<string, unknown>): Record<string, unknown> {
  const { password_hash, ...safe } = user;
  return safe;
}

/**
 * Build a session expiry timestamp (24 hours from now).
 */
function sessionExpiresAt(): string {
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);
  return expires.toISOString();
}

// ── Route Registration ─────────────────────────────────────────────

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // ── Status endpoint ──────────────────────────────────────────────
  server.get('/api/v1/identity/status', async () => ({
    service: 'identity-service',
    routes: [
      'users', 'auth', 'roles', 'sessions',
      'devices', 'auth/social', 'offline/packs', 'offline/downloads',
    ],
  }));

  // ════════════════════════════════════════════════════════════════
  //  AUTH ROUTES (PUBLIC -- no authentication required)
  // ════════════════════════════════════════════════════════════════

  // ── POST /api/v1/auth/register ───────────────────────────────────
  server.post(
    '/api/v1/auth/register',
    { preValidation: [validateBody(registerBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof registerBodySchema>;

      // Check if email is already taken
      const existingUser = await findUserByEmail(body.email);
      if (existingUser) {
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'A user with this email address already exists',
          },
        });
      }

      // Hash password (TODO: replace with bcrypt/argon2id)
      const passwordHash = hashPassword(body.password);

      // Create user + profile in a single transaction
      const { user, profile } = await createUserWithProfile({
        email: body.email,
        password_hash: passwordHash,
        phone: body.phone,
        display_name: body.display_name,
      });

      request.log.info({ userId: user.user_id }, 'User registered');

      return reply.code(201).send({
        user: stripPasswordHash(user),
        profile,
      });
    },
  );

  // ── POST /api/v1/auth/login ──────────────────────────────────────
  server.post(
    '/api/v1/auth/login',
    { preValidation: [validateBody(loginBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof loginBodySchema>;

      // Find user by email
      const user = await findUserByEmail(body.email);
      if (!user) {
        return reply.code(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          },
        });
      }

      // Check account status
      if (user.status !== 'active') {
        return reply.code(401).send({
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'This account has been suspended or deleted',
          },
        });
      }

      // Verify password
      const passwordHash = hashPassword(body.password);
      if (user.password_hash !== passwordHash) {
        return reply.code(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid email or password',
          },
        });
      }

      // Create a new session
      const session = await createSession({
        user_id: user.user_id,
        expires_at: sessionExpiresAt(),
        ip: request.ip,
        user_agent: request.headers['user-agent'] ?? null,
      });

      // Sign JWT access token
      const token = await signToken({
        sub: user.user_id,
        email: user.email,
        roles: [UserRole.Traveler], // Default role; a full impl would read roles from DB
        sid: session.session_id,
      });

      request.log.info({ userId: user.user_id, sessionId: session.session_id }, 'User logged in');

      return reply.code(200).send({
        token,
        user: stripPasswordHash(user),
      });
    },
  );

  // ── POST /api/v1/auth/logout ─────────────────────────────────────
  // This route is NOT in publicRoutes, so the auth plugin will require a valid token.
  server.post(
    '/api/v1/auth/logout',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      // Delete the current session identified by the JWT's session ID (sid)
      await deleteSession(user.sid, user.sub);

      request.log.info({ userId: user.sub, sessionId: user.sid }, 'User logged out');

      return reply.code(204).send();
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  SOCIAL AUTH ROUTES (Mobile)
  // ════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // PUBLIC: Social Sign-In (Google / Apple / Facebook)
  // POST /api/v1/identity/auth/social
  //
  // Exchanges a provider OAuth token for an Atlas JWT.
  // If the social provider user is not yet linked to an Atlas user,
  // a new user account is created automatically.
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/identity/auth/social',
    { preValidation: [validateBody(socialSignInBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as z.infer<typeof socialSignInBodySchema>;

      // In production, validate the provider token with the actual OAuth provider:
      // - Google: verify ID token via https://oauth2.googleapis.com/tokeninfo
      // - Apple: verify identity token via Apple's public keys
      // - Facebook: verify via https://graph.facebook.com/me?access_token=...
      // For now, we trust the provided provider_user_id (to be replaced with real validation).

      const tokenHash = hashToken(body.provider_token);

      // Check if this social account is already linked to an Atlas user
      const existingSocial = await findSocialAuthByProvider(body.provider, body.provider_user_id);

      if (existingSocial) {
        // Social account exists -- log in the linked user
        const user = await findUserById(existingSocial.user_id);
        if (!user) {
          return reply.code(404).send({
            error: {
              code: 'USER_NOT_FOUND',
              message: 'The linked user account no longer exists',
            },
          });
        }

        if (user.status !== 'active') {
          return reply.code(401).send({
            error: {
              code: 'ACCOUNT_INACTIVE',
              message: 'This account has been suspended or deleted',
            },
          });
        }

        // Update the social auth tokens
        await linkSocialAuth({
          user_id: user.user_id,
          provider: body.provider,
          provider_user_id: body.provider_user_id,
          email: body.email,
          display_name: body.display_name,
          avatar_url: body.avatar_url,
          access_token_hash: tokenHash,
        });

        // Create session and sign JWT
        const session = await createSession({
          user_id: user.user_id,
          expires_at: sessionExpiresAt(),
          ip: request.ip,
          user_agent: request.headers['user-agent'] ?? null,
        });

        const token = await signToken({
          sub: user.user_id,
          email: user.email,
          roles: [UserRole.Traveler],
          sid: session.session_id,
        });

        request.log.info(
          { userId: user.user_id, provider: body.provider },
          'Social sign-in (existing user)',
        );

        return reply.code(200).send({
          token,
          user: stripPasswordHash(user),
          is_new_user: false,
        });
      }

      // No existing social link -- check if the email is already registered
      let user;
      let isNewUser = false;

      if (body.email) {
        user = await findUserByEmail(body.email);
      }

      if (!user) {
        // Create a new Atlas user account for this social sign-in
        const displayName = body.display_name ?? body.email?.split('@')[0] ?? 'User';
        const randomPassword = createHash('sha256')
          .update(`${body.provider}-${body.provider_user_id}-${Date.now()}`)
          .digest('hex');

        const { user: newUser } = await createUserWithProfile({
          email: body.email ?? `${body.provider}_${body.provider_user_id}@atlas.internal`,
          password_hash: hashPassword(randomPassword),
          display_name: displayName,
        });

        user = newUser;
        isNewUser = true;
      }

      // Link social auth to the user
      await linkSocialAuth({
        user_id: user.user_id,
        provider: body.provider,
        provider_user_id: body.provider_user_id,
        email: body.email,
        display_name: body.display_name,
        avatar_url: body.avatar_url,
        access_token_hash: tokenHash,
      });

      // Create session and sign JWT
      const session = await createSession({
        user_id: user.user_id,
        expires_at: sessionExpiresAt(),
        ip: request.ip,
        user_agent: request.headers['user-agent'] ?? null,
      });

      const token = await signToken({
        sub: user.user_id,
        email: user.email,
        roles: [UserRole.Traveler],
        sid: session.session_id,
      });

      request.log.info(
        { userId: user.user_id, provider: body.provider, isNewUser },
        'Social sign-in',
      );

      return reply.code(isNewUser ? 201 : 200).send({
        token,
        user: stripPasswordHash(user),
        is_new_user: isNewUser,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: List Linked Social Providers
  // GET /api/v1/identity/auth/social/providers
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/identity/auth/social/providers',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const socialAuths = await findSocialAuth(user.sub);

      return reply.send({
        providers: socialAuths.map((sa: Record<string, unknown>) => ({
          provider: sa.provider,
          provider_user_id: sa.provider_user_id,
          email: sa.email,
          display_name: sa.display_name,
          avatar_url: sa.avatar_url,
          linked_at: sa.created_at,
        })),
        count: socialAuths.length,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Link Social Account
  // POST /api/v1/identity/auth/social/link
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/identity/auth/social/link',
    { preValidation: [validateBody(linkSocialBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as z.infer<typeof linkSocialBodySchema>;

      // Check if this social account is already linked to another user
      const existingSocial = await findSocialAuthByProvider(body.provider, body.provider_user_id);
      if (existingSocial && existingSocial.user_id !== user.sub) {
        return reply.code(409).send({
          error: {
            code: 'ALREADY_LINKED',
            message: 'This social account is already linked to a different Atlas account',
          },
        });
      }

      // Check if the user already has this provider linked
      const userSocial = await findSocialAuthByUserAndProvider(user.sub, body.provider);
      if (userSocial) {
        return reply.code(409).send({
          error: {
            code: 'PROVIDER_ALREADY_LINKED',
            message: `You already have a ${body.provider} account linked. Unlink it first to link a different one.`,
          },
        });
      }

      const tokenHash = hashToken(body.provider_token);

      const socialAuth = await linkSocialAuth({
        user_id: user.sub,
        provider: body.provider,
        provider_user_id: body.provider_user_id,
        email: body.email,
        display_name: body.display_name,
        avatar_url: body.avatar_url,
        access_token_hash: tokenHash,
      });

      request.log.info({ userId: user.sub, provider: body.provider }, 'Social account linked');

      return reply.code(201).send({
        provider: socialAuth.provider,
        provider_user_id: socialAuth.provider_user_id,
        email: socialAuth.email,
        display_name: socialAuth.display_name,
        linked_at: socialAuth.created_at,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Unlink Social Account
  // DELETE /api/v1/identity/auth/social/:provider
  // ────────────────────────────────────────────────────────────

  server.delete(
    '/api/v1/identity/auth/social/:provider',
    { preValidation: [validateParams(providerParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof providerParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { provider } = request.params as z.infer<typeof providerParamSchema>;

      // Verify the link exists
      const existing = await findSocialAuthByUserAndProvider(user.sub, provider);
      if (!existing) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: `No ${provider} account is linked to your account`,
          },
        });
      }

      // Check that the user has a password set or another social provider,
      // so they don't lock themselves out
      const allSocial = await findSocialAuth(user.sub);
      const atlasUser = await findUserById(user.sub);

      // A user with no password and only one social provider cannot unlink
      const hasPassword = atlasUser?.password_hash && !atlasUser.password_hash.startsWith('social-');
      const hasOtherProviders = allSocial.length > 1;

      if (!hasPassword && !hasOtherProviders) {
        return reply.code(409).send({
          error: {
            code: 'CANNOT_UNLINK',
            message: 'Cannot unlink your only sign-in method. Set a password first or link another provider.',
          },
        });
      }

      const deleted = await unlinkSocialAuth(user.sub, provider);
      if (!deleted) {
        return reply.code(500).send({
          error: {
            code: 'UNLINK_FAILED',
            message: 'Failed to unlink social account',
          },
        });
      }

      request.log.info({ userId: user.sub, provider }, 'Social account unlinked');

      return reply.code(204).send();
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  USER ROUTES (AUTHENTICATED)
  // ════════════════════════════════════════════════════════════════

  // ── GET /api/v1/users/me ─────────────────────────────────────────
  server.get(
    '/api/v1/users/me',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const row = await findUserWithProfile(user.sub);
      if (!row) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      // Separate user fields from profile fields
      const {
        password_hash,
        first_name,
        last_name,
        dob,
        home_place_id,
        preferences,
        travel_style_vector_id,
        profile_updated_at,
        ...userFields
      } = row;

      return reply.code(200).send({
        user: userFields,
        profile: {
          user_id: userFields.user_id,
          first_name,
          last_name,
          dob,
          home_place_id,
          preferences,
          travel_style_vector_id,
          updated_at: profile_updated_at,
        },
      });
    },
  );

  // ── PATCH /api/v1/users/me ───────────────────────────────────────
  server.patch(
    '/api/v1/users/me',
    { preValidation: [validateBody(updateProfileBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as z.infer<typeof updateProfileBodySchema>;

      // Build the fields to update on identity_profile
      const profileFields: Record<string, unknown> = {};

      // Handle display_name by splitting into first/last
      if (body.display_name !== undefined) {
        const nameParts = body.display_name.trim().split(/\s+/);
        profileFields.first_name = nameParts[0] ?? '';
        profileFields.last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null;
      }

      // Direct profile column mappings
      if (body.first_name !== undefined) profileFields.first_name = body.first_name;
      if (body.last_name !== undefined) profileFields.last_name = body.last_name;
      if (body.dob !== undefined) profileFields.dob = body.dob;

      // Store extra fields (bio, avatar_url, locale, timezone) in the preferences JSONB column
      const existingProfile = await findUserProfile(user.sub);
      const existingPreferences = existingProfile?.preferences ?? {};

      const preferencesUpdate: Record<string, unknown> = { ...existingPreferences };
      if (body.bio !== undefined) preferencesUpdate.bio = body.bio;
      if (body.avatar_url !== undefined) preferencesUpdate.avatar_url = body.avatar_url;
      if (body.locale !== undefined) preferencesUpdate.locale = body.locale;
      if (body.timezone !== undefined) preferencesUpdate.timezone = body.timezone;

      // Only include preferences in update if something changed
      const hasPreferencesChange = body.bio !== undefined ||
        body.avatar_url !== undefined ||
        body.locale !== undefined ||
        body.timezone !== undefined;

      if (hasPreferencesChange) {
        profileFields.preferences = preferencesUpdate;
      }

      // Check that there is something to update
      if (Object.keys(profileFields).length === 0) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'No valid fields provided for update',
          },
        });
      }

      const updatedProfile = await updateProfile(user.sub, profileFields);
      if (!updatedProfile) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'Profile not found' },
        });
      }

      request.log.info({ userId: user.sub }, 'Profile updated');

      return reply.code(200).send({ profile: updatedProfile });
    },
  );

  // ── GET /api/v1/users/:id ────────────────────────────────────────
  // Admin-only: get any user by ID
  server.get(
    '/api/v1/users/:id',
    {
      preValidation: [validateParams(userIdParamsSchema)],
      preHandler: [requireRole(UserRole.Admin)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const params = request.params as z.infer<typeof userIdParamsSchema>;

      const row = await findUserWithProfile(params.id);
      if (!row) {
        return reply.code(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      const {
        password_hash,
        first_name,
        last_name,
        dob,
        home_place_id,
        preferences,
        travel_style_vector_id,
        profile_updated_at,
        ...userFields
      } = row;

      return reply.code(200).send({
        user: userFields,
        profile: {
          user_id: userFields.user_id,
          first_name,
          last_name,
          dob,
          home_place_id,
          preferences,
          travel_style_vector_id,
          updated_at: profile_updated_at,
        },
      });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  SESSION ROUTES (AUTHENTICATED)
  // ════════════════════════════════════════════════════════════════

  // ── GET /api/v1/users/me/sessions ────────────────────────────────
  server.get(
    '/api/v1/users/me/sessions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const sessions = await findSessionsByUserId(user.sub);

      return reply.code(200).send({
        sessions,
        count: sessions.length,
      });
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  DEVICE MANAGEMENT ROUTES (AUTHENTICATED)
  // ════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Register Device
  // POST /api/v1/identity/devices
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/identity/devices',
    { preValidation: [validateBody(registerDeviceBodySchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const body = request.body as z.infer<typeof registerDeviceBodySchema>;

      const device = await registerDevice({
        user_id: user.sub,
        platform: body.platform,
        push_token: body.push_token,
        device_model: body.device_model,
        os_version: body.os_version,
        app_version: body.app_version,
      });

      request.log.info(
        { userId: user.sub, deviceId: device.device_id, platform: body.platform },
        'Device registered',
      );

      return reply.code(201).send(device);
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: List User's Devices
  // GET /api/v1/identity/devices
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/identity/devices',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const devices = await findDevicesByUser(user.sub);

      return reply.send({
        data: devices,
        count: devices.length,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Update Device Push Token
  // PATCH /api/v1/identity/devices/:deviceId
  // ────────────────────────────────────────────────────────────

  server.patch(
    '/api/v1/identity/devices/:deviceId',
    {
      preValidation: [
        validateParams(deviceIdParamSchema),
        validateBody(updateDeviceBodySchema),
      ],
    },
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof deviceIdParamSchema>;
        Body: z.infer<typeof updateDeviceBodySchema>;
      }>,
      reply: FastifyReply,
    ) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { deviceId } = request.params as z.infer<typeof deviceIdParamSchema>;
      const body = request.body as z.infer<typeof updateDeviceBodySchema>;

      // Verify the device exists and belongs to the user
      const existing = await findDeviceById(deviceId);
      if (!existing || existing.user_id !== user.sub) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Device not found',
          },
        });
      }

      if (!existing.is_active) {
        return reply.code(409).send({
          error: {
            code: 'DEVICE_INACTIVE',
            message: 'Cannot update an inactive device',
          },
        });
      }

      if (!body.push_token && !body.app_version && !body.os_version) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one field (push_token, app_version, os_version) must be provided',
          },
        });
      }

      const updated = await updateDeviceToken(deviceId, user.sub, {
        push_token: body.push_token,
        app_version: body.app_version,
        os_version: body.os_version,
      });

      request.log.info({ userId: user.sub, deviceId }, 'Device updated');

      return reply.send(updated);
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Deactivate Device
  // DELETE /api/v1/identity/devices/:deviceId
  // ────────────────────────────────────────────────────────────

  server.delete(
    '/api/v1/identity/devices/:deviceId',
    { preValidation: [validateParams(deviceIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof deviceIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { deviceId } = request.params as z.infer<typeof deviceIdParamSchema>;

      // Verify the device exists and belongs to the user
      const existing = await findDeviceById(deviceId);
      if (!existing || existing.user_id !== user.sub) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Device not found',
          },
        });
      }

      if (!existing.is_active) {
        return reply.code(409).send({
          error: {
            code: 'ALREADY_INACTIVE',
            message: 'Device is already inactive',
          },
        });
      }

      await deactivateDevice(deviceId, user.sub);

      request.log.info({ userId: user.sub, deviceId }, 'Device deactivated');

      return reply.code(204).send();
    },
  );

  // ════════════════════════════════════════════════════════════════
  //  OFFLINE DATA ROUTES (AUTHENTICATED)
  // ════════════════════════════════════════════════════════════════

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: List Available Offline Packs
  // GET /api/v1/identity/offline/packs
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/identity/offline/packs',
    { preValidation: [validateQuery(offlinePacksQuerySchema)] },
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof offlinePacksQuerySchema> }>,
      reply: FastifyReply,
    ) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const queryParams = request.query as z.infer<typeof offlinePacksQuerySchema>;

      const packs = await findOfflinePacks(queryParams.destination_id);

      return reply.send({
        data: packs,
        count: packs.length,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Get Pack Details + Download URL
  // GET /api/v1/identity/offline/packs/:packId
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/identity/offline/packs/:packId',
    { preValidation: [validateParams(packIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof packIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { packId } = request.params as z.infer<typeof packIdParamSchema>;

      const pack = await findOfflinePackById(packId);
      if (!pack) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Offline pack not found',
          },
        });
      }

      return reply.send(pack);
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: List User's Downloaded Packs
  // GET /api/v1/identity/offline/downloads
  // ────────────────────────────────────────────────────────────

  server.get(
    '/api/v1/identity/offline/downloads',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const downloads = await getUserOfflineDownloads(user.sub);

      // Annotate each download with whether an update is available
      const annotated = downloads.map((d: Record<string, unknown>) => ({
        ...d,
        update_available: (d.latest_version as number) > (d.downloaded_version as number),
      }));

      return reply.send({
        data: annotated,
        count: annotated.length,
      });
    },
  );

  // ────────────────────────────────────────────────────────────
  // AUTHENTICATED: Record Offline Download
  // POST /api/v1/identity/offline/downloads/:packId
  // ────────────────────────────────────────────────────────────

  server.post(
    '/api/v1/identity/offline/downloads/:packId',
    { preValidation: [validateParams(packIdParamSchema)] },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof packIdParamSchema> }>,
      reply: FastifyReply,
    ) => {
      const user = request.user;
      if (!user) {
        return reply.code(401).send({
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        });
      }

      const { packId } = request.params as z.infer<typeof packIdParamSchema>;

      // Verify the pack exists
      const pack = await findOfflinePackById(packId);
      if (!pack) {
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Offline pack not found',
          },
        });
      }

      const download = await recordOfflineDownload(user.sub, packId, pack.version);

      request.log.info(
        { userId: user.sub, packId, version: pack.version },
        'Offline download recorded',
      );

      return reply.code(201).send({
        ...download,
        pack_name: pack.name,
        data_url: pack.data_url,
      });
    },
  );
}
