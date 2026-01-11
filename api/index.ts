/**
 * Vercel Serverless Function Entry Point
 * Portal Aluno API - Complete
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/vercel';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const app = new Hono();

// CORS
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
}));

// Auth middleware - validates JWT and returns aluno data
async function validateAlunoToken(authHeader: string | undefined): Promise<{ valid: boolean; alunoId?: string; escolaId?: string; userId?: string }> {
    if (!authHeader?.startsWith('Bearer ')) {
        return { valid: false };
    }

    const token = authHeader.substring(7);

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return { valid: false };
        }

        // Check aluno role
        const { data: roleData } = await supabase
            .from('user_roles')
            .select('role, escola_id')
            .eq('user_id', user.id)
            .eq('role', 'aluno')
            .maybeSingle();

        if (!roleData) {
            return { valid: false };
        }

        // Get aluno id
        const { data: aluno } = await supabase
            .from('alunos')
            .select('id, escola_id')
            .eq('user_id', user.id)
            .single();

        if (!aluno) {
            return { valid: false };
        }

        return { valid: true, alunoId: aluno.id, escolaId: aluno.escola_id, userId: user.id };
    } catch {
        return { valid: false };
    }
}

// Root info
app.get('/', (c) => c.json({
    name: 'Portal Aluno API',
    version: '2.0.0',
    health: '/api/health',
    docs: 'Use /api/v1/* endpoints'
}));

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', service: 'portal-aluno-api' }));

// =====================
// AUTH ROUTES
// =====================

// Login
app.post('/api/v1/auth/login', async (c) => {
    try {
        const { email, password } = await c.req.json();

        if (!email || !password) {
            return c.json({ success: false, error: 'Email e senha são obrigatórios' }, 400);
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (authError || !authData.user) {
            return c.json({ success: false, error: 'Credenciais inválidas' }, 401);
        }

        // Check aluno role
        const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', authData.user.id)
            .eq('role', 'aluno')
            .maybeSingle();

        if (!roleData) {
            await supabase.auth.signOut();
            return c.json({ success: false, error: 'Apenas alunos podem acessar este portal' }, 403);
        }

        // Get student info with turma name
        const { data: aluno } = await supabase
            .from('alunos')
            .select('id, nome, matricula, turma_id, escola_id')
            .eq('user_id', authData.user.id)
            .single();

        // Get turma name
        const { data: turma } = await supabase
            .from('turmas')
            .select('nome')
            .eq('id', aluno?.turma_id)
            .single();

        // Get escola name
        const { data: escola } = await supabase
            .from('escola_configuracao')
            .select('nome')
            .eq('id', aluno?.escola_id)
            .single();

        return c.json({
            success: true,
            data: {
                accessToken: authData.session?.access_token,
                refreshToken: authData.session?.refresh_token,
                aluno: {
                    id: aluno?.id,
                    nome: aluno?.nome,
                    matricula: aluno?.matricula,
                    turma: turma?.nome || 'Sem Turma',
                    escolaNome: escola?.nome || 'Escola',
                },
            },
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// Register
app.post('/api/v1/auth/register', async (c) => {
    try {
        const { matricula, email, password } = await c.req.json();

        if (!matricula || !email || !password) {
            return c.json({ success: false, error: 'Matrícula, email e senha são obrigatórios' }, 400);
        }

        const { data: aluno, error: alunoError } = await supabase
            .from('alunos')
            .select('id, nome, escola_id, user_id')
            .eq('matricula', matricula.trim())
            .single();

        if (alunoError || !aluno) {
            return c.json({ success: false, error: 'Matrícula não encontrada' }, 404);
        }

        if (aluno.user_id) {
            return c.json({ success: false, error: 'Matrícula já possui conta' }, 409);
        }

        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password,
            email_confirm: true,
        });

        if (authError || !authData.user) {
            return c.json({ success: false, error: authError?.message || 'Erro ao criar conta' }, 400);
        }

        await supabase.from('alunos').update({ user_id: authData.user.id }).eq('id', aluno.id);
        await supabase.from('user_roles').insert({ user_id: authData.user.id, escola_id: aluno.escola_id, role: 'aluno' });

        return c.json({ success: true, message: 'Conta criada com sucesso!' }, 201);
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// Forgot Password
app.post('/api/v1/auth/forgot-password', async (c) => {
    try {
        const { email } = await c.req.json();

        const redirectTo = process.env.FRONTEND_URL
            ? `${process.env.FRONTEND_URL}/reset-password`
            : 'https://portal.chamadadiaria.com.br/reset-password';

        await supabase.auth.resetPasswordForEmail(email, { redirectTo });

        return c.json({ success: true, message: 'Email enviado se cadastrado' });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// =====================
// PROTECTED ROUTES
// =====================

// GET /me - Dados do aluno logado
app.get('/api/v1/me', async (c) => {
    try {
        const auth = await validateAlunoToken(c.req.header('Authorization'));
        if (!auth.valid || !auth.alunoId) {
            return c.json({ success: false, error: 'Não autorizado' }, 401);
        }

        const { data: aluno } = await supabase
            .from('alunos')
            .select('id, nome, matricula, turma_id, escola_id, nome_responsavel, telefone_responsavel, endereco')
            .eq('id', auth.alunoId)
            .single();

        const { data: turma } = await supabase
            .from('turmas')
            .select('nome, turno')
            .eq('id', aluno?.turma_id)
            .single();

        const { data: escola } = await supabase
            .from('escola_configuracao')
            .select('nome, url_logo, cor_primaria')
            .eq('id', aluno?.escola_id)
            .single();

        // Calculate frequencia
        const { count: totalPresencas } = await supabase
            .from('presencas')
            .select('*', { count: 'exact', head: true })
            .eq('aluno_id', auth.alunoId);

        const { count: presentes } = await supabase
            .from('presencas')
            .select('*', { count: 'exact', head: true })
            .eq('aluno_id', auth.alunoId)
            .eq('presente', true);

        const frequencia = totalPresencas && totalPresencas > 0
            ? Math.round((presentes || 0) / totalPresencas * 100)
            : 100;

        return c.json({
            success: true,
            data: {
                ...aluno,
                turma: turma?.nome || 'Sem Turma',
                turno: turma?.turno || null,
                escola: escola,
                frequencia,
            },
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// GET /presencas - Histórico de presenças do aluno
app.get('/api/v1/presencas', async (c) => {
    try {
        const auth = await validateAlunoToken(c.req.header('Authorization'));
        if (!auth.valid || !auth.alunoId) {
            return c.json({ success: false, error: 'Não autorizado' }, 401);
        }

        const mes = c.req.query('mes'); // formato: 2024-01
        const limit = parseInt(c.req.query('limit') || '50');

        let query = supabase
            .from('presencas')
            .select('id, data_chamada, presente, falta_justificada, created_at')
            .eq('aluno_id', auth.alunoId)
            .order('data_chamada', { ascending: false })
            .limit(limit);

        if (mes) {
            const [ano, mesNum] = mes.split('-');
            const inicio = `${ano}-${mesNum}-01`;
            const fim = `${ano}-${mesNum}-31`;
            query = query.gte('data_chamada', inicio).lte('data_chamada', fim);
        }

        const { data: presencas, error } = await query;

        if (error) throw error;

        // Calculate summary
        const total = presencas?.length || 0;
        const presentes = presencas?.filter(p => p.presente).length || 0;
        const faltas = total - presentes;
        const justificadas = presencas?.filter(p => !p.presente && p.falta_justificada).length || 0;

        return c.json({
            success: true,
            data: {
                presencas: presencas || [],
                resumo: {
                    total,
                    presentes,
                    faltas,
                    justificadas,
                    frequencia: total > 0 ? Math.round((presentes / total) * 100) : 100,
                },
            },
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// GET /boletim - Notas do aluno
app.get('/api/v1/boletim', async (c) => {
    try {
        const auth = await validateAlunoToken(c.req.header('Authorization'));
        if (!auth.valid || !auth.alunoId) {
            return c.json({ success: false, error: 'Não autorizado' }, 401);
        }

        // Get notas with disciplina name
        const { data: notas, error } = await supabase
            .from('notas')
            .select('id, semestre, valor, tipo_avaliacao, disciplina_id, disciplinas(nome, cor)')
            .eq('aluno_id', auth.alunoId)
            .order('semestre', { ascending: true });

        if (error) throw error;

        // Group by disciplina
        const boletim: Record<string, any> = {};

        (notas || []).forEach((nota: any) => {
            const disciplinaId = nota.disciplina_id;
            const disciplinaNome = nota.disciplinas?.nome || 'Sem Nome';
            const disciplinaCor = nota.disciplinas?.cor || '#6D28D9';

            if (!boletim[disciplinaId]) {
                boletim[disciplinaId] = {
                    disciplina: disciplinaNome,
                    cor: disciplinaCor,
                    semestre1: null,
                    semestre2: null,
                    semestre3: null,
                    media: null,
                };
            }

            if (nota.semestre === 1) boletim[disciplinaId].semestre1 = nota.valor;
            if (nota.semestre === 2) boletim[disciplinaId].semestre2 = nota.valor;
            if (nota.semestre === 3) boletim[disciplinaId].semestre3 = nota.valor;
        });

        // Calculate media
        Object.values(boletim).forEach((item: any) => {
            const notas = [item.semestre1, item.semestre2, item.semestre3].filter(n => n !== null);
            if (notas.length > 0) {
                item.media = parseFloat((notas.reduce((a, b) => a + b, 0) / notas.length).toFixed(1));
            }
        });

        return c.json({
            success: true,
            data: Object.values(boletim),
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// GET /atestados - Atestados do aluno
app.get('/api/v1/atestados', async (c) => {
    try {
        const auth = await validateAlunoToken(c.req.header('Authorization'));
        if (!auth.valid || !auth.alunoId) {
            return c.json({ success: false, error: 'Não autorizado' }, 401);
        }

        const { data: atestados, error } = await supabase
            .from('atestados')
            .select('id, data_inicio, data_fim, descricao, status, created_at')
            .eq('aluno_id', auth.alunoId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return c.json({
            success: true,
            data: atestados || [],
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// GET /beneficios - Programas sociais do aluno (via programas_registros)
app.get('/api/v1/beneficios', async (c) => {
    try {
        const auth = await validateAlunoToken(c.req.header('Authorization'));
        if (!auth.valid || !auth.alunoId) {
            return c.json({ success: false, error: 'Não autorizado' }, 401);
        }

        // Get aluno matricula for beneficios lookup
        const { data: aluno } = await supabase
            .from('alunos')
            .select('matricula')
            .eq('id', auth.alunoId)
            .single();

        if (!aluno) {
            return c.json({ success: true, data: [] });
        }

        // Get beneficios via programas_registros
        const { data: registros, error } = await supabase
            .from('programas_registros')
            .select('id, dados_pagamento, created_at, programas_sociais(nome, descricao, ativo)')
            .eq('matricula_beneficiario', aluno.matricula);

        if (error) throw error;

        const beneficios = (registros || []).map((r: any) => ({
            id: r.id,
            programa: r.programas_sociais?.nome || 'Programa',
            descricao: r.programas_sociais?.descricao || '',
            ativo: r.programas_sociais?.ativo || false,
            dados: r.dados_pagamento,
            desde: r.created_at,
        }));

        return c.json({
            success: true,
            data: beneficios,
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// Export handlers for Vercel
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

export default app;
