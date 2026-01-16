// Authentication middleware using hono/jwt
import { createMiddleware } from 'hono/factory';
import { jwt, verify } from 'hono/jwt';
import type { Context, Next } from 'hono';
import type { Env, JWTPayload } from '../types';

// JWT secret (should be set in environment)
const DEFAULT_JWT_SECRET = '0qSaPnw3Osn8nC0QPhg0wsgHT0UGS5gO';

/**
 * Get JWT secret from environment or use default
 */
export function getJwtSecret(env: Env): string {
    return env.JWT_SECRET || DEFAULT_JWT_SECRET;
}

/**
 * Create JWT middleware for protected routes
 */
export function authMiddleware(env: Env) {
    return jwt({ secret: getJwtSecret(env) });
}

/**
 * Middleware to extract user info from JWT payload
 */
export const extractUser = createMiddleware(async (c: Context, next: Next) => {
    const payload = c.get('jwtPayload') as JWTPayload;
    if (payload) {
        c.set('userId', payload.sub);
        c.set('username', payload.username);
    }
    await next();
});

/**
 * JWT 验证结果
 */
export interface JWTVerifyResult {
    valid: true;
    payload: JWTPayload;
    expiresAt: number;
}

export interface JWTVerifyError {
    valid: false;
    error: string;
}

export type JWTVerifyResponse = JWTVerifyResult | JWTVerifyError;

/**
 * 验证 JWT Token（用于 WebSocket 等非 HTTP 中间件场景）
 */
export async function verifyJwt(token: string, env: Env): Promise<JWTVerifyResponse> {
    try {
        const secret = getJwtSecret(env);
        const decoded = await verify(token, secret);
        const payload = decoded as unknown as JWTPayload;

        // 检查是否过期
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now) {
            return { valid: false, error: 'Token expired' };
        }

        // 验证必要字段
        if (!payload.sub || !payload.username) {
            return { valid: false, error: 'Invalid token payload' };
        }

        return {
            valid: true,
            payload,
            expiresAt: payload.exp,
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Token verification failed';
        return { valid: false, error: message };
    }
}
