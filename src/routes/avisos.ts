import { Hono } from 'hono';
import { supabase } from '../lib/supabase.js';

export const avisos = new Hono();

/**
 * GET /api/v1/avisos
 * Retorna os comunicados ativos da escola do aluno ordenados por data
 */
avisos.get('/', async (c) => {
    const { escolaId } = c.get('auth');

    const { data, error } = await supabase
        .from('portal_comunicados')
        .select('id, titulo, conteudo, tipo, data_publicacao, ativo')
        .eq('escola_id', escolaId)
        .eq('ativo', true)
        .order('data_publicacao', { ascending: false });

    if (error) {
        console.error('Erro ao buscar avisos:', error);
        return c.json({ success: false, error: 'Erro ao buscar comunicados' }, 500);
    }

    return c.json({ success: true, data });
});
