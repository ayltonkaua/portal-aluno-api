/**
 * Rate Limiting Middleware
 * 
 * Simple in-memory rate limiter (for production, use Redis)
 */

import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;    // 100 requests per minute

/**
 * Rate limiting middleware by IP or user
 */
export function rateLimitMiddleware(c: Context, next: Next) {
    // Use auth context if available, otherwise IP
    const auth = c.get('auth');
    const identifier = auth?.alunoId || c.req.header('x-forwarded-for') || 'anonymous';

    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    if (!entry || now > entry.resetTime) {
        // New window
        rateLimitStore.set(identifier, {
            count: 1,
            resetTime: now + WINDOW_MS,
        });
        return next();
    }

    if (entry.count >= MAX_REQUESTS) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        c.header('Retry-After', String(retryAfter));
        throw new HTTPException(429, {
            message: `Muitas requisições. Tente novamente em ${retryAfter} segundos.`
        });
    }

    entry.count++;
    return next();
}

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);
