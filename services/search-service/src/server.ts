import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createAuthPlugin } from '@atlas/auth';
import { registerRoutes } from './routes/index.js';
import { healthCheck } from '@atlas/database';
import { getPool } from '@atlas/database';

export async function buildServer() {
  const server = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
      transport: process.env['NODE_ENV'] !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    requestTimeout: 30_000,
    bodyLimit: 1_048_576, // 1MB
  });

  // ── CORS (restricted to known origins) ─────────────────────────
  await server.register(cors, {
    origin: process.env['CORS_ORIGIN']?.split(',') ?? [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Trace-Id'],
  });

  // ── Authentication ─────────────────────────────────────────────
  // Most search endpoints are public. Only /api/v1/search/recent
  // requires a valid JWT (the auth plugin will enforce 401 there).
  // The base /api/v1/search route uses query strings so it must be
  // listed as a prefix (request.url includes ?q=...).
  await server.register(createAuthPlugin, {
    publicRoutes: [
      '/health',
      '/ready',
      '/api/v1/search',
      '/api/v1/search/status',
      '/api/v1/search/filters',
    ],
    publicPrefixes: [
      '/api/v1/search/autocomplete',
      '/api/v1/search/nearby',
      '/api/v1/search/facets',
      '/api/v1/search/trending',
      '/api/v1/search/filters',
      '/api/v1/search/status',
      '/api/v1/search?',   // base search with query string params
      '/api/v1/search/semantic',
      '/api/v1/search/hybrid',
      '/api/v1/search/similar',
      '/api/v1/search/index',
    ],
  });

  // ── Request ID propagation ─────────────────────────────────────
  server.addHook('onRequest', async (request, _reply) => {
    const traceId = request.headers['x-trace-id'] ?? request.id;
    request.headers['x-trace-id'] = traceId as string;
  });

  // ── Global error handler ───────────────────────────────────────
  server.setErrorHandler(async (error: Error & { statusCode?: number; code?: string }, request, reply) => {
    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Internal server error');
    } else {
      request.log.warn({ err: error }, 'Client error');
    }

    reply.code(statusCode).send({
      error: {
        code: error.code ?? 'INTERNAL_ERROR',
        message: statusCode >= 500 ? 'Internal server error' : error.message,
        ...(process.env['NODE_ENV'] !== 'production' && { stack: error.stack }),
      },
    });
  });

  // ── Not found handler ──────────────────────────────────────────
  server.setNotFoundHandler(async (_request, reply) => {
    reply.code(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    });
  });

  // ── Routes ─────────────────────────────────────────────────────
  await registerRoutes(server);

  // ── Health check ───────────────────────────────────────────────
  server.get('/health', async () => {
    const pool = getPool();
    const dbHealth = await healthCheck(pool);
    return {
      status: dbHealth.ok ? ('ok' as const) : ('degraded' as const),
      service: 'search-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealth,
    };
  });

  // ── Readiness check ────────────────────────────────────────────
  server.get('/ready', async (_request, reply) => {
    const pool = getPool();
    const dbHealth = await healthCheck(pool);
    if (!dbHealth.ok) {
      reply.code(503).send({ status: 'not_ready', reason: 'database_unavailable' });
      return;
    }
    return { status: 'ready' };
  });

  return server;
}
