import { contextoEsforcoSchema } from "@/lib/ai/case-effort";
import { perguntaDeOpiniao, responderOpiniaoLocal } from "@/lib/ai/contract-assessment";
import { ZodError, z } from "zod";
import { runFlowB } from "@/lib/ai/flow-b";
import { carregarDadosFinanceiros } from "@/lib/db/contratos";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = z.object({
      pergunta: z.string().trim().min(1).max(500),
      contratoId: z.string().trim().min(1).max(200).optional(),
      contextoEsforco: contextoEsforcoSchema.optional(),
      modo: z.enum(["conversa", "opiniao"]).default("conversa"),
    }).parse(await request.json());
    // O contexto financeiro vem do banco, não do cliente: o browser manda
    // a pergunta e a referência; os dados e avaliações vêm do servidor.
    if (body.contextoEsforco && !body.contratoId) return Response.json({ erro: "Selecione um contrato para avaliar as estimativas." }, { status: 400 });
    const avaliarBeneficio = body.modo === "opiniao" || perguntaDeOpiniao(body.pergunta);
    const dados = await carregarDadosFinanceiros(new Date(), avaliarBeneficio && body.contratoId && body.contextoEsforco ? { contratoId: body.contratoId, contexto: body.contextoEsforco } : undefined);
    if (dados.contratos.length === 0) {
      return Response.json(
        { erro: "Nenhum contrato cadastrado ainda. Importe um contrato antes de perguntar." },
        { status: 409 },
      );
    }
    if (body.contratoId && !dados.contratos.some(c => c.id === body.contratoId)) {
      return Response.json({ erro: "Contrato não encontrado." }, { status: 404 });
    }
    if (avaliarBeneficio) {
      return Response.json({ resposta: responderOpiniaoLocal(body.pergunta, dados.contratos, body.contratoId), insights: [], fontes: [] });
    }
    return Response.json(await runFlowB({ pergunta: body.pergunta, contratoReferencia: body.contratoId, dados }));
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { erro: "Dados inválidos.", detalhes: error.issues },
        { status: 400 },
      );
    }
    return Response.json({ erro: "Não foi possível responder com os dados disponíveis. Tente novamente." }, { status: 502 });
  }
}
