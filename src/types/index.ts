/**
 * Type Definitions for Portal Aluno API
 */

// =====================
// Student Types
// =====================

export interface StudentData {
    id: string;
    nome: string;
    matricula: string;
    turma: string;
    turma_id: string;
    escola_id: string;
    nome_responsavel?: string;
    telefone_responsavel?: string;
    endereco?: string;
}

export interface FrequenciaStats {
    frequencia: number;
    totalAulas: number;
    totalFaltas: number;
    faltasJustificadas: number;
    status: 'Excelente' | 'Regular' | 'Atenção' | 'Crítico';
}

export interface Presenca {
    id: string;
    data_chamada: string;
    presente: boolean;
    falta_justificada: boolean;
    turma_nome: string;
}

// =====================
// Atestados Types
// =====================

export interface Atestado {
    id: string;
    aluno_id: string;
    data_inicio: string;
    data_fim: string;
    descricao: string;
    status: 'pendente' | 'aprovado' | 'rejeitado';
    created_at: string;
}

export interface CreateAtestadoDTO {
    data_inicio: string;
    data_fim: string;
    descricao: string;
}

// =====================
// Justificativa Types
// =====================

export interface Justificativa {
    id: string;
    presenca_id: string;
    motivo: string;
    created_at: string;
}

export interface CreateJustificativaDTO {
    presenca_id: string;
    motivo: string;
}

// =====================
// Boletim Types
// =====================

export interface Nota {
    id: string;
    disciplina_id: string;
    disciplina_nome: string;
    disciplina_cor: string;
    semestre: number;
    valor: number;
    tipo_avaliacao: string;
}

export interface BoletimData {
    disciplinas: {
        id: string;
        nome: string;
        cor: string;
        notas: {
            semestre: number;
            valor: number;
            tipo: string;
        }[];
        media: number;
    }[];
}

// =====================
// Beneficios Types
// =====================

export interface Beneficio {
    id: string;
    programa_nome: string;
    situacao: string;
    valor?: number;
    data_pagamento?: string | number;
    nome_responsavel?: string;
    cpf_responsavel?: string;
    banco?: string;
    agencia?: string;
    conta?: string;
}

// =====================
// Escola Types
// =====================

export interface EscolaInfo {
    id: string;
    nome: string;
    endereco?: string;
    telefone?: string;
    email: string;
    cor_primaria: string;
    cor_secundaria: string;
    url_logo?: string;
}

// =====================
// Auth Context
// =====================

export interface AuthContext {
    userId: string;
    alunoId: string;
    escolaId: string;
    email: string;
}

// =====================
// API Response Types
// =====================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
}
