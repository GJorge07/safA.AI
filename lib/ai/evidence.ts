import type { ExtracaoContrato } from "./schemas";

export interface SourcePage {
  page: number;
  text: string;
}

export class UnsupportedEvidenceError extends Error {
  constructor(public readonly reasons: string[]) {
    super(`Evidências não confirmadas: ${reasons.join("; ")}`);
    this.name = "UnsupportedEvidenceError";
  }
}

function normalize(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function requiredEvidenceFields(extraction: ExtracaoContrato): string[] {
  const fields: string[] = [];
  if (extraction.cliente !== null) fields.push("cliente");
  if (extraction.tipoPagamento !== null) fields.push("tipoPagamento");
  if (extraction.valorTotal !== null) fields.push("valorTotal");
  if (extraction.honorariosExito?.percentual !== null && extraction.honorariosExito?.percentual !== undefined) fields.push("honorariosExito.percentual");
  if (extraction.honorariosExito?.baseCalculo) fields.push("honorariosExito.baseCalculo");
  extraction.parcelas.forEach((parcela, index) => {
    if (parcela.valor !== null) fields.push(`parcelas.${index}.valor`);
    if (parcela.vencimento !== null) fields.push(`parcelas.${index}.vencimento`);
  });
  return fields;
}

export function validateExtractionEvidence(extraction: ExtracaoContrato, pages: SourcePage[]): ExtracaoContrato {
  const reasons: string[] = [];
  const documentText = normalize(pages.map((item) => item.text).join("\n"));
  const evidenceByField = new Map(extraction.evidencias.map((item) => [item.campo, item]));

  for (const field of requiredEvidenceFields(extraction)) {
    if (!evidenceByField.has(field)) reasons.push(`${field} sem evidência`);
  }

  for (const evidence of extraction.evidencias) {
    const target = evidence.pagina === null
      ? documentText
      : normalize(pages.find((item) => item.page === evidence.pagina)?.text ?? "");
    if (!target || !target.includes(normalize(evidence.trecho))) {
      reasons.push(`${evidence.campo}: trecho não localizado${evidence.pagina ? ` na página ${evidence.pagina}` : " no documento"}`);
    }
  }

  extraction.parcelas.forEach((parcela, index) => {
    if (!documentText.includes(normalize(parcela.evidencia))) reasons.push(`parcela ${index + 1}: evidência não localizada`);
  });
  if (extraction.clausulaOriginal && !documentText.includes(normalize(extraction.clausulaOriginal))) {
    reasons.push("cláusula financeira não localizada literalmente");
  }

  if (reasons.length) throw new UnsupportedEvidenceError(reasons);
  return extraction;
}
