import { prisma } from '@/lib/prisma';
import { body, Context, handle, parcela } from '@/lib/api/http';

export async function PUT(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    return Response.json(await prisma.parcela.update({ where: { id }, data: parcela(await body(request)) }));
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    await prisma.parcela.delete({ where: { id } });
    return new Response(null, { status: 204 });
  });
}
