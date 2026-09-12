import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { contextoFinanceiroSchema } from "./schemas";

function loadMock(): unknown {
  const path = join(process.cwd(), "lib/ai/mocks/financial-context.json");
  return JSON.parse(readFileSync(path, "utf8"));
}

test("aceita o contexto financeiro mockado", () => {
  const result = contextoFinanceiroSchema.safeParse(loadMock());
  assert.equal(result.success, true);
});

test("rejeita valor financeiro negativo", () => {
  const mock = loadMock() as any;
  mock.dados.resumo.pendente = -1;
  assert.equal(contextoFinanceiroSchema.safeParse(mock).success, false);
});

test("rejeita data que não esteja em ISO", () => {
  const mock = loadMock() as any;
  mock.dados.dataReferencia = "12/09/2026";
  assert.equal(contextoFinanceiroSchema.safeParse(mock).success, false);
});

test("limita o tamanho da pergunta", () => {
  const mock = loadMock() as any;
  mock.pergunta = "a".repeat(501);
  assert.equal(contextoFinanceiroSchema.safeParse(mock).success, false);
});
