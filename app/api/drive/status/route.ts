import { isDriveConfigured } from "@/lib/ai/drive";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  return Response.json({ configurado: isDriveConfigured() });
}
