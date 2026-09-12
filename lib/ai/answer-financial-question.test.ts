import assert from "node:assert/strict";
import test from "node:test";
import { validateAnswerContractCitations } from "./answer-financial-question";

const data = {
  dataReferencia: "2026-09-12",
  resumo: { previsto: 1000, recebido: 0, pendente: 1000, atrasado: 1000 },
  contratos: [{
    id: "contrato-1", clienteId: "cliente-1", cliente: "Ana",
    tipoPagamento: "fixo" as const, valorTotal: 1000,
    parcelas: [{ id: "p-1", valor: 1000, vencimento: "2026-09-01", status: "atrasada" as const }],
  }],
};

test("aceita somente citações que existem no contexto", () => {
  const answer = {
    resposta: "Há R$ 1.000,00 pendentes.",
    contratosCitados: ["contrato-1"],
    citacoes: [{ contratoId: "contrato-1", campos: ["parcelas.0.valor"] }],
    aviso: null,
  };

  assert.equal(
    validateAnswerContractCitations(answer, data),
    answer,
  );
});

test("rejeita contrato inventado pelo modelo", () => {
  const answer = {
    resposta: "Resposta",
    contratosCitados: ["contrato-inexistente"],
    citacoes: [{ contratoId: "contrato-inexistente", campos: ["valorTotal"] }],
    aviso: null,
  };

  assert.throws(
    () => validateAnswerContractCitations(answer, data),
    /contratos inexistentes/,
  );
});

test("rejeita campo financeiro inventado pelo modelo", () => {
  const answer = {
    resposta: "Resposta", contratosCitados: ["contrato-1"],
    citacoes: [{ contratoId: "contrato-1", campos: ["lucroInventado"] }], aviso: null,
  };
  assert.throws(() => validateAnswerContractCitations(answer, data), /campo inexistente/);
});

test("aceita total consolidado com fonte no resumo", () => {
  const answer = {
    resposta: "Há R$ 1.000,00 pendentes.", contratosCitados: [],
    citacoes: [{ contratoId: null, campos: ["resumo.pendente"] }], aviso: null,
  };
  assert.equal(validateAnswerContractCitations(answer, data), answer);
});

test("rejeita inconsistência entre lista e fontes detalhadas", () => {
  const answer = {
    resposta: "Resposta", contratosCitados: ["contrato-1"],
    citacoes: [{ contratoId: null, campos: ["resumo.pendente"] }], aviso: null,
  };
  assert.throws(() => validateAnswerContractCitations(answer, data), /não corresponde/);
});
