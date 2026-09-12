import { Prisma } from '@/app/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { handle, period, text } from '@/lib/api/http';
import { cashflow } from '@/lib/api/finance';

export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const range = period(url);
    const id = url.searchParams.get('clienteId');
    const contrato = id === null ? {} : { clienteId: text(id, 'clienteId') };
    const [parcelas, pagamentos] = await prisma.$transaction([
      prisma.parcela.findMany({ where: { vencimento: range, contrato }, select: { valor: true, vencimento: true } }),
      prisma.pagamento.findMany({ where: { dataPago: range, parcela: { contrato } }, select: { valorPago: true, dataPago: true } }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    return Response.json(cashflow(range, parcelas, pagamentos));
  });
}
