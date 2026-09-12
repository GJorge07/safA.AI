import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import mammoth from "mammoth";
// pdf-parse não tem tipos ESM completos; importamos a função direto.
// @ts-expect-error -- sem types para o subpath usado (evita o self-test do pacote)
import pdfParse from "pdf-parse/lib/pdf-parse.js";

/**
 * Lê um arquivo PDF ou DOCX e devolve o texto bruto extraído.
 */
export async function extrairTexto(caminhoArquivo: string): Promise<string> {
  const buffer = await readFile(caminhoArquivo);
  const extensao = extname(caminhoArquivo).toLowerCase();

  switch (extensao) {
    case ".pdf": {
      const resultado = await pdfParse(buffer);
      return resultado.text;
    }
    case ".docx": {
      const resultado = await mammoth.extractRawText({ buffer });
      return resultado.value;
    }
    default:
      throw new Error(
        `Formato não suportado: "${extensao}" (arquivo: ${caminhoArquivo}). Use .pdf ou .docx.`,
      );
  }
}
