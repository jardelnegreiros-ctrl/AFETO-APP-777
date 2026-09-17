# Arquitetura e Especificações — LembreMe (App de Lembretes com WhatsApp)

**Versão:** 1.0  
**Data:** 2026-09-17  
**Status:** Planejamento

---

## 1. Visão Geral

Aplicativo web progressivo (PWA) de criação e gerenciamento de lembretes, com integração nativa ao WhatsApp para:
- Receber notificações de lembretes via mensagem WhatsApp
- Criar lembretes enviando mensagens para o número do app no WhatsApp

O aplicativo será acessível por navegador web (funcionando como PWA no Android, instalável como app) e por conversação via WhatsApp.

---

## 2. Requisitos Funcionais

### 2.1 Gestão de Lembretes (Web App)
- Criar lembrete com: título, descrição, data/hora, repetição (diária, semanal, mensal, personalizada), categoria
- Editar e excluir lembretes existentes
- Listar lembretes com filtros (por data, categoria, status: pendente/concluído)
- Marcar lembrete como concluído
- Configurar alerta prévio (ex: 10 min antes, 1 hora antes, no dia)
- Toggle de ativar/desativar lembrete

### 2.2 Gestão de Lembretes (WhatsApp)
- Criar lembrete enviando mensagem no formato:
  - `/lembrete Título | Descrição | DD/MM/AAAA HH:MM | categoria`
  - Exemplo: `/lembrete Reunião | Reunião com cliente | 18/09/2026 14:00 | Trabalho`
- Listar lembretes: enviar `/listar`
- Concluir lembrete: enviar `/concluir ID`
- Excluir lembrete: enviar `/excluir ID`
- Cancelar lembrete: enviar `/cancelar ID`
- Ajuda de comandos: enviar `/ajuda`

### 2.3 Notificações via WhatsApp
- Envio automático de mensagem WhatsApp no horário do lembrete
- Mensagem personalizável (padrão: "🔔 Lembrete: {título} — {descrição}")
- Suporte a alertas pré-definidos (notificação X minutos/antes da hora)
- Confirmação de envio (só notifica se usuário não estiver offline no app web)

### 2.3 Autenticação e Perfil
- Cadastro com e-mail/senha ou login via Google
- Vinculação de número de WhatsApp ao perfil (número único por conta)
- Gerenciamento de perfil (nome, foto, fuso horário)

---

## 3. Requisitos Não-Funcionais

- **Disponibilidade:** 99.5% uptime
- **Latência de notificação WhatsApp:** envio em até 1 minuto do horário programado
- **Escalabilidade:** suporte a 10.000 usuários ativos/mês na fase inicial
- **Segurança:** dados criptografados em trânsito (TLS 1.3) e em repouso (AES-256)
- **Compatibilidade:** Chrome, Safari, Firefox (Web); Android 8+ (PWA); WhatsApp Business API
- **Acessibilidade:** WCAG 2.1 AA

---

## 4. Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTES                                     │
│  ┌──────────────┐                    ┌──────────────────────┐       │
│  │  Web App      │                    │  WhatsApp (usuário)  │       │
│  │  (PWA)        │                    │  (app de mensagens)  │       │
│  └──────┬───────┘                    └──────────┬───────────┘       │
│         │ HTTPS / REST API                      │ WhatsApp Cloud     │
└─────────┼─────────────────────────────────────────┼───────────────────┘
          │                                       │
          ▼                                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY / REVERSE PROXY                     │
