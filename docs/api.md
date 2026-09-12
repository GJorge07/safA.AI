# API SAFA

Rotas implementadas com Next.js e Prisma. O schema permanece inalterado.
As rotas ainda não têm autenticação nem isolamento por escritório.

## Convenções

- Corpos de escrita em JSON, exceto upload na extração.
- Erros retornam `{ "error": "mensagem" }`.
- Novas rotas: `201` na criação, `200` em consultas/edições e `204` sem corpo na exclusão.
- Entradas inválidas: `400`; registros/vínculos inexistentes: `404`; pagamento duplicado: `409`.
- Dinheiro: número ou string decimal positiva, até 12 dígitos inteiros e duas casas decimais. Prefira strings nas escritas. O CRUD serializa `Decimal` como string; fluxo de caixa retorna números conforme `FluxoCaixaMes`.
- Datas: `YYYY-MM-DD` ou timestamp ISO com segundos e fuso explícito. Datas sem horário são armazenadas à meia-noite UTC. Agrupamento mensal e dia atual dos insights usam UTC.
- As novas listagens de contratos e parcelas retornam arrays e aceitam `page` (padrão 1) e `limit` (padrão 20, máximo 100).
- `PUT` exige todos os campos editáveis documentados abaixo.
- A API não exige que a soma das parcelas seja igual ao valor total: contratos podem ter cronograma incompleto ou componente de êxito. Editar parcelas não recalcula `valorTotal`.
- Exclusões seguem as cascatas do schema: excluir contrato apaga parcelas e pagamentos; excluir parcela apaga seu pagamento.

## Rotas

| Rota | Métodos | Comportamento |
| --- | --- | --- |
| `/api/clientes` | GET, POST | CRUD existente de clientes |
| `/api/clientes/[id]` | GET, PUT, DELETE | CRUD existente de clientes |
| `/api/contratos` | GET, POST | Lista com filtro opcional `clienteId`; cria contrato e parcelas atomicamente |
| `/api/contratos/[id]` | GET, PUT, DELETE | Detalhe com cliente, parcelas e pagamentos; edita campos do contrato; exclui |
| `/api/contratos/[id]/parcelas` | GET, POST | Lista parcelas com pagamento; adiciona parcela |
| `/api/parcelas/[id]` | PUT, DELETE | Edita valor e vencimento; exclui parcela |
| `/api/parcelas/[id]/pagamento` | POST, PUT, DELETE | Registra, corrige ou remove o único pagamento da parcela |
| `/api/fluxo-caixa` | GET | Previsto por vencimento e recebido pela data do pagamento |
| `/api/insights` | GET | Alertas calculados de atraso e concentração de receita prevista |
| `/api/contratos/extrair` | POST | Extrai PDF/TXT/texto usando Gemini para revisão |
| `/api/health` | GET | Health check existente da aplicação, sem consulta ao banco |

## Criar e editar contrato

`POST /api/contratos`:

```json
{
  "clienteId": "ID_DE_CLIENTE_EXISTENTE",
  "tipoPagamento": "fixo",
  "valorTotal": "1200.00",
  "clausulaOriginal": "Honorários de R$ 1.200,00 em duas parcelas de R$ 600,00.",
  "parcelas": [
    { "valor": "600.00", "vencimento": "2026-10-10" },
    { "valor": "600.00", "vencimento": "2026-11-10" }
  ]
}
```

Aceita `fixo`, `exito`, `misto` ou equivalentes em maiúsculas; persiste e retorna o enum em maiúsculas. `parcelas` é obrigatório, aceita lista vazia e até 600 itens na criação. Nome de cliente não substitui `clienteId`.

`PUT /api/contratos/[id]` recebe `clienteId`, `tipoPagamento`, `valorTotal` e `clausulaOriginal`. O campo `parcelas` é rejeitado: use as rotas de parcelas para preservar seus identificadores e pagamentos.

## Parcelas e pagamentos

`POST /api/contratos/[id]/parcelas` e `PUT /api/parcelas/[id]`:

```json
{ "valor": "600.00", "vencimento": "2026-10-10" }
```

`POST /api/parcelas/[id]/pagamento`:

```json
{ "valorPago": "600.00", "dataPago": "2026-10-11" }
```

