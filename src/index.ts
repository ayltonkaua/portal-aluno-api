/**
 * Portal Aluno API - Entry Point
 * 
 * Hono-based REST API for student portal.
 * Works on both Node.js (local) and Vercel (serverless).
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { handle } from 'hono/vercel';

// Middleware
import { authMiddleware } from './middleware/auth.js';
import { rateLimitMiddleware } from './middleware/rateLimit.js';
import { errorHandler } from './middleware/errorHandler.js';

// Routes
import { auth } from './routes/auth.js';
import { me } from './routes/me.js';
import { presencas } from './routes/presencas.js';
import { boletim } from './routes/boletim.js';
import { beneficios } from './routes/beneficios.js';
import { atestados } from './routes/atestados.js';
import { justificativas } from './routes/justificativas.js';
import { escola } from './routes/escola.js';

// Create app with base path
const app = new Hono().basePath('/api');

// =====================
// Global Middleware
// =====================

// CORS - Dynamic origin
app.use('*', cors({
    origin: (origin) => {
        // Allow localhost for development
        if (origin?.includes('localhost')) return origin;
        // Allow Vercel preview deployments
        if (origin?.includes('vercel.app')) return origin;
        // Allow custom domain
        if (origin?.includes('chamadadiaria.com.br')) return origin;
        return null;
    },
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
}));

// Request logging
app.use('*', logger());

// Error handling
app.onError(errorHandler);

// =====================
// Public Routes
// =====================

// Health check
app.get('/health', (c) => {
    return c.json({
        name: 'Portal Aluno API',
        version: '1.0.0',
        status: 'online',
        timestamp: new Date().toISOString(),
    });
});

// Public auth routes (no auth required)
app.route('/v1/auth', auth);

// =====================
// Protected Routes
// =====================

// API v1 group with auth
const v1 = new Hono();

// Apply auth and rate limit middleware
v1.use('*', authMiddleware);
v1.use('*', rateLimitMiddleware);

// Mount routes
v1.route('/me', me);
v1.route('/presencas', presencas);
v1.route('/boletim', boletim);
v1.route('/beneficios', beneficios);
v1.route('/atestados', atestados);
v1.route('/justificativas', justificativas);
v1.route('/escola', escola);

// Mount v1 to main app
app.route('/v1', v1);

// =====================
// 404 Handler
// =====================

app.notFound((c) => {
    return c.json({
        success: false,
        error: 'Endpoint não encontrado',
        path: c.req.path,
    }, 404);
});

// =====================
// Export for Vercel
// =====================

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
export const OPTIONS = handle(app);

// =====================
// Local Development Server
// =====================

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    import('@hono/node-server').then(({ serve }) => {
        const port = Number(process.env.PORT) || 3000;
        console.log(`🎓 Portal Aluno API running on http://localhost:${port}`);
        serve({ fetch: app.fetch, port });
    });
}

export default app;

