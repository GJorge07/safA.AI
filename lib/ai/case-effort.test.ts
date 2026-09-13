import assert from "node:assert/strict";
import test from "node:test";
import { avaliarContratoCadastrado, type ContratoParaAvaliacao } from "./contract-assessment";
import { contextoEsforcoSchema, type ContextoEsforco } from "./case-effort";

const contrato: ContratoParaAvaliacao = { id: "c1", clienteId: "cli1", tipoPagamento: "fixo", valorTotal: 10000,
  parcelas: [{ valor: 10000, vencimento: new Date("2026-10-01"), pagamento: { valorPago: 2000, dataPago: new Date("2026-09-01") } }] };
const estimativa: ContextoEsforco = { dificuldade: "alta", fatores: ["pericia", "recursos"], horasMinimas: 20, horasMaximas: 40, custosEstimados: 2000, valorHoraMinimo: 150 };
const avaliar = (contexto: ContextoEsforco, c = contrato) => avaliarContratoCadastrado(c, [c], new Date("2026-09-12"), contexto);

test("caso difícil pode compensar: preço cruza custos e intervalo de esforço", () => {
  const opiniao = avaliar(estimativa);
  assert.equal(opiniao.avaliacoes.financeiro.status, "favoravel");
  assert.match(opiniao.avaliacoes.financeiro.justificativa, /200,00 a R\$\s*400,00/);
  assert.match(opiniao.avaliacoes.complexidade.justificativa, /perícia, recursos/);
  assert.equal(opiniao.classificacao, "atencao"); // escopo jurídico não foi confirmado
});

test("mesmo preço deixa de compensar quando o esforço cresce", () => {
  const opiniao = avaliar({ ...estimativa, horasMinimas: 80, horasMaximas: 100 });
  assert.equal(opiniao.avaliacoes.financeiro.status, "desfavoravel");
  assert.equal(opiniao.classificacao, "desfavoravel");
  assert.match(opiniao.recomendacao, /17\.000,00/);
});

test("intervalo que cruza a meta é condicionado ao esforço", () => {
  const opiniao = avaliar({ ...estimativa, horasMinimas: 40, horasMaximas: 80 });
  assert.equal(opiniao.avaliacoes.financeiro.status, "atencao");
  assert.match(opiniao.resumo, /depende do esforço/);
});

test("retorno realizado usa só recebido, custos incorridos e horas já trabalhadas", () => {
  const opiniao = avaliar({ ...estimativa, horasTrabalhadas: 10, custosIncorridos: 500 });
  assert.match(opiniao.avaliacoes.financeiro.justificativa, /já trabalhada: R\$\s*150,00\/h/);
  assert.match(opiniao.avaliacoes.financeiro.justificativa, /2\.000,00 recebidos/);
});

test("não inventa horas pela dificuldade e não trata êxito como garantido", () => {
  assert.equal(avaliar({ dificuldade: "alta", fatores: ["pericia"] }).avaliacoes.financeiro.status, "dados_insuficientes");
  const opiniao = avaliar(estimativa, { ...contrato, tipoPagamento: "exito" });
  assert.equal(opiniao.avaliacoes.financeiro.status, "atencao");
  assert.match(opiniao.avaliacoes.financeiro.justificativa, /sem probabilidade atribuída/);
});

test("custos superiores ao valor geram intervalo negativo ordenado", () => {
  const opiniao = avaliar({ ...estimativa, custosEstimados: 12000 });
  assert.match(opiniao.avaliacoes.financeiro.justificativa, /-R\$\s*100,00 a -R\$\s*50,00/);
  assert.equal(opiniao.classificacao, "desfavoravel");
});

test("valida intervalos, ausência versus zero e rejeita campos pessoais", () => {
  for (const invalido of [{ ...estimativa, horasMinimas: 0 }, { ...estimativa, horasMaximas: 10 }, { ...estimativa, custosEstimados: -1 }, { ...estimativa, cpf: "fictício" }]) {
    assert.equal(contextoEsforcoSchema.safeParse(invalido).success, false);
  }
  assert.equal(contextoEsforcoSchema.safeParse({ ...estimativa, custosEstimados: 0 }).success, true);
  assert.equal(avaliar({ ...estimativa, custosEstimados: undefined }).avaliacoes.financeiro.status, "dados_insuficientes");
});
