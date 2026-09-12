import { ZodError, z } from "zod";
import { ingestDriveContract, ingestUploadedContract, type SupportedContractMimeType } from "@/lib/ai";
import { UnsupportedEvidenceError } from "@/lib/ai/evidence";

export const runtime = "nodejs";

const driveRequestSchema = z.object({ driveFileId: z.string().trim().min(1).max(200) });
const supported = new Set<SupportedContractMimeType>([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

class HttpError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let result;
    if (contentType.includes("application/json")) {
      result = await ingestDriveContract(driveRequestSchema.parse(await request.json()).driveFileId);
    } else if (contentType.includes("multipart/form-data")) {
      result = await ingestUpload(request);
    } else {
      throw new HttpError("Content-Type não suportado. Use application/json ou multipart/form-data.", 415);
    }
    return Response.json(result, { status: result.status === "pronto_para_salvar" ? 200 : 202 });
  } catch (error) {
    if (error instanceof HttpError) return Response.json({ erro: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return Response.json({ erro: "JSON inválido." }, { status: 400 });
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
  if (!(file instanceof File)) throw new HttpError("Envie o contrato no campo 'file'.", 400);
  if (!supported.has(file.type as SupportedContractMimeType)) throw new HttpError("Formato não suportado. Use PDF, DOCX ou TXT.", 415);
  if (file.size > MAX_FILE_SIZE) throw new HttpError("O arquivo excede o limite de 20 MB.", 413);
  return ingestUploadedContract(Buffer.from(await file.arrayBuffer()), file.type as SupportedContractMimeType);
}
