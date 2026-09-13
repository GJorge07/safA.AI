import { resolverContratos, type ReferenciaContrato } from "./contract-reference";
import { sintetizarOpiniao, rotulosDimensao, rotulosStatus } from "./opinion-summary";
import { cruzarEsforcoERetorno, type ContextoEsforco } from "./case-effort";
import type { OpiniaoContrato, RespostaFinanceira } from "./schemas";
import { resumirPagamentos, type ParcelaHistorico } from "./payment-history";

export interface ContratoParaAvaliacao {
  id: string;
  clienteId: string;
  tipoPagamento: "fixo" | "exito" | "misto";
  valorTotal: number;
  parcelas: ParcelaHistorico[];
}

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const insuficiente = (justificativa: string, dadosFaltantes: string[]): OpiniaoContrato["avaliacoes"]["financeiro"] => ({
  status: "dados_insuficientes", justificativa, dadosFaltantes, evidencias: [],
});

// Avaliação reproduzível e somente de leitura. Não recebe nomes, documentos,
// cláusulas livres, atributos pessoais ou instruções de um modelo.
export function avaliarContratoCadastrado(
  contrato: ContratoParaAvaliacao,
  carteira: ContratoParaAvaliacao[],
  hoje = new Date(),
  contexto?: ContextoEsforco,
): OpiniaoContrato {
  const historico = resumirPagamentos(carteira.filter(c => c.clienteId === contrato.clienteId).flatMap(c => c.parcelas), hoje);
  const atual = resumirPagamentos(contrato.parcelas, hoje);
  const somaParcelas = Math.round(contrato.parcelas.reduce((s, p) => s + p.valor, 0) * 100) / 100;
  const divergencia = Math.abs(somaParcelas - contrato.valorTotal) > 0.009;
  const dependeExito = contrato.tipoPagamento !== "fixo";
  const riscos: OpiniaoContrato["riscos"] = [];
  if (dependeExito) riscos.push({ categoria: "financeiro", descricao: "A receita depende total ou parcialmente de êxito; o valor cadastrado não é garantia de recebimento." });
  if (divergencia) riscos.push({ categoria: "financeiro", descricao: `As parcelas somam ${moeda(somaParcelas)}, diferente do total de ${moeda(contrato.valorTotal)}. Confira o cadastro antes de projetar receita.` });
  if (historico.saldoVencido > 0) riscos.push({ categoria: "pagamentos", descricao: `Há ${moeda(historico.saldoVencido)} de saldo vencido nos contratos vinculados ao mesmo cadastro de cliente. Confirme se os registros de pagamento estão atualizados.` });
  if (historico.pagamentosEmAtraso > 0) riscos.push({ categoria: "pagamentos", descricao: `${historico.pagamentosEmAtraso} pagamento(s) registrado(s) após o vencimento. Isso não permite prever o comportamento futuro.` });
  const pagamentos: OpiniaoContrato["avaliacoes"]["pagamentos"] = {
    status: historico.saldoVencido > 0 || historico.pagamentosEmAtraso > 0 ? "atencao" : historico.recebido > 0 ? "favoravel" : "dados_insuficientes",
    justificativa: historico.saldoVencido > 0
      ? `Existem ${historico.parcelasVencidas} parcela(s) com saldo vencido, totalizando ${moeda(historico.saldoVencido)}, no mesmo cadastro de cliente.`
      : historico.recebido > 0
        ? `Há ${moeda(historico.recebido)} recebidos no mesmo cadastro de cliente e nenhum saldo vencido na data da consulta. ${historico.pagamentosEmAtraso} pagamento(s) ocorreu(ram) após o vencimento. Esse histórico não garante novos recebimentos.`
        : "Ainda não há pagamentos registrados que permitam avaliar a pontualidade do cliente. Parcelas futuras não são dívidas vencidas.",
    evidencias: [`Pagamentos e vencimentos dos contratos com o mesmo clienteId; data de referência: ${historico.dataReferencia}.`],
    dadosFaltantes: historico.recebido === 0 ? ["Histórico de recebimentos confirmado"] : [],
  };
  const opiniao: OpiniaoContrato = {
    classificacao: "atencao",
    resumo: riscos.length
      ? "O caso exige atenção antes de aceitar ou manter nas condições atuais. Há sinais financeiros para conferir; ainda não é possível afirmar que seja um bom caso no conjunto."
      : "Os registros não mostram alertas de atraso ou dependência de êxito, mas ainda não permitem concluir que o caso seja vantajoso.",
    avaliacoes: {
      financeiro: {
        ...insuficiente(`Total cadastrado: ${moeda(contrato.valorTotal)}; recebido neste contrato: ${moeda(atual.recebido)}. Faturamento não é lucro: faltam custos, horas e duração para avaliar rentabilidade.`, ["Custos estimados", "Horas de trabalho", "Duração e remuneração mínima pretendida"]),
        status: dependeExito || divergencia ? "atencao" : "dados_insuficientes",
        evidencias: ["valorTotal", "tipoPagamento", "parcelas.valor", "parcelas.pagamento.valorPago"],
      },
      pagamentos,
      complexidade: insuficiente("O cadastro financeiro não contém provas, fase processual ou análise jurídica suficiente para classificar a dificuldade ou a chance de êxito.", ["Objeto e fase da causa", "Provas disponíveis, perícias e recursos necessários"]),
      escopo: insuficiente("Não há áreas de atuação e experiência do advogado registradas para comparar com a causa.", ["Áreas de atuação e experiência", "Objeto da causa"]),
    },
    pontosFortes: contrato.tipoPagamento === "fixo" && !divergencia && contrato.parcelas.length > 0
      ? ["Honorários fixos com parcelas que correspondem ao total cadastrado; isso permite planejar a cobrança, sem garantir o recebimento."] : [],
    riscos,
    recomendacao: historico.saldoVencido > 0
      ? "Confirme os recebimentos e negocie entrada ou regularização do saldo antes de ampliar o trabalho. Obtenha custos, esforço e contexto jurídico para decidir se aceita, renegocia ou encaminha a causa."
      : "Antes de aceitar, estime custos e horas, confira as provas e verifique a aderência à sua atuação. Se fugir da sua experiência, considere parceria ou encaminhamento. Não há base para recomendar aceite definitivo agora.",
  };
  return contexto ? cruzarEsforcoERetorno(opiniao, contrato.valorTotal, atual.recebido, dependeExito, divergencia, contexto) : opiniao;
}

