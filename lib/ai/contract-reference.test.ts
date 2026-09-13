import assert from "node:assert/strict";
import test from "node:test";
import { resolverContratos } from "./contract-reference";
import { avaliarContratoCadastrado, perguntaDeOpiniao, responderOpiniaoLocal } from "./contract-assessment";
import { answerFinancialQuestion, validateAnswerContractCitations } from "./answer-financial-question";
import type { DadosFinanceiros } from "./schemas";

const recentes = [
  { id: "c1", cliente: "Ana Teste", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "c10", cliente: "Beatriz Teste", createdAt: "2026-09-12T12:00:00.000Z" },
  { id: "c2", cliente: "Carlos Teste", createdAt: "2026-02-01T00:00:00.000Z" },
];

test("reconhece a pergunta exata e variações sem depender da ordem da lista ou do ID", () => {
  for (const pergunta of ["meu ultimo caso é bom?", "meu último caso é bom?", "o contrato mais recente é bom?", "minha última causa é boa?", "meu ultimo caso é ruim?"]) {
    assert.equal(perguntaDeOpiniao(pergunta), true);
    const result = resolverContratos(pergunta, recentes);
    assert.equal(result.selecionados[0].id, "c10");
    assert.equal(result.usaData, true);
  }
  assert.equal(perguntaDeOpiniao("bom dia"), false);
});

test("não escolhe um último caso quando faltam datas, há empate ou o cliente é desconhecido", () => {
  assert.equal(resolverContratos("último caso é bom?", recentes.map(c => ({...c, createdAt: undefined}))).selecionados.length, 0);
  assert.equal(resolverContratos("último caso é bom?", recentes.map(c => ({...c, createdAt: recentes[1].createdAt}))).selecionados.length, 0);
  assert.equal(resolverContratos("o último caso da Maria é bom?", recentes).selecionados.length, 0);
  assert.equal(resolverContratos("avalie c10", recentes).selecionados.length, 1);
  assert.equal(resolverContratos("avalie c10", recentes).selecionados[0].id, "c10");
  assert.equal(resolverContratos("o último caso de Ana Teste é bom?", recentes).selecionados[0].id, "c1");
});

test("responde o último caso sem chave de IA, com fonte da data e limitações verificáveis", async () => {
  const base = { id: "c10", clienteId: "cliente", valorTotal: 100, tipoPagamento: "fixo" as const, parcelas: [] };
  const opiniao = avaliarContratoCadastrado(base, [base]);
  const dados: DadosFinanceiros = {
    dataReferencia:"2026-09-12", resumo:{previsto:0,recebido:0,pendente:0,atrasado:0},
    contratos: recentes.map(c => ({...c,clienteId:"cliente",tipoPagamento:"fixo",valorTotal:100,clausulaOriginal:"Contrato fictício",parcelas:[],opiniao})),
  };
  const resposta = await answerFinancialQuestion({ pergunta:"meu ultimo caso é bom?",dados });
  assert.deepEqual(resposta.contratosCitados, ["c10"]);
  assert.match(resposta.resposta,/Beatriz Teste/);
  assert.match(resposta.resposta,/cadastrado mais recentemente/);
  assert.match(resposta.resposta,/Ainda não dá para afirmar/);
  assert.deepEqual(resposta.citacoes[0].campos, ["opiniao","createdAt"]);
  assert.equal(validateAnswerContractCitations(resposta,dados),resposta);
  assert.ok(resposta.resposta.length < 1200);
  const detalhada = responderOpiniaoLocal("Explique meu último caso, é bom?",dados.contratos);
  assert.ok(detalhada.resposta.length > resposta.resposta.length);
});
