import { prisma } from '@/lib/prisma';
import { ApiError, body, Context, handle, pagination, parcela } from '@/lib/api/http';

export async function GET(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const paging = pagination(new URL(request.url));
    if (!await prisma.contrato.findUnique({ where: { id }, select: { id: true } })) throw new ApiError(404, 'Contrato não encontrado');
    return Response.json(await prisma.parcela.findMany({
      where: { contratoId: id }, ...paging,
      orderBy: [{ vencimento: 'asc' }, { id: 'asc' }], include: { pagamento: true },
    }));
  });
}

export async function POST(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    return Response.json(await prisma.parcela.create({
      data: { contratoId: id, ...parcela(await body(request)) },
    }), { status: 201 });
  });
}
