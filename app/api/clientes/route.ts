import { prisma } from "@/lib/prisma";
import { ApiError, body as readBody } from "@/lib/api/http";

export async function GET() {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return Response.json(clientes);
  } catch (error) {
    console.error(error);

    return Response.json(
      { error: "Erro ao buscar clientes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await readBody(request);

    if (typeof body.nome !== "string" || body.nome.trim() === "") {
      return Response.json(
        { error: "Nome é obrigatório" },
        { status: 400 }
      );
    }

    const cliente = await prisma.cliente.create({
      data: {
        nome: body.nome.trim(),
      },
    });

    return Response.json(cliente, {
      status: 201,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error(error);

    return Response.json(
      { error: "Erro ao criar cliente" },
      { status: 500 }
    );
  }
}
