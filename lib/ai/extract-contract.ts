import {
  extracaoContratoJsonSchema,
  extracaoContratoSchema,
  type ExtracaoContrato,
} from "./schemas";
import { getGeminiClient, getGeminiModel } from "./gemini";
import { contractExtractionPrompt } from "./prompts";

export type ContractInput =
  | { kind: "text"; text: string }
  | { kind: "pdf"; base64: string };

export async function extractContract(
  input: ContractInput,
): Promise<ExtracaoContrato> {
  const ai = getGeminiClient();

  const contents = input.kind === "text"
    ? `${contractExtractionPrompt}\n\nDOCUMENTO:\n${input.text}`
    : [
        { type: "text" as const, text: contractExtractionPrompt },
        {
          type: "document" as const,
          data: input.base64,
          mime_type: "application/pdf" as const,
        },
      ];

  const interaction = await ai.interactions.create({
    model: getGeminiModel(),
    input: contents,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: extracaoContratoJsonSchema,
    },
  });

  if (!interaction.output_text) {
    throw new Error("O Gemini não devolveu conteúdo para a extração.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(interaction.output_text);
  } catch (cause) {
    throw new Error("O Gemini devolveu JSON inválido.", { cause });
  }

  return extracaoContratoSchema.parse(parsed);
}
