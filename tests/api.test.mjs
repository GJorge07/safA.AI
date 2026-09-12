import { test, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import * as clients from '@/app/api/clientes/route';
import * as client from '@/app/api/clientes/[id]/route';
import * as contracts from '@/app/api/contratos/route';
import * as contract from '@/app/api/contratos/[id]/route';
import * as installments from '@/app/api/contratos/[id]/parcelas/route';
import * as installment from '@/app/api/parcelas/[id]/route';
import * as payment from '@/app/api/parcelas/[id]/pagamento/route';
import * as flow from '@/app/api/fluxo-caixa/route';
import * as insightRoute from '@/app/api/insights/route';
import * as extraction from '@/app/api/contratos/extrair/route';
import { cashflow, insights } from '@/lib/api/finance';
import { money, date, period } from '@/lib/api/http';

afterEach(() => mock.restoreAll());
const ctx = { params: Promise.resolve({ id: 'test-id' }) };
const request = (method, data, query = '') => new Request(`http://localhost/api/test${query}`, {
  method, ...(data === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),
});
const valid = { clienteId: 'cliente-1', tipoPagamento: 'fixo', valorTotal: '100.50', clausulaOriginal: 'Pagamento em uma parcela.', parcelas: [{ valor: '100.50', vencimento: '2026-10-01' }] };
const fail = code => { throw new Prisma.PrismaClientKnownRequestError('test', { code, clientVersion: '6.19.3' }); };
const decimal = value => new Prisma.Decimal(value);

test('POST e PUT de clientes rejeitam corpos inválidos sem consultar o banco', async () => {
  const create = mock.method(prisma.cliente, 'create');
  const lookup = mock.method(prisma.cliente, 'findUnique');
  const update = mock.method(prisma.cliente, 'update');
  for (const data of [null, [], {}, { nome: 123 }, { nome: true }, { nome: {} }, { nome: ' ' }]) {
    assert.equal((await clients.POST(request('POST', data))).status, 400);
    assert.equal((await client.PUT(request('PUT', data), ctx)).status, 400);
  }
  for (const [method, handler] of [['POST', clients.POST], ['PUT', client.PUT]]) {
    assert.equal((await handler(new Request('http://localhost', { method, body: '{' }), ctx)).status, 400);
  }
  assert.equal(create.mock.callCount(), 0);
  assert.equal(lookup.mock.callCount(), 0);
  assert.equal(update.mock.callCount(), 0);
});

test('POST e PUT de clientes preservam sucesso e removem espaços do nome', async () => {
  const create = mock.method(prisma.cliente, 'create', async ({ data }) => ({ id: 'test-id', ...data }));
  mock.method(prisma.cliente, 'findUnique', async () => ({ id: 'test-id' }));
  const update = mock.method(prisma.cliente, 'update', async ({ data }) => ({ id: 'test-id', ...data }));
  const created = await clients.POST(request('POST', { nome: ' Ana ' }));
  assert.equal(created.status, 201);
  assert.equal((await created.json()).nome, 'Ana');
  const updated = await client.PUT(request('PUT', { nome: ' Maria ' }), ctx);
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).nome, 'Maria');
  assert.equal(create.mock.calls[0].arguments[0].data.nome, 'Ana');
  assert.equal(update.mock.calls[0].arguments[0].data.nome, 'Maria');
});

test('valida dinheiro e datas sem arredondar ou normalizar entradas inválidas', () => {
  for (const value of [null, true, {}, -1, 0, '1.001', '1000000000000', '1e3', 'NaN']) assert.throws(() => money(value, 'valor'));
  assert.equal(money('999999999999.99', 'valor').toFixed(2), '999999999999.99');
  for (const value of ['2026-02-29', '2026-04-31', '2026-01-01T12:00:00', 123]) assert.throws(() => date(value, 'data'));
  assert.equal(date('2024-02-29', 'data').toISOString(), '2024-02-29T00:00:00.000Z');
  assert.throws(() => period(new URL('http://localhost?inicio=2026-01-01')));
});

test('POST contrato rejeita JSON inválido, null e parcelas inválidas antes do banco', async () => {
  const spy = mock.method(prisma.contrato, 'create', () => { throw new Error('Não deve consultar o banco'); });
  for (const data of [null, [], {}, { ...valid, parcelas: [{}] }, { ...valid, tipoPagamento: 123 }]) {
    assert.equal((await contracts.POST(request('POST', data))).status, 400);
  }
  assert.equal((await contracts.POST(new Request('http://localhost', { method: 'POST', body: '{' }))).status, 400);
  assert.equal(spy.mock.callCount(), 0);
});

