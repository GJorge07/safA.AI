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

1. `cp .env.example .env.local` e preencher a chave do Gemini e, para arquivos do Drive, as credenciais OAuth
2. `npm install`
3. `npx prisma migrate dev`
4. `npm run dev`

## Rotas disponíveis

- `POST /api/contratos/extrair`: recebe `multipart/form-data` com `file`, ou
  JSON com `{ "driveFileId": "..." }`.
- `POST /api/chat`: recebe `{ "pergunta": "...", "dados": { ... },
  "driveFileIds": [] }`.
- `GET /api/drive/status`: informa se as três credenciais OAuth foram configuradas.
- `GET /api/drive/arquivos`: lista PDFs, DOCX, TXT e Google Docs disponíveis.

Para limitar a listagem a uma pasta, preencha `GOOGLE_DRIVE_FOLDER_ID`. O
backend usa OAuth 2.0 com acesso somente de leitura: troca o refresh token por
um access token temporário, lista os arquivos e baixa apenas o contrato
selecionado. Google Docs são exportados automaticamente para DOCX.

As rotas ficam no App Router do Next.js, sempre em arquivos chamados
`route.ts`. Requisições `GET` retornam `405`, pois os dois endpoints aceitam
somente `POST`.

## Fluxo de branch

- `main` sempre funcional, protegida — sem push direto
- 1 branch por tarefa: `feat/schema-contratos`, `feat/api-fluxo-caixa`, `feat/extracao-pdf`, `feat/dashboard-tabela`
- Commits pequenos, PR assim que uma parte fecha
- Rodar `npx prisma generate` sempre que `prisma/schema.prisma` mudar
