import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      status: "ok",
      message: "SAFA backend funcionando",
      db: "conectado",
    });
  } catch (error) {
    return Response.json(
      {
        status: "erro",
        message: "SAFA backend funcionando, mas sem conexão com o banco",
        db: "desconectado",
        erro: error instanceof Error ? error.message : "Erro desconhecido",
      },
      { status: 503 },
    );
  }
}