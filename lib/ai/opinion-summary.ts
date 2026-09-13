import type { OpiniaoContrato } from "./schemas";

export const rotulosDimensao = { financeiro: "Financeiro", pagamentos: "Pagamentos", complexidade: "Dificuldade", escopo: "Área de atuação" } as const;
export const rotulosStatus = { favoravel: "Favorável", atencao: "Atenção", desfavoravel: "Desfavorável", dados_insuficientes: "Faltam dados" } as const;

// Apresentação determinística dos estados já calculados. Não gera fatos novos.
export function sintetizarOpiniao(opiniao: OpiniaoContrato) {
  const a = opiniao.avaliacoes;
  const faltantes = [...new Set(Object.values(a).flatMap(d => d.dadosFaltantes))];
  const incompleta = Object.values(a).some(d => d.status === "dados_insuficientes") || faltantes.length > 0;
  const titulo = opiniao.classificacao === "desfavoravel" || a.financeiro.status === "desfavoravel"
    ? "Há riscos relevantes nas condições avaliadas."
    : incompleta
      ? "Ainda não dá para afirmar que seja um bom caso."
      : opiniao.classificacao === "favoravel"
        ? "Os critérios avaliados são favoráveis."
        : "O caso exige atenção antes de decidir.";
  const proximoPasso = a.financeiro.status === "desfavoravel"
    ? "Revise o preço, os custos e o esforço antes de aceitar."
    : a.pagamentos.status === "atencao" || a.pagamentos.status === "desfavoravel"
      ? "Confira os pagamentos e as condições de cobrança."
      : a.escopo.status === "atencao" || a.escopo.status === "desfavoravel"
        ? "Confirme se o caso cabe na sua atuação ou exige parceria."
        : incompleta ? "Complete os dados pendentes antes de decidir."
          : "Confirme as premissas antes de aceitar o caso.";
  const candidatas = Object.values(a).filter(d => d.status === "desfavoravel" || d.status === "atencao");
  if (!candidatas.length) candidatas.push(a.financeiro);
  const motivos = candidatas.map(d => d.justificativa.match(/^.*?[.!?](?=\s+[A-ZÀ-ÖØ-Þ]|$)/u)?.[0] ?? d.justificativa).filter(frase => frase.length <= 220).slice(0, 2);
  return { titulo, proximoPasso, faltantes, motivos };
}
