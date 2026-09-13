import { ZodError } from "zod";
import { runFlowB } from "@/lib/ai/flow-b";
import { carregarDadosFinanceiros } from "@/lib/db/contratos";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) ?? {};
    // O contexto financeiro vem do banco, não do cliente: o browser manda
    // apenas a pergunta, e a IA só enxerga contratos que existem de fato.
    const dados = await carregarDadosFinanceiros();
    if (dados.contratos.length === 0) {
      return Response.json(
        { erro: "Nenhum contrato cadastrado ainda. Importe um contrato antes de perguntar." },
        { status: 409 },
      );
    }
    return Response.json(await runFlowB({ pergunta: body.pergunta, driveFileIds: body.driveFileIds, dados }));
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
