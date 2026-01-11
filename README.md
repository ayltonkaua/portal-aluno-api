# 🎓 Portal Aluno API

API REST do Portal do Aluno para o sistema ChamadaDiária.

## Tecnologias

- **Hono** - Framework web ultrarrápido
- **TypeScript** - Tipagem estática
- **Supabase** - Banco de dados PostgreSQL
- **Node.js 20+** - Runtime

## Instalação

```bash
# Instalar dependências
npm install

# Copiar variáveis de ambiente
cp .env.example .env

# Editar .env com suas credenciais
```

## Variáveis de Ambiente

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
SUPABASE_JWT_SECRET=seu_jwt_secret
PORT=3000
CORS_ORIGIN=http://localhost:5173
```

> ⚠️ **IMPORTANTE**: O `SUPABASE_JWT_SECRET` é encontrado em:
> Supabase Dashboard → Settings → API → JWT Secret

## Desenvolvimento

```bash
# Rodar em modo desenvolvimento (hot reload)
npm run dev

# Verificar tipos
npm run typecheck

# Build para produção
npm run build

# Rodar build
npm start
```

## Endpoints

### Públicos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/` | Info da API |
| `GET` | `/health` | Health check |

### Protegidos (requer JWT)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/v1/me` | Dados do aluno |
| `GET` | `/api/v1/me/frequencia` | Estatísticas de frequência |
| `PATCH` | `/api/v1/me/dados` | Atualizar cadastro |
| `GET` | `/api/v1/presencas` | Histórico de presenças |
| `GET` | `/api/v1/presencas/faltas` | Lista de faltas |
| `GET` | `/api/v1/presencas/resumo/:ano/:mes` | Resumo mensal |
| `GET` | `/api/v1/boletim` | Boletim completo |
| `GET` | `/api/v1/boletim/:semestre` | Notas por semestre |
| `GET` | `/api/v1/beneficios` | Programas sociais |
| `GET` | `/api/v1/atestados` | Meus atestados |
| `POST` | `/api/v1/atestados` | Enviar atestado |
| `GET` | `/api/v1/justificativas` | Minhas justificativas |
| `POST` | `/api/v1/justificativas` | Justificar falta |
| `GET` | `/api/v1/escola` | Info da escola |

## Autenticação

A API usa tokens JWT do Supabase. Envie o token no header:

```
Authorization: Bearer <token>
```

## Deploy no Render

1. Conecte o repositório ao Render
2. Configure como **Web Service**
3. Build command: `npm install && npm run build`
4. Start command: `npm start`
5. Adicione as variáveis de ambiente

## Estrutura

```
src/
├── index.ts           # Entry point
├── lib/
│   ├── supabase.ts    # Cliente Supabase
│   └── jwt.ts         # Helpers JWT
├── middleware/
│   ├── auth.ts        # Autenticação
│   ├── rateLimit.ts   # Rate limiting
│   └── errorHandler.ts
├── routes/
│   ├── me.ts          # /api/v1/me
│   ├── presencas.ts   # /api/v1/presencas
│   ├── boletim.ts     # /api/v1/boletim
│   ├── beneficios.ts  # /api/v1/beneficios
│   ├── atestados.ts   # /api/v1/atestados
│   ├── justificativas.ts
│   └── escola.ts
├── services/
│   ├── student.service.ts
│   ├── attendance.service.ts
│   ├── grades.service.ts
│   ├── benefits.service.ts
│   ├── atestados.service.ts
│   ├── justificativas.service.ts
│   └── escola.service.ts
└── types/
    └── index.ts
```

## Licença

Privado - ChamadaDiária
