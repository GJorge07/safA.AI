# Safa.IA

**Um assistente que lê seus contratos de honorários e te mostra quanto você vai receber, e quando.**

Você joga o contrato lá dentro. Ele lê sozinho, entende as regras de pagamento, monta o calendário de
recebimentos e ainda avisa quando alguém atrasou. Sem digitar nada em planilha.

Projeto do **Hackathon da Cidadania — OAB-PR**, categoria Inovação Aberta e Cidadania (12 e 13/09/2026).
Livre para usar, copiar e modificar (licença MIT).

---

> **Este documento tem duas partes.**
> **Parte 1 — Para todo mundo:** o que é, para quem serve e como usar. Não precisa entender de tecnologia.
> **Parte 2 — Para quem vai instalar ou programar:** como rodar o sistema e como ele foi construído.

---

# PARTE 1 — Para todo mundo

## O problema que a gente resolve

Todo advogado tem contratos com regras de pagamento diferentes:

- **Fixo:** um valor combinado, à vista ou parcelado.
- **Êxito:** você só recebe se ganhar a causa, e normalmente é uma porcentagem.
- **Misto:** um pouco de cada — uma parte fixa agora, uma parte se ganhar depois.

Cada contrato tem sua própria cláusula, com seu próprio vencimento, escrita de um jeito diferente.
Quem está começando e não tem um financeiro para cuidar disso acaba assim:

- não sabe quanto vai entrar no mês que vem;
- descobre tarde que uma parcela venceu e ninguém pagou;
- não percebe que quase toda a sua receita depende de um cliente só — e se esse cliente sumir, sobra nada;
- perde tempo relendo contrato atrás de "aquela cláusula do pagamento".

A saída de sempre é uma planilha. Só que **planilha não lê contrato**: ela organiza o que você já digitou
na mão, uma linha por vez. O Safa.IA lê o contrato por você.

**Para quem é:** advogados em geral, e principalmente quem está começando ou trabalha por conta própria,
sem estrutura financeira nenhuma. O caso típico: recém-formado, com vários contratos ativos, e nenhuma
ideia de quanto vai receber no mês seguinte.

## O que o Safa.IA faz

**1. Lê o contrato no seu lugar.**
Você envia o arquivo do contrato (PDF ou Word) ou aponta a pasta do seu Google Drive. Ele lê, encontra
quem é o cliente, que tipo de honorário é, qual o valor e em quantas vezes — e monta tudo já organizado.

**2. Mostra sempre de onde tirou a informação.**
Isso é o mais importante. Ao lado de cada valor que ele preencheu, aparece **o trecho exato do contrato**
de onde aquilo saiu. Você bate o olho e confere. Se a leitura ficou em dúvida, ele **para e pergunta**
em vez de chutar um número.

**3. Junta tudo num calendário de recebimentos.**
Um gráfico simples, mês a mês, com duas informações: **o que está previsto** (o que deveria entrar) e
**o que já entrou de verdade**. A diferença entre as duas barras é exatamente o seu problema do mês.

**4. Avisa sobre o que merece atenção.**
Sem você pedir, ele aponta coisas como: "esta parcela venceu há 12 dias e não foi paga" ou
"60% do que você tem a receber vem de um único cliente".

**5. Responde perguntas em português.**
Tem um chat. Você pergunta como falaria com uma pessoa, e ele responde com base nos seus contratos —
citando de qual contrato tirou a resposta.

## Como usar, passo a passo

Depois que o sistema estiver aberto no navegador, existem três telas, e só. O menu fica na lateral esquerda.
(A aba antiga `/contratos` continua funcionando: ela redireciona para `/pagamentos`.)

### Tela **Início** — como estou e o que faço agora

É a primeira que abre, e responde duas perguntas nessa ordem. Navegar contratos é trabalho da tela de
Pagamentos — por isso aqui não há lista de contratos.

**Como estou:**

- **o gráfico Fluxo de caixa:** por mês, o previsto, o que entrou e o que saiu em despesas. Clique no
  card para abrir a visão expandida (barras, linha ou por cliente, em 3, 6 ou 12 meses);
- **quanto sobrou este mês:** o recebido menos as despesas pagas — o número que o honorário sozinho
  não conta;
