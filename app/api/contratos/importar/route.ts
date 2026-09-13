import { revalidatePath } from "next/cache";
import { ZodError, z } from "zod";
import { ingestDriveContract, ingestUploadedContract, type SupportedContractMimeType } from "@/lib/ai";
import { UnsupportedEvidenceError } from "@/lib/ai/evidence";
import { carregarDadosFinanceiros, salvarContratoExtraido } from "@/lib/db/contratos";

export const runtime = "nodejs";
export const maxDuration = 120;

const driveRequestSchema = z.object({ driveFileId: z.string().trim().min(1).max(200) });
const supported = new Set<SupportedContractMimeType>([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

export async function POST(request: Request): Promise<Response> {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let result;
    if (contentType.includes("application/json")) {
      const body = driveRequestSchema.parse(await request.json());
      result = await ingestDriveContract(body.driveFileId);
    } else {
      const form = await request.formData();
      result = await ingestUpload(form);
    }

    // Só grava o que a validação de evidência aprovou; o que precisa de
    // revisão volta para o advogado sem sujar o banco.
    if (!result.payloadBackend) return Response.json({ ...result, contratoId: null, opiniao: null }, { status: 202 });

    const contrato = await salvarContratoExtraido(result.payloadBackend, result.textoCompleto);
    const dados = await carregarDadosFinanceiros();
    const opiniao = dados.contratos.find(item => item.id === contrato.id)?.opiniao ?? null;
    revalidatePath("/");
    revalidatePath("/contratos");
    return Response.json({ ...result, contratoId: contrato.id, opiniao }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ erro: "Dados inválidos.", detalhes: error.issues }, { status: 400 });
    if (error instanceof UnsupportedEvidenceError) {
      return Response.json({ erro: "Extração rejeitada por falta de evidência verificável.", detalhes: error.reasons }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    if (/\b429\b|quota exceeded|rate.?limit/i.test(message)) {
      return Response.json({
        erro: "O leitor atingiu temporariamente o limite do serviço de IA. Aguarde alguns segundos e envie o arquivo novamente.",
      }, { status: 503 });
    }
    return Response.json({ erro: message }, { status: 502 });
  }
}

async function ingestUpload(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Envie o contrato no campo 'file'.");
  const mimeType = detectarTipo(file);
  if (!mimeType || !supported.has(mimeType)) throw new Error("Formato não suportado. Use PDF, DOCX ou TXT.");
  const buffer = Buffer.from(await file.arrayBuffer());
  if (mimeType === "application/pdf" && buffer.subarray(0, 5).toString() !== "%PDF-") {
    throw new Error("O arquivo selecionado não é um PDF válido.");
  }
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
      buffer.subarray(0, 2).toString() !== "PK") {
    throw new Error("O arquivo selecionado não é um DOCX válido.");
  }
  return ingestUploadedContract(buffer, mimeType);
}

function detectarTipo(file: File): SupportedContractMimeType | null {
  if (supported.has(file.type as SupportedContractMimeType)) return file.type as SupportedContractMimeType;
  const nome = file.name.toLowerCase();
  if (nome.endsWith(".pdf")) return "application/pdf";
  if (nome.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (nome.endsWith(".txt")) return "text/plain";
  return null;
}
