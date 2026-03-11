/**
 * Fastify preHandler hook that requires the user to have a specific role.
 */
export function requireRole(role) {
    return async (request, reply) => {
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
export function requireAnyRole(...roles) {
    return async (request, reply) => {
        if (!request.user) {
            reply.code(401).send({
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
            });
            return;
        }
        const hasRole = roles.some((role) => request.user.roles.includes(role));
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
//# sourceMappingURL=rbac.js.map