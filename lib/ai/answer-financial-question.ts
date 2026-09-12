import { getGeminiClient, getGeminiModel } from "./gemini";
import { financialChatPrompt } from "./prompts";
import {
  contextoFinanceiroSchema,
  respostaFinanceiraJsonSchema,
  respostaFinanceiraSchema,
  type RespostaFinanceira,
} from "./schemas";

export async function answerFinancialQuestion(
  input: unknown,
): Promise<RespostaFinanceira> {
  const context = contextoFinanceiroSchema.parse(input);
  const ai = getGeminiClient();

  const interaction = await ai.interactions.create({
    model: getGeminiModel(),
    input: `${financialChatPrompt}\n\nPERGUNTA_DO_USUARIO:\n${context.pergunta}\n\n<DADOS_DO_BACKEND>\n${JSON.stringify(context.dados, null, 2)}\n</DADOS_DO_BACKEND>`,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: respostaFinanceiraJsonSchema,
    },
  });

  if (!interaction.output_text) {
    throw new Error("O Gemini não devolveu resposta para a pergunta financeira.");
  }

  const answer = respostaFinanceiraSchema.parse(JSON.parse(interaction.output_text));
  const validContractIds = new Set(context.dados.contratos.map((item) => item.id));
  const invalidCitations = answer.contratosCitados.filter(
    (contractId) => !validContractIds.has(contractId),
  );

  if (invalidCitations.length > 0) {
    throw new Error(
      `O Gemini citou contratos inexistentes: ${invalidCitations.join(", ")}`,
    );
  }

  return answer;
}
