import { getGeminiClient, getGeminiModel } from "./gemini";
import { contractOpinionPrompt } from "./prompts";
import {
  opiniaoContratoJsonSchema,
  opiniaoContratoSchema,
  type ExtracaoContrato,
  type OpiniaoContrato,
} from "./schemas";
import type { EstatisticasCarteira } from "../db/contratos";

// Avalia o contrato recém-extraído para o advogado: risco financeiro, risco
// jurídico do texto completo do documento e comparação com a carteira dele,
// quando existir uma.
export async function opinarSobreContrato(
  extracao: ExtracaoContrato,
  textoCompleto: string,
  carteira: EstatisticasCarteira | null,
): Promise<OpiniaoContrato> {
  const ai = getGeminiClient();

  const contratoResumo = {
    cliente: extracao.cliente,
    tipoPagamento: extracao.tipoPagamento,
    valorTotal: extracao.valorTotal,
    honorariosExito: extracao.honorariosExito,
    parcelas: extracao.parcelas.map(({ valor, vencimento }) => ({ valor, vencimento })),
    avisos: extracao.avisos,
  };

  const interaction = await ai.interactions.create({
    model: getGeminiModel(),
    input:
      `${contractOpinionPrompt}\n\n` +
      `CONTRATO_EXTRAIDO:\n${JSON.stringify(contratoResumo, null, 2)}\n\n` +
      `TEXTO_DO_CONTRATO:\n${textoCompleto}\n\n` +
      `ESTATISTICAS_DA_CARTEIRA:\n${
        carteira ? JSON.stringify(carteira, null, 2) : "não há outros contratos cadastrados ainda"
      }`,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: opiniaoContratoJsonSchema,
    },
  });

  if (!interaction.output_text) {
    throw new Error("O Gemini não devolveu a avaliação do contrato.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(interaction.output_text);
  } catch (cause) {
    throw new Error("O Gemini devolveu JSON inválido para a avaliação do contrato.", { cause });
  }

  return opiniaoContratoSchema.parse(parsed);
}