│                    (Nginx / Traefik)                                 │
└────────────────────────┬────────────────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│  Web API     │  │ WhatsApp API │  │  Push Notification│
│  (Backend)   │  │ Handler      │  │  Service          │
│  Node.js     │  │ (Twilio/     │  │  (WhatsApp Cloud │
│  /FastAPI    │  │  Meta BSP)   │  │   Messaging API)  │
└──────┬───────┘  └──────────────┘  └──────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      SERVIÇOS INTERNOS                             │
│                                                                     │
│  ┌────────────┐  ┌──────────────┐  ┌───────────────────────┐       │
│  │Scheduler / │  │  Auth        │  │  NLP / Command Parser │       │
│  │Cron Engine │  │  Service     │  │  (comandos WhatsApp)  │       │
│  │(BullMQ/    │  │ (JWT + OAuth│  │                       │       │
│  │  Node-cron)│  │  + Google)   │  │                       │       │
│  └──────┬─────┘  └──────┬───────┘  └───────────────────────┘       │
│         │              │                                            │
│         ▼              ▼                                            │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │              Banco de Dados (PostgreSQL)                    │     │
│  │  users | reminders | whatsapp_profiles | sessions          │     │
│  └────────────────────────────────────────────────────────────┘     │
│                                                                     │
│  ┌────────────────────┐  ┌──────────────────────┐                  │
│  │ Redis (Cache +     │  │  Fila de Mensagens   │                  │
│  │  Fila BullMQ)      │  │  (Redis Queue)       │                  │
│  └────────────────────┘  └──────────────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Frontend** | Next.js 14 + React 18 + TypeScript | SSR/SSG, PWA nativa, ecossistema robusto |
| **UI** | Tailwind CSS + shadcn/ui | Componentes acessíveis, design responsivo |
| **Backend** | Node.js + Express (ou NestJS) | Mesmo runtime que o frontend (monorepo), vasto ecossistema |
| **Banco de Dados** | PostgreSQL 16 | Relacional, robusto, excelente para dados estruturados de lembretes |
| **Cache/Fila** | Redis | BullMQ para scheduler de lembretes, cache de sessões |
| **WhatsApp** | WhatsApp Cloud API (Meta) ou Twilio WhatsApp | API oficial, confiável, sem violação de ToS |
| **Auth** | NextAuth.js (Auth.js) | Suporte a Google OAuth + credentials (email/senha) |
| **NLP/Comandos** | Parsing customizado (regex + keywords) | Leve, sem necessidade de LLM para comandos simples |
| **Deploy** | Docker + Docker Compose (dev), Vercel (frontend) + Railway/Render (backend) | Escalabilidade fácil, custo controlado |
| **Monitoramento** | Sentry + PostgreSQL logs | Erros em produção, performance |
| **PWA** | Workbox + next-pwa | Service worker, cache offline |

---

## 6. Modelo de Dados (Esquema)

### 6.1 Tabela: `users`
| Campo | Tipo | Restrições | Descrição |
|-------|------|-----------|-----------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Identificador único |
| email | VARCHAR(255) | UNIQUE, NOT NULL | E-mail do usuário |
| password_hash | VARCHAR(255) | NOT NULL | Senha hasheada (bcrypt) |
| name | VARCHAR(100) | NOT NULL | Nome do usuário |
| avatar_url | TEXT | NULL | URL da foto de perfil |
| timezone | VARCHAR(50) | DEFAULT 'America/Sao_Paulo' | Fuso horário |
| google_id | VARCHAR(255) | UNIQUE, NULL | ID do Google (login social) |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT NOW() | Última atualização |

### 6.2 Tabela: `reminders`
| Campo | Tipo | Restrições | Descrição |
|-------|------|-----------|-----------|
| id | UUID | PK | Identificador único |
| user_id | UUID | FK → users(id), NOT NULL | Dono do lembrete |
| title | VARCHAR(200) | NOT NULL | Título do lembrete |
| description | TEXT | NULL | Descrição detalhada |
| scheduled_at | TIMESTAMP | NOT NULL | Data/hora programada |
| timezone | VARCHAR(50) | DEFAULT 'America/Sao_Paulo' | Fuso horário do lembrete |
| category | VARCHAR(50) | NULL | Categoria (Trabalho, Pessoal, Saúde, etc.) |
| is_active | BOOLEAN | DEFAULT TRUE | Lembrete ativo? |
| is_completed | BOOLEAN | DEFAULT FALSE | Concluído? |
| repeats | VARCHAR(20) | NULL | Frequência: 'daily', 'weekly', 'monthly', 'custom', NULL |
| repeat_interval | INT | NULL | Intervalo de repetição (ex: a cada 2 semanas) |
| notify_before_minutes | INT[] | NULL | Alertas prévios (ex: '{10, 60}' = 10min e 1h antes) |
| whatsapp_notified | BOOLEAN | DEFAULT FALSE | Já notificou via WhatsApp? |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |
| updated_at | TIMESTAMP | DEFAULT NOW() | Última atualização |
| completed_at | TIMESTAMP | NULL | Data de conclusão |

