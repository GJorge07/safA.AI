import type { ContratoExtraido } from "../types";
import type { ExtracaoContrato } from "./schemas";

export class ExtractionNeedsReviewError extends Error {
  constructor(public readonly reasons: string[]) {
    super(`Extração exige revisão: ${reasons.join("; ")}`);
    this.name = "ExtractionNeedsReviewError";
  }
}

/**
 * Converte a saída rica da IA no contrato compartilhado atual.
 * Nunca substitui campos desconhecidos por zero ou datas fabricadas.
 */
export function adaptToBackend(extraction: ExtracaoContrato): ContratoExtraido {
  const reasons: string[] = [];

  if (!extraction.cliente) reasons.push("cliente não identificado");
  if (!extraction.tipoPagamento) reasons.push("tipo de pagamento não identificado");
  if (extraction.valorTotal === null) reasons.push("valor total não determinado");
  if (!extraction.clausulaOriginal) reasons.push("cláusula financeira não identificada");

  extraction.parcelas.forEach((parcela, index) => {
    if (parcela.valor === null) reasons.push(`valor ausente na parcela ${index + 1}`);
    if (parcela.vencimento === null) reasons.push(`vencimento ausente na parcela ${index + 1}`);
  });

  if (reasons.length > 0) throw new ExtractionNeedsReviewError(reasons);

  return {
    cliente: extraction.cliente!,
    tipoPagamento: extraction.tipoPagamento!,
    valorTotal: extraction.valorTotal!,
    parcelas: extraction.parcelas.map((parcela) => ({
      valor: parcela.valor!,
      vencimento: parcela.vencimento!,
    })),
    clausulaOriginal: extraction.clausulaOriginal!,
  };
}
