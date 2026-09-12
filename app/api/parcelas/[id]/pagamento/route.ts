import { prisma } from '@/lib/prisma';
import { body, Context, date, handle, money } from '@/lib/api/http';

export async function POST(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const data = await body(request);
    return Response.json(await prisma.pagamento.create({
      data: {
        parcelaId: id, valorPago: money(data.valorPago, 'valorPago'),
        ...(data.dataPago === undefined ? {} : { dataPago: date(data.dataPago, 'dataPago') }),
      },
    }), { status: 201 });
  });
}

export async function PUT(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const data = await body(request);
    return Response.json(await prisma.pagamento.update({
      where: { parcelaId: id },
      data: { valorPago: money(data.valorPago, 'valorPago'), dataPago: date(data.dataPago, 'dataPago') },
    }));
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    await prisma.pagamento.delete({ where: { parcelaId: id } });
    return new Response(null, { status: 204 });
  });
}
