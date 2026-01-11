/**
 * Beneficios Routes (/beneficios)
 * 
 * Endpoints for social programs and benefits.
 */

import { Hono } from 'hono';
import { benefitsService } from '../services/benefits.service.js';
import type { AuthContext, ApiResponse, Beneficio } from '../types/index.js';

const beneficios = new Hono<{ Variables: { auth: AuthContext } }>();

/**
 * GET /beneficios - Get student's benefits
 */
beneficios.get('/', async (c) => {
    const auth = c.get('auth');
    const data = await benefitsService.getBeneficios(auth.alunoId);

    return c.json<ApiResponse<Beneficio[]>>({
        success: true,
        data,
    });
});

export { beneficios };
