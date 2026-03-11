import * as jose from 'jose';
// ─── Configuration ──────────────────────────────────────────────────
function getJwtSecret() {
    const secret = process.env['JWT_SECRET'];
    if (!secret || secret === 'CHANGE_ME_TO_A_RANDOM_64_CHAR_STRING') {
        if (process.env['NODE_ENV'] === 'production') {
            throw new Error('JWT_SECRET must be set to a secure random value in production');
        }
        // Dev-only fallback
        return new TextEncoder().encode('atlas-dev-jwt-secret-not-for-production-use-change-me');
    }
    return new TextEncoder().encode(secret);
}
const ISSUER = process.env['JWT_ISSUER'] ?? 'atlas-one';
const ACCESS_TOKEN_TTL = process.env['JWT_ACCESS_TOKEN_EXPIRES_IN'] ?? '15m';
const REFRESH_TOKEN_TTL = process.env['JWT_REFRESH_TOKEN_EXPIRES_IN'] ?? '7d';
// ─── Token Operations ───────────────────────────────────────────────
export async function signToken(payload, options) {
    const secret = getJwtSecret();
    return new jose.SignJWT({
        email: payload.email,
        roles: payload.roles,
        sid: payload.sid,
        tid: payload.tid,
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(payload.sub)
        .setIssuer(ISSUER)
        .setIssuedAt()
        .setExpirationTime(options?.expiresIn ?? ACCESS_TOKEN_TTL)
        .sign(secret);
}
export async function signRefreshToken(payload) {
    const secret = getJwtSecret();
    return new jose.SignJWT({ sid: payload.sid })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(payload.sub)
        .setIssuer(ISSUER)
        .setIssuedAt()
        .setExpirationTime(REFRESH_TOKEN_TTL)
        .sign(secret);
}
export async function verifyToken(token) {
    const secret = getJwtSecret();
    const { payload } = await jose.jwtVerify(token, secret, {
        issuer: ISSUER,
    });
    return {
        sub: payload.sub,
        email: payload['email'],
        roles: payload['roles'],
        sid: payload['sid'],
        tid: payload['tid'],
        iat: payload.iat,
        exp: payload.exp,
        iss: payload.iss,
    };
}
export {};
//# sourceMappingURL=jwt.js.map