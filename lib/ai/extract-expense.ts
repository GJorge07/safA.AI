import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { getGeminiClient, getGeminiModel } from "./gemini";
import { expenseExtractionPrompt } from "./prompts";
import { extracaoDespesaJsonSchema, extracaoDespesaSchema, type ExtracaoDespesa } from "./schemas";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export type SupportedExpenseMimeType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "text/plain";

// Lê recibo/nota/guia e devolve um RASCUNHO de despesa. Nada é gravado aqui:
// quem confirma o lançamento é o advogado, com o textoOriginal ao lado.
export async function extrairDespesaDeTexto(texto: string): Promise<ExtracaoDespesa> {
  if (!texto.trim()) throw new Error("O documento não tem texto para extrair.");

  const ai = getGeminiClient();
  const interaction = await ai.interactions.create({
    model: getGeminiModel(),
    input: `${expenseExtractionPrompt}\n\nDOCUMENTO:\n${texto}`,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: extracaoDespesaJsonSchema,
    },
  });

  if (!interaction.output_text) {
    throw new Error("O Gemini não devolveu a extração da despesa.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(interaction.output_text);
  } catch (cause) {
    throw new Error("O Gemini devolveu JSON inválido para a despesa.", { cause });
  }

  return extracaoDespesaSchema.parse(parsed);
}

export async function extrairDespesaDeArquivo(
  buffer: Buffer,
  mimeType: SupportedExpenseMimeType,
): Promise<ExtracaoDespesa> {
  if (buffer.byteLength === 0) throw new Error("O arquivo está vazio.");
  if (buffer.byteLength > MAX_FILE_SIZE) throw new Error("O arquivo excede o limite de 20 MB.");

  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      if (!result.text.trim()) {
        throw new Error("O PDF não possui texto pesquisável; execute OCR antes da extração.");
      }
      return extrairDespesaDeTexto(result.text);
    } finally {
      await parser.destroy();
    }
  }

  if (mimeType === "text/plain") return extrairDespesaDeTexto(buffer.toString("utf8"));

  const { value } = await mammoth.extractRawText({ buffer });
  if (!value.trim()) throw new Error("Não foi possível extrair texto do DOCX.");
  return extrairDespesaDeTexto(value);
}

export interface RascunhoDespesa {
  extracao: ExtracaoDespesa;
  /** Campos que o advogado precisa preencher antes de conseguir lançar. */
  motivosRevisao: string[];
  pronto: boolean;
}

const CATEGORIAS_DE_PROCESSO = new Set([
  "deslocamento",
  "custas",
  "diligencia",
  "cartorio",
  "pericia",
  "correspondente",
  "outros_processo",
]);

export function avaliarRascunho(extracao: ExtracaoDespesa): RascunhoDespesa {
  const motivosRevisao: string[] = [];
  if (!extracao.descricao) motivosRevisao.push("descrição não identificada");
  if (extracao.valor === null) motivosRevisao.push("valor não identificado");
  if (!extracao.vencimento) motivosRevisao.push("data não identificada");
  if (!extracao.tipo) motivosRevisao.push("não deu para dizer se é gasto de processo ou de escritório");
  if (!extracao.categoria) motivosRevisao.push("categoria não identificada");

  // Categoria fora do tipo tornaria a margem do caso mentirosa — melhor o
  // advogado escolher do que gravar um par incoerente.
  if (extracao.tipo && extracao.categoria) {
    const doProcesso = CATEGORIAS_DE_PROCESSO.has(extracao.categoria);
    if (doProcesso !== (extracao.tipo === "processo")) {
      motivosRevisao.push(`categoria ${extracao.categoria} não combina com um gasto de ${extracao.tipo}`);
    }
  }

  motivosRevisao.push(...extracao.avisos);

  return {
    extracao,
    motivosRevisao,
    pronto: Boolean(
      extracao.descricao && extracao.valor !== null && extracao.vencimento && extracao.tipo && extracao.categoria,
    ),
  };
}
