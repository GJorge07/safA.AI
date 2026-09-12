import { Prisma } from '@/app/generated/prisma/client';
import type { FluxoCaixaMes, Insight } from '@/lib/types';

type Due = { valor: Prisma.Decimal; vencimento: Date };
type Paid = { valorPago: Prisma.Decimal; dataPago: Date };

export function cashflow(range: { gte: Date; lt: Date }, parcelas: Due[], pagamentos: Paid[]): FluxoCaixaMes[] {
  const months = new Map<string, { previsto: Prisma.Decimal; recebido: Prisma.Decimal }>();
  const cursor = new Date(range.gte);
  cursor.setUTCDate(1);
  while (cursor < range.lt) {
    months.set(cursor.toISOString().slice(0, 7), { previsto: new Prisma.Decimal(0), recebido: new Prisma.Decimal(0) });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  for (const parcela of parcelas) {
    const month = months.get(parcela.vencimento.toISOString().slice(0, 7));
    if (month) month.previsto = month.previsto.plus(parcela.valor);
  }
  for (const pagamento of pagamentos) {
    const month = months.get(pagamento.dataPago.toISOString().slice(0, 7));
    if (month) month.recebido = month.recebido.plus(pagamento.valorPago);
  }
  return Array.from(months, ([mes, values]) => ({ mes, previsto: values.previsto.toNumber(), recebido: values.recebido.toNumber() }));
}

type InsightParcela = Due & {
  contratoId: string;
  contrato: { clienteId: string; cliente: { nome: string } };
  pagamento: { valorPago: Prisma.Decimal } | null;
};

export function insights(parcelas: InsightParcela[], today: Date): Insight[] {
  const result: Insight[] = [];
  const overdue = new Map<string, Prisma.Decimal>();
  const clients = new Map<string, { nome: string; total: Prisma.Decimal; contratos: Set<string> }>();
  let total = new Prisma.Decimal(0);
  for (const parcela of parcelas) {
    total = total.plus(parcela.valor);
    const { clienteId, cliente } = parcela.contrato;
    const entry = clients.get(clienteId) ?? { nome: cliente.nome, total: new Prisma.Decimal(0), contratos: new Set<string>() };
    entry.total = entry.total.plus(parcela.valor);
    entry.contratos.add(parcela.contratoId);
    clients.set(clienteId, entry);
    const outstanding = parcela.valor.minus(parcela.pagamento?.valorPago ?? 0);
    if (parcela.vencimento < today && outstanding.gt(0)) {
      overdue.set(parcela.contratoId, (overdue.get(parcela.contratoId) ?? new Prisma.Decimal(0)).plus(outstanding));
    }
  }
  for (const [contratoId, saldo] of overdue) {
    result.push({ tipo: 'atraso', contratoId, descricao: `Saldo vencido de R$ ${saldo.toFixed(2)} no período consultado.` });
  }
  if (total.gt(0)) {
    for (const client of clients.values()) {
      if (client.total.div(total).gt(0.5)) {
        for (const contratoId of client.contratos) result.push({
          tipo: 'concentracao_cliente', contratoId,
          descricao: `${client.nome} concentra ${client.total.div(total).mul(100).toFixed(1)}% do valor previsto no período.`,
        });
      }
    }
  }
  return result;
}
