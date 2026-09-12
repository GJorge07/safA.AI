import mammoth from "mammoth";
import { extractContract } from "./extract-contract";
import type { ExtracaoContrato } from "./schemas";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

export type SupportedContractMimeType =
  | "application/pdf"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "text/plain";

export async function extractContractFile(
  buffer: Buffer,
  mimeType: SupportedContractMimeType,
): Promise<ExtracaoContrato> {
  if (buffer.byteLength === 0) throw new Error("O arquivo está vazio.");
  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw new Error("O arquivo excede o limite de 20 MB.");
  }

  if (mimeType === "application/pdf") {
    return extractContract({ kind: "pdf", base64: buffer.toString("base64") });
  }

  if (mimeType === "text/plain") {
    return extractContract({ kind: "text", text: buffer.toString("utf8") });
  }

  const { value } = await mammoth.extractRawText({ buffer });
  if (!value.trim()) throw new Error("Não foi possível extrair texto do DOCX.");
  return extractContract({ kind: "text", text: value });
}
