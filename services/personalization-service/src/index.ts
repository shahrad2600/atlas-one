import { buildServer } from './server.js';
import { closePool } from '@atlas/database';

const SERVICE_NAME = 'personalization-service';
const DEFAULT_PORT = 4024;

const PORT = Number(process.env['PORT'] ?? DEFAULT_PORT);

async function main(): Promise<void> {
  const server = await buildServer();

  // ── Graceful shutdown ────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.info(`[${SERVICE_NAME}] Received ${signal}, shutting down gracefully...`);
    try {
      await server.close();
      await closePool();
      console.info(`[${SERVICE_NAME}] Shutdown complete`);
      process.exit(0);
    } catch (err) {
      console.error(`[${SERVICE_NAME}] Error during shutdown:`, err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  // ── Handle unhandled rejections ──────────────────────────────
  process.on('unhandledRejection', (reason) => {
    console.error(`[${SERVICE_NAME}] Unhandled rejection:`, reason);
  });

  process.on('uncaughtException', (err) => {
    console.error(`[${SERVICE_NAME}] Uncaught exception:`, err);
    void shutdown('uncaughtException');
  });

  // ── Start server ─────────────────────────────────────────────
  await server.listen({ port: PORT, host: '0.0.0.0' });
  console.info(`[${SERVICE_NAME}] listening on port ${String(PORT)}`);
}

main().catch((err) => {
  console.error(`[${SERVICE_NAME}] Fatal startup error:`, err);
  process.exit(1);
});
