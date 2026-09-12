import { basename } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { extrairTexto } from "./extractText.js";
import { montarPromptUsuario, SYSTEM_PROMPT } from "./prompt.js";
import { ContratoExtraidoSchema, type ContratoExtraido } from "./schema.js";

const client = new Anthropic();

/**
 * Lê um contrato de honorários (PDF/DOCX), extrai os dados via Claude e
 * valida a saída com zod antes de devolvê-la. Lança erro se a saída não
 * puder ser validada.
 */
export async function extrairContrato(caminhoArquivo: string): Promise<ContratoExtraido> {
  const nomeArquivo = basename(caminhoArquivo);
  const textoContrato = await extrairTexto(caminhoArquivo);

  const response = await client.messages.parse({
    model: "claude-opus-5",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: montarPromptUsuario(nomeArquivo, textoContrato) }],
    output_config: {
      format: zodOutputFormat(ContratoExtraidoSchema),
    },
  });

  const validado = ContratoExtraidoSchema.safeParse(response.parsed_output);
  if (!validado.success) {
    throw new Error(
      `Saída da IA não corresponde ao schema de contrato (${nomeArquivo}): ${validado.error.message}`,
    );
  }

  return validado.data;
}
