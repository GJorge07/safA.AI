# Safa.IA

Agente de IA que monitora os pagamentos de honorários de advogados iniciantes:
lê os contratos (PDF/DOCX), extrai automaticamente as cláusulas de pagamento,
consolida tudo num fluxo de caixa projetado e responde perguntas em linguagem
natural com insights comparativos entre contratos.

Projeto do **Hackathon da Cidadania — OAB-PR**, categoria **Inovação Aberta e
Cidadania** (12–13/09/2026, pitch dia 13 às 15h). É um **protótipo/MVP de
hackathon**, não um produto de produção — priorize o caminho fim-a-fim
funcionando sobre robustez, cobertura de casos ou polimento.

## Problema que o projeto resolve

Honorários fragmentados em contratos com regras de pagamento distintas (fixo,
êxito, misto) deixam advogados — principalmente os iniciantes, sem financeiro
dedicado — sem visão consolidada do fluxo de caixa, gerando insegurança,
desorganização e imprevisibilidade. A alternativa "sem IA" é uma planilha
manual: organiza o que já foi digitado, mas não lê contrato nenhum sozinha e
não gera insight algum. O diferencial de IA é justamente ler o contrato e
raciocinar sobre os dados extraídos.

## Personas

Advogados no geral, mas principalmente os iniciantes/autônomos sem estrutura
financeira própria — ex.: recém-formado com vários contratos ativos e nenhuma
visão de quanto vai receber no mês seguinte.

## Escopo do MVP (o que fazer e o que NÃO fazer)

Fazer:
- Upload de contrato (PDF/DOCX) **ou** contrato puxado automaticamente do
  Google Drive do advogado via API (integração Drive) → extração automática
  via LLM → dado estruturado gravado no banco, sempre com a cláusula
  original guardada junto para o advogado conferir.
- Sincronização com Drive: o sistema varre uma pasta indicada pelo usuário e
  importa novos contratos automaticamente, sem precisar de upload manual a
  cada arquivo.
- Dashboard com fluxo de caixa projetado (previsto x recebido por mês),
  tabela de contratos com status, e um chat de perguntas em linguagem natural
  sobre os dados já extraídos.
- 2–3 insights automáticos: atraso de pagamento, contrato com margem abaixo
  da média, concentração de receita num único cliente.

Não fazer neste MVP (fora de escopo, não gastar tempo):
- Integração bancária real (Open Finance) ou com tribunais (PJe) — status de
  processo e extrato bancário ficam manuais/fora do MVP.
- Autenticação multiusuário robusta — um usuário fixo já basta.
- Suporte a qualquer formato de contrato — só os formatos escolhidos para os
  contratos-exemplo de teste.

## Fontes de dados

- Contratos de honorários enviados manualmente pelo usuário (upload).
- Contratos **puxados automaticamente do Google Drive via API** (Google
  Drive API + OAuth do usuário) — fonte principal para reduzir trabalho
  manual do advogado.
- Registro manual dos pagamentos recebidos.
- Fora do MVP: status de processo e extrato bancário.

A integração com Drive entra em `lib/ai/` (ou um `lib/integrations/drive.ts`
dedicado) e é dela que a extração recebe os arquivos, além do upload manual —
as duas vias caem no mesmo pipeline de extração e no mesmo schema
`ContratoExtraido`.

## Indicadores de sucesso (para validar o que construímos)

Taxa de extração correta dos contratos, tempo de setup por contrato, número
de insights acionáveis gerados, e clareza do dashboard para um usuário leigo
(a banca examinadora, no pitch).

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Dados:** Prisma + PostgreSQL (banco compartilhado — Neon/Supabase free
  tier — não local, para todo mundo testar contra o mesmo dado)
- **IA:** SDK de LLM com tool-calling (Vercel AI SDK sobre Anthropic/OpenAI)
  para extração estruturada e para o chat de insights
- **UI:** Tailwind CSS, shadcn/ui, Recharts

Monorepo TypeScript de propósito: evita fronteira de linguagem entre
front/back em 2 dias de hackathon com 4 devs.

## Estrutura de pastas e donos