### 6.3 Tabela: `whatsapp_profiles`
| Campo | Tipo | Restrições | Descrição |
|-------|------|-----------|-----------|
| id | UUID | PK | Identificador único |
| user_id | UUID | FK → users(id), UNIQUE, NOT NULL | Usuário vinculado |
| phone_number | VARCHAR(20) | NOT NULL | Número de WhatsApp E.164 format (ex: +5511999999999) |
| wa_instance_id | VARCHAR(100) | NULL | ID da instância WhatsApp Cloud API |
| wa_access_token | VARCHAR(500) | NULL | Token de acesso |
| is_linked | BOOLEAN | DEFAULT FALSE | WhatsApp vinculado? |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |

### 6.4 Tabela: `whatsapp_messages` (log)
| Campo | Tipo | Restrições | Descrição |
|-------|------|-----------|-----------|
| id | UUID | PK | Identificador único |
| user_id | UUID | FK → users(id) | Usuário |
| direction | VARCHAR(10) | NOT NULL | 'inbound' (recebido) ou 'outbound' (enviado) |
| content | TEXT | NOT NULL | Conteúdo da mensagem |
| wa_message_id | VARCHAR(100) | NULL | ID da mensagem na API do WhatsApp |
| status | VARCHAR(20) | DEFAULT 'pending' | pending/sent/delivered/failed |
| parsed_command | VARCHAR(50) | NULL | Comando extraído (ex: 'create_reminder') |
| related_reminder_id | UUID | FK → reminders(id), NULL | Lembrete associado |
| created_at | TIMESTAMP | DEFAULT NOW() | Data/hora |

### 6.5 Tabela: `sessions`
| Campo | Tipo | Restrições | Descrição |
|-------|------|-----------|-----------|
| id | UUID | PK | Identificador único |
| user_id | UUID | FK → users(id), NOT NULL | Usuário |
| token_hash | VARCHAR(255) | NOT NULL | Hash do token JWT |
| expires_at | TIMESTAMP | NOT NULL | Expiração |
| created_at | TIMESTAMP | DEFAULT NOW() | Data de criação |

---

## 7. API REST — Endpoints

### Base URL: `/api/v1`

### Autenticação
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/auth/register` | Criar conta (email + senha) |
| POST | `/auth/login` | Login (email + senha → JWT) |
| POST | `/auth/google` | Login via Google OAuth |
| POST | `/auth/refresh` | Renovar token JWT |
| POST | `/auth/logout` | Invalidar sessão |

### Lembretes
| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/reminders` | Listar lembretes (filtros: data, categoria, status) | Sim |
| GET | `/reminders/:id` | Obter lembrete por ID | Sim |
| POST | `/reminders` | Criar lembrete | Sim |
| PUT | `/reminders/:id` | Atualizar lembrete | Sim |
| PATCH | `/reminders/:id/toggle` | Ativar/desativar | Sim |
| PATCH | `/reminders/:id/complete` | Marcar como concluído | Sim |
| DELETE | `/reminders/:id` | Excluir lembrete | Sim |

### Categorias
| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/categories` | Listar categorias padrão | Sim |
| POST | `/categories` | Criar categoria personalizada | Sim |
| DELETE | `/categories/:id` | Excluir categoria | Sim |

### Configurações do Usuário
| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| GET | `/users/me` | Obter perfil | Sim |
| PUT | `/users/me` | Atualizar perfil | Sim |
| POST | `/users/me/whatsapp/link` | Iniciar vinculação WhatsApp | Sim |
| GET | `/users/me/whatsapp/status` | Status de vinculação | Sim |
| PUT | `/users/me/settings` | Atualizar preferências (fuso horário, notificações) | Sim |

### Administração
| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/admin/webhook/whatsapp` | Webhook inbound WhatsApp (sem auth - validar via signature) | Não (signature) |

---

## 8. Integração WhatsApp

### 8.1 Fluxo de Recebimento de Mensagens

```
Usuário envia mensagem no WhatsApp
        │
        ▼
WhatsApp Cloud API (Meta)
        │  Webhook POST /api/v1/admin/webhook/whatsapp
        ▼
Backend recebe payload com mensagem
        │
        ▼
[INBOUND] Salvar em whatsapp_messages (direction='inbound')
        │
        ▼
Command Parser analisa conteúdo
        │
        ├── Comando reconhecido (/lembrete, /listar, /concluir, etc.)
        │       │
        │       ▼
        │   Action Executor executa ação
        │       │
        │       ▼
        │   Resposta formatada para WhatsApp
        │       │
        │       ▼
        │   [OUTBOUND] Enviar via WhatsApp Cloud API
        │
        └── Mensagem não reconhecida
                │
                ▼
            Responder com "Comandos disponíveis: /ajuda"
```

