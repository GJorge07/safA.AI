import { buildGoogleAuthUrl } from "@/lib/ai/drive";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    return Response.redirect(buildGoogleAuthUrl());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return Response.json({ erro: message }, { status: 500 });
  }
}