| Pasta | Dono | Responsabilidade |
|---|---|---|
| `prisma/` | Banco de dados | schema, migrations, seed |
| `app/api/` | Backend | endpoints (contratos, fluxo-caixa, pagamentos, chat) |
| `lib/ai/` | IA | extração de contrato, prompts, insights |
| `app/(dashboard)/` | Frontend | telas: upload, tabela, gráfico, chat |
| `lib/types.ts` | Compartilhado | contrato de tipos entre as 4 camadas |

Regra de ouro: cada camada só depende da **interface** da vizinha (schema →
API → UI), nunca do código interno dela. `prisma/schema.prisma` e
`lib/types.ts` são compartilhados — qualquer mudança neles é avisada no grupo
antes de commitar, porque afeta as outras 3 pessoas. Rode
`npx prisma generate` sempre que o schema mudar.

## Modelo de dados (resumo — a fonte de verdade é `prisma/schema.prisma`)

`Cliente` → `Contrato` (tipoPagamento: fixo/exito/misto, valorTotal,
clausulaOriginal) → `Parcela` (valor, vencimento) → `Pagamento` (opcional,
registro manual de recebido). O JSON de extração da IA deve bater exatamente
com `ContratoExtraido` em `lib/types.ts`.

## Fluxo de git

- `main` sempre funcional, protegida — sem push direto.
- Uma branch por tarefa, não por pessoa: `feat/schema-contratos`,
  `feat/api-fluxo-caixa`, `feat/extracao-pdf`, `feat/dashboard-tabela`.
- Commits pequenos e frequentes; abrir PR assim que uma parte fechar (nunca
  guardar o dia inteiro numa branch só).
- Antes de criar uma branch: `git checkout main && git pull origin main`.

## Referências de mercado (para inspiração, não para copiar)

Não existe um produto que já junte as três coisas que o Safa.IA propõe —
leitura automática de contrato por IA + projeção de fluxo de caixa + insight
comparativo entre clientes/contratos, para o advogado iniciante autônomo.
Cada referência abaixo cobre só um pedaço do problema; nenhuma é igual ao
Safa.IA, mas servem de inspiração de fluxo, posicionamento e UX:

- **JusCash** (Brasil) — antecipa honorários sucumbenciais e recebíveis
  judiciais para advogados. Resolve o sintoma financeiro (receita presa),
  mas via crédito/antecipação, não via monitoramento e insight de contrato.
- **Lucree** (Brasil) — pagamento parcelado para clientes de advogados, com
  dashboard de controle de transações. Foco é meio de pagamento, não
  análise financeira do próprio advogado.
- **ChatFin** — "AI contract analytics & legal finance" internacional; é o
  conceito mais próximo (IA lendo contrato + extraindo dado financeiro), mas
  não é voltado a advogado autônomo nem a fluxo de caixa pessoal.
- **Spellbook / Ironclad** — IA aplicada a contrato jurídico em geral
  (redação/revisão), útil como referência de "agente lendo contrato com
  LLM", mas sem foco financeiro.
- **Conta Azul / Nibo** — gestão financeira genérica com módulo para
  escritório de advocacia; é exatamente o cenário "sem IA" descrito no
  canvas (organiza o que foi digitado manualmente, não lê contrato sozinho).

Não modelar o Safa.IA como clone de nenhum desses — usar só como referência
de fluxo/UX pontual quando fizer sentido.

## Requisito do edital (não esquecer)

A categoria exige que documentação técnica, modelos de dados e guias de
implantação sejam entregues em **formato aberto**, sob **licença MIT** (item
2.3 do edital). Manter este `CLAUDE.md`, o `README.md` e os prompts de
extração em `lib/ai/` sempre atualizados e versionados serve como essa
documentação — não deixar para escrever no fim.

## Como trabalhar comigo (Claude) neste projeto

- Antes de mexer em `prisma/schema.prisma` ou `lib/types.ts`, avise que vai
  mudar um arquivo compartilhado.
- Ao gerar código de extração de IA, sempre validar a saída do LLM contra o
  schema de `ContratoExtraido` antes de considerar pronto.
- Prefira soluções simples e rápidas de implementar (é hackathon de 2 dias)
  a soluções "corretas" e generalizáveis — a menos que eu peça o contrário.
- Ao terminar uma tarefa, rode/valide o que der (lint, build, teste manual do
  endpoint) antes de dizer que está pronta.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