### 8.2 Fluxo de Envio de Notificação (Scheduler)

```
BullMQ Queue: reminders_check
        │
        ▼
Worker processa jobs a cada 30 segundos
        │
        ▼
Buscar no banco: lembretes WHERE 
  scheduled_at <= NOW() AND 
  is_active = TRUE AND 
  is_completed = FALSE AND 
  (notify_before IS NULL OR notify_done = FALSE) AND
  whatsapp_notified = FALSE
        │
        ▼
Para cada lembrete devido:
  1. Verificar se usuário tem WhatsApp vinculado
  2. Enviar mensagem via WhatsApp Cloud API
  3. Marcar whatsapp_notified = TRUE
  4. Salvar em whatsapp_messages (direction='outbound')
  5. Se houver alertas prévios, agendar next check
        │
        ▼
Para lembretes com repeat:
  1. Calcular próxima ocorrência
  2. Reagendar no banco (scheduled_at = próxima data)
  3. Resetar whatsapp_notified = FALSE
```

### 8.3 Configuração da API WhatsApp

**Provedor recomendado:** WhatsApp Cloud API via Meta (gratuito até 1.000 conversas/mês) ou Twilio WhatsApp (pay-as-you-go).

**Necessário:**
1. Conta Meta Developer Portal
2. App Facebook/Meta configurado com WhatsApp Product
3. número de telefone verificado
4. Template de mensagem aprovado (para notificações out-of-session)
5. Access Token permanente (long-lived)

**Templates de mensagem (precisam de aprovação da Meta):**
- `reminder_notification` — "🔔 *{título}* — {descrição}"
- `reminder_confirmation` — "✅ Lembrete '{título}' marcado como concluído"
- `reminder_created` — "✅ Lembrete '{título}' criado para {data}"
- `command_help` — Lista de comandos disponíveis

### 8.4 Parser de Comandos WhatsApp

```
Formatos reconhecidos:

Criar:
  /lembrete Título | Descrição | DD/MM/AAAA HH:MM | categoria
  /lembrete Título | DD/MM/AAAA HH:MM
  /lembrete Reunião às 14h hoje
  /lembrete Tomar remédio todo dia às 8h

Listar:
  /listar → lista todos lembretes ativos
  /listar Hoje → lembretes de hoje
  /listar Trabalho → lembretes da categoria

Gerenciar:
  /concluir ID → marcar como concluído
  /cancelar ID → desativar lembrete
  /excluir ID → remover lembrete
  /editar ID título=Novo título

Outros:
  /ajuda → mostra comandos disponíveis
  /hoje → lembretes do dia
  /proximo → próximo lembrete
```

---

## 9. Sistema de Notificações

### 9.1 Tipos de Notificação
| Tipo | Canal | Disparador |
|------|-------|-----------|
| Lembrete no horário | WhatsApp | Horário programado |
| Alerta prévio | WhatsApp | X minutos/antes |
| Confirmação | WhatsApp | Ação do usuário (concluir, criar via web) |
| Erro no agendamento | E-mail | Falha no worker |

### 9.2 Lógica de Alertas Prévio
- Ao criar um lembrete, o usuário pode selecionar alertas: 5min, 15min, 30min, 1h, 2h antes
- Cada alerta prévio gera uma job na fila BullMQ com timestamp = scheduled_at - alert_minutes
- Quando a job dispara, envia notificação WhatsApp com mensagem de alerta
- Se o lembrete principal já foi notificado, cancelar alertas pendentes

---

## 10. Progressive Web App (PWA)

### 10.1 Manifesto (`manifest.json`)
- **Nome:** LembreMe
- **Short Name:** LembreMe
- **Icons:** 192x192 e 512x512 PNG
- **Start URL:** `/`
- **Display:** standalone
- **Theme Color:** #4F46E5
- **Background Color:** #FFFFFF

### 10.2 Service Worker (Workbox)
- Cache de assets estáticos (JS, CSS, imagens) — Cache First
- Cache de API (listar lembretes, categorias) — Stale While Revalidate
- Estratégia offline: mostrar lembretes cached se sem conexão
- Background sync para criação/edição de lembretes quando voltar online

### 10.3 Funcionalidades PWA
- Instalável na tela inicial do Android
- Funciona offline para visualizar lembretes cacheados
- Push notifications via Service Worker (quando Web Push estiver disponível)
- Responsivo (mobile-first design)
- Touch-optimized UI

---

