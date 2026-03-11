import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UserRole } from '@atlas/shared-types';
/**
 * Fastify preHandler hook that requires the user to have a specific role.
 */
export declare function requireRole(role: UserRole): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
/**
 * Fastify preHandler hook that requires the user to have at least one of the specified roles.
 */
export declare function requireAnyRole(...roles: UserRole[]): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
//# sourceMappingURL=rbac.d.ts.map