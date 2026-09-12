import { ZodError } from "zod";
import { runFlowB } from "@/lib/ai/flow-b";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    return Response.json(await runFlowB(body));
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { erro: "Dados inválidos.", detalhes: error.issues },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return Response.json({ erro: message }, { status: 502 });
  }
}
