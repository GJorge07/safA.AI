import { ApiError, handle, object, text } from "@/lib/api/http";
import {
  avaliarRascunho,
  extrairDespesaDeArquivo,
  extrairDespesaDeTexto,
  type SupportedExpenseMimeType,
} from "@/lib/ai/extract-expense";
import { downloadDriveContract } from "@/lib/ai/drive";

export const runtime = "nodejs";
export const maxDuration = 60;

const MIMES: Record<string, SupportedExpenseMimeType> = {
  "application/pdf": "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain": "text/plain",
};

// Lê recibo/nota/guia e devolve um RASCUNHO. Diferente de contratos, aqui o
// caminho principal do produto é o lançamento manual — este endpoint é o
// atalho para quem prefere jogar o comprovante. Nada é gravado: quem confirma
// o lançamento é o advogado, via POST /api/despesas.
export async function POST(request: Request) {
  return handle(async () => {
    if (!process.env.GEMINI_API_KEY) {
      throw new ApiError(503, "GEMINI_API_KEY não configurada: a leitura automática está indisponível");
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.startsWith("application/json")) {
      const dados = object(await request.json().catch(() => null));

      // Mesma porta de entrada de /api/contratos/importar: um arquivo que já
      // está no Drive do advogado não precisa passar pela máquina dele.
      if (dados.driveFileId !== undefined) {
        const arquivo = await downloadDriveContract(text(dados.driveFileId, "driveFileId"));
        const mime = MIMES[arquivo.mimeType];
        if (!mime) throw new ApiError(415, "Formato aceito: PDF, DOCX ou TXT");
        const extracao = await extrairDespesaDeArquivo(arquivo.buffer, mime);
        return Response.json({ ...avaliarRascunho(extracao), origem: "drive", gravado: false });
      }

      const extracao = await extrairDespesaDeTexto(text(dados.texto, "texto", 100000));
      return Response.json({ ...avaliarRascunho(extracao), gravado: false });
    }

    if (!contentType.startsWith("multipart/form-data")) {
      throw new ApiError(415, "Envie JSON com texto ou multipart/form-data com o arquivo no campo file");
    }

    const form = await request.formData();
    const arquivo = form.get("file");
    if (!(arquivo instanceof File) || arquivo.size === 0) {
      throw new ApiError(400, "Envie um arquivo não vazio no campo file");
    }

    const mime = MIMES[arquivo.type];
    if (!mime) throw new ApiError(415, "Formato aceito: PDF, DOCX ou TXT");

    const buffer = Buffer.from(await arquivo.arrayBuffer());
    const extracao = await extrairDespesaDeArquivo(buffer, mime);
    return Response.json({ ...avaliarRascunho(extracao), gravado: false });
  });
}
