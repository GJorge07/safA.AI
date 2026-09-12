# Schema de Extração de Contrato — Safa.IA

> Rascunho de trabalho (Fluxo A). Ajustar assim que o time 1 fechar o schema
> definitivo do banco (Prisma). Este arquivo é o "contrato" entre o agente de
> extração e quem consome o JSON (backend / camada de insights).

## Objetivo

Dado o texto de um contrato de honorários advocatícios (PDF ou DOCX), o
agente deve devolver **um único objeto JSON** no formato abaixo. Nenhum campo
deve ser inventado: se a informação não existir no texto, o valor deve ser
`null`, nunca um número ou data "chutados".

## Formato do JSON

```json
{
  "arquivo_origem": "contrato-joao-silva.pdf",
  "cliente": {
    "nome": "João da Silva",
    "documento": "123.456.789-00"
  },
  "contrato": {
    "tipo_pagamento": "fixo",
    "valor_total_estimado": 12000.00,
    "moeda": "BRL",
    "data_assinatura": "2026-02-10",
    "descricao_servico": "Ação trabalhista contra Empresa X Ltda."
  },
  "parcelas": [
    {
      "numero": 1,
      "descricao": "Entrada",
      "valor": 2000.00,
      "vencimento": "2026-02-10",
      "condicao": null
    },
    {
      "numero": 2,
      "descricao": "Parcela 2/6",
      "valor": 2000.00,
      "vencimento": "2026-03-10",
      "condicao": null
    }
  ],
  "clausula_pagamento_original": "O CONTRATANTE pagará ao CONTRATADO o valor de R$ 12.000,00 (doze mil reais), em 6 (seis) parcelas mensais e iguais de R$ 2.000,00 (dois mil reais), vencendo a primeira na data de assinatura e as demais todo dia 10.",
  "observacoes": null
}
```

## Descrição dos campos

| Campo | Tipo | Obrigatório | Observações |
|---|---|---|---|
| `arquivo_origem` | string | sim | nome do arquivo enviado, para rastreabilidade |
| `cliente.nome` | string | sim | nome completo do contratante |
| `cliente.documento` | string \| null | não | CPF ou CNPJ, se aparecer no contrato |
| `contrato.tipo_pagamento` | enum: `"fixo"` \| `"exito"` \| `"misto"` | sim | ver seção abaixo |
| `contrato.valor_total_estimado` | number \| null | não | pode ser `null` quando o valor só é conhecido no êxito |
| `contrato.moeda` | string | sim | fixo `"BRL"` no MVP |
| `contrato.data_assinatura` | string (`YYYY-MM-DD`) \| null | não | |
| `contrato.descricao_servico` | string | sim | objeto/causa do contrato, resumido |
| `parcelas[]` | array | sim (pode ser vazio) | ver seção abaixo |
| `clausula_pagamento_original` | string | sim | texto **literal** da cláusula de pagamento, para o advogado conferir |
| `observacoes` | string \| null | não | qualquer ressalva relevante (ex: reajuste, multa) |

### `contrato.tipo_pagamento`

- **`fixo`** — valor e datas definidos no contrato, independente do resultado da ação.
- **`exito`** — pagamento é um percentual sobre o valor obtido, condicionado ao resultado (sem parcelas fixas).
- **`misto`** — combina uma parte fixa (entrada, honorário contratual) com uma parte de êxito.

### `parcelas[]`

Cada item representa um pagamento esperado, fixo ou condicional:

| Campo | Tipo | Observações |
|---|---|---|
| `numero` | int | ordem da parcela |
| `descricao` | string | ex: `"Entrada"`, `"Parcela 3/6"`, `"Honorário de êxito"` |
| `valor` | number \| null | `null` quando o valor só existe como percentual (ex: êxito) |
| `vencimento` | string (`YYYY-MM-DD`) \| null | `null` quando a data depende de um evento (ex: recebimento judicial) |
| `condicao` | string \| null | descreve o evento que dispara o pagamento, quando não há data fixa (ex: `"em até 5 dias úteis após o levantamento do valor"`) |

Para contratos de **êxito puro**, é comum `parcelas` conter um único item com
`valor: null`, `vencimento: null` e `condicao` preenchida — o percentual de
êxito deve ficar registrado em `observacoes` até decidirmos um campo dedicado
(`contrato.percentual_exito`) com o time 1.

## Regra de ouro

`clausula_pagamento_original` **sempre** deve ser preenchida com o trecho
exato do contrato, mesmo quando os outros campos ficarem incompletos — é o
que permite o advogado conferir o que a IA extraiu contra o texto real.
