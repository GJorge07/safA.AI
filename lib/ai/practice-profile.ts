import { z } from "zod";
import type { OpiniaoContrato } from "./schemas";

export const areasAtuacao = { civel: "Cível", trabalhista: "Trabalhista", previdenciario: "Previdenciário", tributario: "Tributário", penal: "Penal", familia: "Família e sucessões", consumidor: "Consumidor", empresarial: "Empresarial", administrativo: "Administrativo" } as const;
export const areaSchema = z.enum(["civel", "trabalhista", "previdenciario", "tributario", "penal", "familia", "consumidor", "empresarial", "administrativo"]);
export const perfilAdvogadoSchema = z.object({
  areas: z.array(areaSchema).max(9).transform(areas => [...new Set(areas)]),
  valorHoraMinimo: z.number().finite().positive().max(999999999999.99).nullable(),
}).strict();
export type PerfilAtuacao = z.infer<typeof perfilAdvogadoSchema>;

export function compararEscopo(opiniao: OpiniaoContrato, areas: (keyof typeof areasAtuacao)[], perfil: PerfilAtuacao | null): OpiniaoContrato {
  if (!areas.length || !perfil?.areas.length) return { ...opiniao, avaliacoes: { ...opiniao.avaliacoes, escopo: {
    status: "dados_insuficientes", justificativa: "A comparação de escopo exige uma área identificada no documento e as áreas declaradas no perfil do advogado.",
    evidencias: [], dadosFaltantes: [...(!areas.length ? ["Área da causa explícita no contrato"] : []), ...(!perfil?.areas.length ? ["Áreas de atuação no perfil"] : [])],
  } } };
  const fora = areas.filter(area => !perfil.areas.includes(area));
  const escopo: OpiniaoContrato["avaliacoes"]["escopo"] = {
    status: fora.length ? "atencao" : "favoravel",
    justificativa: fora.length
      ? `Áreas mencionadas fora do perfil: ${fora.map(area => areasAtuacao[area]).join(", ")}. Confirme o objeto e considere parceria ou encaminhamento; o perfil não mede capacidade jurídica.`
      : `As áreas mencionadas (${areas.map(area => areasAtuacao[area]).join(", ")}) constam do seu perfil. A correspondência de área não comprova experiência específica nem garante êxito.`,
    evidencias: ["Áreas explicitamente mencionadas no contrato", "Áreas declaradas em Meu perfil"], dadosFaltantes: [],
  };
  return { ...opiniao, avaliacoes: { ...opiniao.avaliacoes, escopo },
    riscos: fora.length ? [...opiniao.riscos, { categoria: "escopo", descricao: escopo.justificativa }] : opiniao.riscos,
    recomendacao: fora.length ? `${opiniao.recomendacao} ${escopo.justificativa}` : opiniao.recomendacao,
  };
}
