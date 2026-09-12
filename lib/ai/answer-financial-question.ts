import { getGeminiClient, getGeminiModel } from "./gemini";
import { financialChatPrompt } from "./prompts";
import {
  contextoFinanceiroSchema,
  respostaFinanceiraJsonSchema,
  respostaFinanceiraSchema,
  type DadosFinanceiros,
  type RespostaFinanceira,
} from "./schemas";

export function validateAnswerContractCitations(
  answer: RespostaFinanceira,
  data: DadosFinanceiros,
): RespostaFinanceira {
  const allowed = new Set(data.contratos.map((item) => item.id));
  const invalidCitations = answer.contratosCitados.filter(
    (contractId) => !allowed.has(contractId),
  );

  if (invalidCitations.length > 0) {
    throw new Error(
      `O Gemini citou contratos inexistentes: ${invalidCitations.join(", ")}`,
    );
  }


  if (answer.citacoes.length === 0 && answer.aviso === null) {
    throw new Error("O Gemini respondeu sem indicar os dados utilizados.");
  }

  for (const citation of answer.citacoes) {
    const root: unknown = citation.contratoId === null
      ? data
      : data.contratos.find((item) => item.id === citation.contratoId);
    if (!root) throw new Error(`O Gemini citou contrato inexistente: ${citation.contratoId}`);
    for (const field of citation.campos) {
      if (!hasOwnPath(root, field)) throw new Error(`O Gemini citou campo inexistente: ${citation.contratoId ?? "resumo"}.${field}`);
    }
  }

  const citationContractIds = new Set(answer.citacoes.flatMap((item) => item.contratoId ? [item.contratoId] : []));
  if (answer.contratosCitados.some((id) => !citationContractIds.has(id)) || [...citationContractIds].some((id) => !answer.contratosCitados.includes(id))) {
    throw new Error("A lista de contratos citados não corresponde às fontes detalhadas.");
  }

  return answer;
}

function hasOwnPath(root: unknown, path: string): boolean {
  if (!/^[A-Za-z][A-Za-z0-9]*(?:\.\d+|\.[A-Za-z][A-Za-z0-9]*)*$/.test(path)) return false;
  let current: unknown = root;
  for (const segment of path.split(".")) {
    if (current === null || typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, segment)) return false;
    current = (current as Record<string, unknown>)[segment];
  }
  return current !== undefined;
}

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
  return validateAnswerContractCitations(
    answer,
    context.dados,
  );
}
