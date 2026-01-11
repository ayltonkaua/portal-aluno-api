/**
 * Boletim Routes (/boletim)
 * 
 * Endpoints for grades and report card.
 */

import { Hono } from 'hono';
import { gradesService } from '../services/grades.service.js';
import type { AuthContext, ApiResponse, BoletimData, Nota } from '../types/index.js';

const boletim = new Hono<{ Variables: { auth: AuthContext } }>();

/**
 * GET /boletim - Get complete report card
 */
boletim.get('/', async (c) => {
    const auth = c.get('auth');
    const data = await gradesService.getBoletim(auth.alunoId, auth.escolaId);

    return c.json<ApiResponse<BoletimData>>({
        success: true,
        data,
    });
});

/**
 * GET /boletim/:semestre - Get grades for specific semester
 */
boletim.get('/:semestre', async (c) => {
    const auth = c.get('auth');
    const semestre = Number(c.req.param('semestre'));

    if (isNaN(semestre) || semestre < 1 || semestre > 3) {
        return c.json<ApiResponse<null>>({
            success: false,
            error: 'Semestre inválido (1-3)',
        }, 400);
    }

    const data = await gradesService.getNotasSemestre(auth.alunoId, auth.escolaId, semestre);

    return c.json<ApiResponse<Nota[]>>({
        success: true,
        data,
    });
});

export { boletim };
