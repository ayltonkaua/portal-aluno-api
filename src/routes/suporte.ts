import { Hono } from 'hono';
import { suporteService } from '../services/suporte.service.js';
import type { AuthContext, ApiResponse } from '../types/index.js';
import type { SolicitacaoSuporte } from '../types/index.js';

const suporte = new Hono<{ Variables: { auth: AuthContext } }>();

/**
 * GET /suporte - Get student's support tickets
 */
suporte.get('/', async (c) => {
    const auth = c.get('auth');
    const data = await suporteService.getSuporteTickets(auth.alunoId);

    return c.json<ApiResponse<SolicitacaoSuporte[]>>({
        success: true,
        data,
    });
});

/**
 * POST /suporte - Submit a new support ticket
 */
suporte.post('/', async (c) => {
    const auth = c.get('auth');
    const body = await c.req.json();

    // Validate required fields
    if (!body.assunto || !body.mensagem) {
        return c.json<ApiResponse<null>>({
            success: false,
            error: 'Campos obrigatórios: assunto, mensagem',
        }, 400);
    }

    const data = await suporteService.createSuporteTicket(auth.alunoId, auth.escolaId, {
        assunto: String(body.assunto).trim(),
        mensagem: String(body.mensagem).trim(),
        telefone_contato: body.telefone_contato ? String(body.telefone_contato).trim() : undefined,
    });

    return c.json<ApiResponse<SolicitacaoSuporte>>({
        success: true,
        data,
        message: 'Ticket enviado com sucesso',
    }, 201);
});

export { suporte };
