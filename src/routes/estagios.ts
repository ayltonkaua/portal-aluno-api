import { Hono } from 'hono';
import { supabase } from '../lib/supabase.js';

export const estagios = new Hono();

/**
 * GET /api/v1/estagios
 * Retorna as oportunidades de estágio ativas da escola do aluno
 */
estagios.get('/', async (c) => {
    const { escolaId } = c.get('auth');

    const { data, error } = await supabase
        .from('portal_estagios')
        .select('id, empresa, cargo, descricao, bolsa, requisitos, link_inscricao, data_publicacao, ativo')
        .eq('escola_id', escolaId)
        .eq('ativo', true)
        .order('data_publicacao', { ascending: false });

    if (error) {
        console.error('Erro ao buscar estagios:', error);
        return c.json({ success: false, error: 'Erro ao buscar vagas de estágio' }, 500);
    }

    return c.json({ success: true, data });
});
