import Fastify from 'fastify';
import cors from '@fastify/cors';
import { createAuthPlugin } from '@atlas/auth';
import { healthCheck, getPool } from '@atlas/database';
import { registerRoutes } from './routes/index.js';
import { getConversationManager } from './conversation.js';

export async function buildServer() {
  const server = Fastify({
    logger: {
      level: process.env['LOG_LEVEL'] ?? 'info',
      transport: process.env['NODE_ENV'] !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    requestTimeout: 60_000, // AI calls can be slow
    bodyLimit: 2_097_152,   // 2MB for chat payloads
  });

  // ── CORS ───────────────────────────────────────────────────────
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
    publicRoutes: ['/health', '/ready', '/api/v1/ai/status'],
  });

  // ── Request ID propagation ─────────────────────────────────────
  server.addHook('onRequest', async (request, _reply) => {
    const traceId = request.headers['x-trace-id'] ?? request.id;
    request.headers['x-trace-id'] = traceId as string;
  });

  // ── Global error handler ───────────────────────────────────────
  server.setErrorHandler(async (error: Record<string, unknown> & Error, request, reply) => {
    const statusCode = (error.statusCode as number) ?? 500;
    if (statusCode >= 500) {
      request.log.error({ err: error }, 'Internal server error');
    } else {
      request.log.warn({ err: error }, 'Client error');
    }
    reply.code(statusCode).send({
      error: {
        code: (error.code as string) ?? 'INTERNAL_ERROR',
        message: statusCode >= 500 ? 'Internal server error' : error.message,
        ...(process.env['NODE_ENV'] !== 'production' && { stack: error.stack as string }),
      },
    });
  });

  // ── Not found handler ──────────────────────────────────────────
  server.setNotFoundHandler(async (_request, reply) => {
    reply.code(404).send({
      error: { code: 'NOT_FOUND', message: 'The requested resource was not found' },
    });
  });

  // ── AI Orchestrator Routes ─────────────────────────────────────
  await registerRoutes(server);

  // ── AI Orchestrator status route ───────────────────────────────
  server.get('/api/v1/ai/status', async () => {
    const convStats = getConversationManager().stats();
    return {
      service: 'ai-orchestrator',
      agents: ['orchestrator', 'dining', 'stay', 'flight', 'budget', 'risk', 'support', 'experiences'],
      tools: 11,
      validators: 4,
      conversations: convStats,
    };
  });

  // ── Health check ───────────────────────────────────────────────
  server.get('/health', async () => {
    const pool = getPool();
    const dbHealth = await healthCheck(pool);
    return {
      status: dbHealth.ok ? ('ok' as const) : ('degraded' as const),
      service: 'ai-orchestrator',
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
