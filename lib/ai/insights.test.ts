import assert from "node:assert/strict";
import test from "node:test";
import { generateAutomaticInsights } from "./insights";

test("gera atraso, concentração e dependência de êxito sem usar LLM", () => {
  const insights = generateAutomaticInsights(
    [
      {
        contratoId: "contrato-ana",
        clienteId: "cliente-ana",
        clienteNome: "Ana Lima",
        valor: 2000,
        vencimento: "2026-09-05",
        pago: false,
      },
      {
        contratoId: "contrato-ana",
        clienteId: "cliente-ana",
        clienteNome: "Ana Lima",
        valor: 3000,
        vencimento: "2026-10-05",
        pago: false,
      },
      {
        contratoId: "contrato-bruno",
        clienteId: "cliente-bruno",
        clienteNome: "Bruno Alves",
        valor: 1000,
        vencimento: "2026-10-10",
        pago: false,
      },
    ],
    new Date("2026-09-12T00:00:00Z"),
    [
      { id: "contrato-ana", tipoPagamento: "fixo" },
      { id: "contrato-bruno", tipoPagamento: "misto" },
    ],
  );

  assert.equal(insights.filter((item) => item.tipo === "atraso").length, 1);
  assert.equal(
    insights.find((item) => item.tipo === "concentracao_cliente")?.percentual,
    83.3,
  );
  assert.equal(
    insights.find((item) => item.tipo === "dependencia_exito")?.percentual,
    50,
  );
});
