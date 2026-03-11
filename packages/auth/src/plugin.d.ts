import type { FastifyInstance } from 'fastify';
export interface AuthPluginOptions {
    /** Routes that skip authentication (e.g., ['/health', '/ready']) */
    publicRoutes?: string[];
    /** Route prefixes that skip authentication (e.g., ['/public/']) */
    publicPrefixes?: string[];
}
declare function authPlugin(fastify: FastifyInstance, options: AuthPluginOptions): Promise<void>;
export declare const createAuthPlugin: typeof authPlugin;
export {};
//# sourceMappingURL=plugin.d.ts.map