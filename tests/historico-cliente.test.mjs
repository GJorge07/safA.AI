import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../lib/prisma.ts';
import { carregarHistoricoCliente } from '../lib/db/contratos.ts';

test('histórico não atribui dívidas sem identidade ou com nomes ambíguos', async () => {
  assert.equal((await carregarHistoricoCliente(null)).status, 'cliente_nao_identificado');
  prisma.cliente.findMany = async () => [];
  assert.equal((await carregarHistoricoCliente('Novo')).status, 'sem_historico');
  prisma.cliente.findMany = async () => [{}, {}];
  assert.deepEqual(await carregarHistoricoCliente('Homônimo'), {status: 'identidade_ambigua'});
});
test('cliente sem parcelas tem histórico insuficiente', async () => {
  prisma.cliente.findMany = async (query) => {
    assert.deepEqual(query.where, {nome: {equals: 'Cliente', mode: 'insensitive'}});
    return [{contratos: [{id: 'c1', parcelas: []}]}];
  };
  const historico = await carregarHistoricoCliente(' Cliente ');
  assert.equal(historico.status, 'sem_historico');
  assert.deepEqual(historico.contratoIds, ['c1']);
});
