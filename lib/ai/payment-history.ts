export interface ParcelaHistorico {
  valor: number;
  vencimento: Date;
  pagamento: { valorPago: number; dataPago: Date } | null;
}

export function resumirPagamentos(parcelas: ParcelaHistorico[], hoje = new Date()) {
  const dia = (data: Date) => data.toISOString().slice(0, 10);
  const arredondar = (valor: number) => Math.round(valor * 100) / 100;
  let saldoVencido = 0;
  let parcelasVencidas = 0;
  let pagamentosEmAtraso = 0;
  let recebido = 0;
  for (const parcela of parcelas) {
    const pago = parcela.pagamento?.valorPago ?? 0;
    recebido += pago;
    const saldo = Math.max(0, parcela.valor - pago);
    if (saldo > 0 && dia(parcela.vencimento) < dia(hoje)) {
      saldoVencido += saldo;
      parcelasVencidas++;
    }
    if (parcela.pagamento && dia(parcela.pagamento.dataPago) > dia(parcela.vencimento)) pagamentosEmAtraso++;
  }
  return { dataReferencia: dia(hoje), totalParcelas: parcelas.length, recebido: arredondar(recebido), saldoVencido: arredondar(saldoVencido), parcelasVencidas, pagamentosEmAtraso };
}
