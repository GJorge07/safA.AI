import assert from "node:assert/strict";
import test from "node:test";
import { responderConsultaMensal } from "./monthly-finance";
import type { DadosFinanceiros } from "./schemas";

const dados: DadosFinanceiros = {
  dataReferencia: "2026-09-13",
  resumo: { previsto: 1500, recebido: 400, pendente: 1100, atrasado: 0 },
  contratos: [
    {
      id: "c1", clienteId: "cli1", cliente: "Cliente 1", tipoPagamento: "fixo",
      valorTotal: 1000, clausulaOriginal: "Teste",
      parcelas: [
        { id: "p1", valor: 1000, saldo: 600, vencimento: "2026-10-05", status: "prevista" },
      ],
    },
    {
      id: "c2", clienteId: "cli2", cliente: "Cliente 2", tipoPagamento: "fixo",
      valorTotal: 500, clausulaOriginal: "Teste",
      parcelas: [
        { id: "p2", valor: 500, saldo: 500, vencimento: "2026-11-05", status: "prevista" },
      ],
    },
  ],
};

test("responde perguntas simples de outubro sem IA", () => {
  for (const pergunta of ["Quanto vou receber em outubro?", "quando vou ganhar em outubro", "qual o previsto para 10/2026?"]) {
    const resposta = responderConsultaMensal(pergunta, dados);
    assert.ok(resposta);
    assert.match(resposta.resposta, /R\$\s*1\.000,00 previstos/);
    assert.match(resposta.resposta, /R\$\s*400,00 já foi recebido/);
    assert.match(resposta.resposta, /R\$\s*600,00 continua pendente/);
    assert.deepEqual(resposta.contratosCitados, ["c1"]);
  }
});

test("entende mês relativo e informa quando não há vencimentos", () => {
  assert.match(responderConsultaMensal("quanto entra no próximo mês?", dados)!.resposta, /outubro de 2026/);
  assert.match(responderConsultaMensal("quanto vou receber em dezembro?", dados)!.resposta, /Não há parcelas/);
});

test("respeita o contrato selecionado", () => {
  const vazio = responderConsultaMensal("quanto vou receber em outubro?", dados, "c2")!;
  assert.match(vazio.resposta, /Não há parcelas/);
  const outubro = responderConsultaMensal("quanto vou receber em outubro?", dados, "c1")!;
  assert.deepEqual(outubro.contratosCitados, ["c1"]);
});

test("não intercepta perguntas sem intenção financeira mensal", () => {
  assert.equal(responderConsultaMensal("o processo aconteceu em outubro?", dados), null);
  assert.equal(responderConsultaMensal("quanto vou receber?", dados), null);
});
