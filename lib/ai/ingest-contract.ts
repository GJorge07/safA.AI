import { adaptToBackend, ExtractionNeedsReviewError } from "./adapt-to-backend";
import { downloadDriveContract, type DriveFileReference } from "./drive";
import { extractContractFile, type SupportedContractMimeType } from "./extract-file";
import type { ExtracaoContrato } from "./schemas";
import type { ContratoExtraido } from "../types";

export interface IngestionResult {
  status: "pronto_para_salvar" | "revisao_necessaria";
  extracao: ExtracaoContrato;
  textoCompleto: string;
  payloadBackend: ContratoExtraido | null;
  motivosRevisao: string[];
  fonte: DriveFileReference | null;
}

async function finalize(buffer: Buffer, mimeType: SupportedContractMimeType, fonte: DriveFileReference | null): Promise<IngestionResult> {
  const { extracao, textoCompleto } = await extractContractFile(buffer, mimeType);
  try {
    return { status: "pronto_para_salvar", extracao, textoCompleto, payloadBackend: adaptToBackend(extracao), motivosRevisao: [], fonte };
  } catch (error) {
    if (!(error instanceof ExtractionNeedsReviewError)) throw error;
    return { status: "revisao_necessaria", extracao, textoCompleto, payloadBackend: null, motivosRevisao: error.reasons, fonte };
  }
}

export function ingestUploadedContract(buffer: Buffer, mimeType: SupportedContractMimeType): Promise<IngestionResult> {
  return finalize(buffer, mimeType, null);
}

export async function ingestDriveContract(fileId: string): Promise<IngestionResult> {
  const file = await downloadDriveContract(fileId);
  return finalize(file.buffer, file.mimeType, file.reference);
}
