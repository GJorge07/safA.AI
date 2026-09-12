export interface InstallmentForInsights {
  contratoId: string;
  clienteId: string;
  clienteNome: string;
  valor: number;
  vencimento: string;
  pago: boolean;
}

export interface ContractForInsights {
  id: string;
  tipoPagamento: "fixo" | "exito" | "misto";
}

export type AutomaticInsight =
  | {
      tipo: "atraso";
      descricao: string;
      contratoId: string;
      valor: number;
      diasAtraso: number;
    }
  | {
      tipo: "concentracao_cliente";
      descricao: string;
      clienteId: string;
      percentual: number;
    }
  | {
      tipo: "dependencia_exito";
      descricao: string;
      quantidadeContratos: number;
      percentual: number;
    };

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const MS_PER_DAY = 86_400_000;

export function generateAutomaticInsights(
  installments: InstallmentForInsights[],
  today = new Date(),
  contracts: ContractForInsights[] = [],
): AutomaticInsight[] {
  const insights: AutomaticInsight[] = [];
  const todayUtc = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );

  for (const installment of installments) {
    if (installment.pago) continue;
    const due = Date.parse(`${installment.vencimento}T00:00:00Z`);
    const daysLate = Math.floor((todayUtc - due) / MS_PER_DAY);
    if (Number.isFinite(due) && daysLate > 0) {
      insights.push({
        tipo: "atraso",
        descricao: `${installment.clienteNome} possui parcela de ${brl.format(installment.valor)} atrasada há ${daysLate} dia(s).`,
        contratoId: installment.contratoId,
        valor: installment.valor,
        diasAtraso: daysLate,
      });
    }
  }

  const open = installments.filter((item) => !item.pago);
  const total = open.reduce((sum, item) => sum + item.valor, 0);
  if (total > 0) {
    const byClient = new Map<string, { nome: string; total: number }>();
    for (const item of open) {
      const current = byClient.get(item.clienteId) ?? {
        nome: item.clienteNome,
        total: 0,
      };
      current.total += item.valor;
      byClient.set(item.clienteId, current);
    }

    const largest = [...byClient.entries()].sort(
      (a, b) => b[1].total - a[1].total,
    )[0];
    if (largest) {
      const percentage = Math.round((largest[1].total / total) * 1000) / 10;
      if (percentage >= 40) {
        insights.push({
          tipo: "concentracao_cliente",
          descricao: `${largest[1].nome} representa ${percentage}% dos valores em aberto cadastrados.`,
          clienteId: largest[0],
          percentual: percentage,
        });
      }
    }
  }

  if (contracts.length > 0) {
    const successBased = contracts.filter(
      (contract) => contract.tipoPagamento === "exito" || contract.tipoPagamento === "misto",
    ).length;
    const percentage = Math.round((successBased / contracts.length) * 1000) / 10;
    if (percentage >= 40) {
      insights.push({
        tipo: "dependencia_exito",
        descricao: `${successBased} de ${contracts.length} contratos (${percentage}%) dependem total ou parcialmente de êxito e têm receita menos previsível.`,
        quantidadeContratos: successBased,
        percentual: percentage,
      });
    }
  }

  return insights;
}