`dataPago` é opcional apenas no POST, quando assume a data/hora atual do banco. No PUT, envie os dois campos. Um segundo POST para a mesma parcela retorna 409. O valor pago pode diferir do valor previsto; pagamento inferior mantém saldo devedor nos insights. Vários pagamentos parciais exigiriam uma alteração futura do schema.

## Fluxo de caixa e insights

Ambas as rotas aceitam `inicio=2026-01-01&fim=2026-12-31`. Informe os dois ou nenhum; o padrão é o ano corrente UTC. As datas são inclusivas e o período máximo é cinco anos. Meses sem movimento aparecem com zero no fluxo de caixa.

`GET /api/fluxo-caixa` também aceita `clienteId`:

```json
[
  { "mes": "2026-10", "previsto": 600, "recebido": 600 },
  { "mes": "2026-11", "previsto": 600, "recebido": 0 }
]
```

O previsto inclui todas as parcelas com vencimento no período, inclusive as pagas. Recebido considera pagamentos feitos no período, mesmo que a parcela vença fora dele. As duas consultas usam uma transação com snapshot consistente.

Insights não chamam IA: retornam `Insight[]` compatível com `lib/types.ts`.

- `atraso`: saldo positivo de parcelas vencidas antes de hoje UTC, agrupado por contrato. Só considera vencimentos no período consultado; para buscar anos anteriores, amplie o período.
- `concentracao_cliente`: cliente com mais de 50% dos valores previstos do período; retorna um alerta por contrato desse cliente com parcelas no período.
- `margem_baixa` não é emitido: não há custos no schema para calcular margem.

## Extração com Gemini

Configure `GEMINI_API_KEY` e `GEMINI_MODEL` no `.env`, conforme `.env.example`, e reinicie o servidor. Não use prefixo `NEXT_PUBLIC_` para a chave. O modelo precisa suportar PDF e saída estruturada.

A integração usa HTTP `generateContent`, com [saída estruturada documentada pelo Google](https://ai.google.dev/gemini-api/docs/generate-content/structured-output). Os dados enviados à rota são encaminhados ao Gemini. Não há persistência automática nem upload permanente implementado pela aplicação.

Texto em JSON:

```bash
curl http://localhost:3000/api/contratos/extrair \
  -H 'Content-Type: application/json' \
  -d '{"texto":"Cliente Ana. Honorários fixos de R$ 600,00, vencimento em 10/10/2026."}'
```

PDF ou TXT UTF-8, no campo `arquivo`:

```bash
curl http://localhost:3000/api/contratos/extrair \
  -F 'arquivo=@contrato.pdf;type=application/pdf'
```

Limites locais: corpo completo até 10 MiB (incluindo multipart), texto até 100 mil caracteres e chamada ao Gemini com timeout de 45 segundos. Limites adicionais de hospedagem ou do provedor podem se aplicar.

```json
{
  "dados": {
    "cliente": "Ana",
    "tipoPagamento": "fixo",
    "valorTotal": 600,
    "clausulaOriginal": "Honorários fixos de R$ 600,00, vencimento em 10/10/2026.",
    "parcelas": [{ "valor": 600, "vencimento": "2026-10-10" }]
  },
  "revisaoNecessaria": true
}
```

Informação ausente pode ser `null`, inclusive valor e vencimento de uma parcela; não é um `ContratoExtraido` pronto para salvar até a revisão completar esses campos. Após revisar, localize/crie o cliente e envie `clienteId` com os dados válidos para `POST /api/contratos`.

Retorna `413` para corpo excessivo, `415` para formato não suportado, `503` se falta configuração ou há limite de uso do Gemini, `502` para falha/resposta inválida do provedor e `504` para timeout.

## Verificação local

```bash
npm test
npm run lint
npx next typegen
npx tsc --noEmit --incremental false
npm run build
```

Testes requerem Node.js 22.15+ ou 24 e usam o runner nativo com TypeScript instalado. Prisma e fetch são substituídos nos testes: eles não conectam ao banco nem consomem a API do Gemini. Incluem validação, CRUD, erros de vínculo/duplicidade, cálculo mensal, insights e extração. Testes de integração com banco real e Gemini real permanecem necessários para validar credenciais e infraestrutura.
