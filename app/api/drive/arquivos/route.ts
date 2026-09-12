import { ZodError } from "zod";
import { listDriveContracts } from "@/lib/ai/drive";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const pageToken = new URL(request.url).searchParams.get("pageToken") ?? undefined;
    return Response.json(await listDriveContracts(pageToken));
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json({ erro: "Parâmetros inválidos.", detalhes: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return Response.json({ erro: message }, { status: 502 });
  }
}
