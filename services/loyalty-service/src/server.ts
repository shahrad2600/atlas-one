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
  await server.register(createAuthPlugin, {
    publicRoutes: ['/health', '/ready', '/api/v1/loyalty/status'],
    publicPrefixes: ['/api/v1/loyalty/public/'],
  });

  // ── Request ID propagation ─────────────────────────────────────
  server.addHook('onRequest', async (request, _reply) => {
    const traceId = request.headers['x-trace-id'] ?? request.id;
    request.headers['x-trace-id'] = traceId as string;
  });

  // ── Global error handler ───────────────────────────────────────
  server.setErrorHandler(async (error, request, reply) => {
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
      service: 'loyalty-service',
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
