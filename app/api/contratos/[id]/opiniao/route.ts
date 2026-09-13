import { ApiError, Context, handle } from "@/lib/api/http";
import { opinarSobreContrato } from "@/lib/ai/opine-contract";
import { carregarEstatisticasCarteira, obterContratoComRelacoes } from "@/lib/db/contratos";
import type { ExtracaoContrato } from "@/lib/ai/schemas";

// Avaliação sob demanda: chamar o Gemini ao abrir a página custaria uma
// requisição por visita, então quem dispara é o botão da tela de detalhe.
export async function POST(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const contrato = await obterContratoComRelacoes(id);
    if (!contrato) throw new ApiError(404, "Contrato não encontrado");

    // O contrato já gravado não guarda as evidências da extração original;
    // o que temos de texto literal é a cláusula.
    const extracao: ExtracaoContrato = {
      cliente: contrato.cliente.nome,
      tipoPagamento: contrato.tipoPagamento,
      valorTotal: contrato.valorTotal,
      honorariosExito: null,
      parcelas: contrato.parcelas.map((parcela) => ({
        valor: parcela.valor,
        vencimento: parcela.vencimento.toISOString().slice(0, 10),
        // A parcela veio do banco, não de uma leitura de documento — a
        // evidência é a própria cláusula gravada.
        evidencia: contrato.clausulaOriginal,
      })),
      clausulaOriginal: contrato.clausulaOriginal,
      evidencias: [],
      confianca: 1,
      avisos: [],
    };

    const carteira = await carregarEstatisticasCarteira();
    const opiniao = await opinarSobreContrato(extracao, contrato.clausulaOriginal, carteira);
    return Response.json({ opiniao });
  });
}
