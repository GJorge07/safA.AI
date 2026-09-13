import { revalidatePath } from "next/cache";
import { ingestDriveContract } from "@/lib/ai";
import { listarArquivosDaPasta } from "@/lib/ai/drive";
import { salvarContratoExtraido } from "@/lib/db/contratos";
import { arquivosJaImportados, marcarArquivoImportado, obterConexaoDrive } from "@/lib/db/drive-conexao";

export const runtime = "nodejs";

const MIME_SUPORTADOS = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.google-apps.document",
  "text/plain",
]);

// Limita arquivos processados por chamada — evita uma sincronização travar a
// UI por minutos ou estourar a cota do Gemini de uma vez só.
const MAX_ARQUIVOS_POR_SYNC = 10;

export async function POST(): Promise<Response> {
  const conexao = await obterConexaoDrive();
  if (!conexao.conectado) return Response.json({ erro: "Conecte uma conta do Google Drive antes." }, { status: 409 });
  if (!conexao.pastaId) return Response.json({ erro: "Configure a pasta do Drive antes de sincronizar." }, { status: 409 });

  try {
    const arquivos = await listarArquivosDaPasta(conexao.pastaId);
    const candidatos = arquivos.filter((a) => MIME_SUPORTADOS.has(a.mimeType));
    const jaImportados = await arquivosJaImportados(candidatos.map((a) => a.id));
    const pendentes = candidatos.filter((a) => !jaImportados.has(a.id)).slice(0, MAX_ARQUIVOS_POR_SYNC);

    let salvos = 0;
    let revisao = 0;
    let erros = 0;

    for (const arquivo of pendentes) {
      try {
        const resultado = await ingestDriveContract(arquivo.id);
        if (resultado.payloadBackend) {
          const contrato = await salvarContratoExtraido(resultado.payloadBackend);
          await marcarArquivoImportado({ driveFileId: arquivo.id, status: "importado", contratoId: contrato.id });
          salvos += 1;
        } else {
          await marcarArquivoImportado({ driveFileId: arquivo.id, status: "revisao_necessaria" });
          revisao += 1;
        }
      } catch (error) {
        console.error(`Falha ao importar arquivo do Drive ${arquivo.id}:`, error);
        await marcarArquivoImportado({ driveFileId: arquivo.id, status: "erro" });
        erros += 1;
      }
    }

    if (salvos > 0) {
      revalidatePath("/");
      revalidatePath("/contratos");
    }

    return Response.json({
      encontrados: arquivos.length,
      novos: pendentes.length,
      salvos,
      revisao,
      erros,
      restantesNaPasta: candidatos.length - jaImportados.size - pendentes.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado.";
    return Response.json({ erro: message }, { status: 502 });
  }
}
