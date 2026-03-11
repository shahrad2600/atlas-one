import pg from 'pg';
declare const Pool: typeof import("pg").Pool;
type Pool = pg.Pool;
type PoolConfig = pg.PoolConfig;
type PoolClient = pg.PoolClient;
type QueryResult = pg.QueryResult;
export declare function createPool(config?: PoolConfig): Pool;
export declare function getPool(): Pool;
export declare function closePool(): Promise<void>;
export declare function query(pool: Pool, text: string, params?: unknown[]): Promise<QueryResult>;
export declare function transaction<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T>;
export declare function healthCheck(pool: Pool): Promise<{
    ok: boolean;
    totalCount: number;
    idleCount: number;
    waitingCount: number;
    latencyMs: number;
}>;
export type { Pool, PoolConfig, PoolClient, QueryResult };
//# sourceMappingURL=index.d.ts.map