import assert from "node:assert/strict";
import test from "node:test";
import { avaliarContratoCadastrado, perguntaDeOpiniao, responderOpiniaoLocal, type ContratoParaAvaliacao } from "./contract-assessment";
import { opiniaoContratoSchema } from "./schemas";

const hoje = new Date("2026-09-12T12:00:00Z");
const base: ContratoParaAvaliacao = { id: "c1", clienteId: "cliente1", tipoPagamento: "fixo", valorTotal: 100,
  parcelas: [{ valor: 100, vencimento: new Date("2026-10-01"), pagamento: null }] };

test("contrato futuro sem pagamentos não é devedor nem tem rentabilidade comprovada", () => {
  const opiniao = avaliarContratoCadastrado(base, [base], hoje);
  assert.doesNotThrow(() => opiniaoContratoSchema.parse(opiniao));
  assert.equal(opiniao.classificacao, "atencao");
  for (const dimensao of Object.values(opiniao.avaliacoes)) assert.equal(dimensao.status, "dados_insuficientes");
  assert.equal(opiniao.riscos.length, 0);
});

test("não mistura histórico de cadastros distintos e reconhece saldo parcial do mesmo cadastro", () => {
  const vencido = { ...base, id: "c2", parcelas: [{ valor: 100, vencimento: new Date("2026-09-01"), pagamento: { valorPago: 40, dataPago: new Date("2026-09-01") } }] };
  const outro = { ...vencido, id: "c3", clienteId: "outro", parcelas: [{ valor: 9999, vencimento: new Date("2026-01-01"), pagamento: null }] };
  const opiniao = avaliarContratoCadastrado(base, [base, vencido, outro], hoje);
  assert.equal(opiniao.avaliacoes.pagamentos.status, "atencao");
  assert.match(opiniao.avaliacoes.pagamentos.justificativa, /60,00/);
  assert.doesNotMatch(JSON.stringify(opiniao), /9\.999/);
});

test("pagamento completo tardio merece atenção sem dívida atual", () => {
  const contrato = { ...base, parcelas: [{ valor: 100, vencimento: new Date("2026-09-01"), pagamento: { valorPago: 100, dataPago: new Date("2026-09-02") } }] };
  const opiniao = avaliarContratoCadastrado(contrato, [contrato], hoje);
  assert.equal(opiniao.avaliacoes.pagamentos.status, "atencao");
  assert.match(opiniao.avaliacoes.pagamentos.justificativa, /nenhum saldo vencido/);
});

test("êxito e parcelas divergentes geram alertas sem inventar lucro", () => {
  const contrato = { ...base, tipoPagamento: "exito" as const, valorTotal: 1000 };
  const opiniao = avaliarContratoCadastrado(contrato, [contrato], hoje);
  assert.equal(opiniao.riscos.length, 2);
  assert.equal(opiniao.avaliacoes.financeiro.status, "atencao");
  assert.match(opiniao.avaliacoes.financeiro.justificativa, /faltam custos/);
});

test("chat usa exatamente a opinião do contrato selecionado e não adivinha nomes", () => {
  const opiniao = avaliarContratoCadastrado(base, [base], hoje);
  const contratos = [{ id: base.id, cliente: "Cliente de Teste", opiniao }];
  const resposta = responderOpiniaoLocal("É um bom caso?", contratos, base.id);
  assert.match(resposta.resposta, /Ainda não dá para afirmar que seja um bom caso/);
  assert.deepEqual(resposta.citacoes, [{ contratoId: "c1", campos: ["opiniao"] }]);
  assert.equal(responderOpiniaoLocal("Avalie o contrato de Maria", contratos).contratosCitados.length, 0);
  assert.equal(responderOpiniaoLocal("Avalie todos os contratos", contratos).contratosCitados.length, 1);
  for (const pergunta of ["É vantajoso?", "Qual a dificuldade?", "bom caso", "me dê insights", "tem chance de êxito?", "fora do escopo"]) assert.equal(perguntaDeOpiniao(pergunta), true);
});
