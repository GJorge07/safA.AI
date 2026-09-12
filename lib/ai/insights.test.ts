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

test("não marca parcela paga como atrasada", () => {
  const insights = generateAutomaticInsights(
    [{
      contratoId: "contrato-1",
      clienteId: "cliente-1",
      clienteNome: "Cliente",
      valor: 1000,
      vencimento: "2026-01-01",
      pago: true,
    }],
    new Date("2026-09-12T00:00:00Z"),
  );

  assert.equal(insights.some((item) => item.tipo === "atraso"), false);
});

test("não gera concentração abaixo do limite de 40%", () => {
  const installments = ["a", "b", "c"].map((id) => ({
    contratoId: `contrato-${id}`,
    clienteId: `cliente-${id}`,
    clienteNome: `Cliente ${id}`,
    valor: 1000,
    vencimento: "2026-12-01",
    pago: false,
  }));

  const insights = generateAutomaticInsights(
    installments,
    new Date("2026-09-12T00:00:00Z"),
  );

  assert.equal(
    insights.some((item) => item.tipo === "concentracao_cliente"),
    false,
  );
});

test("não gera dependência de êxito abaixo do limite de 40%", () => {
  const insights = generateAutomaticInsights(
    [],
    new Date("2026-09-12T00:00:00Z"),
    [
      { id: "1", tipoPagamento: "exito" },
      { id: "2", tipoPagamento: "fixo" },
      { id: "3", tipoPagamento: "fixo" },
    ],
  );

  assert.equal(
    insights.some((item) => item.tipo === "dependencia_exito"),
    false,
  );
});
