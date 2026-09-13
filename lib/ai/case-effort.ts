import { z } from "zod";
import type { OpiniaoContrato } from "./schemas";

const horas = z.number().finite().positive().max(100000);
const dinheiro = z.number().finite().nonnegative().max(1e12);
export const contextoEsforcoSchema = z.object({
  dificuldade: z.enum(["baixa", "media", "alta"]).optional(),
  fatores: z.array(z.enum(["pericia", "recursos", "audiencias", "provas", "urgencia"])).max(5).default([]),
  horasMinimas: horas.optional(),
  horasMaximas: horas.optional(),
  custosEstimados: dinheiro.optional(),
  valorHoraMinimo: dinheiro.positive().optional(),
  horasTrabalhadas: horas.optional(),
  custosIncorridos: dinheiro.optional(),
}).strict().superRefine((c, ctx) => {
  if (c.horasMinimas !== undefined && c.horasMaximas !== undefined && c.horasMaximas < c.horasMinimas) {
    ctx.addIssue({ code: "custom", path: ["horasMaximas"], message: "O máximo de horas deve ser maior ou igual ao mínimo." });
  }
});
export type ContextoEsforco = z.infer<typeof contextoEsforcoSchema>;
export const temEstimativaEsforco = (contexto: ContextoEsforco) => Object.entries(contexto).some(([campo, valor]) => campo === "fatores" ? contexto.fatores.length > 0 : valor !== undefined);
const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fatoresRotulo = { pericia: "perícia", recursos: "recursos", audiencias: "audiências", provas: "produção ou análise de provas", urgencia: "prazos urgentes" };

