import { contextoEsforcoSchema } from "@/lib/ai/case-effort";
import { ZodError } from "zod";
import { carregarDadosFinanceiros } from "@/lib/db/contratos";
import type { Context } from "@/lib/api/http";

export async function GET(_request: Request, { params }: Context) {
  try {
    const { id } = await params;
    const dados = await carregarDadosFinanceiros();
    const contrato = dados.contratos.find(c => c.id === id);
    if (!contrato) return Response.json({ erro: "Contrato não encontrado." }, { status: 404 });
    return Response.json({ opiniao: contrato.opiniao, contextoSugerido: contrato.contextoSugerido, evidenciasContexto: contrato.evidenciasContexto, dataReferencia: dados.dataReferencia }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return Response.json({ erro: "Não foi possível consultar a avaliação." }, { status: 500 });
  }
}

// Simulação de leitura: não salva estimativas nem altera o contrato.
export async function POST(request: Request, { params }: Context) {
  try {
    const contexto = contextoEsforcoSchema.parse(await request.json());
    const { id } = await params;
    const dados = await carregarDadosFinanceiros(new Date(), { contratoId: id, contexto });
    const contrato = dados.contratos.find(c => c.id === id);
    if (!contrato) return Response.json({ erro: "Contrato não encontrado." }, { status: 404 });
    return Response.json({ opiniao: contrato.opiniao, contextoSugerido: contrato.contextoSugerido, evidenciasContexto: contrato.evidenciasContexto, dataReferencia: dados.dataReferencia }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) return Response.json({ erro: "Confira as estimativas: as horas devem ser positivas e o máximo não pode ser menor que o mínimo." }, { status: 400 });
    return Response.json({ erro: "Não foi possível calcular o benefício." }, { status: 500 });
  }
}
