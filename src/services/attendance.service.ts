/**
 * Attendance Service
 * 
 * Business logic for attendance and presence operations.
 */

import { supabase } from '../lib/supabase.js';
import type { Presenca, PaginatedResponse } from '../types/index.js';

export const attendanceService = {
    /**
     * Get paginated attendance history
     */
    async getPresencas(
        alunoId: string,
        page: number = 1,
        pageSize: number = 20
    ): Promise<PaginatedResponse<Presenca>> {
        const offset = (page - 1) * pageSize;

        // Get total count
        const { count: total, error: countError } = await supabase
            .from('presencas')
            .select('id', { count: 'exact', head: true })
            .eq('aluno_id', alunoId);

        if (countError) throw countError;

        // Get paginated data
        const { data, error } = await supabase
            .from('presencas')
            .select(`
                id,
                data_chamada,
                presente,
                falta_justificada,
                turmas (nome)
            `)
            .eq('aluno_id', alunoId)
            .order('data_chamada', { ascending: false })
            .range(offset, offset + pageSize - 1);

        if (error) throw error;

        const presencas: Presenca[] = (data || []).map((p: any) => ({
            id: p.id,
            data_chamada: p.data_chamada,
            presente: p.presente,
            falta_justificada: p.falta_justificada,
            turma_nome: p.turmas?.nome || 'Sem Turma',
        }));

        return {
            data: presencas,
            page,
            pageSize,
            total: total || 0,
            hasMore: offset + presencas.length < (total || 0),
        };
    },

    /**
     * Get only absences
     */
    async getFaltas(alunoId: string): Promise<Presenca[]> {
        const { data, error } = await supabase
            .from('presencas')
            .select(`
                id,
                data_chamada,
                presente,
                falta_justificada,
                turmas (nome)
            `)
            .eq('aluno_id', alunoId)
            .eq('presente', false)
            .order('data_chamada', { ascending: false });

        if (error) throw error;

        return (data || []).map((p: any) => ({
            id: p.id,
            data_chamada: p.data_chamada,
            presente: false,
            falta_justificada: p.falta_justificada,
            turma_nome: p.turmas?.nome || 'Sem Turma',
        }));
    },

    /**
     * Get monthly summary
     */
    async getResumoMensal(alunoId: string, ano: number, mes: number) {
        const startDate = new Date(ano, mes - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(ano, mes, 0).toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('presencas')
            .select('presente, falta_justificada')
            .eq('aluno_id', alunoId)
            .gte('data_chamada', startDate)
            .lte('data_chamada', endDate);

        if (error) throw error;

        const total = data?.length || 0;
        const presencas = data?.filter((p: any) => p.presente).length || 0;
        const faltas = total - presencas;
        const faltasJustificadas = data?.filter((p: any) => !p.presente && p.falta_justificada).length || 0;

        return {
            ano,
            mes,
            totalAulas: total,
            presencas,
            faltas,
            faltasJustificadas,
            frequencia: total > 0 ? Math.round((presencas / total) * 100) : 100,
        };
    },
};
