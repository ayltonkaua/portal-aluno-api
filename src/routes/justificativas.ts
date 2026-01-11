/**
 * Justificativas Routes (/justificativas)
 * 
 * Endpoints for absence justifications.
 */

import { Hono } from 'hono';
import { justificativasService } from '../services/justificativas.service.js';
import type { AuthContext, ApiResponse, Justificativa } from '../types/index.js';

const justificativas = new Hono<{ Variables: { auth: AuthContext } }>();

/**
 * GET /justificativas - Get student's justifications
 */
justificativas.get('/', async (c) => {
    const auth = c.get('auth');
    const data = await justificativasService.getJustificativas(auth.alunoId, auth.escolaId);

    return c.json<ApiResponse<Justificativa[]>>({
        success: true,
        data,
    });
});

/**
 * POST /justificativas - Submit a new justification
 */
justificativas.post('/', async (c) => {
    const auth = c.get('auth');
    const body = await c.req.json();

    // Validate required fields
    if (!body.presenca_id || !body.motivo) {
        return c.json<ApiResponse<null>>({
            success: false,
            error: 'Campos obrigatórios: presenca_id, motivo',
        }, 400);
    }

    // Validate motivo length
    const motivo = String(body.motivo).trim();
    if (motivo.length < 10) {
        return c.json<ApiResponse<null>>({
            success: false,
            error: 'O motivo deve ter pelo menos 10 caracteres',
        }, 400);
    }

    try {
        const data = await justificativasService.createJustificativa(auth.alunoId, auth.escolaId, {
            presenca_id: body.presenca_id,
            motivo,
        });

        return c.json<ApiResponse<Justificativa>>({
            success: true,
            data,
            message: 'Justificativa enviada com sucesso',
        }, 201);
    } catch (error) {
        if (error instanceof Error && error.message.includes('não encontrada')) {
            return c.json<ApiResponse<null>>({
                success: false,
                error: error.message,
            }, 404);
        }
        throw error;
    }
});

export { justificativas };
