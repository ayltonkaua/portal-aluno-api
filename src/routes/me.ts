/**
 * Student Routes (/me)
 * 
 * Endpoints for student data and profile.
 */

import { Hono } from 'hono';
import { studentService } from '../services/student.service.js';
import type { AuthContext, ApiResponse, StudentData, FrequenciaStats } from '../types/index.js';

const me = new Hono<{ Variables: { auth: AuthContext } }>();

/**
 * GET /me - Get current student data
 */
me.get('/', async (c) => {
    const auth = c.get('auth');
    const data = await studentService.getStudentData(auth.alunoId);

    return c.json<ApiResponse<StudentData>>({
        success: true,
        data,
    });
});

/**
 * GET /me/frequencia - Get attendance statistics
 */
me.get('/frequencia', async (c) => {
    const auth = c.get('auth');
    const data = await studentService.getFrequenciaStats(auth.alunoId);

    return c.json<ApiResponse<FrequenciaStats>>({
        success: true,
        data,
    });
});

/**
 * PATCH /me/dados - Update cadastral data
 */
me.patch('/dados', async (c) => {
    const auth = c.get('auth');
    const body = await c.req.json();

    // Validate input
    const allowedFields = [
        'nome_responsavel', 
        'telefone_responsavel', 
        'endereco',
        'data_nascimento',
        'trabalha',
        'mora_com_familia',
        'recebe_bolsa_familia',
        'recebe_pe_de_meia',
        'usa_transporte',
        'tem_passe_livre',
        'telefone_aluno',
        'telefone_responsavel_2'
    ];
    const updateData: Record<string, any> = {};

    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            updateData[field] = body[field];
        }
    }

    if (Object.keys(updateData).length === 0) {
        return c.json<ApiResponse<null>>({
            success: false,
            error: 'Nenhum dado para atualizar',
        }, 400);
    }

    await studentService.updateCadastro(auth.alunoId, updateData);

    return c.json<ApiResponse<null>>({
        success: true,
        message: 'Dados atualizados com sucesso',
    });
});

export { me };
