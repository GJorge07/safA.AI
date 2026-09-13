// Shapes derivados de prisma/schema.prisma — fonte de verdade do modelo de
// dados. Nada aqui é um schema novo: são apenas as relações que o dashboard
// precisa incluídas (cliente, parcelas, pagamento), como uma query real do
// Prisma devolveria.
import type { Cliente, Contrato, Despesa, Parcela, Pagamento, Servico } from "@/app/generated/prisma/client";
import type {
  CategoriaDespesa,
  CategoriaServico,
  OrigemRegistro,
  QuemPaga,
  TipoDespesa,
  TipoPagamento,
} from "@/lib/types";

// Modelo de apresentação: valores numéricos e enum compartilhado em minúsculas.
// Os campos de auditoria não usados na UI podem ser omitidos nos dados de demonstração.
type PagamentoUI = Omit<Pagamento, 'valorPago' | 'createdAt'> & { valorPago: number };
export type ParcelaComPagamento = Omit<Parcela, 'valor' | 'createdAt'> & { valor: number; pagamento: PagamentoUI | null };

export type ContratoComRelacoes = Omit<Contrato, 'valorTotal' | 'tipoPagamento' | 'origem' | 'updatedAt'> & {
  valorTotal: number;
  tipoPagamento: TipoPagamento;
  origem: OrigemRegistro;
  cliente: Cliente;
  parcelas: ParcelaComPagamento[];
};

export type DespesaUI = Omit<
  Despesa,
  'valor' | 'tipo' | 'categoria' | 'quemPaga' | 'origem' | 'updatedAt'
> & {
  valor: number;
  tipo: TipoDespesa;
  categoria: CategoriaDespesa;
  quemPaga: QuemPaga;
  origem: OrigemRegistro;
  contrato: { id: string; numero: number; cliente: { nome: string } } | null;
};

export type ServicoUI = Omit<Servico, 'valor' | 'categoria' | 'updatedAt'> & {
  valor: number;
  categoria: CategoriaServico;
  cliente: { id: string; nome: string } | null;
  contrato: { id: string; numero: number } | null;
};

export type StatusServico = "recebido" | "atrasado" | "a_receber";

export function statusDoServico(servico: ServicoUI, hoje: Date = new Date()): StatusServico {
  if (servico.recebidoEm) return "recebido";
  return diasDeAtraso(servico.vencimento, hoje) > 0 ? "atrasado" : "a_receber";
}

export type StatusContrato = "em_dia" | "atrasado" | "quitado";

export function statusDoContrato(contrato: ContratoComRelacoes): StatusContrato {
  if (contrato.parcelas.length === 0) return "em_dia";
  const todasPagas = contrato.parcelas.every((p) => p.pagamento);
  if (todasPagas) return "quitado";
  const hoje = new Date();
  const temAtraso = contrato.parcelas.some((p) => !p.pagamento && p.vencimento < hoje);
  return temAtraso ? "atrasado" : "em_dia";
}

// CT-0042: número curto e estável para o advogado citar numa cobrança.
export function numeroContrato(contrato: { numero: number }): string {
  return `CT-${String(contrato.numero).padStart(4, "0")}`;
}

export function numeroDespesa(despesa: { numero: number }): string {
  return `DP-${String(despesa.numero).padStart(4, "0")}`;
}

export function numeroServico(servico: { numero: number }): string {
  return `SV-${String(servico.numero).padStart(4, "0")}`;
}

// Comparação só por dia civil — usar o horário faria o mesmo vencimento contar
// como atrasado ou não dependendo da hora em que a página foi aberta.
function soDia(data: Date): number {
  return Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
}

export function diasDeAtraso(vencimento: Date, hoje: Date = new Date()): number {
  const diff = soDia(hoje) - soDia(vencimento);
  return diff > 0 ? Math.floor(diff / 86400000) : 0;
}

export interface ParcelaAtrasada {
  parcela: ParcelaComPagamento;
  /** Posição da parcela dentro do contrato, base 1 — "Parcela 2 de 3". */
  indice: number;
  total: number;
  dias: number;
  saldo: number;
}

// Da mais antiga para a mais nova: é a ordem em que o advogado cobra.
export function parcelasAtrasadas(
  contrato: ContratoComRelacoes,
  hoje: Date = new Date(),
): ParcelaAtrasada[] {
  const total = contrato.parcelas.length;
  return contrato.parcelas
    .map((parcela, i) => {
      const saldo = Math.max(0, parcela.valor - (parcela.pagamento?.valorPago ?? 0));
      return { parcela, indice: i + 1, total, dias: diasDeAtraso(parcela.vencimento, hoje), saldo };
    })
    .filter((item) => item.saldo > 0 && item.dias > 0)
    .sort((a, b) => b.dias - a.dias);
}

export function totalPagoDoContrato(contrato: ContratoComRelacoes): number {
  return contrato.parcelas.reduce((soma, p) => soma + (p.pagamento?.valorPago ?? 0), 0);
}

export function saldoEmAberto(contrato: ContratoComRelacoes): number {
  return contrato.parcelas.reduce(
    (soma, p) => soma + Math.max(0, p.valor - (p.pagamento?.valorPago ?? 0)),
    0,
  );
}

export type StatusDespesa = "paga" | "atrasada" | "prevista";

// Era do cliente, o advogado já pagou e ainda não repassou. É o valor que o
// advogado está emprestando ao cliente sem perceber.
export function aguardandoReembolso(despesa: DespesaUI): boolean {
  return despesa.quemPaga === "cliente" && despesa.pagoEm !== null && despesa.cobradoEm === null;
}

export function statusDaDespesa(despesa: DespesaUI, hoje: Date = new Date()): StatusDespesa {
  if (despesa.pagoEm) return "paga";
  return diasDeAtraso(despesa.vencimento, hoje) > 0 ? "atrasada" : "prevista";
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