## 11. Segurança

### 11.1 Autenticação
- JWT com access token (15 min) + refresh token (7 dias)
- Refresh token rotativo (refresh token rotation)
- Google OAuth 2.0 via NextAuth.js
- Rate limiting no login (5 tentativas/min por IP)

### 11.2 Autorização
- RBAC: cada usuário apenas acessa seus próprios dados
- Verificação de ownership em cada endpoint (user_id do token vs. recurso)

### 11.3 Dados
- Senhas: bcrypt (12 rounds)
- Tokens: HMAC-SHA256 para JWT
- Trânsito: TLS 1.3 obrigatório
- Repouso: AES-256 para dados sensíveis (tokens WhatsApp)
- Tokens WhatsApp criptografados no banco (envelope encryption)

### 11.4 Validação
- Input validation via Zod (schema validation)
- Sanitize all SQL queries (Prisma ORM — parameterized)
- Content Security Policy headers
- CORS restrito ao domínio do app

---

## 12. Infraestrutura e Deploy

### 12.1 Ambiente de Desenvolvimento
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: ./
    ports: ['3000:3000']
    depends_on: [postgres, redis]
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://redis:6379
      - WHATSAPP_ACCESS_TOKEN=${WHATSAPP_TOKEN}
      - JWT_SECRET=${JWT_SECRET}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: remindeme
      POSTGRES_USER: app
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: [pgdata:/var/lib/postgresql/data]
    
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    
volumes:
  pgdata:
```

### 12.2 Produção (Proposta)
| Serviço | Plataforma | Justificativa |
|---------|------------|---------------|
| Frontend (Next.js) | Vercel | SSR + PWA, integração nativa |
| Backend API | Railway ou Render | Docker support, auto-scaling |
| Banco de Dados | Supabase PostgreSQL ou Railway DB | Managed, backups automáticos |
| Redis | Upstash (serverless) | Redis compatível via API |
| WhatsApp | Meta Cloud API + servidor backend | Gratuito até 1k mensagens |
| CDN/Static | Vercel Edge | Global CDN |
| Monitoring | Sentry | Error tracking |

### 12.3 CI/CD
- GitHub Actions para lint, typecheck, testes e deploy automático
- Branch protection rules
- Preview deployments para PRs

---

## 13. Estrutura de Diretórios (Proposta)

```
/lembre-me/
├── apps/
│   ├── web/                          # Next.js App (PWA)
│   │   ├── app/                      # App Router (Next.js 14)
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx          # Dashboard principal
│   │   │   │   ├── reminders/
│   │   │   │   │   ├── page.tsx      # Listagem
│   │   │   │   │   ├── new/page.tsx  # Criar
│   │   │   │   │   └── [id]/edit/    # Editar
│   │   │   │   ├── categories/
│   │   │   │   └── settings/
│   │   │   ├── api/                  # Route handlers (API routes)
│   │   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   │   ├── reminders/route.ts
│   │   │   │   └── ...
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── reminders/
│   │   │   │   ├── ReminderCard.tsx
│   │   │   │   ├── ReminderForm.tsx
│   │   │   │   └── ReminderList.tsx
│   │   │   └── layout/
│   │   │       ├── Navbar.tsx
│   │   │       └── Sidebar.tsx
│   │   ├── hooks/
│   │   │   └── useReminders.ts
│   │   ├── lib/
│   │   │   ├── prisma.ts
│   │   │   └── utils.ts
│   │   ├── public/
│   │   │   ├── manifest.json
│   │   │   ├── sw.js
│   │   │   └── icons/
│   │   └── prisma/
│   │       └── schema.prisma
│   │
│   └── worker/                         # Background worker (Node.js)
│       ├── src/
│       │   ├── index.ts              # BullMQ worker setup
│       │   ├── whatsapp-handler.ts    # Processa webhooks WhatsApp
│       │   ├── reminder-checker.ts    # Verifica lembretes devidos
│       │   ├── whatsapp-client.ts     # Wrapper API WhatsApp Cloud
│       │   └── command-parser.ts      # Interpreta comandos WhatsApp
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── shared/                         # Tipos e utilitários compartilhados
│   │   ├── types/
│   │   └── constants/
│   └── config/                         # Configurações ESLint, TS
│
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── turbo.json                          # Turborepo (monorepo)
└── README.md
```

---

## 14. Fluxo Principal — Criar Lembrete via WhatsApp

```
1. Usuário digita no WhatsApp:
   "/lembrete Reunião com João | Apresentação projeto | 18/09/2026 14:00 | Trabalho"

