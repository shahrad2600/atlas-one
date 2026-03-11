import type { TokenPayload } from './types.js';
import type { UserRole } from '@atlas/shared-types';
export declare function signToken(payload: {
    sub: string;
    email: string;
    roles: UserRole[];
    sid: string;
    tid?: string;
}, options?: {
    expiresIn?: string;
}): Promise<string>;
export declare function signRefreshToken(payload: {
    sub: string;
    sid: string;
}): Promise<string>;
export declare function verifyToken(token: string): Promise<TokenPayload>;
export { type TokenPayload };
//# sourceMappingURL=jwt.d.ts.map