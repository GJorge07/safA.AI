import { z } from "zod";
import { extrairIdDaPastaDrive } from "@/lib/ai/drive";
import { obterConexaoDrive, salvarPastaDrive } from "@/lib/db/drive-conexao";

export const runtime = "nodejs";

const bodySchema = z.object({ pasta: z.string().trim().min(1).max(500) });

export async function POST(request: Request): Promise<Response> {
  try {
    const { conectado } = await obterConexaoDrive();
    if (!conectado) return Response.json({ erro: "Conecte uma conta do Google Drive antes." }, { status: 409 });

    const { pasta } = bodySchema.parse(await request.json());
    const pastaId = extrairIdDaPastaDrive(pasta);
    await salvarPastaDrive(pastaId);
    return Response.json({ pastaId });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ erro: "Dados inválidos." }, { status: 400 });
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return Response.json({ erro: message }, { status: 500 });
  }
}
