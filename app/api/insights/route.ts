import { prisma } from '@/lib/prisma';
import { handle, period } from '@/lib/api/http';
import { insights } from '@/lib/api/finance';

export async function GET(request: Request) {
  return handle(async () => {
    const range = period(new URL(request.url));
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const parcelas = await prisma.parcela.findMany({
      where: { vencimento: range },
      select: {
        valor: true, vencimento: true, contratoId: true,
        pagamento: { select: { valorPago: true } },
        contrato: { select: { clienteId: true, cliente: { select: { nome: true } } } },
      },
      orderBy: [{ vencimento: 'asc' }, { id: 'asc' }],
    });
    return Response.json(insights(parcelas, today));
  });
}
