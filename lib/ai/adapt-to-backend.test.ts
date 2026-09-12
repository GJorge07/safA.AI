import assert from "node:assert/strict";
import test from "node:test";
import { adaptToBackend, ExtractionNeedsReviewError } from "./adapt-to-backend";
import { extracaoContratoSchema } from "./schemas";

test("contrato fixo completo fica pronto para o backend", () => {
  const extraction = extracaoContratoSchema.parse({
    cliente: "Ana Lima", tipoPagamento: "fixo", valorTotal: 2500,
    honorariosExito: null,
    parcelas: [{ valor: 2500, vencimento: "2026-09-20", evidencia: "R$ 2.500 em 20/09/2026" }],
    clausulaOriginal: "Honorários de R$ 2.500 em 20/09/2026.", evidencias: [], confianca: 0.99, avisos: [],
  });
  assert.equal(adaptToBackend(extraction).valorTotal, 2500);
});

test("contrato de êxito sem valor não vira zero", () => {
  const extraction = extracaoContratoSchema.parse({
    cliente: "Carla Mendes", tipoPagamento: "exito", valorTotal: null,
    honorariosExito: { percentual: 20, baseCalculo: "valor líquido recebido" },
    parcelas: [], clausulaOriginal: "20% do valor líquido recebido.", evidencias: [], confianca: 0.9, avisos: [],
  });
  assert.throws(() => adaptToBackend(extraction), ExtractionNeedsReviewError);
});

test("contrato misto preserva parte fixa e êxito na extração rica", () => {
  const extraction = extracaoContratoSchema.parse({
    cliente: "Daniel Rocha", tipoPagamento: "misto", valorTotal: 1500,
    honorariosExito: { percentual: 15, baseCalculo: "proveito econômico bruto" },
    parcelas: [{ valor: 1500, vencimento: "2026-09-30", evidencia: "R$ 1.500 em 30/09/2026" }],
    clausulaOriginal: "R$ 1.500 e 15% sobre o proveito econômico bruto.", evidencias: [], confianca: 0.98, avisos: [],
  });
  assert.equal(extraction.honorariosExito?.percentual, 15);
  assert.equal(adaptToBackend(extraction).tipoPagamento, "misto");
});
