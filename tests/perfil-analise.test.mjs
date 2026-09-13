import assert from 'node:assert/strict';
import { test, mock, afterEach } from 'node:test';
import { prisma } from '../lib/prisma.ts';
import { Prisma } from '../app/generated/prisma/client.ts';
import { GET, PUT } from '../app/api/perfil/route.ts';
import { carregarDadosFinanceiros, salvarContratoExtraido } from '../lib/db/contratos.ts';

afterEach(() => mock.restoreAll());
const request = data => new Request('http://localhost/api/perfil', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });

test('perfil salva apenas áreas e meta e rejeita informação pessoal ou valores inválidos', async () => {
  let salvo;
  mock.method(prisma.perfilAdvogado, 'upsert', async ({create,update}) => { assert.deepEqual(update.areas, ['civel']); salvo = create; });
  assert.equal((await PUT(request({areas:['civel','civel'],valorHoraMinimo:150}))).status, 200);
  assert.deepEqual(salvo.areas, ['civel']);
  for (const data of [{areas:['inexistente'],valorHoraMinimo:null},{areas:[],valorHoraMinimo:-1},{areas:[],valorHoraMinimo:null,cpf:'fictício'}]) assert.equal((await PUT(request(data))).status, 400);
  mock.method(prisma.perfilAdvogado, 'findUnique', async () => ({areas:['civel'],valorHoraMinimo:new Prisma.Decimal(150)}));
  assert.deepEqual(await (await GET()).json(), {areas:['civel'],valorHoraMinimo:150});
});

test('contrato cadastrado aproveita o texto e a meta do perfil sem salvar na consulta', async () => {
  mock.method(prisma.perfilAdvogado, 'findUnique', async () => ({areas:['trabalhista'],valorHoraMinimo:new Prisma.Decimal(150)}));
  mock.method(prisma.contrato, 'findMany', async () => [{id:'teste',clienteId:'cli',cliente:{nome:'Fictício'},tipoPagamento:'FIXO',valorTotal:new Prisma.Decimal(12000),contextoAnalise:null,
    clausulaOriginal:'Ação cível. Dificuldade alta. Esforço total entre 60 e 100 horas. Custos totais de R$ 2.000,00.',parcelas:[]}]);
  const dados = await carregarDadosFinanceiros(new Date('2026-09-12'));
  const c = dados.contratos[0];
  assert.equal(c.contextoSugerido.horasMaximas,100);
  assert.equal(c.contextoSugerido.valorHoraMinimo,150);
  assert.equal(c.opiniao.avaliacoes.escopo.status,'atencao');
  assert.match(c.opiniao.avaliacoes.escopo.justificativa,/Cível/);
  assert.deepEqual(c.opiniao.avaliacoes.financeiro.dadosFaltantes,[]);
});

test('importação preserva contexto do texto completo mesmo quando a cláusula financeira não o contém', async () => {
  let criado;
  mock.method(prisma, '$transaction', async callback => callback({
    cliente:{findFirst:async()=>({id:'cli'})},
    contrato:{create:async args => {criado=args.data;return {id:'contrato'};}},
  }));
  await salvarContratoExtraido({cliente:'Fictício',tipoPagamento:'fixo',valorTotal:1000,clausulaOriginal:'Honorários de R$ 1.000,00.',parcelas:[]},'Objeto: ação trabalhista com perícia técnica. Honorários de R$ 1.000,00.');
  assert.deepEqual(criado.contextoAnalise.areas,['trabalhista']);
  assert.deepEqual(criado.contextoAnalise.contexto.fatores,['pericia']);
  assert.equal(criado.clausulaOriginal,'Honorários de R$ 1.000,00.');
});
