import assert from "node:assert/strict";
import test from "node:test";
import { validateAnswerContractCitations } from "./answer-financial-question";

test("aceita somente citações que existem no contexto", () => {
  const answer = {
    resposta: "Há R$ 1.000,00 pendentes.",
    contratosCitados: ["contrato-1"],
    aviso: null,
  };

  assert.equal(
    validateAnswerContractCitations(answer, ["contrato-1"]),
    answer,
  );
});

test("rejeita contrato inventado pelo modelo", () => {
  const answer = {
    resposta: "Resposta",
    contratosCitados: ["contrato-inexistente"],
    aviso: null,
  };

  assert.throws(
    () => validateAnswerContractCitations(answer, ["contrato-1"]),
    /contratos inexistentes/,
  );
});
