/**
 * Atestados Routes (/atestados)
 * 
 * Endpoints for medical certificates.
 */

import { Hono } from 'hono';
import { atestadosService } from '../services/atestados.service.js';
import type { AuthContext, ApiResponse, Atestado } from '../types/index.js';

const atestados = new Hono<{ Variables: { auth: AuthContext } }>();

/**
 * GET /atestados - Get student's medical certificates
 */
atestados.get('/', async (c) => {
    const auth = c.get('auth');
    const data = await atestadosService.getAtestados(auth.alunoId);

    return c.json<ApiResponse<Atestado[]>>({
        success: true,
        data,
    });
});

/**
 * POST /atestados - Submit a new medical certificate
 */
atestados.post('/', async (c) => {
    const auth = c.get('auth');
    const body = await c.req.json();

    // Validate required fields
    if (!body.data_inicio || !body.data_fim || !body.descricao) {
        return c.json<ApiResponse<null>>({
            success: false,
            error: 'Campos obrigatórios: data_inicio, data_fim, descricao',
        }, 400);
    }

    // Validate dates
    const dataInicio = new Date(body.data_inicio);
    const dataFim = new Date(body.data_fim);

    if (isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
        return c.json<ApiResponse<null>>({
            success: false,
            error: 'Formato de data inválido',
        }, 400);
    }

    if (dataFim < dataInicio) {
        return c.json<ApiResponse<null>>({
            success: false,
            error: 'Data final não pode ser anterior à data inicial',
        }, 400);
    }

    const data = await atestadosService.createAtestado(auth.alunoId, auth.escolaId, {
        data_inicio: body.data_inicio,
        data_fim: body.data_fim,
        descricao: String(body.descricao).trim(),
    });

    return c.json<ApiResponse<Atestado>>({
        success: true,
        data,
        message: 'Atestado enviado com sucesso',
    }, 201);
});

export { atestados };
