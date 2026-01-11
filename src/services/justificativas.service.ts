/**
 * Justificativas Service
 * 
 * Business logic for absence justifications.
 */

import { supabase } from '../lib/supabase.js';
import type { Justificativa, CreateJustificativaDTO } from '../types/index.js';

export const justificativasService = {
    /**
     * Get student's justifications
     */
    async getJustificativas(alunoId: string, escolaId: string): Promise<Justificativa[]> {
        const { data, error } = await supabase
            .from('justificativas_faltas')
            .select('*')
            .eq('aluno_id', alunoId)
            .eq('escola_id', escolaId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((j: any) => ({
            id: j.id,
            presenca_id: j.presenca_id,
            motivo: j.motivo,
            created_at: j.created_at,
        }));
    },

    /**
     * Create a new justification
     */
    async createJustificativa(
        alunoId: string,
        escolaId: string,
        dto: CreateJustificativaDTO
    ): Promise<Justificativa> {
        // Verify the presenca belongs to this student
        const { data: presenca, error: presencaError } = await supabase
            .from('presencas')
            .select('id, aluno_id')
            .eq('id', dto.presenca_id)
            .eq('aluno_id', alunoId)
            .single();

        if (presencaError || !presenca) {
            throw new Error('Presença não encontrada ou não pertence a este aluno');
        }

        const { data, error } = await supabase
            .from('justificativas_faltas')
            .insert({
                presenca_id: dto.presenca_id,
                aluno_id: alunoId,
                escola_id: escolaId,
                motivo: dto.motivo,
            })
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            presenca_id: data.presenca_id,
            motivo: data.motivo,
            created_at: data.created_at,
        };
    },
};
