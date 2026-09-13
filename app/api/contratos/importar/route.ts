import { ZodError, z } from "zod";
import { ingestDriveContract, ingestUploadedContract, type SupportedContractMimeType } from "@/lib/ai";
import { UnsupportedEvidenceError } from "@/lib/ai/evidence";

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
    const result = contentType.includes("application/json")
      ? await ingestDriveContract(driveRequestSchema.parse(await request.json()).driveFileId)
      : await ingestUpload(request);
    return Response.json(result, { status: result.status === "pronto_para_salvar" ? 200 : 202 });
  } catch (error) {
    if (error instanceof ZodError) return Response.json({ erro: "Dados inválidos.", detalhes: error.issues }, { status: 400 });
    if (error instanceof UnsupportedEvidenceError) {
      return Response.json({ erro: "Extração rejeitada por falta de evidência verificável.", detalhes: error.reasons }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return Response.json({ erro: message }, { status: 502 });
  }
}

async function ingestUpload(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Envie o contrato no campo 'file'.");
  if (!file.size) throw new Error("O arquivo está vazio.");
  if (file.size > 20 * 1024 * 1024) throw new Error("O arquivo excede o limite de 20 MB.");
  const extensions: Record<string, SupportedContractMimeType> = {
    pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", txt: "text/plain",
  };
  const mime = file.type && file.type !== "application/octet-stream"
    ? file.type : extensions[file.name.split(".").pop()?.toLowerCase() ?? ""];
  if (!supported.has(mime as SupportedContractMimeType)) throw new Error("Formato não suportado. Use PDF, DOCX ou TXT.");
  return ingestUploadedContract(Buffer.from(await file.arrayBuffer()), mime as SupportedContractMimeType);
}
