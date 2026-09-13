import { z } from "zod";
import { answerFinancialQuestion } from "./answer-financial-question";
import { resolveDriveReferences, type DriveFileReference } from "./drive";
import { generateAutomaticInsights, type AutomaticInsight } from "./insights";
import { contextoFinanceiroSchema, type RespostaFinanceira } from "./schemas";

const flowBInputSchema = contextoFinanceiroSchema.extend({
  driveFileIds: z.array(z.string().min(1).max(200)).max(20).default([]),
});

export interface FlowBResult {
  resposta: RespostaFinanceira;
  insights: AutomaticInsight[];
  fontes: DriveFileReference[];
}

export async function runFlowB(input: unknown): Promise<FlowBResult> {
  const parsed = flowBInputSchema.parse(input);
  const installments = parsed.dados.contratos.flatMap((contract) =>
    contract.parcelas.map((installment) => ({
      contratoId: contract.id,
      clienteId: contract.clienteId,
      clienteNome: contract.cliente,
      valor: installment.saldo ?? installment.valor,
      vencimento: installment.vencimento,
      pago: installment.status === "paga",
    })),
  );

  const [resposta, fontes] = await Promise.all([
    answerFinancialQuestion({ pergunta: parsed.pergunta, dados: parsed.dados, contratoReferencia: parsed.contratoReferencia }),
    parsed.driveFileIds.length ? resolveDriveReferences(parsed.driveFileIds) : [],
  ]);
  const insights = generateAutomaticInsights(
    installments,
    new Date(`${parsed.dados.dataReferencia}T12:00:00Z`),
    parsed.dados.contratos.map(({ id, tipoPagamento }) => ({ id, tipoPagamento })),
  );

  return { resposta, insights, fontes };
}