// Não atribui multiplicadores inventados à dificuldade: o esforço entra pelo
// intervalo de horas informado pelo advogado, incluindo as atividades indicadas.
export function cruzarEsforcoERetorno(
  opiniao: OpiniaoContrato,
  valorTotal: number,
  recebido: number,
  receitaCondicionada: boolean,
  divergenciaCadastro: boolean,
  contexto: ContextoEsforco,
): OpiniaoContrato {
  const c = contextoEsforcoSchema.parse(contexto);
  const resultado = structuredClone(opiniao);
  const faltantes = [
    !c.dificuldade && "Dificuldade estimada pelo advogado",
    c.horasMinimas === undefined && "Mínimo de horas totais estimadas",
    c.horasMaximas === undefined && "Máximo de horas totais estimadas",
    c.custosEstimados === undefined && "Custos totais estimados, incluindo despesas e tributos",
    c.valorHoraMinimo === undefined && "Remuneração mínima por hora pretendida",
  ].filter((item): item is string => Boolean(item));
  resultado.avaliacoes.complexidade = {
    status: c.dificuldade ? c.dificuldade === "alta" ? "atencao" : "favoravel" : "dados_insuficientes",
    justificativa: `${c.dificuldade ? `Dificuldade ${c.dificuldade === "media" ? "média" : c.dificuldade}, informada na base da avaliação` : "Dificuldade não informada"}. ${c.fatores.length ? `Atividades informadas: ${c.fatores.map(f => fatoresRotulo[f]).join(", ")}. ` : ""}${c.horasMinimas !== undefined && c.horasMaximas !== undefined ? `Esforço total estimado: ${c.horasMinimas} a ${c.horasMaximas} horas. ` : ""}A dificuldade não determina sozinha a chance de vitória nem torna o caso desvantajoso; seu custo depende do trabalho necessário.`,
    evidencias: ["Estimativas extraídas do contrato ou declaradas pelo advogado; não são uma conclusão jurídica automática."],
    dadosFaltantes: c.dificuldade ? [] : ["Dificuldade estimada pelo advogado"],
  };
  const caixaRealizado = c.horasTrabalhadas !== undefined && c.custosIncorridos !== undefined
    ? `Retorno de caixa por hora já trabalhada: ${moeda((recebido - c.custosIncorridos) / c.horasTrabalhadas)}/h = (${moeda(recebido)} recebidos − ${moeda(c.custosIncorridos)} de custos incorridos) ÷ ${c.horasTrabalhadas} h. Isso descreve o caixa até agora, não o resultado final.`
    : `Já recebido: ${moeda(recebido)}. Faltam horas efetivamente trabalhadas e/ou custos incorridos para calcular o retorno de caixa por hora realizado.`;
  if (faltantes.length) {
    resultado.avaliacoes.financeiro = {
      status: "dados_insuficientes",
      justificativa: `Não há dados suficientes para comparar a dificuldade com a remuneração. Não converto dificuldade em horas por suposição. ${caixaRealizado}`,
      dadosFaltantes: faltantes,
      evidencias: ["valorTotal", "parcelas.pagamento.valorPago", "Estimativas extraídas do contrato ou declaradas pelo advogado"],
    };
    return resultado;
  }
  const liquidoEstimado = valorTotal - c.custosEstimados!;
  // Com saldo negativo, dividir por menos horas produz o menor retorno.
  const extremos = [liquidoEstimado / c.horasMinimas!, liquidoEstimado / c.horasMaximas!];
  const menor = Math.min(...extremos);
  const maior = Math.max(...extremos);
  const meta = c.valorHoraMinimo!;
  const cobreMeta = menor >= meta;
  const abaixoSempre = maior < meta;
  const minimoHonorarios = c.custosEstimados! + c.horasMaximas! * meta;
  const conclusao = abaixoSempre
    ? "A remuneração não compensa o esforço pela meta informada, mesmo no cenário mais favorável de horas."
    : cobreMeta
      ? "A remuneração cobre a meta por hora em todo o intervalo de esforço informado."
      : "O benefício depende do esforço: se o trabalho aumentar dentro do intervalo informado, o retorno fica abaixo da meta.";
  resultado.avaliacoes.financeiro = {
    status: abaixoSempre ? "desfavoravel" : receitaCondicionada || divergenciaCadastro || !cobreMeta ? "atencao" : "favoravel",
    justificativa: `${conclusao} Retorno previsto após os custos informados: ${moeda(menor)} a ${moeda(maior)}/h, usando (${moeda(valorTotal)} de honorários − ${moeda(c.custosEstimados!)} de custos) ÷ ${c.horasMinimas} a ${c.horasMaximas} h. Meta: ${moeda(meta)}/h. Esse cenário pressupõe o recebimento integral e todos os custos informados; não é lucro garantido. ${receitaCondicionada ? "Honorários de êxito são condicionais: este cálculo é apenas um cenário de recebimento, sem probabilidade atribuída. " : ""}${caixaRealizado}`,
    evidencias: ["valorTotal", "parcelas.pagamento.valorPago", "Dificuldade, horas, custos e meta informados na base da avaliação"],
    dadosFaltantes: [],
  };
  resultado.resumo = `${conclusao} A conclusão financeira é condicionada às estimativas; a adequação jurídica e à área de atuação ainda precisa ser confirmada.`;
  resultado.classificacao = abaixoSempre ? "desfavoravel" : "atencao";
  const sugestao = cobreMeta
    ? "O preço comporta o esforço estimado pela sua meta. Monitore horas, custos e recebimentos antes de manter essa conclusão."
    : `Considere renegociar os honorários ou limitar o escopo. Para cobrir ${c.horasMaximas} h pela meta informada e os custos estimados, o total necessário seria ${moeda(minimoHonorarios)}; esse é um cálculo pela sua meta, não uma tabela de mercado.`;
  resultado.recomendacao = `${sugestao} ${opiniao.avaliacoes.pagamentos.status === "atencao" ? "Confirme o histórico de pagamentos e negocie a cobrança antes de ampliar o trabalho. " : ""}Confirme também as provas, o contexto jurídico e a adequação à sua área de atuação antes de aceitar o caso.`;
  if (!cobreMeta) resultado.riscos.push({ categoria: "financeiro", descricao: conclusao });
  return resultado;
}
