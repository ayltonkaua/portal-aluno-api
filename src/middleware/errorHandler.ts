/**
 * Error Handler Middleware
 * 
 * Standardizes error responses across the API.
 */

import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';

export interface ErrorResponse {
    success: false;
    error: string;
    code?: string;
    details?: unknown;
}

/**
 * Custom error handler for Hono
 */
export function errorHandler(err: Error, c: Context): Response {
    console.error('[API Error]', err);

    // HTTP Exceptions (controlled errors)
    if (err instanceof HTTPException) {
        return c.json<ErrorResponse>({
            success: false,
            error: err.message,
            code: `HTTP_${err.status}`,
        }, err.status);
    }

    // Supabase errors
    if ('code' in err && typeof (err as any).code === 'string') {
        const supabaseError = err as any;

        // Common Supabase error codes
        const errorMap: Record<string, { status: number; message: string }> = {
            'PGRST116': { status: 404, message: 'Registro não encontrado' },
            '23505': { status: 409, message: 'Registro duplicado' },
            '23503': { status: 400, message: 'Referência inválida' },
            '42501': { status: 403, message: 'Sem permissão para esta operação' },
        };

        const mapped = errorMap[supabaseError.code];
        if (mapped) {
            return c.json<ErrorResponse>({
                success: false,
                error: mapped.message,
                code: supabaseError.code,
            }, mapped.status as 400 | 403 | 404 | 409);
        }
    }

    // Generic server error
    return c.json<ErrorResponse>({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Erro interno do servidor'
            : err.message,
        code: 'INTERNAL_ERROR',
    }, 500);
}
