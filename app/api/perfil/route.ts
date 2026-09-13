import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { perfilAdvogadoSchema } from "@/lib/ai/practice-profile";

const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const perfil = await prisma.perfilAdvogado.findUnique({ where: { id: "principal" } });
    return Response.json({ areas: perfil?.areas ?? [], valorHoraMinimo: perfil?.valorHoraMinimo?.toNumber() ?? null }, { headers });
  } catch { return Response.json({ erro: "Não foi possível carregar o perfil." }, { status: 500 }); }
}
export async function PUT(request: Request) {
  try {
    const dados = perfilAdvogadoSchema.parse(await request.json());
    await prisma.perfilAdvogado.upsert({ where: { id: "principal" }, create: { id: "principal", ...dados }, update: dados });
    return Response.json(dados, { headers });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) return Response.json({ erro: "Confira as áreas e a meta por hora; informe um valor positivo ou deixe em branco." }, { status: 400 });
    return Response.json({ erro: "Não foi possível salvar o perfil." }, { status: 500 });
  }
}
