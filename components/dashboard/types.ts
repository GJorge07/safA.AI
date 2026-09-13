// Shapes derivados de prisma/schema.prisma — fonte de verdade do modelo de
// dados. Nada aqui é um schema novo: são apenas as relações que o dashboard
// precisa incluídas (cliente, parcelas, pagamento), como uma query real do
// Prisma devolveria.
import type { Cliente, Contrato, Parcela, Pagamento } from "@/app/generated/prisma/client";
import type { TipoPagamento } from "@/lib/types";

// Modelo de apresentação: valores numéricos e enum compartilhado em minúsculas.
// Os campos de auditoria não usados na UI podem ser omitidos nos dados de demonstração.
type PagamentoUI = Omit<Pagamento, 'valorPago' | 'createdAt'> & { valorPago: number };
export type ParcelaComPagamento = Omit<Parcela, 'valor' | 'createdAt'> & { valor: number; pagamento: PagamentoUI | null };

export type ContratoComRelacoes = Omit<Contrato, 'valorTotal' | 'tipoPagamento' | 'updatedAt' | 'contextoAnalise'> & {
  valorTotal: number;
  tipoPagamento: TipoPagamento;
  cliente: Cliente;
  parcelas: ParcelaComPagamento[];
};

export type StatusContrato = "em_dia" | "atrasado" | "quitado";

export function statusDoContrato(contrato: ContratoComRelacoes): StatusContrato {
  if (contrato.parcelas.length === 0) return "em_dia";
  const todasPagas = contrato.parcelas.every((p) => p.pagamento);
  if (todasPagas) return "quitado";
  const hoje = new Date();
  const temAtraso = contrato.parcelas.some((p) => !p.pagamento && p.vencimento < hoje);
  return temAtraso ? "atrasado" : "em_dia";
}

export function proximoVencimento(contrato: ContratoComRelacoes): Date | null {
  const pendentes = contrato.parcelas
    .filter((p) => !p.pagamento)
    .sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime());
  return pendentes[0]?.vencimento ?? null;
}

// Métricas do dashboard — todas derivadas de parcelas/pagamento, nenhum
// campo novo no schema.
export function totalRecebidoNoMes(contratos: ContratoComRelacoes[], ano: number, mes: number): number {
  let total = 0;
  for (const c of contratos) {
    for (const p of c.parcelas) {
      const d = p.pagamento?.dataPago;
      if (d && d.getFullYear() === ano && d.getMonth() === mes) total += p.pagamento!.valorPago;
    }
  }
  return total;
}

export function totalPrevistoNoMes(contratos: ContratoComRelacoes[], ano: number, mes: number): number {
  let total = 0;
  for (const c of contratos) {
    for (const p of c.parcelas) {
      if (p.vencimento.getFullYear() === ano && p.vencimento.getMonth() === mes) total += p.valor;
    }
  }
  return total;
}

export function totalEmAtraso(contratos: ContratoComRelacoes[], hoje: Date = new Date()): number {
  let total = 0;
  for (const c of contratos) {
    for (const p of c.parcelas) {
      if (!p.pagamento && p.vencimento < hoje) total += p.valor;
    }
  }
  return total;
}

export interface ClientesAtivosResumo {
  total: number;
  novosEsteMes: number;
}

// "Ativo" = tem ao menos um contrato ainda não quitado.
export function clientesAtivos(contratos: ContratoComRelacoes[], hoje: Date = new Date()): ClientesAtivosResumo {
  const porCliente = new Map<string, ContratoComRelacoes[]>();
  for (const c of contratos) {
    const lista = porCliente.get(c.clienteId) ?? [];
    lista.push(c);
    porCliente.set(c.clienteId, lista);
  }

  let total = 0;
  let novosEsteMes = 0;
  for (const lista of porCliente.values()) {
    const ativo = lista.some((c) => statusDoContrato(c) !== "quitado");
    if (!ativo) continue;
    total += 1;
    const primeiraData = lista.reduce((min, c) => (c.createdAt < min ? c.createdAt : min), lista[0].createdAt);
    if (primeiraData.getFullYear() === hoje.getFullYear() && primeiraData.getMonth() === hoje.getMonth()) {
      novosEsteMes += 1;
    }
  }
  return { total, novosEsteMes };
}
