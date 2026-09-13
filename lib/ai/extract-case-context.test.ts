import assert from "node:assert/strict";
import test from "node:test";
import { extrairContextoDoContrato } from "./extract-case-context";
import { compararEscopo } from "./practice-profile";
import { avaliarContratoCadastrado } from "./contract-assessment";

const texto = "Objeto: ação cível com perícia técnica e audiências. Dificuldade alta, esforço total entre 60 e 100 horas, custos totais de R$ 2.000,00 e meta de R$ 150,00 por hora. Foram trabalhadas 20 horas. Custos incorridos: R$ 500,00.";

test("extrai somente campos explícitos e preserva o trecho literal de cada origem", () => {
  const extraido = extrairContextoDoContrato(texto);
  assert.deepEqual(extraido.areas, ['civel']);
  assert.equal(extraido.contexto.horasMinimas, 60);
  assert.equal(extraido.contexto.horasMaximas, 100);
  assert.equal(extraido.contexto.custosEstimados, 2000);
  assert.equal(extraido.contexto.valorHoraMinimo, 150);
  assert.equal(extraido.contexto.dificuldade, 'alta');
  assert.deepEqual(extraido.contexto.fatores, ['pericia', 'audiencias']);
  assert.equal(extraido.contexto.horasTrabalhadas, undefined);
  assert.equal(extraido.contexto.custosIncorridos, undefined);
  for (const evidencia of extraido.evidencias) assert.ok(texto.includes(evidencia.trecho));
});

test("não inventa horas ou dificuldade pelo tipo da causa e ignora negações e valores contraditórios", () => {
  const sem = extrairContextoDoContrato('Ação trabalhista. Sem perícia. Não haverá recursos. Não há dificuldade alta. Custos totais de R$ 100,00. Custos totais de R$ 200,00.');
  assert.deepEqual(sem.areas, ['trabalhista']);
  assert.deepEqual(sem.contexto.fatores, []);
  assert.equal(sem.contexto.dificuldade, undefined);
  assert.equal(sem.contexto.horasMinimas, undefined);
  assert.equal(sem.contexto.custosEstimados, undefined);
});

test("intervalo inválido permanece ausente e custo zero explícito é preservado", () => {
  const extraido = extrairContextoDoContrato('Esforço total entre 100 e 60 horas. Custos totais: R$ 0,00.');
  assert.equal(extraido.contexto.horasMinimas, undefined);
  assert.equal(extraido.contexto.horasMaximas, undefined);
  assert.equal(extraido.contexto.custosEstimados, 0);
});

test("comparação de escopo exige perfil e área documentada e sinaliza áreas fora do perfil", () => {
  const contrato = { id:'c1', clienteId:'cli1', valorTotal:100, tipoPagamento:'fixo' as const, parcelas:[] };
  const opiniao = avaliarContratoCadastrado(contrato, [contrato]);
  assert.equal(compararEscopo(opiniao, ['civel'], null).avaliacoes.escopo.status, 'dados_insuficientes');
  const perfil = { areas: ['civel'] as const, valorHoraMinimo: 100 };
  assert.equal(compararEscopo(opiniao, [], {...perfil, areas:['civel']}).avaliacoes.escopo.status, 'dados_insuficientes');
  assert.equal(compararEscopo(opiniao, ['civel'], {...perfil, areas:['civel']}).avaliacoes.escopo.status, 'favoravel');
  assert.equal(compararEscopo(opiniao, ['trabalhista'], {...perfil, areas:['civel']}).avaliacoes.escopo.status, 'atencao');
});


test("disclaimer de exemplo não nega os campos explícitos seguintes", () => {
  const dados = extrairContextoDoContrato('Cenário de simulação sugerido, sem constituir estimativa jurídica real: dificuldade alta, esforço total entre 60 e 100 horas, custos totais de R$ 2.000,00 e meta de R$ 150,00 por hora.');
  assert.equal(dados.contexto.dificuldade, 'alta');
  assert.equal(dados.contexto.horasMinimas, 60);
  assert.equal(dados.contexto.custosEstimados, 2000);
});

test("aceita texto de PDF sem cedilha ao extrair intervalo de esforço", () => {
  const dados = extrairContextoDoContrato("Dificuldade alta. Esforco total estimado entre 60 e 100 horas.");
  assert.equal(dados.contexto.horasMinimas, 60);
  assert.equal(dados.contexto.horasMaximas, 100);
  assert.match(dados.evidencias.find((item) => item.campo.includes("horas"))?.trecho ?? "", /60 e 100 horas/);
});
