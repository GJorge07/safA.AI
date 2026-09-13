import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const contratos = await prisma.contrato.findMany({
      select: { id: true, cliente: { select: { nome: true } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return Response.json(contratos, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ erro: "Não foi possível listar os contratos." }, { status: 500 });
  }
}
