import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  estaBaixada,
  estaEmAberto,
  parcelasAtrasadas,
  proximoVencimento,
  saldoEmAberto,
  statusDoContrato,
  totalEmAtraso,
  totalPrevistoNoMes,
} from '@/components/dashboard/types';

const HOJE = new Date('2026-09-13T12:00:00.000Z');

function parcela({ id, valor, vencimento, pago = false, baixada = false }) {
  return {
    id,
    contratoId: 'c1',
    valor,
    vencimento: new Date(vencimento),
    baixadaEm: baixada ? new Date('2026-09-10T00:00:00.000Z') : null,
    motivoBaixa: baixada ? 'sem_exito' : null,
    notaBaixa: null,
    pagamento: pago
      ? { id: `${id}-pg`, parcelaId: id, valorPago: valor, dataPago: new Date(vencimento) }
      : null,
  };
}

function contrato(parcelas) {
  return {
    id: 'c1',
    numero: 1,
    titulo: null,
    processo: null,
    clienteId: 'cli1',
    cliente: { id: 'cli1', nome: 'Cliente', documento: null, email: null, telefone: null, createdAt: HOJE },
    tipoPagamento: 'exito',
    valorTotal: parcelas.reduce((t, p) => t + p.valor, 0),
    clausulaOriginal: 'cláusula',
    origem: 'manual',
    arquivoNome: null,
    createdAt: new Date('2026-01-01'),
    parcelas,
  };
}

// Honorário de êxito que não se confirmou deixa de ser devido. O risco aqui é
// o oposto do da inadimplência: tratá-lo como dívida infla atraso e previsto
// com dinheiro que nunca vai existir.
describe('parcela baixada (êxito que não veio)', () => {
  it('não é dívida em aberto, mas continua sendo uma baixa', () => {
    const baixada = parcela({ id: 'p1', valor: 18000, vencimento: '2026-08-01', baixada: true });

    assert.equal(estaBaixada(baixada), true);
    assert.equal(estaEmAberto(baixada), false);
  });

  it('sai do saldo em aberto do contrato', () => {
    const c = contrato([
      parcela({ id: 'p1', valor: 10000, vencimento: '2026-08-01', baixada: true }),
      parcela({ id: 'p2', valor: 5000, vencimento: '2026-10-01' }),
    ]);

    assert.equal(saldoEmAberto(c), 5000);
  });

  it('vencida e baixada não conta como atraso', () => {
    const c = contrato([parcela({ id: 'p1', valor: 18000, vencimento: '2026-08-01', baixada: true })]);

    assert.equal(totalEmAtraso([c], HOJE), 0);
    assert.deepEqual(parcelasAtrasadas(c, HOJE), []);
  });

  it('vencida e não paga continua sendo atraso — baixa não é inadimplência', () => {
    const c = contrato([parcela({ id: 'p1', valor: 18000, vencimento: '2026-08-01' })]);

    assert.equal(totalEmAtraso([c], HOJE), 18000);
    assert.equal(parcelasAtrasadas(c, HOJE).length, 1);
  });

  it('contrato com tudo baixado ou pago é considerado encerrado', () => {
    const c = contrato([
      parcela({ id: 'p1', valor: 10000, vencimento: '2026-07-01', pago: true }),
      parcela({ id: 'p2', valor: 18000, vencimento: '2026-08-01', baixada: true }),
    ]);

    assert.equal(statusDoContrato(c), 'quitado');
  });

  it('some da projeção do mês', () => {
    const c = contrato([
      parcela({ id: 'p1', valor: 18000, vencimento: '2026-10-05', baixada: true }),
      parcela({ id: 'p2', valor: 3000, vencimento: '2026-10-15' }),
    ]);

    // Outubro tem 21.000 lançados, mas só 3.000 ainda podem entrar.
    assert.equal(totalPrevistoNoMes([c], 2026, 9), 3000);
  });

  it('não é oferecida como próximo vencimento a cobrar', () => {
    const c = contrato([
      parcela({ id: 'p1', valor: 18000, vencimento: '2026-09-20', baixada: true }),
      parcela({ id: 'p2', valor: 3000, vencimento: '2026-11-10' }),
    ]);

    assert.equal(proximoVencimento(c)?.toISOString().slice(0, 10), '2026-11-10');
  });

  it('desfazer a baixa devolve a parcela à cobrança', () => {
    const aberta = parcela({ id: 'p1', valor: 18000, vencimento: '2026-08-01' });
    const c = contrato([aberta]);

    assert.equal(statusDoContrato(c), 'atrasado');
    assert.equal(saldoEmAberto(c), 18000);
  });
});
