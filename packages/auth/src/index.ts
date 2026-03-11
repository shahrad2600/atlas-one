/**
 * Atlas One — Authentication & Authorization Package
 *
 * Provides JWT-based auth middleware for Fastify services.
 * Uses the `jose` library for JWT verification (no native crypto dependency issues).
 */

export { createAuthPlugin, type AuthPluginOptions } from './plugin.js';
export { verifyToken, signToken, type TokenPayload } from './jwt.js';
export { requireRole, requireAnyRole } from './rbac.js';
export { type AuthenticatedRequest } from './types.js';
