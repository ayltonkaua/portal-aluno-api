/**
 * Grades Service
 * 
 * Business logic for grades and report card operations.
 */

import { supabase } from '../lib/supabase.js';
import type { BoletimData, Nota } from '../types/index.js';

export const gradesService = {
    /**
     * Get student grades organized by subject
     */
    async getBoletim(alunoId: string, escolaId: string): Promise<BoletimData> {
        // Get all grades for student
        const { data: notas, error: notasError } = await supabase
            .from('notas')
            .select(`
                id,
                disciplina_id,
                semestre,
                valor,
                tipo_avaliacao,
                disciplinas (id, nome, cor)
            `)
            .eq('aluno_id', alunoId)
            .eq('escola_id', escolaId)
            .order('semestre', { ascending: true });

        if (notasError) throw notasError;

        // Group by subject
        const disciplinasMap = new Map<string, {
            id: string;
            nome: string;
            cor: string;
            notas: { semestre: number; valor: number; tipo: string }[];
        }>();

        for (const nota of notas || []) {
            const disc = nota.disciplinas as any;
            if (!disc) continue;

            if (!disciplinasMap.has(disc.id)) {
                disciplinasMap.set(disc.id, {
                    id: disc.id,
                    nome: disc.nome,
                    cor: disc.cor || '#E2E8F0',
                    notas: [],
                });
            }

            disciplinasMap.get(disc.id)!.notas.push({
                semestre: nota.semestre,
                valor: Number(nota.valor),
                tipo: nota.tipo_avaliacao || 'media',
            });
        }

        // Calculate average for each subject
        const disciplinas = Array.from(disciplinasMap.values()).map(disc => {
            const mediaNotas = disc.notas.filter(n => n.tipo === 'media');
            const media = mediaNotas.length > 0
                ? mediaNotas.reduce((sum, n) => sum + n.valor, 0) / mediaNotas.length
                : 0;

            return {
                ...disc,
                media: Math.round(media * 10) / 10,
            };
        });

        return { disciplinas };
    },

    /**
     * Get grades for a specific semester
     */
    async getNotasSemestre(
        alunoId: string,
        escolaId: string,
        semestre: number
    ): Promise<Nota[]> {
        const { data, error } = await supabase
            .from('notas')
            .select(`
                id,
                disciplina_id,
                semestre,
                valor,
                tipo_avaliacao,
                disciplinas (id, nome, cor)
            `)
            .eq('aluno_id', alunoId)
            .eq('escola_id', escolaId)
            .eq('semestre', semestre);

        if (error) throw error;

        return (data || []).map((n: any) => ({
            id: n.id,
            disciplina_id: n.disciplina_id,
            disciplina_nome: n.disciplinas?.nome || 'Sem nome',
            disciplina_cor: n.disciplinas?.cor || '#E2E8F0',
            semestre: n.semestre,
            valor: Number(n.valor),
            tipo_avaliacao: n.tipo_avaliacao || 'media',
        }));
    },
};
