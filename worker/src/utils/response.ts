// Unified API Response Utilities
import { Context } from 'hono';

/**
 * Standard API Response Format
 */
export interface ApiResponse<T = unknown> {
    code: number;
    message: string;
    data: T | null;
}

/**
 * Common HTTP status codes
 */
export const HttpStatus = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    PAYLOAD_TOO_LARGE: 413,
    INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Success response helper
 * @param c - Hono Context
 * @param data - Response data
 */
export function success<T>(
    c: Context,
    data: T
) {
    const response: ApiResponse<T> = {
        code: HttpStatus.OK,
        message: 'success',
        data,
    };
    return c.json(response, HttpStatus.OK);
}

/**
 * Error response helper
 * @param c - Hono Context
 * @param message - Error message
 * @param code - HTTP status code (default: 400)
 */
export function error(
    c: Context,
    message: string,
    code: number = HttpStatus.BAD_REQUEST
) {
    const response: ApiResponse<null> = {
        code,
        message,
        data: null,
    };
    return c.json(response, code as any);
}

/**
 * Common error responses
 */
export const errors = {
    badRequest: (c: Context, message: string = 'Bad request') =>
        error(c, message, HttpStatus.BAD_REQUEST),

    unauthorized: (c: Context, message: string = 'Unauthorized') =>
        error(c, message, HttpStatus.UNAUTHORIZED),

    forbidden: (c: Context, message: string = 'Forbidden') =>
        error(c, message, HttpStatus.FORBIDDEN),

    notFound: (c: Context, message: string = 'Not found') =>
        error(c, message, HttpStatus.NOT_FOUND),

    conflict: (c: Context, message: string = 'Conflict') =>
        error(c, message, HttpStatus.CONFLICT),

    payloadTooLarge: (c: Context, message: string = 'Payload too large') =>
        error(c, message, HttpStatus.PAYLOAD_TOO_LARGE),

    internal: (c: Context, message: string = 'Internal server error') =>
        error(c, message, HttpStatus.INTERNAL_SERVER_ERROR),
};
