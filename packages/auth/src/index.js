/**
 * Atlas One — Authentication & Authorization Package
 *
 * Provides JWT-based auth middleware for Fastify services.
 * Uses the `jose` library for JWT verification (no native crypto dependency issues).
 */
export { createAuthPlugin } from './plugin.js';
export { verifyToken, signToken } from './jwt.js';
export { requireRole, requireAnyRole } from './rbac.js';
export {} from './types.js';
//# sourceMappingURL=index.js.map