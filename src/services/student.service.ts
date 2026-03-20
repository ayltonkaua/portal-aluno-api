/**
 * Student Service
 * 
 * Business logic for student data operations.
 */

import { supabase } from '../lib/supabase.js';
import type { StudentData, FrequenciaStats } from '../types/index.js';

export const studentService = {
    /**
     * Get student basic data
     */
    async getStudentData(alunoId: string): Promise<StudentData> {
        const { data, error } = await supabase
            .from('alunos')
            .select(`
                id,
                nome,
                matricula,
                turma_id,
                escola_id,
                nome_responsavel,
                telefone_responsavel,
                endereco,
                data_nascimento,
                trabalha,
                mora_com_familia,
                recebe_bolsa_familia,
                recebe_pe_de_meia,
                usa_transporte,
                tem_passe_livre,
                telefone_aluno,
                telefone_responsavel_2,
                dados_atualizados_em,
                turmas (nome)
            `)
            .eq('id', alunoId)
            .single();

        if (error) throw error;

        return {
            id: data.id,
            nome: data.nome,
            matricula: data.matricula,
            turma: (data.turmas as any)?.nome || 'Sem Turma',
            turma_id: data.turma_id,
            escola_id: data.escola_id,
            nome_responsavel: data.nome_responsavel || undefined,
            telefone_responsavel: data.telefone_responsavel || undefined,
            endereco: data.endereco || undefined,
            data_nascimento: data.data_nascimento || undefined,
            trabalha: data.trabalha,
            mora_com_familia: data.mora_com_familia,
            recebe_bolsa_familia: data.recebe_bolsa_familia,
            recebe_pe_de_meia: data.recebe_pe_de_meia,
            usa_transporte: data.usa_transporte,
            tem_passe_livre: data.tem_passe_livre,
            telefone_aluno: data.telefone_aluno || undefined,
            telefone_responsavel_2: data.telefone_responsavel_2 || undefined,
            dados_atualizados_em: data.dados_atualizados_em || undefined,
        };
    },

    /**
     * Get student attendance statistics
     */
    async getFrequenciaStats(alunoId: string): Promise<FrequenciaStats> {
        // Total classes
        const { count: totalAulas, error: errorTotal } = await supabase
            .from('presencas')
            .select('id', { count: 'exact', head: true })
            .eq('aluno_id', alunoId);

        if (errorTotal) throw errorTotal;

        // Total absences
        const { count: totalFaltas, error: errorFaltas } = await supabase
            .from('presencas')
            .select('id', { count: 'exact', head: true })
            .eq('aluno_id', alunoId)
            .eq('presente', false);

        if (errorFaltas) throw errorFaltas;

        // Justified absences
        const { count: faltasJustificadas, error: errorJustificadas } = await supabase
            .from('presencas')
            .select('id', { count: 'exact', head: true })
            .eq('aluno_id', alunoId)
            .eq('presente', false)
            .eq('falta_justificada', true);

        if (errorJustificadas) throw errorJustificadas;

        const aulas = totalAulas || 0;
        const faltas = totalFaltas || 0;
        const justificadas = faltasJustificadas || 0;

        // Calculate frequency percentage
        const freq = aulas > 0 ? Math.round(((aulas - faltas) / aulas) * 100) : 100;

        // Determine status
        let status: FrequenciaStats['status'] = 'Excelente';
        if (freq < 75) status = 'Crítico';
        else if (freq < 85) status = 'Atenção';
        else if (freq < 100) status = 'Regular';

        return {
            frequencia: freq,
            totalAulas: aulas,
            totalFaltas: faltas,
            faltasJustificadas: justificadas,
            status,
        };
    },

    /**
     * Update student cadastral data
     */
    async updateCadastro(
        alunoId: string,
        data: {
            nome_responsavel?: string;
            telefone_responsavel?: string;
            endereco?: string;
            data_nascimento?: string;
            trabalha?: boolean;
            mora_com_familia?: boolean;
            recebe_bolsa_familia?: boolean;
            recebe_pe_de_meia?: boolean;
            usa_transporte?: boolean;
            tem_passe_livre?: boolean;
            telefone_aluno?: string;
            telefone_responsavel_2?: string;
            distancia_km?: number;
        }
    ): Promise<void> {
        const { error } = await supabase
            .from('alunos')
            .update({
                ...data,
                dados_atualizados_em: new Date().toISOString(),
            })
            .eq('id', alunoId);

        if (error) throw error;
    },
};