export const ROTULOS_AVALIACAO = { financeiro: "Financeiro", pagamentos: "Histórico de pagamentos", complexidade: "Dificuldade da causa", escopo: "Área de atuação" } as const;

export function formatarOpiniao(opiniao: OpiniaoContrato, completa = false): string {
  if (!completa) {
    const sintese = sintetizarOpiniao(opiniao);
    return [sintese.titulo,
      ...sintese.motivos.slice(0, 1),
      ...Object.entries(opiniao.avaliacoes).map(([campo, a]) => `${rotulosDimensao[campo as keyof typeof rotulosDimensao]}: ${rotulosStatus[a.status].toLowerCase()}.`),
      `Próximo passo: ${sintese.proximoPasso}`,
      ...(sintese.faltantes.length ? [`Pendências: ${sintese.faltantes.slice(0, 2).join("; ")}${sintese.faltantes.length > 2 ? ` e mais ${sintese.faltantes.length - 2}. Veja os detalhes na avaliação do contrato.` : "."}`] : []),
    ].join("\n");
  }
  return [opiniao.resumo, ...Object.entries(opiniao.avaliacoes).map(([campo, valor]) =>
    `${ROTULOS_AVALIACAO[campo as keyof typeof ROTULOS_AVALIACAO]}: ${valor.justificativa}${valor.dadosFaltantes.length ? ` Falta: ${valor.dadosFaltantes.join("; ")}.` : ""}`),
  ...opiniao.riscos.map(r => `Atenção: ${r.descricao}`), `Recomendação: ${opiniao.recomendacao}`].join("\n\n");
}

export function perguntaDeOpiniao(pergunta: string) {
  const texto = normalizar(pergunta);
  if (/^(bom dia|boa tarde|boa noite)[!.?\s]*$/.test(texto)) return false;
  if (/\b(bom|boa|bons|boas|ruim|ruins|seguro|segura|melhor|pior)\b/.test(texto)) return true;
  return /por hora|remuner|beneficio|compensa|custo.?beneficio|valor pago|esforco|vantajos|vale\s+a\s+pena|bom\s+(caso|contrato)|boa\s+causa|opiniao|opine|avali|aceit|recus|renegoci|escopo|dific|complex|rentab|risco|insight|devedor|inadimpl|pagador|chance|exito|especial|lucro|lucrativ|viavel/.test(texto);
}
const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function responderOpiniaoLocal(
  pergunta: string,
  contratos: (ReferenciaContrato & { opiniao?: OpiniaoContrato })[],
  contratoId?: string,
): RespostaFinanceira {
  const { selecionados, criterio, aviso, usaData } = resolverContratos(pergunta, contratos, contratoId);
  if (!selecionados.length) return {
    resposta: aviso ?? "Contrato não encontrado. Selecione um contrato cadastrado.",
    contratosCitados: [], citacoes: [], aviso: "Contrato não identificado com segurança.",
  };
  const comOpiniao = selecionados.filter(c => c.opiniao);
  if (comOpiniao.length !== selecionados.length) return { resposta: "A avaliação está indisponível. Consulte novamente para obter os dados atuais.", contratosCitados: [], citacoes: [], aviso: "Avaliação não disponível." };
  return {
    resposta: [criterio, ...comOpiniao.map(c => `${c.cliente}${usaData ? ` — cadastrado em ${new Date(c.createdAt!).toLocaleDateString("pt-BR", { timeZone: "America/Bahia" })}` : ""}\n${formatarOpiniao(c.opiniao!, /detalh|complet|explique|evidencia/.test(normalizar(pergunta)))}`)].filter(Boolean).join("\n\n"),
    contratosCitados: comOpiniao.map(c => c.id),
    citacoes: comOpiniao.map(c => ({ contratoId: c.id, campos: usaData ? ["opiniao", "createdAt"] : ["opiniao"] })),
    aviso: "Base: dados cadastrados e estimativas informadas. Não é garantia de lucro ou de êxito.",
  };
}
