import { NextResponse } from "next/server";

// TODO(ia): substituir por chamada real ao LLM com tool-calling sobre os
// contratos extraídos (ver lib/ai/). Placeholder criado pelo frontend só
// para o chat funcionar ponta a ponta antes da API de verdade existir.
export async function POST(req: Request) {
  const { pergunta } = await req.json();
  return NextResponse.json({
    resposta: `Ainda não tenho a extração real conectada, mas recebi sua pergunta: "${pergunta}".`,
  });
}
