import type { FastifyRequest } from 'fastify';
import type { UserRole } from '@atlas/shared-types';
export interface TokenPayload {
    /** User UUID */
    sub: string;
    /** User email */
    email: string;
    /** User roles */
    roles: UserRole[];
    /** Session ID */
    sid: string;
    /** Tenant ID (multi-tenant) */
    tid?: string;
    /** Issued at (Unix timestamp) */
    iat: number;
    /** Expires at (Unix timestamp) */
    exp: number;
    /** Issuer */
    iss: string;
}
export interface AuthenticatedRequest extends FastifyRequest {
    user: TokenPayload;
}
declare module 'fastify' {
    interface FastifyRequest {
        user?: TokenPayload;
    }
}
//# sourceMappingURL=types.d.ts.map