/**
 * Portal Aluno API - Entry Point
 * 
 * Hono-based REST API for student portal.
 * Built for deployment on Render.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

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

// Create app
const app = new Hono();

// =====================
// Global Middleware
// =====================

// CORS
app.use('*', cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
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
app.get('/', (c) => {
    return c.json({
        name: 'Portal Aluno API',
        version: '1.0.0',
        status: 'online',
        timestamp: new Date().toISOString(),
    });
});

// API info
app.get('/health', (c) => {
    return c.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
    });
});

// Public auth routes (no auth required)
app.route('/api/v1/auth', auth);

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
app.route('/api/v1', v1);

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
// Server
// =====================

const port = Number(process.env.PORT) || 3000;

console.log(`
╔════════════════════════════════════════════════╗
║         🎓 Portal Aluno API                    ║
║                                                ║
║  Server running on http://localhost:${port}      ║
║                                                ║
║  Endpoints:                                    ║
║    GET  /              - API info              ║
║    GET  /health        - Health check          ║
║    GET  /api/v1/me     - Student data          ║
║    GET  /api/v1/presencas - Attendance         ║
║    GET  /api/v1/boletim   - Grades             ║
║    GET  /api/v1/beneficios - Benefits          ║
║    GET  /api/v1/atestados  - Certificates      ║
║    POST /api/v1/justificativas - Justify       ║
║    GET  /api/v1/escola        - School info    ║
╚════════════════════════════════════════════════╝
`);

serve({
    fetch: app.fetch,
    port,
});

export default app;
