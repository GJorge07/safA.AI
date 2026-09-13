import { z } from "zod";
import { extracaoContratoSchema } from "@/lib/ai/schemas";

export const documentoSchema = z.object({
  id: z.string(),
  nome: z.string(),
  extracao: extracaoContratoSchema,
  motivosRevisao: z.array(z.string()),
});
export type DocumentoEnviado = z.infer<typeof documentoSchema>;
const CHAVE = "safa:documentos";

export function obterDocumentos(): DocumentoEnviado[] {
  if (typeof window === "undefined") return [];
  try {
    return z.array(documentoSchema).parse(JSON.parse(localStorage.getItem(CHAVE) ?? "[]"));
  } catch { return []; }
}

export async function enviarContrato(file: File): Promise<DocumentoEnviado> {
  if (!file.size) throw new Error("O arquivo está vazio.");
  if (file.size > 20 * 1024 * 1024) throw new Error("O arquivo excede o limite de 20 MB.");
  if (!/\.(pdf|docx|txt)$/i.test(file.name)) throw new Error("Formato não suportado. Use PDF, DOCX ou TXT.");
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/contratos/importar", { method: "POST", body: form });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.erro ?? "Não foi possível ler o arquivo. Tente novamente.");
  const documento = documentoSchema.parse({
    id: crypto.randomUUID(), nome: file.name,
    extracao: data?.extracao, motivosRevisao: data?.motivosRevisao,
  });
  // Mesma persistência local usada pelo histórico de conversas do MVP.
  localStorage.setItem(CHAVE, JSON.stringify([...obterDocumentos(), documento]));
  window.dispatchEvent(new Event(CHAVE));
  return documento;
}

export function resumoDocumento(doc: DocumentoEnviado): string {
  const e = doc.extracao;
  return `${doc.nome}: cliente ${e.cliente ?? "não identificado"}; pagamento ${e.tipoPagamento ?? "não identificado"}; valor total ${e.valorTotal === null ? "não informado" : e.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}; ${e.parcelas.length} parcela(s).${e.clausulaOriginal ? `\nCláusula: ${e.clausulaOriginal}` : ""}${doc.motivosRevisao.length ? `\nRevisão necessária: ${doc.motivosRevisao.join(" ")}` : ""}${e.avisos.length ? `\nAvisos: ${e.avisos.join(" ")}` : ""}`;
}
