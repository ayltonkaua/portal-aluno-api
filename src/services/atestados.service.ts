/**
 * Atestados Service
 * 
 * Business logic for medical certificates.
 */

import { supabase } from '../lib/supabase.js';
import type { Atestado, CreateAtestadoDTO } from '../types/index.js';

export const atestadosService = {
    /**
     * Get student's medical certificates
     */
    async getAtestados(alunoId: string): Promise<Atestado[]> {
        const { data, error } = await supabase
            .from('atestados')
            .select('*')
            .eq('aluno_id', alunoId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((a: any) => ({
            id: a.id,
            aluno_id: a.aluno_id,
            data_inicio: a.data_inicio,
            data_fim: a.data_fim,
            descricao: a.descricao,
            status: a.status,
            created_at: a.created_at,
        }));
    },

    /**
     * Create a new medical certificate
     */
    async createAtestado(
        alunoId: string,
        escolaId: string,
        dto: CreateAtestadoDTO
    ): Promise<Atestado> {
        const { data, error } = await supabase
            .from('atestados')
            .insert({
                aluno_id: alunoId,
                escola_id: escolaId,
                data_inicio: dto.data_inicio,
                data_fim: dto.data_fim,
                descricao: dto.descricao,
                status: 'pendente',
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            aluno_id: data.aluno_id,
            data_inicio: data.data_inicio,
            data_fim: data.data_fim,
            descricao: data.descricao,
            status: data.status,
            created_at: data.created_at,
        };
    },
};
