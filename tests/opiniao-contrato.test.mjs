import assert from 'node:assert/strict';
import { test, mock, afterEach } from 'node:test';
import { prisma } from '../lib/prisma.ts';
import { Prisma } from '../app/generated/prisma/client.ts';
import { GET, POST as simular } from '../app/api/contratos/[id]/opiniao/route.ts';
import { POST } from '../app/api/chat/route.ts';
import { carregarDadosFinanceiros } from '../lib/db/contratos.ts';
import { formatarOpiniao } from '../lib/ai/contract-assessment.ts';

afterEach(() => mock.restoreAll());
const contrato = {
  id: 'contrato-teste', clienteId: 'cliente-teste', cliente: {nome: 'Cliente Fictício'},
  tipoPagamento: 'FIXO', valorTotal: new Prisma.Decimal(100), clausulaOriginal: 'Texto de teste sem dados reais.',
  parcelas: [{ id: 'p1', valor: new Prisma.Decimal(100), vencimento: new Date('2020-01-01'),
    pagamento: { valorPago: new Prisma.Decimal(40), dataPago: new Date('2020-01-02') } }],
};
const request = body => new Request('http://localhost/api/chat', { method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body) });

test('chat e área do contrato compartilham avaliação atual sem IA externa nem escritas', async () => {
  mock.method(prisma.contrato, 'findMany', async () => [contrato]);
  const response = await GET(new Request('http://localhost'), { params: Promise.resolve({id: contrato.id}) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const { opiniao } = await response.json();
  const chat = await POST(request({pergunta: 'É um bom caso?', contratoId: contrato.id}));
  assert.equal(chat.status, 200);
  const body = await chat.json();
  assert.ok(body.resposta.resposta.includes(formatarOpiniao(opiniao)));
  assert.deepEqual(body.resposta.citacoes, [{contratoId: contrato.id, campos: ['opiniao']}]);
  const dados = await carregarDadosFinanceiros();
  assert.equal(dados.contratos[0].parcelas[0].saldo, 60);
  assert.equal(dados.resumo.atrasado, 60);
  // Os delegates de escrita e o cliente Gemini não têm mock: qualquer chamada
  // inesperada falha, e este fluxo deve funcionar sem chave de IA.
});

test('IDs inexistentes e pergunta inválida não geram opiniões inventadas', async () => {
  mock.method(prisma.contrato, 'findMany', async () => [contrato]);
  assert.equal((await GET(new Request('http://localhost'), {params: Promise.resolve({id: 'inexistente'})})).status, 404);
  assert.equal((await POST(request({pergunta: 'Avalie', contratoId: 'inexistente'}))).status, 404);
  assert.equal((await POST(request({pergunta: ''}))).status, 400);
  const chat = await POST(request({pergunta: 'O contrato da Maria é vantajoso?'}));
  const body = await chat.json();
  assert.deepEqual(body.resposta.contratosCitados, []);
  assert.match(body.resposta.resposta, /Qual contrato/);
});


test('simulação cruza esforço e preço igualmente no chat e cartão sem salvar', async () => {
  mock.method(prisma.contrato, 'findMany', async () => [contrato]);
  const contexto = { dificuldade: 'alta', fatores: ['pericia'], horasMinimas: 10, horasMaximas: 20, custosEstimados: 20, valorHoraMinimo: 30 };
  const cartao = await simular(request(contexto), { params: Promise.resolve({ id: contrato.id }) });
  assert.equal(cartao.status, 200);
  const { opiniao } = await cartao.json();
  assert.equal(opiniao.classificacao, 'desfavoravel');
  const chat = await POST(request({pergunta: 'O valor pago compensa a dificuldade?', contratoId: contrato.id, contextoEsforco: contexto}));
  assert.equal(chat.status, 200);
  assert.ok((await chat.json()).resposta.resposta.includes(formatarOpiniao(opiniao)));
  const semDados = await GET(new Request('http://localhost'), {params: Promise.resolve({id: contrato.id})});
  assert.equal((await semDados.json()).opiniao.avaliacoes.financeiro.status, 'dados_insuficientes');
});

test('rejeita horas inválidas e estimativa sem contrato específico', async () => {
  const contexto = { dificuldade: 'alta', horasMinimas: 20, horasMaximas: 10 };
  assert.equal((await simular(request(contexto), {params: Promise.resolve({id: contrato.id})})).status, 400);
  assert.equal((await POST(request({pergunta: 'Avalie', contextoEsforco: {dificuldade: 'alta'}}))).status, 400);
});

test('pergunta simples sobre o último caso usa a data de cadastro e nunca chama geração livre', async () => {
  mock.method(prisma.contrato, 'findMany', async () => [
    { ...contrato, id:'antigo', createdAt:new Date('2026-01-01') },
    { ...contrato, id:'recente', createdAt:new Date('2026-09-12T12:00:00Z') },
  ]);
  const res = await POST(request({pergunta:'meu ultimo caso é bom?'}));
  assert.equal(res.status,200);
  const body = await res.json();
  assert.deepEqual(body.resposta.contratosCitados,['recente']);
  assert.match(body.resposta.resposta,/cadastrado mais recentemente/);
  assert.deepEqual(body.resposta.citacoes[0].campos,['opiniao','createdAt']);
});

test('pergunta mensal responde localmente sem chamar o provedor', async () => {
  mock.method(prisma.contrato, 'findMany', async () => [{
    ...contrato, createdAt:new Date('2026-09-12T12:00:00Z'),
    parcelas:[{id:'outubro',valor:new Prisma.Decimal(100),vencimento:new Date('2026-10-05'),pagamento:null}],
  }]);
  const res = await POST(request({pergunta:'Quanto vou receber em outubro?'}));
  assert.equal(res.status,200);
  const body = await res.json();
  assert.match(body.resposta.resposta,/R\$\s*100,00 previstos/);
  assert.match(body.resposta.aviso,/sem geração por IA/);
});