2. Webhook recebe mensagem → Salvar em whatsapp_messages (inbound)

3. Command Parser:
   - Detecta comando: /lembrete
   - Extrai campos via regex:
     • título: "Reunião com João"
     • descrição: "Apresentação projeto"
     • data/hora: "18/09/2026 14:00" → ISO 8601
     • categoria: "Trabalho"

4. Validação:
   - Data válida? Sim
   - Usuário existe? Sim (pelo phone_number)
   - Categoria existe? Sim (Trabalho é padrão)

5. Criar lembrete no banco (reminders)

6. Agendar no BullMQ para notificação no horário

7. Enviar resposta via WhatsApp:
   "✅ Lembrete criado!
    📌 Reunião com João
    📅 18/09/2026 14:00
    🏷 Trabalho
    🔁 ID: abc-123"

8. No horário programado (18/09 14:00):
   - BullMQ dispara a job
   - Worker busca o lembrete do banco
   - Envia via WhatsApp Cloud API:
     "🔔 Lembrete: Reunião com João — Apresentação projeto"
   - Marca whatsapp_notified = TRUE
```

---

## 15. Fluxo Principal — Usuário interage via Web

```
1. Usuário abre PWA no navegador Android
2. Login (email/senha ou Google)
3. Dashboard mostra lembretes ativos (fetched via REST API)
4. Usuário clica "+ Nova"
5. Formulário: título, descrição, data/hora picker, categoria dropdown, alertas pré-definidos
6. POST /api/v1/reminders → cria no banco + agenda no BullMQ
7. Confirmação visual no app
8. No horário → notificação WhatsApp automática
```

---

## 16. Estimativa de Cronograma

| Fase | Tarefa | Duração |
|------|--------|---------|
| **Fase 1** | Setup do monorepo, Docker, CI/CD, autenticação | 1 semana |
| **Fase 2** | CRUD de lembretes (web), modelo de dados, API REST | 1.5 semanas |
| **Fase 3** | Integração WhatsApp Cloud API (receber/enviar) | 1.5 semanas |
| **Fase 4** | Parser de comandos WhatsApp + criação via WhatsApp | 1 semana |
| **Fase 5** | Scheduler/notificações (BullMQ + worker) | 1 semana |
| **Fase 6** | PWA (service worker, manifest, installable) | 1 semana |
| **Fase 7** | Testes, ajustes, deploy, documentação | 1 semana |
| **Total** | | **~8 semanas** |

---

## 17. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Meta aprovar templates lentamente | Atraso em notificações | Usar mensagens de texto simples inicialmente; submeter templates no dia 1 |
| WhatsApp Webhook delivery falha | Perda de mensagens | Implementar retry com exponential backoff; log em whatsapp_messages |
| PWA não instalável em alguns Androids | Experiência degradada | Verificar compatibilidade com Lighthouse PWA audit; fallback ao navegador |
| BullMQ perdar jobs em crash | Lembretes não enviados | Persistência em Redis com AOF; monitoramento de fila vazia |
| Abuso (criar milhares de lembretes) | Custo WhatsApp | Rate limits por usuário (max 50 lembretes/dia); verificação humana se exceder |

---

## 18. Decisões Arquiteturais (ADR)

### ADR-001: Monorepo (Turborepo)
- **Decisão:** Frontend e worker em monorepo
- **Justificativa:** Compartilhamento de tipos/interfaces, commits atômicos

### ADR-002: Next.js como app web
- **Decisão:** Next.js 14 com App Router
- **Justificativa:** SSR/SSG nativo, API routes, PWA via next-pwa, ecossistema React

### ADR-003: PostgreSQL sobre MongoDB
- **Decisão:** Banco relacional
- **Justificativa:** Lembretes têm relacionamentos claros (user, category), consultas complexas (filtrar, ordenar, agrupar), integridade referencial

### ADR-004: WhatsApp Cloud API (Meta) sobre Twilio
- **Decisão:** Meta Cloud API direta
- **Justificativa:** Custo (1000 mensagens grátis/mês), sem intermediário, controle total

### ADR-005: BullMQ sobre Node-cron puro
- **Decisão:** Fila com BullMQ + Redis
- **Justificativa:** Filas retryáveis, priorização, delay jobs, monitoramento via UI (Bull Board)

---

*Fim do documento de arquitetura e especificações.*
