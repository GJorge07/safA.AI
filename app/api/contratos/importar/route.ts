import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";
import { ingestDriveContract, ingestUploadedContract, opinarSobreContrato, type SupportedContractMimeType } from "@/lib/ai";
import { UnsupportedEvidenceError } from "@/lib/ai/evidence";
import { carregarEstatisticasCarteira, salvarContratoExtraido } from "@/lib/db/contratos";
import type { ExtracaoContrato, OpiniaoContrato } from "@/lib/ai/schemas";

export const runtime = "nodejs";

const driveRequestSchema = z.object({ driveFileId: z.string().trim().min(1).max(200) });
const supported = new Set<SupportedContractMimeType>([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

export async function POST(request: Request): Promise<Response> {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    const result = contentType.includes("application/json")
      ? await ingestDriveContract(driveRequestSchema.parse(await request.json()).driveFileId)
      : await ingestUpload(request);

    // A opinião é um extra sobre a extração; se o Gemini falhar nela, o
    // advogado ainda recebe o contrato extraído/salvo normalmente.
    const opiniao = await gerarOpiniaoComFallback(result.extracao, result.textoCompleto);

    // Só grava o que a validação de evidência aprovou; o que precisa de
    // revisão volta para o advogado sem sujar o banco.
    if (!result.payloadBackend) return Response.json({ ...result, contratoId: null, opiniao }, { status: 202 });

    const contrato = await salvarContratoExtraido(result.payloadBackend);
    revalidatePath("/");
    revalidatePath("/pagamentos");
    return Response.json({ ...result, contratoId: contrato.id, opiniao }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ erro: "Dados inválidos.", detalhes: error.issues }, { status: 400 });
    if (error instanceof UnsupportedEvidenceError) {
      return Response.json({ erro: "Extração rejeitada por falta de evidência verificável.", detalhes: error.reasons }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return Response.json({ erro: message }, { status: 502 });
  }
}

async function gerarOpiniaoComFallback(extracao: ExtracaoContrato, textoCompleto: string): Promise<OpiniaoContrato | null> {
  if (!textoCompleto.trim()) return null;
  try {
    const carteira = await carregarEstatisticasCarteira();
    return await opinarSobreContrato(extracao, textoCompleto, carteira);
  } catch (error) {
    console.error("Falha ao gerar opinião do contrato:", error);
    return null;
  }
}

async function ingestUpload(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Envie o contrato no campo 'file'.");
  if (!supported.has(file.type as SupportedContractMimeType)) throw new Error("Formato não suportado. Use PDF, DOCX ou TXT.");
  return ingestUploadedContract(Buffer.from(await file.arrayBuffer()), file.type as SupportedContractMimeType);
}