test('cria contrato e parcelas com uma escrita aninhada e normaliza enum', async () => {
  const spy = mock.method(prisma.contrato, 'create', async args => ({ id: 'contrato-1', ...args.data }));
  const response = await contracts.POST(request('POST', valid));
  assert.equal(response.status, 201);
  const data = spy.mock.calls[0].arguments[0].data;
  assert.equal(data.tipoPagamento, 'FIXO');
  assert.equal(data.parcelas.create[0].valor.toFixed(2), '100.50');
  assert.equal(spy.mock.callCount(), 1);
});

test('listagem aplica filtro e paginação e rejeita limite excessivo', async () => {
  const spy = mock.method(prisma.contrato, 'findMany', async () => []);
  assert.equal((await contracts.GET(request('GET', undefined, '?clienteId=c1&page=2&limit=5'))).status, 200);
  assert.equal(spy.mock.calls[0].arguments[0].skip, 5);
  assert.deepEqual(spy.mock.calls[0].arguments[0].where, { clienteId: 'c1' });
  assert.equal((await contracts.GET(request('GET', undefined, '?limit=1000'))).status, 400);
});

test('consulta contrato inexistente retorna 404 e PUT não substitui parcelas', async () => {
  mock.method(prisma.contrato, 'findUnique', async () => null);
  assert.equal((await contract.GET(request('GET'), ctx)).status, 404);
  assert.equal((await contract.PUT(request('PUT', valid), ctx)).status, 400);
  mock.method(prisma.contrato, 'update', async () => fail('P2025'));
  const fields = { ...valid };
  delete fields.parcelas;
  assert.equal((await contract.PUT(request('PUT', fields), ctx)).status, 404);
});

test('CRUD de contrato, parcela e pagamento retorna respostas de sucesso', async () => {
  mock.method(prisma.contrato, 'findUnique', async () => ({ id: 'test-id' }));
  mock.method(prisma.contrato, 'update', async () => ({ id: 'test-id' }));
  mock.method(prisma.contrato, 'delete', async () => ({ id: 'test-id' }));
  mock.method(prisma.parcela, 'findMany', async () => []);
  mock.method(prisma.parcela, 'create', async () => ({ id: 'p1' }));
  mock.method(prisma.parcela, 'update', async () => ({ id: 'p1' }));
  mock.method(prisma.parcela, 'delete', async () => ({ id: 'p1' }));
  mock.method(prisma.pagamento, 'create', async () => ({ id: 'pg1' }));
  mock.method(prisma.pagamento, 'update', async () => ({ id: 'pg1' }));
  mock.method(prisma.pagamento, 'delete', async () => ({ id: 'pg1' }));
  const fields = { ...valid };
  delete fields.parcelas;
  assert.equal((await contract.GET(request('GET'), ctx)).status, 200);
  assert.equal((await contract.PUT(request('PUT', fields), ctx)).status, 200);
  assert.equal((await contract.DELETE(request('DELETE'), ctx)).status, 204);
  assert.equal((await installments.GET(request('GET'), ctx)).status, 200);
  assert.equal((await installments.POST(request('POST', valid.parcelas[0]), ctx)).status, 201);
  assert.equal((await installment.PUT(request('PUT', valid.parcelas[0]), ctx)).status, 200);
  assert.equal((await installment.DELETE(request('DELETE'), ctx)).status, 204);
  assert.equal((await payment.POST(request('POST', { valorPago: 100 }), ctx)).status, 201);
  assert.equal((await payment.PUT(request('PUT', { valorPago: 100, dataPago: '2026-10-01' }), ctx)).status, 200);
  assert.equal((await payment.DELETE(request('DELETE'), ctx)).status, 204);
});

test('vínculo ausente retorna 404, pagamento duplicado retorna 409', async () => {
  mock.method(prisma.parcela, 'create', async () => fail('P2003'));
  mock.method(prisma.pagamento, 'create', async () => fail('P2002'));
  mock.method(prisma.pagamento, 'delete', async () => fail('P2025'));
  assert.equal((await installments.POST(request('POST', valid.parcelas[0]), ctx)).status, 404);
  assert.equal((await payment.POST(request('POST', { valorPago: 100 }), ctx)).status, 409);
  assert.equal((await payment.DELETE(request('DELETE'), ctx)).status, 404);
});

