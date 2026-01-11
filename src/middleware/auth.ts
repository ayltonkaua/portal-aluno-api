/**
 * Authentication Middleware
 * 
 * Verifies JWT token and attaches user context to request.
 */

import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { verifyToken, extractBearerToken } from '../lib/jwt.js';
import { supabase } from '../lib/supabase.js';
import type { AuthContext } from '../types/index.js';

// Extend Hono context with auth
declare module 'hono' {
    interface ContextVariableMap {
        auth: AuthContext;
    }
}

/**
 * Middleware that validates JWT and loads student info
 */
export async function authMiddleware(c: Context, next: Next) {
    const authHeader = c.req.header('Authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
        throw new HTTPException(401, { message: 'Token não fornecido' });
    }

    try {
        // Verify JWT
        const payload = verifyToken(token);

        // Get aluno_id from database using user_id
        const { data: aluno, error } = await supabase
            .from('alunos')
            .select('id, escola_id')
            .eq('user_id', payload.sub)
            .single();

        if (error || !aluno) {
            throw new HTTPException(403, { message: 'Usuário não é um aluno cadastrado' });
        }

        // Set auth context
        const authContext: AuthContext = {
            userId: payload.sub,
            alunoId: aluno.id,
            escolaId: aluno.escola_id,
            email: payload.email,
        };

        c.set('auth', authContext);
        await next();
    } catch (error) {
        if (error instanceof HTTPException) throw error;
        throw new HTTPException(401, { message: 'Token inválido ou expirado' });
    }
}
