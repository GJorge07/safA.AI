import { prisma } from '@/lib/prisma';
import { ApiError, body, contrato, handle, pagination, parcela, text } from '@/lib/api/http';

export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const clienteId = url.searchParams.get('clienteId');
    return Response.json(await prisma.contrato.findMany({
      where: clienteId === null ? {} : { clienteId: text(clienteId, 'clienteId') },
      ...pagination(url),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: { cliente: true, _count: { select: { parcelas: true } } },
    }));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const data = await body(request);
    const fields = contrato(data);
    if (!Array.isArray(data.parcelas) || data.parcelas.length > 600) throw new ApiError(400, 'parcelas deve ser uma lista com até 600 itens');
    // A escrita aninhada cria contrato e parcelas atomicamente.
    const result = await prisma.contrato.create({
      data: { ...fields, parcelas: { create: data.parcelas.map(parcela) } },
      include: { parcelas: { orderBy: { vencimento: 'asc' } } },
    });
    return Response.json(result, { status: 201 });
  });
}
