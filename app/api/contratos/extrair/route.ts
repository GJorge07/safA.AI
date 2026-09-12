import { ApiError, handle, object, text } from '@/lib/api/http';
import { extract } from '@/lib/ai/extrair';

export const runtime = 'nodejs';
export const maxDuration = 60;
const MAX_BYTES = 10 * 1024 * 1024;

// Limita o corpo real, mesmo se Content-Length estiver ausente ou incorreto.
async function limitedRequest(request: Request) {
  if (!request.body) throw new ApiError(400, 'Documento obrigatório');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        throw new ApiError(413, 'O corpo da requisição deve ter até 10 MiB');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return new Request(request.url, { method: 'POST', headers: request.headers, body: Buffer.concat(chunks) });
}

export async function POST(request: Request) {
  return handle(async () => {
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.startsWith('application/json') && !contentType.startsWith('multipart/form-data')) throw new ApiError(415, 'Envie JSON com texto ou multipart/form-data com arquivo PDF/TXT');
    const limited = await limitedRequest(request);
    let parts: Parameters<typeof extract>[0];
    try {
      if (contentType.startsWith('application/json')) {
        const data = object(await limited.json());
        parts = [{ text: text(data.texto, 'texto', 100000) }];
      } else {
        const form = await limited.formData();
        const file = form.get('arquivo');
        if (!(file instanceof File) || file.size === 0) throw new ApiError(400, 'Envie um arquivo não vazio no campo arquivo');
        const buffer = Buffer.from(await file.arrayBuffer());
        if (file.type === 'application/pdf') {
          if (buffer.subarray(0, 5).toString() !== '%PDF-') throw new ApiError(400, 'Arquivo PDF inválido');
          parts = [{ inlineData: { mimeType: 'application/pdf', data: buffer.toString('base64') } }];
        } else if (file.type === 'text/plain') {
          parts = [{ text: text(new TextDecoder('utf-8', { fatal: true }).decode(buffer), 'arquivo', 100000) }];
        } else throw new ApiError(415, 'Formato aceito: PDF ou TXT UTF-8');
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, 'Corpo da requisição inválido');
    }
    return Response.json({ dados: await extract(parts), revisaoNecessaria: true });
  });
}
