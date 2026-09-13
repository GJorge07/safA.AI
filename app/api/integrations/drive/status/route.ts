import { obterConexaoDrive } from "@/lib/db/drive-conexao";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const status = await obterConexaoDrive();
  return Response.json(status);
}
