import { prisma } from "@/lib/prisma";
import { ApiError, body as readBody } from "@/lib/api/http";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  request: Request,
  { params }: Params
) {
  try {
    const { id } = await params;

    const cliente = await prisma.cliente.findUnique({
      where: {
        id,
      },
      include: {
        contratos: true,
      },
    });

    if (!cliente) {
      return Response.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    return Response.json(cliente);
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Erro ao buscar cliente" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: Params
) {
  try {
    const { id } = await params;
    const body = await readBody(request);

    if (typeof body.nome !== "string" || body.nome.trim() === "") {
      return Response.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    const clienteExiste = await prisma.cliente.findUnique({
      where: {
        id,
      },
    });

    if (!clienteExiste) {
      return Response.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    const cliente = await prisma.cliente.update({
      where: {
        id,
      },
      data: {
        nome: body.nome.trim(),
      },
    });

    return Response.json(cliente);
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error(error);

    return Response.json(
      { error: "Erro ao atualizar cliente" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: Params
) {
  try {
    const { id } = await params;

    const clienteExiste = await prisma.cliente.findUnique({
      where: {
        id,
      },
    });

    if (!clienteExiste) {
      return Response.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    await prisma.cliente.delete({
      where: {
        id,
      },
    });

    return Response.json({
      message: "Cliente removido com sucesso",
    });
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Erro ao remover cliente" },
      { status: 500 }
    );
  }
}
