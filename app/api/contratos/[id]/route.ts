import { prisma } from '@/lib/prisma';
import { ApiError, body, Context, contrato, handle } from '@/lib/api/http';

export async function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const result = await prisma.contrato.findUnique({
      where: { id },
      include: { cliente: true, parcelas: { orderBy: { vencimento: 'asc' }, include: { pagamento: true } } },
    });
    if (!result) throw new ApiError(404, 'Contrato não encontrado');
    return Response.json(result);
  });
}

export async function PUT(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const data = await body(request);
    if ('parcelas' in data) throw new ApiError(400, 'Edite as parcelas pelas rotas de parcelas');
    return Response.json(await prisma.contrato.update({ where: { id }, data: contrato(data) }));
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    await prisma.contrato.delete({ where: { id } });
    return new Response(null, { status: 204 });
  });
}
