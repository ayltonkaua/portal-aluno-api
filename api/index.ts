/**
 * Vercel Serverless Function Entry Point
 * Portal Aluno API - Aligned with Frontend
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handle } from 'hono/vercel';
import { createClient } from '@supabase/supabase-js';

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

// Auth middleware
async function validateAlunoToken(authHeader: string | undefined): Promise<{
    valid: boolean;
    alunoId?: string;
    escolaId?: string;
    turmaId?: string;
    userId?: string;
}> {
    if (!authHeader?.startsWith('Bearer ')) {
        return { valid: false };
    }

    const token = authHeader.substring(7);

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return { valid: false };

        const { data: roleData } = await supabase
            .from('user_roles')
            .select('role, escola_id')
            .eq('user_id', user.id)
            .eq('role', 'aluno')
            .maybeSingle();

        if (!roleData) return { valid: false };

        const { data: aluno } = await supabase
            .from('alunos')
            .select('id, escola_id, turma_id')
            .eq('user_id', user.id)
            .single();

        if (!aluno) return { valid: false };

        return {
            valid: true,
            alunoId: aluno.id,
            escolaId: aluno.escola_id,
            turmaId: aluno.turma_id,
            userId: user.id
        };
    } catch {
        return { valid: false };
    }
}

// Root
app.get('/', (c) => c.json({ name: 'Portal Aluno API', version: '2.1.0' }));

// Health
app.get('/api/health', (c) => c.json({ status: 'ok', service: 'portal-aluno-api' }));

// =====================
// AUTH
// =====================

app.post('/api/v1/auth/login', async (c) => {
    try {
        const { email, password } = await c.req.json();
        if (!email || !password) {
            return c.json({ success: false, error: 'Email e senha são obrigatórios' }, 400);
        }

        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError || !authData.user) {
            return c.json({ success: false, error: 'Credenciais inválidas' }, 401);
        }

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

        const { data: aluno } = await supabase
            .from('alunos')
            .select('id, nome, matricula, turma_id, escola_id')
            .eq('user_id', authData.user.id)
            .single();

        const { data: turma } = await supabase
            .from('turmas')
            .select('nome')
            .eq('id', aluno?.turma_id)
            .single();

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

        return c.json({ success: true, message: 'Conta criada com sucesso!', data: { email, nome: aluno.nome } }, 201);
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

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

app.post('/api/v1/auth/reset-password', async (c) => {
    try {
        const { accessToken, newPassword } = await c.req.json();
        const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: '',
        });
        if (sessionError) {
            return c.json({ success: false, error: 'Token inválido ou expirado' }, 400);
        }
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) {
            return c.json({ success: false, error: 'Erro ao atualizar senha' }, 400);
        }
        return c.json({ success: true, message: 'Senha atualizada com sucesso' });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// =====================
// /me - Dados do Aluno
// =====================

// GET /me - StudentData
app.get('/api/v1/me', async (c) => {
    try {
        const auth = await validateAlunoToken(c.req.header('Authorization'));
        if (!auth.valid) return c.json({ success: false, error: 'Não autorizado' }, 401);

        const { data: aluno } = await supabase
            .from('alunos')
            .select('id, nome, matricula, turma_id, escola_id, nome_responsavel, telefone_responsavel, endereco')
            .eq('id', auth.alunoId)
            .single();

        const { data: turma } = await supabase
            .from('turmas')
            .select('nome')
            .eq('id', aluno?.turma_id)
            .single();

        return c.json({
            success: true,
            data: {
                id: aluno?.id,
                nome: aluno?.nome,
                matricula: aluno?.matricula,
                turma: turma?.nome || 'Sem Turma',
                turma_id: aluno?.turma_id,
                escola_id: aluno?.escola_id,
                nome_responsavel: aluno?.nome_responsavel,
                telefone_responsavel: aluno?.telefone_responsavel,
                endereco: aluno?.endereco,
            },
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// GET /me/frequencia - FrequenciaStats
app.get('/api/v1/me/frequencia', async (c) => {
    try {
        const auth = await validateAlunoToken(c.req.header('Authorization'));
        if (!auth.valid) return c.json({ success: false, error: 'Não autorizado' }, 401);

        const { count: totalAulas } = await supabase
            .from('presencas')
            .select('*', { count: 'exact', head: true })
            .eq('aluno_id', auth.alunoId);

        const { count: presentes } = await supabase
            .from('presencas')
            .select('*', { count: 'exact', head: true })
            .eq('aluno_id', auth.alunoId)
            .eq('presente', true);

        const { count: faltasJustificadas } = await supabase
            .from('presencas')
            .select('*', { count: 'exact', head: true })
            .eq('aluno_id', auth.alunoId)
            .eq('presente', false)
            .eq('falta_justificada', true);

        const total = totalAulas || 0;
        const pres = presentes || 0;
        const totalFaltas = total - pres;
        const frequencia = total > 0 ? Math.round((pres / total) * 100) : 100;

        let status: 'Excelente' | 'Regular' | 'Atenção' | 'Crítico' = 'Excelente';
        if (frequencia < 75) status = 'Crítico';
        else if (frequencia < 85) status = 'Atenção';
        else if (frequencia < 95) status = 'Regular';

        return c.json({
            success: true,
            data: {
                frequencia,
                totalAulas: total,
                totalFaltas,
                faltasJustificadas: faltasJustificadas || 0,
                status,
            },
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// PATCH /me/dados - Update student data
app.patch('/api/v1/me/dados', async (c) => {
    try {
        const auth = await validateAlunoToken(c.req.header('Authorization'));
        if (!auth.valid) return c.json({ success: false, error: 'Não autorizado' }, 401);

        const { nome_responsavel, telefone_responsavel, endereco } = await c.req.json();

        const { error } = await supabase
            .from('alunos')
            .update({
                nome_responsavel,
                telefone_responsavel,
                endereco,
                dados_atualizados_em: new Date().toISOString()
            })
            .eq('id', auth.alunoId);

        if (error) throw error;

        return c.json({ success: true, data: null });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// =====================
// /boletim
// =====================

app.get('/api/v1/boletim', async (c) => {
    try {
        const auth = await validateAlunoToken(c.req.header('Authorization'));
        if (!auth.valid) return c.json({ success: false, error: 'Não autorizado' }, 401);

        const { data: notas, error } = await supabase
            .from('notas')
            .select('id, semestre, valor, tipo_avaliacao, disciplina_id')
            .eq('aluno_id', auth.alunoId);

        if (error) throw error;

        // Get disciplinas
        const disciplinaIds = [...new Set((notas || []).map((n: any) => n.disciplina_id))];
        const { data: disciplinas } = await supabase
            .from('disciplinas')
            .select('id, nome, cor')
            .in('id', disciplinaIds);

        // Group by disciplina
        const disciplinaMap = new Map();
        (disciplinas || []).forEach((d: any) => {
            disciplinaMap.set(d.id, { id: d.id, nome: d.nome, cor: d.cor || '#6D28D9', notas: [], media: 0 });
        });

        (notas || []).forEach((n: any) => {
            if (disciplinaMap.has(n.disciplina_id)) {
                disciplinaMap.get(n.disciplina_id).notas.push({
                    semestre: n.semestre,
                    valor: parseFloat(n.valor),
                    tipo: n.tipo_avaliacao || 'media',
                });
            }
        });

        // Calculate media
        disciplinaMap.forEach((d: any) => {
            if (d.notas.length > 0) {
                const sum = d.notas.reduce((acc: number, n: any) => acc + n.valor, 0);
                d.media = parseFloat((sum / d.notas.length).toFixed(1));
            }
        });

        return c.json({
            success: true,
            data: {
                disciplinas: Array.from(disciplinaMap.values()),
            },
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// =====================
// /atestados
// =====================

app.get('/api/v1/atestados', async (c) => {
    try {
        const auth = await validateAlunoToken(c.req.header('Authorization'));
        if (!auth.valid) return c.json({ success: false, error: 'Não autorizado' }, 401);

        const { data: atestados, error } = await supabase
            .from('atestados')
            .select('id, data_inicio, data_fim, descricao, status, created_at')
            .eq('aluno_id', auth.alunoId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return c.json({ success: true, data: atestados || [] });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

app.post('/api/v1/atestados', async (c) => {
    try {
        const auth = await validateAlunoToken(c.req.header('Authorization'));
        if (!auth.valid) return c.json({ success: false, error: 'Não autorizado' }, 401);

        const { data_inicio, data_fim, descricao } = await c.req.json();

        const { data, error } = await supabase
            .from('atestados')
            .insert({
                aluno_id: auth.alunoId,
                escola_id: auth.escolaId,
                data_inicio,
                data_fim,
                descricao,
                status: 'pendente',
            })
            .select()
            .single();

        if (error) throw error;

        return c.json({ success: true, data }, 201);
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// =====================
// /beneficios
// =====================

app.get('/api/v1/beneficios', async (c) => {
    try {
        const auth = await validateAlunoToken(c.req.header('Authorization'));
        if (!auth.valid) return c.json({ success: false, error: 'Não autorizado' }, 401);

        // Get matricula
        const { data: aluno } = await supabase
            .from('alunos')
            .select('matricula')
            .eq('id', auth.alunoId)
            .single();

        if (!aluno) return c.json({ success: true, data: [] });

        // Get beneficios from programas_registros
        const { data: registros, error } = await supabase
            .from('programas_registros')
            .select('id, dados_pagamento, created_at, programa_id')
            .eq('matricula_beneficiario', aluno.matricula);

        if (error) throw error;

        // Get programa names
        const programaIds = [...new Set((registros || []).map((r: any) => r.programa_id).filter(Boolean))];
        const { data: programas } = programaIds.length > 0
            ? await supabase.from('programas_sociais').select('id, nome, ativo').in('id', programaIds)
            : { data: [] };

        const programaMap = new Map((programas || []).map((p: any) => [p.id, p]));

        // Format beneficios to match frontend Beneficio interface
        const beneficios = (registros || []).map((r: any) => {
            const programa = programaMap.get(r.programa_id);
            const dados = r.dados_pagamento || {};

            return {
                id: r.id,
                programa_nome: programa?.nome || 'Programa Social',
                situacao: programa?.ativo ? 'Ativo' : 'Inativo',
                valor: dados.valor || null,
                data_pagamento: dados.data_pagamento || null,
                nome_responsavel: dados.nome_responsavel || null,
                cpf_responsavel: dados.cpf_responsavel || null,
                banco: dados.banco || null,
                agencia: dados.agencia || null,
                conta: dados.conta || null,
            };
        });

        return c.json({ success: true, data: beneficios });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// =====================
// /escola
// =====================

app.get('/api/v1/escola', async (c) => {
    try {
        const auth = await validateAlunoToken(c.req.header('Authorization'));
        if (!auth.valid) return c.json({ success: false, error: 'Não autorizado' }, 401);

        const { data: escola, error } = await supabase
            .from('escola_configuracao')
            .select('id, nome, endereco, telefone, email, cor_primaria, cor_secundaria, url_logo')
            .eq('id', auth.escolaId)
            .single();

        if (error) throw error;

        return c.json({ success: true, data: escola });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// Export handlers
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

export default app;