- **quanto está em atraso** e **quantos clientes ativos** você tem;
- **a carteira por tipo:** quanto do seu contratado depende de ganhar a causa (êxito) e quanto é fixo.

Os três números da coluna da direita são clicáveis e caem na lista que os explica: as despesas do
mês, os contratos vencidos e a relação de clientes ativos (`/clientes`).

**O que faço agora:** o painel **Pendências** junta as três formas de o seu dinheiro ficar
parado — parcela vencida, serviço prestado e não recebido, e o que você adiantou pelo cliente e não
cobrou. Sempre o mais antigo primeiro, com um clique que leva direto ao lugar de resolver.

### Tela **Pagamentos** — o que entra e o que sai

No topo, três números que só fazem sentido juntos: **a receber no mês**, **a pagar no mês** e o
**saldo projetado**. Abaixo, duas abas.

#### Aba **Recebimentos** — o que entra

Dividida em duas, porque o dinheiro entra por caminhos diferentes:

- **Por contrato** — os honorários: valor fechado, parcelas com vencimento e cláusula original para
  conferir.
- **Serviços avulsos** — o que você cobra sem contrato: consulta, parecer, petição avulsa, audiência
  fora do que foi contratado. Cobrança única, sem parcela. Um serviço pode ser amarrado a um caso já
  contratado (a audiência extra no meio do processo), e aí soma à receita daquele processo.

##### Por contrato

Duas formas de colocar um contrato no sistema:

- **Sincronizar com o Google Drive (o jeito recomendado).** Você indica uma pasta do seu Drive uma vez.
  Dali em diante, contrato novo que cair naquela pasta entra sozinho — você não precisa fazer nada
  arquivo por arquivo.
- **Enviar manualmente.** Para um caso avulso: clique em "Enviar manualmente", escolha o arquivo
  (PDF, Word ou texto) e pronto.

Logo abaixo fica a lista dos contratos lidos, em tabela, 20 por página — com busca por cliente,
documento ou número e um filtro de situação (atrasados, vencem em 7 dias, em dia, quitados) que já
mostra a contagem de cada um. Os filtros ficam no endereço da página: dá para mandar para alguém o
link de *todos os atrasados*.

**Clique em qualquer contrato** para abrir a ficha dele. Se estiver atrasado, a primeira coisa que
aparece é o bloco de cobrança: qual parcela venceu, há quantos dias, quanto está em aberto, e o
telefone e o e-mail de quem deve — com um botão que copia a mensagem de cobrança já escrita. Nas abas
da ficha você vê as parcelas (e registra um pagamento), **a cláusula original do contrato ao lado do
que o sistema entendeu**, os dados e os outros contratos do mesmo cliente, e as despesas daquele caso.

#### Aba **Despesas** — o que sai do caixa

Dividida em duas, porque são coisas diferentes:

- **Do processo** — o transporte até o juizado, o estacionamento no fórum, a guia de custas, a
  diligência do oficial, as cópias no cartório. Gastos pequenos, frequentes, pagos do próprio bolso.
  Cada um é amarrado a um caso, e você diz **quem arca**: se é você, o valor é abatido do que aquele
  processo rende; se é o cliente, fica marcado como **a reembolsar** até você registrar que cobrou.
- **Do escritório** — aluguel, software, tributos, contabilidade. Custo fixo, não pertence a caso
  nenhum.

O lançamento é manual e leva segundos: há atalhos para "Ida ao fórum", "Estacionamento", "Custas",
"Cópias" e "Diligência". Se preferir, "Ler de um comprovante" usa a IA para preencher o formulário a
partir de um recibo — mas nada é lançado sem você confirmar.

Na ficha de cada contrato aparece **quanto sobra daquele caso**: honorário contratado menos os gastos
que saem do seu bolso, com o aviso de quanto você já adiantou e ainda não cobrou do cliente. É a conta
que quase ninguém faz no começo — e é onde o prejuízo costuma aparecer.

### Tela **Safa AI** — o chat

Escreva a pergunta como você falaria com um colega. Exemplos que funcionam bem:

