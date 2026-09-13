import { getContaConectada, trocarCodigoPorTokens } from "@/lib/ai/drive";
import { salvarConexaoDrive } from "@/lib/db/drive-conexao";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const destino = new URL("/contratos", url.origin);

  const erroGoogle = url.searchParams.get("error");
  if (erroGoogle) {
    destino.searchParams.set("drive", "erro");
    destino.searchParams.set("drive_detalhe", erroGoogle);
    return Response.redirect(destino);
  }

  const code = url.searchParams.get("code");
  if (!code) {
    destino.searchParams.set("drive", "erro");
    destino.searchParams.set("drive_detalhe", "codigo_ausente");
    return Response.redirect(destino);
  }

  try {
    const { refreshToken, accessToken } = await trocarCodigoPorTokens(code);
    const contaEmail = await getContaConectada(accessToken);
    await salvarConexaoDrive({ refreshToken, contaEmail });
    destino.searchParams.set("drive", "conectado");
  } catch (error) {
    destino.searchParams.set("drive", "erro");
    destino.searchParams.set("drive_detalhe", error instanceof Error ? error.message : "erro_desconhecido");
  }
  return Response.redirect(destino);
}
