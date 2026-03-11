import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { verifyToken } from './jwt.js';
import type { TokenPayload } from './types.js';

export interface AuthPluginOptions {
  /** Routes that skip authentication (e.g., ['/health', '/ready']) */
  publicRoutes?: string[];
  /** Route prefixes that skip authentication (e.g., ['/public/']) */
  publicPrefixes?: string[];
}

async function authPlugin(
  fastify: FastifyInstance,
  options: AuthPluginOptions,
): Promise<void> {
  const publicRoutes = new Set([
    '/health',
    '/ready',
    ...(options.publicRoutes ?? []),
  ]);

  const publicPrefixes = options.publicPrefixes ?? [];

  fastify.decorateRequest('user', undefined);

  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for public routes
    if (publicRoutes.has(request.url)) return;
    if (publicPrefixes.some((prefix) => request.url.startsWith(prefix))) return;

    // Extract bearer token
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header',
        },
      });
      return;
    }

    const token = authHeader.slice(7);

    try {
      const payload: TokenPayload = await verifyToken(token);
      request.user = payload;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid token';
      reply.code(401).send({
        error: {
          code: 'INVALID_TOKEN',
          message,
        },
      });
    }
  });
}

export const createAuthPlugin = fp(authPlugin, {
  name: '@atlas/auth',
  fastify: '5.x',
});
