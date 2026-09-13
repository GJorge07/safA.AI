import { getGeminiClient, getGeminiModel } from "./gemini";
import { contractOpinionPrompt } from "./prompts";
import {
  opiniaoContratoJsonSchema,
  opiniaoContratoSchema,
  type ExtracaoContrato,
  type OpiniaoContrato,
} from "./schemas";
import type { EstatisticasCarteira, carregarHistoricoCliente } from "../db/contratos";

// Avalia o contrato recém-extraído para o advogado: risco financeiro, risco
// jurídico do texto completo do documento e comparação com a carteira dele,
// quando existir uma.
export async function opinarSobreContrato(
  extracao: ExtracaoContrato,
  textoCompleto: string,
  carteira: EstatisticasCarteira | null,
  historico: Awaited<ReturnType<typeof carregarHistoricoCliente>>,
  contextoAdvogado: string,
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
      `HISTORICO_DO_CLIENTE:\n${JSON.stringify(historico)}\n\n` +
      `CONTEXTO_DO_ADVOGADO:\n${JSON.stringify(contextoAdvogado || "Não informado")}\n\n` +
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

  const opiniao = opiniaoContratoSchema.parse(parsed);
  if (historico.status !== "disponivel") {
    opiniao.avaliacoes.pagamentos = {
      status: "dados_insuficientes",
      justificativa: historico.status === "identidade_ambigua"
        ? "Há mais de um cliente com esse nome; confirme a identidade antes de atribuir pagamentos."
        : "Não há histórico de pagamentos atribuível ao cliente para concluir se ele paga em dia.",
      evidencias: [`HISTORICO_DO_CLIENTE.status: ${historico.status}`],
      dadosFaltantes: ["Identidade confirmada e histórico de pagamentos do cliente"],
    };
  }
  if (!contextoAdvogado.trim()) {
    opiniao.avaliacoes.escopo = {
      status: "dados_insuficientes",
      justificativa: "As áreas de atuação e a experiência do advogado não foram informadas.",
      evidencias: [],
      dadosFaltantes: ["Áreas de atuação e experiência do advogado"],
    };
  }
  const dimensoes = Object.values(opiniao.avaliacoes);
  if (dimensoes.some(d => d.status === "desfavoravel")) opiniao.classificacao = "desfavoravel";
  else if (dimensoes.some(d => d.status !== "favoravel") && opiniao.classificacao === "favoravel") opiniao.classificacao = "atencao";
  return opiniao;
}