test('fluxo soma decimais e separa mês de vencimento do recebimento', () => {
  const range = period(new URL('http://localhost?inicio=2026-01-01&fim=2026-03-31'));
  const result = cashflow(range, [
    { valor: decimal('0.10'), vencimento: new Date('2026-01-05') },
    { valor: decimal('0.20'), vencimento: new Date('2026-01-06') },
  ], [{ valorPago: decimal('0.30'), dataPago: new Date('2026-02-01') }]);
  assert.deepEqual(result, [
    { mes: '2026-01', previsto: 0.3, recebido: 0 },
    { mes: '2026-02', previsto: 0, recebido: 0.3 },
    { mes: '2026-03', previsto: 0, recebido: 0 },
  ]);
});

test('rotas financeiras usam período por vencimento e por pagamento', async () => {
  const due = mock.method(prisma.parcela, 'findMany', async () => []);
  const paid = mock.method(prisma.pagamento, 'findMany', async () => []);
  mock.method(prisma, '$transaction', async queries => Promise.all(queries));
  assert.equal((await flow.GET(request('GET', undefined, '?inicio=2026-01-01&fim=2026-01-31'))).status, 200);
  assert.equal(due.mock.calls[0].arguments[0].where.vencimento.lt.toISOString(), '2026-02-01T00:00:00.000Z');
  assert.ok(paid.mock.calls[0].arguments[0].where.dataPago);
  assert.deepEqual(await (await insightRoute.GET(request('GET'))).json(), []);
});

test('insights consideram saldo parcial e não atrasam parcelas de hoje', () => {
  const base = { valor: decimal(100), contratoId: 'c1', contrato: { clienteId: 'cli1', cliente: { nome: 'Ana' } }, vencimento: new Date('2026-01-01') };
  const result = insights([
    { ...base, pagamento: { valorPago: decimal(40) } },
    { ...base, contratoId: 'c2', pagamento: { valorPago: decimal(100) } },
    { ...base, contratoId: 'c3', pagamento: null, vencimento: new Date('2026-01-02') },
  ], new Date('2026-01-02'));
  const delays = result.filter(item => item.tipo === 'atraso');
  assert.equal(delays.length, 1);
  assert.match(delays[0].descricao, /60\.00/);
  assert.ok(result.some(item => item.tipo === 'concentracao_cliente'));
});

test('extração sem configuração retorna 503 sem chamar provedor', async () => {
  const original = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const spy = mock.method(globalThis, 'fetch', () => { throw new Error('Não deve chamar provedor'); });
    assert.equal((await extraction.POST(request('POST', { texto: 'Contrato de teste' }))).status, 503);
    assert.equal(spy.mock.callCount(), 0);
  } finally {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
  }
});

test('extração aceita texto e PDF, mantém campos ausentes e trata falhas do Gemini', async () => {
  const original = { key: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL };
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_MODEL = 'test-model';
  const draft = { cliente: 'Ana', tipoPagamento: 'exito', valorTotal: null, clausulaOriginal: 'Êxito condicionado.', parcelas: [] };
  try {
    const spy = mock.method(globalThis, 'fetch', async () => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(draft) }] } }] }));
    const response = await extraction.POST(request('POST', { texto: 'Contrato de teste' }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { dados: draft, revisaoNecessaria: true });
    const form = new FormData();
    form.set('arquivo', new File(['%PDF-1.7\nfixture'], 'contrato.pdf', { type: 'application/pdf' }));
    assert.equal((await extraction.POST(new Request('http://localhost', { method: 'POST', body: form }))).status, 200);
    assert.equal(JSON.parse(spy.mock.calls[1].arguments[1].body).contents[0].parts[0].inlineData.mimeType, 'application/pdf');
    spy.mock.mockImplementation(async () => Response.json({ candidates: [{ finishReason: 'MAX_TOKENS' }] }));
    assert.equal((await extraction.POST(request('POST', { texto: 'teste' }))).status, 502);
    spy.mock.mockImplementation(async () => new Response(null, { status: 429 }));
    assert.equal((await extraction.POST(request('POST', { texto: 'teste' }))).status, 503);
    spy.mock.mockImplementation(async () => { throw new DOMException('timeout', 'TimeoutError'); });
    assert.equal((await extraction.POST(request('POST', { texto: 'teste' }))).status, 504);
  } finally {
    if (original.key === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = original.key;
    if (original.model === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = original.model;
  }
});

test('extração rejeita formato incorreto, PDF falso e corpo excessivo', async () => {
  assert.equal((await extraction.POST(new Request('http://localhost', { method: 'POST', body: 'texto' }))).status, 415);
  const form = new FormData();
  form.set('arquivo', new File(['fake'], 'fake.pdf', { type: 'application/pdf' }));
  assert.equal((await extraction.POST(new Request('http://localhost', { method: 'POST', body: form }))).status, 400);
  assert.equal((await extraction.POST(request('POST', { texto: 'a'.repeat(10 * 1024 * 1024) }))).status, 413);
});
