# Safa.IA

Agente de IA que monitora contratos de honorários de advogados iniciantes:
lê os contratos, extrai as cláusulas de pagamento e consolida tudo em um
dashboard de fluxo de caixa com insights.

Projeto do Hackathon da Cidadania — OAB-PR, categoria Inovação Aberta e Cidadania.

## Stack
- Frontend: Next.js 16, React 19, TypeScript
- Dados: Prisma + PostgreSQL
- IA: SDK de LLM com tool-calling (extração + insights)
- UI: Tailwind CSS, shadcn/ui, Recharts

## Estrutura e donos de pasta

| Pasta | Dono | Responsabilidade |
|---|---|---|
| `prisma/` | Banco de dados | schema, migrations, seed |
| `app/api/` | Backend | endpoints (contratos, fluxo-caixa, pagamentos, chat) |
| `lib/ai/` | IA | extração de contrato, prompts, insights |
| `app/(dashboard)/` | Frontend | telas: upload, tabela, gráfico, chat |
| `lib/types.ts` | Compartilhado | contrato de tipos entre as camadas — avisar o grupo antes de editar |

## Setup

1. `cp .env.example .env` e preencher com a URL do banco compartilhado (Neon/Supabase) e a chave de LLM
2. `npm install`
3. `npx prisma migrate dev`
4. `npm run dev`

O módulo da Parte B expõe `POST /api/chat`. A API do Gemini responde ao chat;
a API do Google Drive resolve os links dos contratos de origem. Consulte
`lib/ai/README.md` para as variáveis e o formato da requisição.

## Fluxo de branch

- `main` sempre funcional, protegida — sem push direto
- 1 branch por tarefa: `feat/schema-contratos`, `feat/api-fluxo-caixa`, `feat/extracao-pdf`, `feat/dashboard-tabela`
- Commits pequenos, PR assim que uma parte fecha
- Rodar `npx prisma generate` sempre que `prisma/schema.prisma` mudar
