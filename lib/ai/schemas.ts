import { contextoEsforcoSchema } from "./case-effort";
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

// A opinião do agente é estruturada por dimensão para que toda conclusão
// exponha as evidências e as informações que ainda faltam.
export const contextoAdvogadoSchema = z.string().trim().max(6000).default("");
const avaliacaoDimensaoSchema = z.object({
  status: z.enum(["favoravel", "atencao", "desfavoravel", "dados_insuficientes"]),
  justificativa: z.string().min(1),
  evidencias: z.array(z.string().min(1)),
  dadosFaltantes: z.array(z.string().min(1)),
});

export const opiniaoContratoSchema = z.object({
  avaliacoes: z.object({
    financeiro: avaliacaoDimensaoSchema,
    pagamentos: avaliacaoDimensaoSchema,
    complexidade: avaliacaoDimensaoSchema,
    escopo: avaliacaoDimensaoSchema,
  }),
  classificacao: z.enum(["favoravel", "atencao", "desfavoravel"]),
  resumo: z.string().min(1),
  pontosFortes: z.array(z.string().min(1)),
  riscos: z.array(z.object({
    categoria: z.enum(["financeiro", "juridico", "carteira", "pagamentos", "complexidade", "escopo"]),
    descricao: z.string().min(1),
  })),
  recomendacao: z.string().min(1),
});

export type OpiniaoContrato = z.infer<typeof opiniaoContratoSchema>;

export const parcelaFinanceiraSchema = z.object({
  id: z.string().min(1),
  valor: z.number().nonnegative(),
  vencimento: z.string().regex(isoDate),
  // "baixada" = honorário de êxito que não vai ser recebido. Sem esse estado,
  // a IA leria a parcela como dívida em aberto e responderia com dinheiro que
  // não existe mais.
  status: z.enum(["prevista", "paga", "atrasada", "baixada"]),
  saldo: z.number().nonnegative().optional(),
});

export const contratoFinanceiroSchema = z.object({
  createdAt: z.string().datetime().optional(),
  contextoSugerido: contextoEsforcoSchema.optional(),
  evidenciasContexto: z.array(z.object({ campo: z.string(), trecho: z.string() })).optional(),
  opiniao: opiniaoContratoSchema.optional(),
  id: z.string().min(1),
  clienteId: z.string().min(1),
  cliente: z.string().min(1),
  tipoPagamento: z.enum(["fixo", "exito", "misto"]),
  valorTotal: z.number().nonnegative().nullable(),
  clausulaOriginal: z.string().min(1),
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
  contratoReferencia: z.string().min(1).max(200).optional(),
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

// Leitura de recibo/nota para virar um RASCUNHO de despesa. Tudo é anulável
// porque comprovante é um documento bagunçado — o advogado completa o que
// faltar antes de confirmar o lançamento.
export const extracaoDespesaSchema = z.object({
  descricao: z.string().min(1).nullable(),
  tipo: z.enum(["processo", "escritorio"]).nullable(),
  categoria: z
    .enum([
      "deslocamento",
      "custas",
      "diligencia",
      "cartorio",
      "pericia",
      "correspondente",
      "outros_processo",
      "estrutura",
      "software",
      "tributos",
      "pessoal",
      "outros_escritorio",
    ])
    .nullable(),
  valor: z.number().nonnegative().nullable(),
  vencimento: z.string().regex(isoDate).nullable(),
  fornecedor: z.string().min(1).nullable(),
  textoOriginal: z.string().min(1).nullable(),
  confianca: z.number().min(0).max(1),
  avisos: z.array(z.string().min(1)),
});

export type ExtracaoDespesa = z.infer<typeof extracaoDespesaSchema>;

const CATEGORIAS_DESPESA = [
  "deslocamento",
  "custas",
  "diligencia",
  "cartorio",
  "pericia",
  "correspondente",
  "outros_processo",
  "estrutura",
  "software",
  "tributos",
  "pessoal",
  "outros_escritorio",
] as const;

export const extracaoDespesaJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    descricao: { type: ["string", "null"] },
    tipo: {
      anyOf: [{ type: "string", enum: ["processo", "escritorio"] }, { type: "null" }],
    },
    categoria: {
      anyOf: [{ type: "string", enum: CATEGORIAS_DESPESA }, { type: "null" }],
    },
    valor: { type: ["number", "null"], minimum: 0 },
    vencimento: { type: ["string", "null"] },
    fornecedor: { type: ["string", "null"] },
    textoOriginal: { type: ["string", "null"] },
    confianca: { type: "number", minimum: 0, maximum: 1 },
    avisos: { type: "array", items: { type: "string" } },
  },
  required: [
    "descricao",
    "tipo",
    "categoria",
    "valor",
    "vencimento",
    "fornecedor",
    "textoOriginal",
    "confianca",
    "avisos",
  ],
} as const;

const avaliacaoDimensaoJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: { type: "string", enum: ["favoravel", "atencao", "desfavoravel", "dados_insuficientes"] },
    justificativa: { type: "string" },
    evidencias: { type: "array", items: { type: "string" } },
    dadosFaltantes: { type: "array", items: { type: "string" } },
  },
  required: ["status", "justificativa", "evidencias", "dadosFaltantes"],
} as const;

export const opiniaoContratoJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    avaliacoes: {
      type: "object",
      additionalProperties: false,
      properties: {
        financeiro: avaliacaoDimensaoJsonSchema,
        pagamentos: avaliacaoDimensaoJsonSchema,
        complexidade: avaliacaoDimensaoJsonSchema,
        escopo: avaliacaoDimensaoJsonSchema,
      },
      required: ["financeiro", "pagamentos", "complexidade", "escopo"],
    },
    classificacao: { type: "string", enum: ["favoravel", "atencao", "desfavoravel"] },
    resumo: { type: "string" },
    pontosFortes: { type: "array", items: { type: "string" } },
    riscos: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          categoria: { type: "string", enum: ["financeiro", "juridico", "carteira", "pagamentos", "complexidade", "escopo"] },
          descricao: { type: "string" },
        },
        required: ["categoria", "descricao"],
      },
    },
    recomendacao: { type: "string" },
  },
  required: ["avaliacoes", "classificacao", "resumo", "pontosFortes", "riscos", "recomendacao"],
} as const;

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
