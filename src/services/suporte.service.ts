import { supabase } from '../lib/supabase.js';
import { HTTPException } from 'hono/http-exception';
import type { SolicitacaoSuporte } from '../types/index.js';

class SuporteService {
    /**
     * Get student's support tickets
     */
    async getSuporteTickets(alunoId: string): Promise<SolicitacaoSuporte[]> {
        const { data, error } = await supabase
            .from('solicitacoes_aluno')
            .select(`
                id,
                assunto,
                mensagem,
                telefone_contato,
                status,
                created_at
            `)
            .eq('aluno_id', alunoId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching support tickets:', error);
            throw new HTTPException(500, { message: 'Erro ao buscar tickets de suporte' });
        }

        const now = new Date();
        const filteredData = (data as SolicitacaoSuporte[]).filter(ticket => {
            if (ticket.status.toLowerCase() === 'concluído' || ticket.status.toLowerCase() === 'fechado') {
                const ticketDate = new Date(ticket.created_at);
                const diffHours = (now.getTime() - ticketDate.getTime()) / (1000 * 60 * 60);
                if (diffHours > 24) return false;
            }
            return true;
        });

        return filteredData;
    }

    /**
     * Submit a new support ticket
     */
    async createSuporteTicket(
        alunoId: string,
        escolaId: string,
        ticketData: {
            assunto: string;
            mensagem: string;
            telefone_contato?: string;
        }
    ): Promise<SolicitacaoSuporte> {
        const { data, error } = await supabase
            .from('solicitacoes_aluno')
            .insert({
                aluno_id: alunoId,
                escola_id: escolaId,
                assunto: ticketData.assunto,
                mensagem: ticketData.mensagem,
                telefone_contato: ticketData.telefone_contato,
                status: 'aberto'
            })
            .select(`
                id,
                assunto,
                mensagem,
                telefone_contato,
                status,
                created_at
            `)
            .single();

        if (error) {
            console.error('Error creating support ticket:', error);
            throw new HTTPException(500, { message: 'Erro ao enviar ticket de suporte' });
        }

        return data as SolicitacaoSuporte;
    }
}

export const suporteService = new SuporteService();
