/**
 * Benefits Service
 * 
 * Business logic for social programs and benefits.
 */

import { supabase } from '../lib/supabase.js';
import type { Beneficio } from '../types/index.js';

export const benefitsService = {
    /**
     * Get student benefits using RPC
     */
    async getBeneficios(alunoId: string): Promise<Beneficio[]> {
        // Try RPC first (if available)
        try {
            const { data, error } = await (supabase as any).rpc('get_beneficios_aluno', {
                p_aluno_id: alunoId,
            });

            if (!error && data) {
                return Array.isArray(data) ? data : [];
            }
        } catch {
            // RPC not available, fallback to direct query
        }

        // Fallback: Direct query
        const { data: aluno, error: alunoError } = await supabase
            .from('alunos')
            .select('matricula')
            .eq('id', alunoId)
            .single();

        if (alunoError || !aluno) return [];

        const { data: registros, error: registrosError } = await supabase
            .from('programas_registros')
            .select(`
                id,
                dados_pagamento,
                programas_sociais (id, nome)
            `)
            .eq('matricula_beneficiario', aluno.matricula);

        if (registrosError) return [];

        return (registros || []).map((r: any) => {
            const pagamento = r.dados_pagamento || {};
            return {
                id: r.id,
                programa_nome: r.programas_sociais?.nome || 'Programa',
                situacao: pagamento.situacao || 'Ativo',
                valor: pagamento.valor,
                data_pagamento: pagamento.data_pagamento,
                nome_responsavel: pagamento.nome_responsavel,
                cpf_responsavel: pagamento.cpf_responsavel,
                banco: pagamento.banco,
                agencia: pagamento.agencia,
                conta: pagamento.conta,
            };
        });
    },
};
