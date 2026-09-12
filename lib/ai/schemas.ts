import { z } from "zod";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const evidenciaDocumentoSchema = z.object({
  campo: z.string().min(1),
  trecho: z.string().min(1),
  pagina: z.number().int().positive().nullable(),
  clausula: z.string().min(1).nullable(),
});

export const parcelaExtraidaSchema = z.object({
  valor: z.number().nonnegative().nullable(),
  vencimento: z.string().regex(isoDate).nullable(),
  evidencia: z.string().min(1),
});

export const extracaoContratoSchema = z.object({
  cliente: z.string().min(1).nullable(),
  tipoPagamento: z.enum(["fixo", "exito", "misto"]).nullable(),
  valorTotal: z.number().nonnegative().nullable(),
  honorariosExito: z.object({
    percentual: z.number().min(0).max(100).nullable(),
    baseCalculo: z.string().min(1).nullable(),
  }).nullable(),
  parcelas: z.array(parcelaExtraidaSchema),
  clausulaOriginal: z.string().min(1).nullable(),
  evidencias: z.array(evidenciaDocumentoSchema),
  confianca: z.number().min(0).max(1),
  avisos: z.array(z.string().min(1)),
});

export type ExtracaoContrato = z.infer<typeof extracaoContratoSchema>;

// JSON Schema enviado ao Gemini. Mantido explícito porque a Interactions API
// aceita JSON Schema diretamente e o valida antes da resposta chegar ao app.
export const extracaoContratoJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    cliente: { type: ["string", "null"] },
    tipoPagamento: {
      anyOf: [
        { type: "string", enum: ["fixo", "exito", "misto"] },
        { type: "null" },
      ],
    },
    valorTotal: { type: ["number", "null"], minimum: 0 },
    honorariosExito: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: {
            percentual: { type: ["number", "null"], minimum: 0, maximum: 100 },
            baseCalculo: { type: ["string", "null"] },
          },
          required: ["percentual", "baseCalculo"],
        },
        { type: "null" },
      ],
    },
    parcelas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          valor: { type: ["number", "null"], minimum: 0 },
          vencimento: {
            type: ["string", "null"],
            description: "Data ISO no formato YYYY-MM-DD, ou null.",
          },
          evidencia: {
            type: "string",
            description: "Trecho literal que sustenta valor e vencimento.",
          },
        },
        required: ["valor", "vencimento", "evidencia"],
      },
    },
    clausulaOriginal: {
      type: ["string", "null"],
      description: "Trecho literal completo das condições financeiras.",
    },
    evidencias: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          campo: { type: "string" },
          trecho: { type: "string", description: "Trecho literal do documento que sustenta o campo." },
          pagina: { type: ["integer", "null"], minimum: 1 },
          clausula: { type: ["string", "null"] },
        },
        required: ["campo", "trecho", "pagina", "clausula"],
      },
    },
    confianca: { type: "number", minimum: 0, maximum: 1 },
    avisos: { type: "array", items: { type: "string" } },
  },
  required: [
    "cliente",
    "tipoPagamento",
    "valorTotal",
    "honorariosExito",
    "parcelas",
    "clausulaOriginal",
    "evidencias",
    "confianca",
    "avisos",
  ],
} as const;

export const parcelaFinanceiraSchema = z.object({
  id: z.string().min(1),
  valor: z.number().nonnegative(),
  vencimento: z.string().regex(isoDate),
  status: z.enum(["prevista", "paga", "atrasada"]),
});

export const contratoFinanceiroSchema = z.object({
  id: z.string().min(1),
  clienteId: z.string().min(1),
  cliente: z.string().min(1),
  tipoPagamento: z.enum(["fixo", "exito", "misto"]),
  valorTotal: z.number().nonnegative().nullable(),
  parcelas: z.array(parcelaFinanceiraSchema),
});

export const dadosFinanceirosSchema = z.object({
  dataReferencia: z.string().regex(isoDate),
  resumo: z.object({
    previsto: z.number().nonnegative(),
    recebido: z.number().nonnegative(),
    pendente: z.number().nonnegative(),
    atrasado: z.number().nonnegative(),
  }),
  contratos: z.array(contratoFinanceiroSchema),
});

export const contextoFinanceiroSchema = z.object({
  pergunta: z.string().trim().min(1).max(500),
  dados: dadosFinanceirosSchema,
});

export type DadosFinanceiros = z.infer<typeof dadosFinanceirosSchema>;

export const respostaFinanceiraSchema = z.object({
  resposta: z.string().min(1),
  contratosCitados: z.array(z.string()),
  citacoes: z.array(z.object({
    contratoId: z.string().min(1).nullable(),
    campos: z.array(z.string().min(1)).min(1),
  })),
  aviso: z.string().nullable(),
});

export type RespostaFinanceira = z.infer<typeof respostaFinanceiraSchema>;

export const respostaFinanceiraJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    resposta: { type: "string" },
    contratosCitados: { type: "array", items: { type: "string" } },
    citacoes: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          contratoId: { type: ["string", "null"] },
          campos: { type: "array", minItems: 1, items: { type: "string" } },
        },
        required: ["contratoId", "campos"],
      },
    },
    aviso: { type: ["string", "null"] },
  },
  required: ["resposta", "contratosCitados", "citacoes", "aviso"],
} as const;
