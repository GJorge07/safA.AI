import { desconectarDrive } from "@/lib/db/drive-conexao";

export const runtime = "nodejs";

export async function POST(): Promise<Response> {
  await desconectarDrive();
  return Response.json({ conectado: false });
}
