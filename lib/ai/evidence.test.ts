import assert from "node:assert/strict";
import test from "node:test";
import { UnsupportedEvidenceError, validateExtractionEvidence } from "./evidence";
import { extracaoContratoSchema } from "./schemas";

function extraction(quote = "honorários fixos de R$ 2.500,00") {
  return extracaoContratoSchema.parse({
    cliente: "Ana Lima", tipoPagamento: "fixo", valorTotal: 2500,
    honorariosExito: null,
    parcelas: [{ valor: 2500, vencimento: "2026-09-20", evidencia: "R$ 2.500,00, com vencimento em 20/09/2026" }],
    clausulaOriginal: "honorários fixos de R$ 2.500,00, com vencimento em 20/09/2026",
    evidencias: [
      { campo: "cliente", trecho: "CONTRATANTE: Ana Lima", pagina: 1, clausula: null },
      { campo: "tipoPagamento", trecho: quote, pagina: 1, clausula: "4ª" },
      { campo: "valorTotal", trecho: quote, pagina: 1, clausula: "4ª" },
      { campo: "parcelas.0.valor", trecho: "R$ 2.500,00", pagina: 1, clausula: "4ª" },
      { campo: "parcelas.0.vencimento", trecho: "vencimento em 20/09/2026", pagina: 1, clausula: "4ª" },
    ],
    confianca: 0.99, avisos: [],
  });
}

const pages = [{ page: 1, text: "CONTRATANTE: Ana Lima. CLÁUSULA 4ª — honorários fixos de R$ 2.500,00, com vencimento em 20/09/2026." }];

test("aceita apenas extração integralmente sustentada pelo documento", () => {
  assert.equal(validateExtractionEvidence(extraction(), pages).valorTotal, 2500);
});

test("rejeita trecho de evidência inventado", () => {
  assert.throws(() => validateExtractionEvidence(extraction("trecho que não existe"), pages), UnsupportedEvidenceError);
});

test("rejeita campo preenchido sem evidência", () => {
  const item = extraction();
  item.evidencias = item.evidencias.filter((e) => e.campo !== "valorTotal");
  assert.throws(() => validateExtractionEvidence(item, pages), /valorTotal sem evidência/);
});
