/**
 * Attendance Routes (/presencas)
 * 
 * Endpoints for attendance history and summaries.
 */

import { Hono } from 'hono';
import { attendanceService } from '../services/attendance.service.js';
import type { AuthContext, ApiResponse, Presenca, PaginatedResponse } from '../types/index.js';

const presencas = new Hono<{ Variables: { auth: AuthContext } }>();

/**
 * GET /presencas - Get paginated attendance history
 */
presencas.get('/', async (c) => {
    const auth = c.get('auth');
    const page = Number(c.req.query('page')) || 1;
    const pageSize = Math.min(Number(c.req.query('pageSize')) || 20, 100);

    const data = await attendanceService.getPresencas(auth.alunoId, page, pageSize);

    return c.json<ApiResponse<PaginatedResponse<Presenca>>>({
        success: true,
        data,
    });
});

/**
 * GET /presencas/faltas - Get only absences
 */
presencas.get('/faltas', async (c) => {
    const auth = c.get('auth');
    const data = await attendanceService.getFaltas(auth.alunoId);

    return c.json<ApiResponse<Presenca[]>>({
        success: true,
        data,
    });
});

/**
 * GET /presencas/resumo/:ano/:mes - Get monthly summary
 */
presencas.get('/resumo/:ano/:mes', async (c) => {
    const auth = c.get('auth');
    const ano = Number(c.req.param('ano'));
    const mes = Number(c.req.param('mes'));

    if (isNaN(ano) || isNaN(mes) || mes < 1 || mes > 12) {
        return c.json<ApiResponse<null>>({
            success: false,
            error: 'Ano ou mês inválido',
        }, 400);
    }

    const data = await attendanceService.getResumoMensal(auth.alunoId, ano, mes);

    return c.json<ApiResponse<typeof data>>({
        success: true,
        data,
    });
});

export { presencas };
