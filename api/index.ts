/**
 * Vercel Serverless Function Entry Point
 * Portal Aluno API
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

const app = new Hono().basePath('/api');

// CORS
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'portal-aluno-api' }));

// Auth Login
app.post('/v1/auth/login', async (c) => {
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

        // Get student info
        const { data: aluno } = await supabase
            .from('alunos')
            .select('id, nome, matricula, turma_id, escola_id, turmas(nome)')
            .eq('user_id', authData.user.id)
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
                    turma: (aluno?.turmas as any)?.nome || 'Sem Turma',
                    escolaNome: escola?.nome || 'Escola',
                },
            },
        });
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// Auth Register
app.post('/v1/auth/register', async (c) => {
    try {
        const { matricula, email, password } = await c.req.json();

        if (!matricula || !email || !password) {
            return c.json({ success: false, error: 'Matrícula, email e senha são obrigatórios' }, 400);
        }

        // Check matricula exists
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

        // Create user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password,
            email_confirm: true,
        });

        if (authError || !authData.user) {
            return c.json({ success: false, error: authError?.message || 'Erro ao criar conta' }, 400);
        }

        // Link to student
        await supabase.from('alunos').update({ user_id: authData.user.id }).eq('id', aluno.id);
        await supabase.from('user_roles').insert({ user_id: authData.user.id, escola_id: aluno.escola_id, role: 'aluno' });

        return c.json({ success: true, message: 'Conta criada com sucesso!' }, 201);
    } catch (error: any) {
        return c.json({ success: false, error: error.message }, 500);
    }
});

// Forgot Password
app.post('/v1/auth/forgot-password', async (c) => {
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

// Export handlers for Vercel
export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

export default app;
