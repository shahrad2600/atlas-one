import { config } from 'dotenv';
import { resolve } from 'path';
import pg from 'pg';
// ─── Load .env from monorepo root ───────────────────────────────────
// Services run from their own directory (services/xxx/), so we try
// both CWD and ../../ to find the root .env file.
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../../.env') });
const { Pool } = pg;
// ─── Configuration ──────────────────────────────────────────────────
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
}
function getPoolConfig() {
    // Prefer DATABASE_URL if available (Heroku, Railway, etc.)
    const connectionString = process.env['DATABASE_URL'];
    if (connectionString) {
        return {
            connectionString,
            max: Number(process.env['DATABASE_POOL_MAX'] ?? 6),
            min: Number(process.env['DATABASE_POOL_MIN'] ?? 1),
            idleTimeoutMillis: 30_000,
            connectionTimeoutMillis: 5_000,
            statement_timeout: 30_000,
            // In production with DATABASE_URL, enable SSL
            ssl: process.env['NODE_ENV'] === 'production'
                ? { rejectUnauthorized: false }
                : undefined,
        };
    }
    return {
        host: process.env['DATABASE_HOST'] ?? 'localhost',
        port: Number(process.env['DATABASE_PORT'] ?? 5432),
        database: process.env['DATABASE_NAME'] ?? 'atlas_dev',
        user: process.env['DATABASE_USER'] ?? 'atlas',
        // NEVER hardcode passwords — require it or fail clearly in non-dev
        password: process.env['DATABASE_PASSWORD'] ?? (process.env['NODE_ENV'] === 'production'
            ? requireEnv('DATABASE_PASSWORD')
            : 'atlas_secret'),
        // Keep pool small per service — 14 services × 6 = 84 connections max
        max: Number(process.env['DATABASE_POOL_MAX'] ?? 6),
        min: Number(process.env['DATABASE_POOL_MIN'] ?? 1),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
        statement_timeout: 30_000,
    };
}
// ─── Pool Factory ───────────────────────────────────────────────────
let _pool = null;
export function createPool(config) {
    const pool = new Pool({
        ...getPoolConfig(),
        ...config,
    });
    // Handle pool-level errors to prevent process crash
    pool.on('error', (err) => {
        console.error('[DATABASE] Unexpected pool error:', err.message);
    });
    // Log pool connections in development
    pool.on('connect', () => {
        if (process.env['NODE_ENV'] !== 'production') {
            console.debug('[DATABASE] New client connected to pool');
        }
    });
    return pool;
}
export function getPool() {
    if (!_pool) {
        _pool = createPool();
    }
    return _pool;
}
// ─── Graceful Shutdown ──────────────────────────────────────────────
export async function closePool() {
    if (_pool) {
        await _pool.end();
        _pool = null;
        console.info('[DATABASE] Connection pool closed');
    }
}
// ─── Query Helpers ──────────────────────────────────────────────────
export async function query(pool, text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env['LOG_LEVEL'] === 'debug') {
        console.debug('[DATABASE] Query executed', {
            text: text.substring(0, 100),
            duration: `${String(duration)}ms`,
            rows: result.rowCount,
        });
    }
    return result;
}
// ─── Transaction Helper ─────────────────────────────────────────────
export async function transaction(pool, fn) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    }
    catch (err) {
        await client.query('ROLLBACK');
        throw err;
    }
    finally {
        client.release();
    }
}
// ─── Health Check ───────────────────────────────────────────────────
export async function healthCheck(pool) {
    const start = Date.now();
    try {
        await pool.query('SELECT 1');
        return {
            ok: true,
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
            latencyMs: Date.now() - start,
        };
    }
    catch {
        return {
            ok: false,
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount,
            latencyMs: Date.now() - start,
        };
    }
}
//# sourceMappingURL=index.js.map