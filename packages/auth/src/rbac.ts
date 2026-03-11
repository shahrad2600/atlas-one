import type { FastifyRequest, FastifyReply } from 'fastify';
import type { UserRole } from '@atlas/shared-types';

/**
 * Fastify preHandler hook that requires the user to have a specific role.
 */
export function requireRole(role: UserRole) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      reply.code(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (!request.user.roles.includes(role)) {
      reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: `Role '${role}' is required to access this resource`,
        },
      });
    }
  };
}

/**
 * Fastify preHandler hook that requires the user to have at least one of the specified roles.
 */
export function requireAnyRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      reply.code(401).send({
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    const hasRole = roles.some((role) => request.user!.roles.includes(role));
    if (!hasRole) {
      reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: `One of roles [${roles.join(', ')}] is required to access this resource`,
        },
      });
    }
  };
}
