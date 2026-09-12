// Espelha o contrato definido em schema-contrato.md.
// Qualquer mudança aqui deve ser refletida lá (e vice-versa).
// A SDK da Anthropic (zodOutputFormat) espera schemas do zod v4 —
// zod 3.25+ já embute esse namespace em "zod/v4".
import { z } from "zod/v4";

export const TipoPagamentoSchema = z.enum(["fixo", "exito", "misto"]);

export const ParcelaSchema = z.object({
  numero: z.number().int(),
  descricao: z.string(),
  valor: z.number().nullable(),
  vencimento: z.string().nullable(),
  condicao: z.string().nullable(),
});

export const ContratoExtraidoSchema = z.object({
  arquivo_origem: z.string(),
  cliente: z.object({
    nome: z.string(),
    documento: z.string().nullable(),
  }),
  contrato: z.object({
    tipo_pagamento: TipoPagamentoSchema,
    valor_total_estimado: z.number().nullable(),
    moeda: z.string(),
    data_assinatura: z.string().nullable(),
    descricao_servico: z.string(),
  }),
  parcelas: z.array(ParcelaSchema),
  clausula_pagamento_original: z.string(),
  observacoes: z.string().nullable(),
});

export type ContratoExtraido = z.infer<typeof ContratoExtraidoSchema>;
export type Parcela = z.infer<typeof ParcelaSchema>;
export type TipoPagamento = z.infer<typeof TipoPagamentoSchema>;