- *"Quanto eu tenho a receber nos próximos três meses?"*
- *"Tem alguma parcela atrasada?"*
- *"Qual cliente representa a maior parte da minha receita?"*
- *"Quais contratos são só de êxito?"*
- *"Quanto o cliente João já me pagou?"*

Toda resposta vem com a fonte: de qual contrato e de qual campo aquele número saiu. Se a informação não
existir nos seus contratos, ele diz que não sabe — não inventa.

## Perguntas frequentes

**Preciso entender de tecnologia para usar?**
Não. Enviar um arquivo e digitar uma pergunta é tudo.

**E se a inteligência artificial ler o contrato errado?**
Por isso a cláusula original fica sempre visível ao lado do dado. Você confere em segundos. E quando o
contrato não deixa alguma informação clara, o sistema marca como **"precisa de revisão"** e pede sua
confirmação, em vez de preencher um valor qualquer.

**Ele mexe nos meus contratos ou no meu Drive?**
Não. Ele só lê. Nada é alterado ou apagado nos seus arquivos.

**Ele entra no meu banco ou no processo no tribunal?**
Não, e isso é de propósito nesta versão. O pagamento recebido é você que registra, com um clique.
Conectar com banco e com tribunal está no plano futuro, não nesta primeira versão.

**Funciona com contrato escaneado (foto do papel)?**
Ainda não. O arquivo precisa ter texto de verdade — aquele em que você consegue selecionar e copiar as
palavras. Contrato que é só imagem precisaria de um passo a mais que esta versão ainda não tem.

**Serve para qualquer contrato?**
Esta é uma versão de demonstração feita em dois dias de hackathon. Ela foi testada com contratos de
honorários comuns (fixo, êxito e misto). Contratos muito fora do padrão podem exigir revisão manual.

## O que esta versão ainda não faz

Somos francos sobre isso, porque é um protótipo de hackathon:

- **não conecta com banco** (Open Finance) nem com o sistema dos tribunais (PJe) — o recebimento é registrado por você;
- **não tem login com senha por usuário** — foi feito para um usuário só, para a demonstração;
- **não lê contrato escaneado** (sem texto selecionável);
- **não calcula margem de lucro**, porque não pedimos os seus custos em lugar nenhum;
- na demonstração, **algumas telas ainda mostram contratos de exemplo**, para o gráfico ficar bonito
  no pitch. A leitura de contrato de verdade funciona e está ligada por trás.

---

# PARTE 2 — Para quem vai instalar ou programar

A partir daqui o texto é técnico. Documentação completa da API em [`docs/api.md`](docs/api.md) e do
módulo de IA em [`lib/ai/README.md`](lib/ai/README.md).

## Como rodar

**Requisitos:** Node.js 22.15+ ou 24, um banco PostgreSQL (usamos um compartilhado em free tier —
Neon/Supabase) e uma chave da API do Gemini. Credenciais do Google Drive são opcionais.

```bash
git clone https://github.com/GJorge07/safA.AI.git
cd safA.AI
npm install

cp .env.example .env      # preencha DATABASE_URL e GEMINI_API_KEY
npx prisma generate       # rode sempre que prisma/schema.prisma mudar
npx prisma db push        # cria as tabelas (ainda não há migrations versionadas)
npm run db:seed           # popula com dados de demonstração

npm run dev               # abre em http://localhost:3000
```

### Variáveis de ambiente

