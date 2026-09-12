import assert from "node:assert/strict";
import test from "node:test";
import mock from "./mocks/financial-context.json";
import { generateAutomaticInsights } from "./insights";
import { contextoFinanceiroSchema } from "./schemas";

test("o contrato de entrada do Fluxo B aceita o JSON mockado", () => {
  assert.doesNotThrow(() => contextoFinanceiroSchema.parse(mock));
});

test("a integração transforma parcelas do backend nos três insights previstos", () => {
  const parsed = contextoFinanceiroSchema.parse(mock);
  const installments = parsed.dados.contratos.flatMap((contract) =>
    contract.parcelas.map((installment) => ({
      contratoId: contract.id,
      clienteId: contract.clienteId,
      clienteNome: contract.cliente,
      valor: installment.valor,
      vencimento: installment.vencimento,
      pago: installment.status === "paga",
    })),
  );
  const insights = generateAutomaticInsights(
    installments,
    new Date(`${parsed.dados.dataReferencia}T12:00:00Z`),
    parsed.dados.contratos.map(({ id, tipoPagamento }) => ({ id, tipoPagamento })),
  );

  assert.ok(insights.some((item) => item.tipo === "atraso"));
  assert.ok(insights.some((item) => item.tipo === "concentracao_cliente"));
  assert.ok(insights.some((item) => item.tipo === "dependencia_exito"));
});
