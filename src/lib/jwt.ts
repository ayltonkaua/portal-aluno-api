/**
 * JWT Helper Functions
 * 
 * Utilities for verifying and decoding Supabase JWT tokens.
 */

import jwt from 'jsonwebtoken';

export interface JWTPayload {
    sub: string;           // user_id
    email: string;
    role: string;
    aud: string;
    exp: number;
    iat: number;
}

/**
 * Verifies and decodes a Supabase JWT token
 */
export function verifyToken(token: string): JWTPayload {
    const secret = process.env.SUPABASE_JWT_SECRET;

    if (!secret) {
        throw new Error('Missing SUPABASE_JWT_SECRET environment variable');
    }

    try {
        const decoded = jwt.verify(token, secret) as unknown as JWTPayload;
        return decoded;
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}

/**
 * Extracts the bearer token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return null;
    }

    return parts[1];
}