| Variável | Obrigatória | Para quê |
|---|---|---|
| `DATABASE_URL` | sim | conexão com o PostgreSQL |
| `GEMINI_API_KEY` | para extração e chat | chave da API do Gemini. **Nunca** use prefixo `NEXT_PUBLIC_` |
| `GEMINI_MODEL` | sim | modelo com suporte a PDF e saída estruturada (ex.: `gemini-3.8-flash`) |
| `SEED_VOLUME` | opcional | `0` faz `npm run db:seed` popular apenas os dados do pitch, sem o volume |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` | opcional | importação via Google Drive. São credenciais independentes do Gemini e exigem a Google Drive API ativa no projeto Cloud |

As rotas financeiras funcionam sem Gemini. Sem `driveFileIds`, o chat funciona e devolve `fontes: []`.

### Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` / `npm start` | build e execução de produção |
| `npm test` | testes de API (`tests/`) e de IA (`lib/ai/*.test.ts`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run eval:extraction` | roda os 6 cenários de avaliação da extração (consome a API do Gemini) |
| `npm run prisma:generate` | regenera o client do Prisma |
| `npm run db:seed` | popula o banco: 123 clientes, 184 contratos, 47 serviços e 66 despesas de demonstração |
| `SEED_VOLUME=0 npm run db:seed` | popula **só** o conjunto pequeno do pitch (3 clientes, 4 contratos) e remove o volume |

## Como funciona por dentro

```text
 Google Drive  ─┐
                ├─→  PDF / DOCX / TXT  →  Gemini (saída estruturada)
 Upload manual ─┘                              │
                                               ▼
                                    Validação Zod + evidências
                                    (todo campo aponta para o
                                     trecho literal do contrato)
                                               │
                          ┌────────────────────┴──────────────────┐
                          ▼                                       ▼
               revisão necessária (HTTP 202)              payload válido
               → confirmação do usuário                          │
                                                                 ▼
                                                   PostgreSQL (Prisma)
                                            Cliente → Contrato → Parcela → Pagamento
                                                                 │
                              ┌──────────────────────────────────┼──────────────────┐
                              ▼                                  ▼                  ▼
                    /api/fluxo-caixa                      /api/insights         /api/chat
                    previsto × recebido                   atraso, concentração  resposta com citações
                              └──────────────── Dashboard (Next.js + Recharts) ────┘
```

**Três camadas de IA:**

1. **Extração** (`lib/ai/extract-contract.ts`) — Gemini com *structured output*, validado por Zod contra
   `ContratoExtraido` em `lib/types.ts`. Nada é gravado automaticamente: faltando campo obrigatório
   (ex.: contrato só de êxito, sem valor total), a rota devolve `status: "revisao_necessaria"` em vez de
   gravar zero.
2. **Rastreabilidade** (`lib/ai/evidence.ts`) — cada campo carrega `campo`, `trecho`, `pagina` e `clausula`,
   e o sistema confere se o trecho existe literalmente na página indicada antes de liberar o payload.
3. **Chat e insights** (`lib/ai/answer-financial-question.ts`, `lib/ai/insights.ts`) — o chat não relê o
   contrato: recebe o JSON financeiro já estruturado e responde com `citacoes` apontando para caminhos
   reais (`parcelas.0.vencimento`, `resumo.pendente`); IDs inexistentes são rejeitados. Os insights são
   determinísticos, em código puro, sem LLM.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, lucide-react
- **Dados:** Prisma 6 + PostgreSQL (banco compartilhado, não local — todos testam contra o mesmo dado)
- **IA:** `@google/genai` (Gemini, saída estruturada) + Zod
- **Leitura de arquivos:** `pdf-parse` (PDF), `mammoth` (DOCX)

Monorepo TypeScript de propósito: evita fronteira de linguagem entre front e back em 2 dias com 4 devs.

## Estrutura de pastas

| Pasta | Dono | Responsabilidade |
|---|---|---|
| `prisma/` | Banco | `schema.prisma` — fonte de verdade do modelo |
| `app/api/` | Backend | endpoints REST |
| `lib/api/` | Backend | regras financeiras puras e testáveis (`finance.ts`) |
| `lib/ai/` | IA | extração, evidências, prompts versionados, chat, insights |
| `app/(dashboard)/` | Frontend | telas: início, pagamentos (recebimentos/despesas), agente |
| `components/dashboard/` | Frontend | gráfico, lista, chat, upload, sync do Drive |
| `components/ui/` | Frontend | primitivos shadcn/ui |
| `lib/types.ts` | **Compartilhado** | contrato de tipos entre as 4 camadas |

Cada camada depende só da **interface** da vizinha (schema → API → UI), nunca do código interno dela.
`prisma/schema.prisma` e `lib/types.ts` são compartilhados — mudanças neles são avisadas no grupo antes do commit.

## Modelo de dados

Fonte de verdade: [`prisma/schema.prisma`](prisma/schema.prisma).

```text
Cliente ──1:N──> Contrato ──1:N──> Parcela ──1:1(opcional)──> Pagamento
```

| Modelo | Campos principais |
|---|---|
| `Cliente` | `id`, `nome` |
| `Contrato` | `clienteId`, `tipoPagamento` (`FIXO` \| `EXITO` \| `MISTO`), `valorTotal` (Decimal 14,2), **`clausulaOriginal`** |
| `Parcela` | `contratoId`, `valor`, `vencimento` |
| `Pagamento` | `parcelaId` (único), `valorPago`, `dataPago` |

- `clausulaOriginal` é obrigatória: nenhum dado extraído entra no banco sem o trecho que o originou.
- Exclusão em cascata: contrato → parcelas → pagamentos.
- A soma das parcelas **não precisa** bater com `valorTotal` — contrato de êxito tem cronograma incompleto por natureza.
- Um pagamento por parcela; pagamentos parciais múltiplos exigiriam mudança de schema.

## API

| Rota | Métodos | Comportamento |
|---|---|---|
| `/api/clientes` · `/api/clientes/[id]` | GET, POST, PUT, DELETE | CRUD de clientes |
| `/api/contratos` | GET, POST | lista (filtro `clienteId`); cria contrato + parcelas atomicamente |
| `/api/contratos/[id]` | GET, PUT, DELETE | detalhe com cliente, parcelas e pagamentos |
| `/api/contratos/[id]/parcelas` | GET, POST | parcelas do contrato |
| `/api/parcelas/[id]` | PUT, DELETE | edita/exclui parcela |
| `/api/parcelas/[id]/pagamento` | POST, PUT, DELETE | registra, corrige ou remove o pagamento |
| `/api/fluxo-caixa` | GET | previsto (por vencimento) × recebido (por data do pagamento), por mês |
| `/api/servicos` | GET, POST | lista paginada (busca, tipo, situação, caso); registra serviço avulso |
| `/api/servicos/[id]` | GET, PATCH, DELETE | detalhe; marca como recebido; exclui |
| `/api/despesas` | GET, POST | lista paginada (busca, tipo, categoria, situação, ordenação, caso); lança despesa |
| `/api/despesas/[id]` | GET, PATCH, DELETE | detalhe; marca como paga ou cobrada do cliente; exclui |
| `/api/despesas/extrair` | POST | lê recibo/guia (PDF, DOCX, TXT ou `driveFileId`) e devolve rascunho — não grava |
| `/api/contratos/[id]/opiniao` | POST | avaliação da IA sob demanda para um contrato já gravado |
| `/api/insights` | GET | alertas de atraso e concentração de receita |
| `/api/contratos/extrair` | POST | extração simples (PDF/TXT/texto) para revisão |
| `/api/contratos/importar` | POST | pipeline completo com evidências (PDF/DOCX/Drive) |
| `/api/chat` | POST | pergunta + dados financeiros → resposta com citações |
| `/api/health` | GET | health check |

Erros em `{ "error": "mensagem" }`; `201` na criação, `204` na exclusão; `400` inválido, `404` inexistente,
`409` pagamento duplicado, `413` corpo grande, `415` formato não suportado, `502/503/504` para falhas do
provedor de IA. Dinheiro como string decimal (2 casas); datas `YYYY-MM-DD` ou ISO, agrupamento mensal em
UTC. Listagens aceitam `page` e `limit` (máx. 100). **Nem `/extrair` nem `/importar` gravam contratos
automaticamente.**

```bash
# Extração a partir de texto
curl http://localhost:3000/api/contratos/extrair \
  -H 'Content-Type: application/json' \
  -d '{"texto":"Cliente Ana. Honorários fixos de R$ 600,00, vencimento em 10/10/2026."}'

# Pipeline completo, por arquivo ou por ID do Drive
curl http://localhost:3000/api/contratos/importar -F 'file=@contrato.pdf'
curl http://localhost:3000/api/contratos/importar \
  -H 'Content-Type: application/json' -d '{"driveFileId":"ID_DO_ARQUIVO"}'

curl 'http://localhost:3000/api/fluxo-caixa?inicio=2026-01-01&fim=2026-12-31'
curl http://localhost:3000/api/insights
```

## Módulo de IA

```ts
import { extractContract, adaptToBackend } from "@/lib/ai";

const extraction = await extractContract({ kind: "text", text: contrato });
// Só converte quando todos os campos obrigatórios existem;
// caso contrário lança ExtractionNeedsReviewError — nunca converte null em zero.
const payload = adaptToBackend(extraction);
```

- `extractContractFile` aceita PDF, DOCX e TXT (até 20 MB; o PDF precisa ter texto pesquisável).
- Prompts versionados em [`lib/ai/prompts/`](lib/ai/prompts/) (`extraction-v1`, `chat-v1.1`, `insights-v1`)
  com [`HISTORY.md`](lib/ai/prompts/HISTORY.md).
- Avaliação: `lib/ai/eval-cases.ts` traz 6 cenários fictícios (fixo à vista, fixo parcelado, êxito, misto
  e dois ambíguos); `npm run eval:extraction` reporta quantos passam integralmente. Não rode com documentos
  reais em projeto Gemini sem faturamento e proteção de dados configurados.
- Limites: corpo até 10 MiB, texto até 100 mil caracteres, timeout de 45s por chamada.

**Decisão de schema em aberto:** `ContratoExtraido` exige `valorTotal: number`, mas contrato só de êxito
pode não ter valor conhecido, e o schema não tem campos para percentual e base de cálculo do êxito. A
extração interna preserva `valorTotal: number | null`, `honorariosExito.percentual`,
`honorariosExito.baseCalculo`, `confianca` e `avisos`; o adaptador nunca transforma `null` em zero.

## Testes

```bash
npm test        # API + IA
npm run lint
npm run typecheck
npm run build
```

Usam o runner nativo do Node com Prisma e `fetch` substituídos: **não conectam ao banco nem consomem a
API do Gemini**. Cobrem validação, CRUD, erros de vínculo e duplicidade, cálculo mensal, insights,
evidências e adaptação do payload. Testes de integração com banco e Gemini reais continuam necessários
para validar credenciais e infraestrutura.

## Estado atual do código

| Parte | Estado |
|---|---|
| Backend CRUD, fluxo de caixa, insights | ✅ implementado sobre Prisma/PostgreSQL, com testes |
| Extração por IA (`/extrair`, `/importar`) | ✅ implementada, com validação Zod e checagem de evidências |
| Chat (`/api/chat`) | ✅ implementado; o painel do frontend chama a rota real |
| Insights determinísticos | ✅ `atraso` e `concentracao_cliente`. `margem_baixa` não é emitido — o schema não tem custos |
| Dashboard (gráfico, lista, filtros) | ✅ telas completas, **ainda alimentadas por `lib/mock-data.ts`** |
| Upload e sync do Drive na tela | ⚠️ fluxo visual simulado; as rotas por trás existem e funcionam via API |
| Migrations versionadas | ⚠️ ainda não — use `prisma db push` |

## Próximos passos

1. Trocar `lib/mock-data.ts` pelas chamadas reais nas telas de início e contratos.
2. Ligar o upload e a sincronização do Drive da interface à rota `/api/contratos/importar`.
3. Versionar migrations do Prisma.
4. Estender o schema para percentual/base de cálculo do êxito e para custos (habilitando `margem_baixa`).
5. Autenticação e isolamento por escritório.

## Referências de mercado

Nenhum produto junta hoje as três pontas do Safa.IA (leitura por IA + projeção de caixa + insight
comparativo para o advogado autônomo). Usadas só como inspiração de fluxo e UX: **JusCash** e **Lucree**
(Brasil, lado financeiro/pagamento), **ChatFin** (IA sobre contrato + finanças, mas não para o autônomo),
**Spellbook/Ironclad** (IA lendo contrato, sem foco financeiro) e **Conta Azul/Nibo** (gestão genérica —
exatamente o cenário "sem IA").

## Licença

**MIT.** Conforme o item 2.3 do edital, documentação técnica, modelos de dados e guias de implantação são
entregues em formato aberto: este `README.md`, o [`CLAUDE.md`](CLAUDE.md), [`docs/api.md`](docs/api.md),
[`prisma/schema.prisma`](prisma/schema.prisma) e os prompts versionados em [`lib/ai/prompts/`](lib/ai/prompts/).
