/**
 * Escola Routes (/escola)
 * 
 * Endpoints for school information.
 */

import { Hono } from 'hono';
import { escolaService } from '../services/escola.service.js';
import type { AuthContext, ApiResponse, EscolaInfo } from '../types/index.js';

const escola = new Hono<{ Variables: { auth: AuthContext } }>();

/**
 * GET /escola - Get school information
 */
escola.get('/', async (c) => {
    const auth = c.get('auth');
    const data = await escolaService.getEscolaInfo(auth.escolaId);

    return c.json<ApiResponse<EscolaInfo>>({
        success: true,
        data,
    });
});

export { escola };
