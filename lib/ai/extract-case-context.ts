import { z } from "zod";
import { contextoEsforcoSchema, type ContextoEsforco } from "./case-effort";
import { areaSchema } from "./practice-profile";

export const dadosAnaliseDocumentoSchema = z.object({
  versao: z.literal(1), contexto: contextoEsforcoSchema,
  areas: z.array(areaSchema),
  evidencias: z.array(z.object({ campo: z.string(), trecho: z.string().max(300) })),
});
export type DadosAnaliseDocumento = z.infer<typeof dadosAnaliseDocumentoSchema>;
const numeroBR = (valor: string) => Number(valor.replaceAll(".", "").replace(",", "."));
const montante = "((?:\\d{1,3}(?:\\.\\d{3})+|\\d+)(?:,\\d{1,2})?)";

// Extração local e conservadora de expressões explícitas, com trecho literal.
// Não estima horas, custo ou dificuldade a partir do tipo da ação.
export function extrairContextoDoContrato(texto: string): DadosAnaliseDocumento {
  const contexto: ContextoEsforco = { fatores: [] };
  const evidencias: DadosAnaliseDocumento["evidencias"] = [];
  const areas: DadosAnaliseDocumento["areas"] = [];
  const afirmado = (match: RegExpMatchArray) => {
    const antes = texto.slice(Math.max(0, (match.index ?? 0) - 65), match.index);
    const frase = antes.split(/[;.!?\n]/).at(-1) ?? "";
    return !/(?:\b(?:não|nao)(?:\s+[\p{L}]+){0,3}|\b(?:sem|exceto|exclu[ií]d[oa]s?|dispensad[oa]s?)(?:\s+(?:necessidade|previs[aã]o|realiza[çc][aã]o))?(?:\s+de)?)[\s:]*$/iu.test(frase);
  };
  function unico(campo: string, regex: RegExp, converter: (m: RegExpMatchArray) => string | number) {
    const matches = [...texto.matchAll(regex)].filter(afirmado);
    const valores = [...new Set(matches.map(converter))];
    if (valores.length !== 1) return undefined;
    evidencias.push({ campo, trecho: matches[0][0].slice(0, 300) });
    return valores[0];
  }
  contexto.dificuldade = unico("dificuldade", /(?:dificuldade|complexidade)\s*(?:estimada\s*)?(?::|de)?\s*(baixa|m[eé]dia|alta)\b/gi, m => m[1].toLowerCase().replace("é", "e")) as ContextoEsforco["dificuldade"];
  const intervalos = [...texto.matchAll(/(?:esforço total|esforço|horas totais|trabalho total|dedica[çc][ãa]o total)\s*(?:estimad[oa]s?\s*)?(?::|de|entre)?\s*(\d+(?:,\d+)?)\s*(?:a|e|–|-)\s*(\d+(?:,\d+)?)\s*(?:horas|h)\b/gi)].filter(afirmado);
  if (new Set(intervalos.map(m => `${m[1]}:${m[2]}`)).size === 1) {
    contexto.horasMinimas = numeroBR(intervalos[0][1]); contexto.horasMaximas = numeroBR(intervalos[0][2]);
    evidencias.push({ campo: "horasMinimas/horasMaximas", trecho: intervalos[0][0] });
  }
  contexto.custosEstimados = unico("custosEstimados", new RegExp(`custos\\s+(?:totais|estimados)(?:\\s+estimados)?\\s*(?::|de)?\\s*R\\$\\s*${montante}(?!\\d|[.,]\\d)`, "gi"), m => numeroBR(m[1])) as number | undefined;
  contexto.valorHoraMinimo = unico("valorHoraMinimo", new RegExp(`meta\\s*(?::|de)?\\s*R\\$\\s*${montante}\\s*(?:por hora|/h)\\b`, "gi"), m => numeroBR(m[1])) as number | undefined;
  // Horas realizadas e despesas incorridas são registros operacionais: não
  // os importa de um contrato prospectivo, mesmo que ele descreva exemplos.
  const fatores = { pericia: /per[ií]cia(?:\s+t[eé]cnica)?/gi, recursos: /recursos\b/gi, audiencias: /audi[eê]ncias?\b/gi, provas: /(?:produ[çc][ãa]o|an[aá]lise)\s+(?:de provas|documental)/gi, urgencia: /prazos?\s+urgentes?/gi };
  for (const [campo, regex] of Object.entries(fatores)) {
    const match = [...texto.matchAll(regex)].find(afirmado);
    if (match) { contexto.fatores.push(campo as ContextoEsforco["fatores"][number]); evidencias.push({ campo: `fatores.${campo}`, trecho: match[0] }); }
  }
  const padroes = {
    civel: /(?:a[çc][ãa]o|direito|demanda)\s+c[ií]v(?:el|il)\b/gi,
    trabalhista: /(?:a[çc][ãa]o|direito|reclama[çc][ãa]o|demanda)\s+trabalhista\b/gi,
    previdenciario: /(?:a[çc][ãa]o|direito|demanda)\s+previdenci[aá]ri[oa]\b/gi,
    tributario: /(?:a[çc][ãa]o|direito|demanda)\s+tribut[aá]ri[oa]\b/gi,
    penal: /(?:a[çc][ãa]o|direito|defesa)\s+(?:penal|criminal)\b/gi,
    familia: /direito\s+de\s+fam[ií]lia|a[çc][ãa]o\s+de\s+div[oó]rcio/gi,
    consumidor: /direito\s+do\s+consumidor|rela[çc][ãa]o\s+de\s+consumo/gi,
    empresarial: /direito\s+empresarial/gi,
    administrativo: /direito\s+administrativo/gi,
  };
  for (const [area, regex] of Object.entries(padroes)) {
    const match = [...texto.matchAll(regex)].find(afirmado);
    if (match) { areas.push(area as DadosAnaliseDocumento["areas"][number]); evidencias.push({ campo: `areas.${area}`, trecho: match[0] }); }
  }
  for (const campo of Object.keys(contexto) as (keyof ContextoEsforco)[]) if (contexto[campo] === undefined) delete contexto[campo];
  const validado = contextoEsforcoSchema.safeParse(contexto);
  if (!validado.success) {
    const invalidos = new Set(validado.error.issues.map(issue => String(issue.path[0])));
    if (invalidos.has("horasMaximas")) invalidos.add("horasMinimas");
    for (const campo of invalidos) delete contexto[campo as keyof ContextoEsforco];
    return { versao: 1, contexto: contextoEsforcoSchema.parse(contexto), areas, evidencias: evidencias.filter(e => ![...invalidos].some(c => e.campo.includes(c))) };
  }
  return { versao: 1, contexto: validado.data, areas, evidencias };
}
