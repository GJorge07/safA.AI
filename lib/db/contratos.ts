// Camada única entre o Prisma e o resto do app. Traduz as duas diferenças de
// representação que existem entre o banco e as outras camadas: o enum é
// gravado em maiúsculas (schema.prisma) e os valores monetários são Decimal,
// enquanto UI e IA trabalham com minúsculas e number.
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { cashflow } from "@/lib/api/finance";
import type { ContratoComRelacoes } from "@/components/dashboard/types";
import type { DadosFinanceiros } from "@/lib/ai/schemas";
import type { ContratoExtraido, FluxoCaixaMes, TipoPagamento } from "@/lib/types";

const comRelacoes = {
  cliente: true,
  parcelas: { include: { pagamento: true }, orderBy: { vencimento: "asc" } },
} satisfies Prisma.ContratoInclude;

type ContratoRow = Prisma.ContratoGetPayload<{ include: typeof comRelacoes }>;

const ordem: Prisma.ContratoOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];

const paraEnumDb = { fixo: "FIXO", exito: "EXITO", misto: "MISTO" } as const;

function diaISO(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function paraUI(contrato: ContratoRow): ContratoComRelacoes {
  return {
    id: contrato.id,
    clienteId: contrato.clienteId,
    cliente: contrato.cliente,
    tipoPagamento: contrato.tipoPagamento.toLowerCase() as TipoPagamento,
    valorTotal: contrato.valorTotal.toNumber(),
    clausulaOriginal: contrato.clausulaOriginal,
    createdAt: contrato.createdAt,
    parcelas: contrato.parcelas.map((parcela) => ({
      id: parcela.id,
      contratoId: parcela.contratoId,
      valor: parcela.valor.toNumber(),
      vencimento: parcela.vencimento,
      pagamento: parcela.pagamento && {
        id: parcela.pagamento.id,
        parcelaId: parcela.pagamento.parcelaId,
        valorPago: parcela.pagamento.valorPago.toNumber(),
        dataPago: parcela.pagamento.dataPago,
      },
    })),
  };
}

export async function listarContratosComRelacoes(): Promise<ContratoComRelacoes[]> {
  const contratos = await prisma.contrato.findMany({ include: comRelacoes, orderBy: ordem });
  return contratos.map(paraUI);
}

export function contarContratos(): Promise<number> {
  return prisma.contrato.count();
}

// Contexto que a IA recebe no Fluxo B. É montado aqui, no servidor, a partir
// do banco — o cliente manda só a pergunta.
export async function carregarDadosFinanceiros(hoje = new Date()): Promise<DadosFinanceiros> {
  const contratos = await prisma.contrato.findMany({ include: comRelacoes, orderBy: ordem });
  const dataReferencia = diaISO(hoje);
  let previsto = 0;
  let recebido = 0;
  let pendente = 0;
  let atrasado = 0;

  const lista = contratos.map((contrato) => ({
    id: contrato.id,
    clienteId: contrato.clienteId,
    cliente: contrato.cliente.nome,
    tipoPagamento: contrato.tipoPagamento.toLowerCase() as TipoPagamento,
    valorTotal: contrato.valorTotal.toNumber(),
    clausulaOriginal: contrato.clausulaOriginal,
    parcelas: contrato.parcelas.map((parcela) => {
      const valor = parcela.valor.toNumber();
      const pago = parcela.pagamento?.valorPago.toNumber() ?? 0;
      const saldo = Math.max(0, valor - pago);
      const vencimento = diaISO(parcela.vencimento);
      const atrasada = saldo > 0 && vencimento < dataReferencia;

      previsto += valor;
      recebido += pago;
      pendente += saldo;
      if (atrasada) atrasado += saldo;

      const status = saldo === 0 ? "paga" : atrasada ? "atrasada" : "prevista";
      return { id: parcela.id, valor, vencimento, status } as const;
    }),
  }));

  return {
    dataReferencia,
    resumo: {
      previsto: centavos(previsto),
      recebido: centavos(recebido),
      pendente: centavos(pendente),
      atrasado: centavos(atrasado),
    },
    contratos: lista,
  };
}

// Janela centrada no mês corrente, para o gráfico não ficar preso ao ano civil.
export async function carregarFluxoCaixa(hoje = new Date(), meses = 6): Promise<FluxoCaixaMes[]> {
  const gte = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - Math.floor(meses / 2), 1));
  const lt = new Date(Date.UTC(gte.getUTCFullYear(), gte.getUTCMonth() + meses, 1));
  const [parcelas, pagamentos] = await prisma.$transaction([
    prisma.parcela.findMany({ where: { vencimento: { gte, lt } }, select: { valor: true, vencimento: true } }),
    prisma.pagamento.findMany({ where: { dataPago: { gte, lt } }, select: { valorPago: true, dataPago: true } }),
  ]);
  return cashflow({ gte, lt }, parcelas, pagamentos);
}

export interface EstatisticasCarteira {
  totalContratos: number;
  valorTotalMedio: number;
  parcelasPorContratoMedia: number;
  distribuicaoTipoPagamento: Record<TipoPagamento, number>;
}

// Base de comparação para a opinião de um contrato novo: como ele se encaixa
// entre os que o advogado já tem cadastrados.
export async function carregarEstatisticasCarteira(): Promise<EstatisticasCarteira | null> {
  const contratos = await prisma.contrato.findMany({
    select: { valorTotal: true, tipoPagamento: true, _count: { select: { parcelas: true } } },
  });
  if (contratos.length === 0) return null;

  const distribuicaoTipoPagamento: Record<TipoPagamento, number> = { fixo: 0, exito: 0, misto: 0 };
  let somaValor = 0;
  let somaParcelas = 0;
  for (const contrato of contratos) {
    distribuicaoTipoPagamento[contrato.tipoPagamento.toLowerCase() as TipoPagamento] += 1;
    somaValor += contrato.valorTotal.toNumber();
    somaParcelas += contrato._count.parcelas;
  }

  return {
    totalContratos: contratos.length,
    valorTotalMedio: centavos(somaValor / contratos.length),
    parcelasPorContratoMedia: Math.round((somaParcelas / contratos.length) * 10) / 10,
    distribuicaoTipoPagamento,
  };
}

// Grava o que a extração aprovou. O cliente é reaproveitado por nome para o
// mesmo escritório não virar dezenas de "João Pereira" a cada importação.
export async function salvarContratoExtraido(extraido: ContratoExtraido) {
  const nome = extraido.cliente.trim();
  return prisma.$transaction(async (tx) => {
    const existente = await tx.cliente.findFirst({ where: { nome: { equals: nome, mode: "insensitive" } } });
    const cliente = existente ?? (await tx.cliente.create({ data: { nome } }));
    return tx.contrato.create({
      data: {
        clienteId: cliente.id,
        tipoPagamento: paraEnumDb[extraido.tipoPagamento],
        valorTotal: new Prisma.Decimal(extraido.valorTotal),
        clausulaOriginal: extraido.clausulaOriginal,
        parcelas: {
          create: extraido.parcelas.map((parcela) => ({
            valor: new Prisma.Decimal(parcela.valor),
            vencimento: new Date(`${parcela.vencimento}T00:00:00.000Z`),
          })),
        },
      },
      include: { cliente: true, parcelas: { orderBy: { vencimento: "asc" } } },
    });
  });
}
