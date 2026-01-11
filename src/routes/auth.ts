/**
 * Auth Routes - Login, Register, Password Recovery for students
 */

import { Hono } from 'hono';
import { supabase } from '../lib/supabase.js';

export const auth = new Hono();

interface LoginBody {
    email: string;
    password: string;
}

interface RegisterBody {
    matricula: string;
    email: string;
    password: string;
}

/**
 * POST /auth/login - Login with email and password
 */
auth.post('/login', async (c) => {
    const body = await c.req.json<LoginBody>();

    if (!body.email || !body.password) {
        return c.json({ success: false, error: 'Email e senha são obrigatórios' }, 400);
    }

    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
    });

    if (authError || !authData.user) {
        return c.json({ success: false, error: 'Credenciais inválidas' }, 401);
    }

    // 2. Check if user has 'aluno' role
    const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('role', 'aluno')
        .maybeSingle();

    if (!roleData) {
        await supabase.auth.signOut();
        return c.json({ success: false, error: 'Acesso negado - Apenas alunos podem acessar este portal' }, 403);
    }

    // 3. Get student info
    const { data: aluno, error: alunoError } = await supabase
        .from('alunos')
        .select('id, nome, matricula, turma_id, escola_id, turmas(nome)')
        .eq('user_id', authData.user.id)
        .single();

    if (alunoError || !aluno) {
        await supabase.auth.signOut();
        return c.json({ success: false, error: 'Dados do aluno não encontrados' }, 403);
    }

    // 4. Get school name
    const { data: escola } = await supabase
        .from('escola_configuracao')
        .select('nome')
        .eq('id', aluno.escola_id)
        .single();

    // 5. Return session and student info
    return c.json({
        success: true,
        data: {
            accessToken: authData.session?.access_token,
            refreshToken: authData.session?.refresh_token,
            expiresAt: authData.session?.expires_at,
            user: {
                id: authData.user.id,
                email: authData.user.email,
            },
            aluno: {
                id: aluno.id,
                nome: aluno.nome,
                matricula: aluno.matricula,
                turma: (aluno.turmas as any)?.nome || 'Sem Turma',
                escolaNome: escola?.nome || 'Escola',
            },
        },
    });
});

/**
 * POST /auth/register - Create account with matricula verification
 */
auth.post('/register', async (c) => {
    const body = await c.req.json<RegisterBody>();

    if (!body.matricula || !body.email || !body.password) {
        return c.json({ success: false, error: 'Matrícula, email e senha são obrigatórios' }, 400);
    }

    // Validate password
    if (body.password.length < 6) {
        return c.json({ success: false, error: 'A senha deve ter pelo menos 6 caracteres' }, 400);
    }

    // 1. Check if matricula exists in database
    const { data: aluno, error: alunoError } = await supabase
        .from('alunos')
        .select('id, nome, escola_id, user_id')
        .eq('matricula', body.matricula.trim())
        .single();

    if (alunoError || !aluno) {
        return c.json({ success: false, error: 'Matrícula não encontrada. Verifique se a matrícula está correta.' }, 404);
    }

    // 2. Check if student already has an account
    if (aluno.user_id) {
        return c.json({ success: false, error: 'Esta matrícula já possui uma conta cadastrada' }, 409);
    }

    // 3. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: body.email.trim().toLowerCase(),
        password: body.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
            nome: aluno.nome,
            matricula: body.matricula,
        },
    });

    if (authError || !authData.user) {
        // Check for email already exists
        if (authError?.message?.includes('already registered')) {
            return c.json({ success: false, error: 'Este email já está cadastrado' }, 409);
        }
        return c.json({ success: false, error: authError?.message || 'Erro ao criar conta' }, 400);
    }

    // 4. Link user to student
    const { error: updateError } = await supabase
        .from('alunos')
        .update({ user_id: authData.user.id })
        .eq('id', aluno.id);

    if (updateError) {
        // Rollback - delete user
        await supabase.auth.admin.deleteUser(authData.user.id);
        return c.json({ success: false, error: 'Erro ao vincular conta ao aluno' }, 500);
    }

    // 5. Add 'aluno' role
    const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
            user_id: authData.user.id,
            escola_id: aluno.escola_id,
            role: 'aluno',
        });

    if (roleError) {
        console.error('Error adding role:', roleError);
        // Non-critical, continue
    }

    return c.json({
        success: true,
        message: 'Conta criada com sucesso! Você já pode fazer login.',
        data: {
            email: authData.user.email,
            nome: aluno.nome,
        },
    }, 201);
});

/**
 * POST /auth/forgot-password - Send password reset email
 */
auth.post('/forgot-password', async (c) => {
    const body = await c.req.json<{ email: string }>();

    if (!body.email) {
        return c.json({ success: false, error: 'Email é obrigatório' }, 400);
    }

    // Get redirect URL from environment or use default
    const redirectTo = process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/reset-password`
        : 'http://localhost:5173/reset-password';

    const { error } = await supabase.auth.resetPasswordForEmail(body.email.trim().toLowerCase(), {
        redirectTo,
    });

    if (error) {
        // Don't reveal if email exists or not
        console.error('Reset password error:', error);
    }

    // Always return success to prevent email enumeration
    return c.json({
        success: true,
        message: 'Se este email estiver cadastrado, você receberá um link para redefinir sua senha.',
    });
});

/**
 * POST /auth/reset-password - Reset password with token
 */
auth.post('/reset-password', async (c) => {
    const body = await c.req.json<{ accessToken: string; newPassword: string }>();

    if (!body.accessToken || !body.newPassword) {
        return c.json({ success: false, error: 'Token e nova senha são obrigatórios' }, 400);
    }

    if (body.newPassword.length < 6) {
        return c.json({ success: false, error: 'A nova senha deve ter pelo menos 6 caracteres' }, 400);
    }

    // Set session with the access token, then update password
    const { error: sessionError } = await supabase.auth.setSession({
        access_token: body.accessToken,
        refresh_token: '', // Not needed for password update
    });

    if (sessionError) {
        return c.json({ success: false, error: 'Token inválido ou expirado. Solicite um novo link.' }, 400);
    }

    const { error: updateError } = await supabase.auth.updateUser({
        password: body.newPassword,
    });

    if (updateError) {
        return c.json({ success: false, error: 'Erro ao atualizar senha. Tente novamente.' }, 400);
    }

    return c.json({
        success: true,
        message: 'Senha alterada com sucesso! Você já pode fazer login.',
    });
});

/**
 * POST /auth/refresh - Refresh access token
 */
auth.post('/refresh', async (c) => {
    const body = await c.req.json<{ refreshToken: string }>();

    if (!body.refreshToken) {
        return c.json({ success: false, error: 'Refresh token é obrigatório' }, 400);
    }

    const { data, error } = await supabase.auth.refreshSession({
        refresh_token: body.refreshToken,
    });

    if (error || !data.session) {
        return c.json({ success: false, error: 'Token inválido ou expirado' }, 401);
    }

    return c.json({
        success: true,
        data: {
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at,
        },
    });
});

/**
 * POST /auth/logout - Logout
 */
auth.post('/logout', async (c) => {
    await supabase.auth.signOut();
    return c.json({ success: true, message: 'Logout realizado' });
});

