import fp from 'fastify-plugin';
import { verifyToken } from './jwt.js';
async function authPlugin(fastify, options) {
    const publicRoutes = new Set([
        '/health',
        '/ready',
        ...(options.publicRoutes ?? []),
    ]);
    const publicPrefixes = options.publicPrefixes ?? [];
    fastify.decorateRequest('user', undefined);
    fastify.addHook('onRequest', async (request, reply) => {
        // Skip auth for public routes
        if (publicRoutes.has(request.url))
            return;
        if (publicPrefixes.some((prefix) => request.url.startsWith(prefix)))
            return;
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
            const payload = await verifyToken(token);
            request.user = payload;
        }
        catch (err) {
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
//# sourceMappingURL=plugin.js.map