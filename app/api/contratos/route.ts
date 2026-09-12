import { NextResponse } from "next/server";

// TODO(backend/ia): substituir por: salvar arquivo, chamar extração
// (lib/ai/) validando contra ContratoExtraido, e persistir via Prisma.
// Placeholder criado pelo frontend só para o upload funcionar ponta a
// ponta antes da API de verdade existir.
export async function POST(req: Request) {
  const form = await req.formData();
  const arquivo = form.get("arquivo");
  if (!arquivo) {
    return NextResponse.json({ erro: "Nenhum arquivo enviado" }, { status: 400 });
  }
  return NextResponse.json({ status: "recebido" });
}
