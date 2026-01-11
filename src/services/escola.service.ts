/**
 * Escola Service
 * 
 * Business logic for school information.
 */

import { supabase } from '../lib/supabase.js';
import type { EscolaInfo } from '../types/index.js';

export const escolaService = {
    /**
     * Get school information
     */
    async getEscolaInfo(escolaId: string): Promise<EscolaInfo> {
        const { data, error } = await supabase
            .from('escola_configuracao')
            .select(`
                id,
                nome,
                endereco,
                telefone,
                email,
                cor_primaria,
                cor_secundaria,
                url_logo
            `)
            .eq('id', escolaId)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            nome: data.nome,
            endereco: data.endereco || undefined,
            telefone: data.telefone || undefined,
            email: data.email,
            cor_primaria: data.cor_primaria || '#6D28D9',
            cor_secundaria: data.cor_secundaria || '#4F46E5',
            url_logo: data.url_logo || undefined,
        };
    },
};
