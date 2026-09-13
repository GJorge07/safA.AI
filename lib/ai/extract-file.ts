import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { extractContract } from "./extract-contract";
import { validateExtractionEvidence, type SourcePage } from "./evidence";
import type { ExtracaoContrato } from "./schemas";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export type SupportedContractMimeType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "text/plain";

export interface ExtracaoDeArquivo {
  extracao: ExtracaoContrato;
  // Texto integral do documento (todas as páginas/parágrafos), para análises
  // que precisam de mais contexto do que o recorte em clausulaOriginal —
  // como avaliar se falta cláusula de mora/reajuste em outro trecho.
  textoCompleto: string;
}

export async function extractContractFile(
  buffer: Buffer,
  mimeType: SupportedContractMimeType,
): Promise<ExtracaoDeArquivo> {
  if (buffer.byteLength === 0) throw new Error("O arquivo está vazio.");
  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw new Error("O arquivo excede o limite de 20 MB.");
  }

  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      const pages = result.pages.map(({ num, text }) => ({ page: num, text }));
      if (!result.text.trim()) throw new Error("O PDF não possui texto pesquisável; execute OCR antes da extração rigorosa.");
      return extractAndValidate(pages);
    } finally {
      await parser.destroy();
    }
  }

  if (mimeType === "text/plain") {
    return extractAndValidate([{ page: 1, text: buffer.toString("utf8") }]);
  }

  const { value } = await mammoth.extractRawText({ buffer });
  if (!value.trim()) throw new Error("Não foi possível extrair texto do DOCX.");
  return extractAndValidate([{ page: 1, text: value }]);
}

async function extractAndValidate(pages: SourcePage[]): Promise<ExtracaoDeArquivo> {
  const markedText = pages.map(({ page, text }) => `[PÁGINA ${page}]\n${text}`).join("\n\n");
  const extraction = await extractContract({ kind: "text", text: markedText });
  const extracao = validateExtractionEvidence(extraction, pages);
  return { extracao, textoCompleto: pages.map(({ text }) => text).join("\n\n") };
}
