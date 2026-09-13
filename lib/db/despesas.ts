// Espelho de lib/db/contratos.ts para o que sai do caixa. Traduz as mesmas
// duas diferenças entre banco e UI: enum em maiúsculas e Decimal → number.
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { DespesaUI } from "@/components/dashboard/types";
import type { CategoriaDespesa, OrigemRegistro, Recorrencia } from "@/lib/types";

const comContrato = {
  contrato: { select: { id: true, numero: true, cliente: { select: { nome: true } } } },
} satisfies Prisma.DespesaInclude;

type DespesaRow = Prisma.DespesaGetPayload<{ include: typeof comContrato }>;

export const categoriaParaDb = {
  custas_processuais: "CUSTAS_PROCESSUAIS",
  diligencia: "DILIGENCIA",
  pericia: "PERICIA",
  software: "SOFTWARE",
  estrutura: "ESTRUTURA",
  tributos: "TRIBUTOS",
  pessoal: "PESSOAL",
  outros: "OUTROS",
} as const;

export const recorrenciaParaDb = { unica: "UNICA", mensal: "MENSAL", anual: "ANUAL" } as const;

export const rotuloCategoria: Record<CategoriaDespesa, string> = {
  custas_processuais: "Custas processuais",
  diligencia: "Diligência",
  pericia: "Perícia",
  software: "Software",
  estrutura: "Estrutura",
  tributos: "Tributos",
  pessoal: "Pessoal",
  outros: "Outros",
};

export const rotuloRecorrencia: Record<Recorrencia, string> = {
  unica: "Única",
  mensal: "Mensal",
  anual: "Anual",
};

function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function paraUI(despesa: DespesaRow): DespesaUI {
  return {
    id: despesa.id,
    numero: despesa.numero,
    descricao: despesa.descricao,
    categoria: despesa.categoria.toLowerCase() as CategoriaDespesa,
    valor: despesa.valor.toNumber(),
    vencimento: despesa.vencimento,
    pagoEm: despesa.pagoEm,
    recorrencia: despesa.recorrencia.toLowerCase() as Recorrencia,
    fornecedor: despesa.fornecedor,
    contratoId: despesa.contratoId,
    contrato: despesa.contrato,
    reembolsavel: despesa.reembolsavel,
    origem: despesa.origem.toLowerCase() as OrigemRegistro,
    textoOriginal: despesa.textoOriginal,
    createdAt: despesa.createdAt,
  };
}

export type StatusDespesaFiltro = "todos" | "paga" | "atrasada" | "prevista";

export interface FiltroDespesas {
  pagina?: number;
  tamanho?: number;
  busca?: string;
  categoria?: CategoriaDespesa | "todos";
  status?: StatusDespesaFiltro;
  recorrencia?: Recorrencia | "todos";
  /** Só o que vence nos próximos 7 dias e ainda não foi pago. */
  vence7?: boolean;
  hoje?: Date;
}

export interface PaginaDespesas {
  itens: DespesaUI[];
  total: number;
  paginas: number;
  pagina: number;
  tamanho: number;
}

function where({ busca, categoria, status, recorrencia, vence7, hoje = new Date() }: FiltroDespesas): Prisma.DespesaWhereInput {
  const filtros: Prisma.DespesaWhereInput[] = [];

  const termo = busca?.trim();
  if (termo) {
    const comoNumero = Number(termo.replace(/\D/g, ""));
    filtros.push({
      OR: [
        { descricao: { contains: termo, mode: "insensitive" } },
        { fornecedor: { contains: termo, mode: "insensitive" } },
        ...(Number.isFinite(comoNumero) && comoNumero > 0 ? [{ numero: comoNumero }] : []),
      ],
    });
  }

  if (categoria && categoria !== "todos") filtros.push({ categoria: categoriaParaDb[categoria] });
  if (recorrencia && recorrencia !== "todos") filtros.push({ recorrencia: recorrenciaParaDb[recorrencia] });

  if (status === "paga") filtros.push({ pagoEm: { not: null } });
  if (status === "atrasada") filtros.push({ pagoEm: null, vencimento: { lt: hoje } });
  if (status === "prevista") filtros.push({ pagoEm: null, vencimento: { gte: hoje } });

  if (vence7) {
    filtros.push({ pagoEm: null, vencimento: { gte: hoje, lt: new Date(hoje.getTime() + 7 * 86400000) } });
  }

  return filtros.length === 0 ? {} : { AND: filtros };
}

export async function listarDespesasPaginado(filtro: FiltroDespesas = {}): Promise<PaginaDespesas> {
  const tamanho = Math.min(Math.max(filtro.tamanho ?? 20, 1), 100);
  const condicao = where(filtro);
  const [total, despesas] = await prisma.$transaction([
    prisma.despesa.count({ where: condicao }),
    prisma.despesa.findMany({
      where: condicao,
      include: comContrato,
      orderBy: [{ vencimento: "desc" }, { id: "desc" }],
      skip: (Math.max(filtro.pagina ?? 1, 1) - 1) * tamanho,
      take: tamanho,
    }),
  ]);

  const paginas = Math.max(1, Math.ceil(total / tamanho));
  return {
    itens: despesas.map(paraUI),
    total,
    paginas,
    pagina: Math.min(Math.max(filtro.pagina ?? 1, 1), paginas),
    tamanho,
  };
}

export async function obterDespesa(id: string): Promise<DespesaUI | null> {
  const despesa = await prisma.despesa.findUnique({ where: { id }, include: comContrato });
  return despesa && paraUI(despesa);
}

export async function listarDespesasDoContrato(contratoId: string): Promise<DespesaUI[]> {
  const despesas = await prisma.despesa.findMany({
    where: { contratoId },
    include: comContrato,
    orderBy: [{ vencimento: "desc" }],
  });
  return despesas.map(paraUI);
}

export interface NovaDespesa {
  descricao: string;
  categoria: CategoriaDespesa;
  valor: number;
  vencimento: Date;
  recorrencia?: Recorrencia;
  fornecedor?: string | null;
  contratoId?: string | null;
  reembolsavel?: boolean;
  pagoEm?: Date | null;
  origem?: OrigemRegistro;
  textoOriginal?: string | null;
}

const origemParaDb = { manual: "MANUAL", upload: "UPLOAD", drive: "DRIVE" } as const;

export async function criarDespesa(dados: NovaDespesa): Promise<DespesaUI> {
  const despesa = await prisma.despesa.create({
    data: {
      descricao: dados.descricao,
      categoria: categoriaParaDb[dados.categoria],
      valor: new Prisma.Decimal(dados.valor),
      vencimento: dados.vencimento,
      pagoEm: dados.pagoEm ?? null,
      recorrencia: recorrenciaParaDb[dados.recorrencia ?? "unica"],
      fornecedor: dados.fornecedor ?? null,
      contratoId: dados.contratoId ?? null,
      reembolsavel: dados.reembolsavel ?? false,
      origem: origemParaDb[dados.origem ?? "manual"],
      textoOriginal: dados.textoOriginal ?? null,
    },
    include: comContrato,
  });
  return paraUI(despesa);
}

export async function atualizarDespesa(id: string, dados: Partial<NovaDespesa>): Promise<DespesaUI> {
  const despesa = await prisma.despesa.update({
    where: { id },
    data: {
      ...(dados.descricao === undefined ? {} : { descricao: dados.descricao }),
      ...(dados.categoria === undefined ? {} : { categoria: categoriaParaDb[dados.categoria] }),
      ...(dados.valor === undefined ? {} : { valor: new Prisma.Decimal(dados.valor) }),
      ...(dados.vencimento === undefined ? {} : { vencimento: dados.vencimento }),
      ...(dados.pagoEm === undefined ? {} : { pagoEm: dados.pagoEm }),
      ...(dados.recorrencia === undefined ? {} : { recorrencia: recorrenciaParaDb[dados.recorrencia] }),
      ...(dados.fornecedor === undefined ? {} : { fornecedor: dados.fornecedor }),
      ...(dados.contratoId === undefined ? {} : { contratoId: dados.contratoId }),
      ...(dados.reembolsavel === undefined ? {} : { reembolsavel: dados.reembolsavel }),
    },
    include: comContrato,
  });
  return paraUI(despesa);
}

export function marcarComoPaga(id: string, pagoEm: Date | null): Promise<DespesaUI> {
  return atualizarDespesa(id, { pagoEm });
}

export function excluirDespesa(id: string): Promise<unknown> {
  return prisma.despesa.delete({ where: { id } });
}

export interface ResumoDespesas {
  totalMes: number;
  pagoMes: number;
  emAbertoMes: number;
  atrasado: number;
  vencendoEm7Dias: number;
  reembolsavelEmAberto: number;
}

// Tudo do mês corrente, para o cabeçalho de /pagamentos fechar com o "a receber".
export async function resumoDespesasDoMes(hoje = new Date()): Promise<ResumoDespesas> {
  const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
  const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 1));
  const em7Dias = new Date(hoje.getTime() + 7 * 86400000);

  const [doMes, atrasadas, proximas, reembolsaveis] = await prisma.$transaction([
    prisma.despesa.findMany({
      where: { vencimento: { gte: inicio, lt: fim } },
      select: { valor: true, pagoEm: true },
    }),
    prisma.despesa.findMany({ where: { pagoEm: null, vencimento: { lt: hoje } }, select: { valor: true } }),
    prisma.despesa.findMany({
      where: { pagoEm: null, vencimento: { gte: hoje, lt: em7Dias } },
      select: { valor: true },
    }),
    prisma.despesa.findMany({
      where: { pagoEm: null, reembolsavel: true },
      select: { valor: true },
    }),
  ]);

  const soma = (linhas: { valor: Prisma.Decimal }[]) =>
    centavos(linhas.reduce((total, l) => total + l.valor.toNumber(), 0));

  const totalMes = soma(doMes);
  const pagoMes = soma(doMes.filter((d) => d.pagoEm !== null));

  return {
    totalMes,
    pagoMes,
    emAbertoMes: centavos(totalMes - pagoMes),
    atrasado: soma(atrasadas),
    vencendoEm7Dias: soma(proximas),
    reembolsavelEmAberto: soma(reembolsaveis),
  };
}

export interface ContadoresDespesas {
  total: number;
  atrasadas: number;
  vencendoEm7Dias: number;
  pagas: number;
}

export async function contadoresDespesas(hoje = new Date()): Promise<ContadoresDespesas> {
  const em7Dias = new Date(hoje.getTime() + 7 * 86400000);
  const [total, atrasadas, vencendoEm7Dias, pagas] = await prisma.$transaction([
    prisma.despesa.count(),
    prisma.despesa.count({ where: { pagoEm: null, vencimento: { lt: hoje } } }),
    prisma.despesa.count({ where: { pagoEm: null, vencimento: { gte: hoje, lt: em7Dias } } }),
    prisma.despesa.count({ where: { pagoEm: { not: null } } }),
  ]);
  return { total, atrasadas, vencendoEm7Dias, pagas };
}

// Quanto o advogado ainda tem a receber no mês — par do resumo de despesas.
export async function aReceberNoMes(hoje = new Date()): Promise<number> {
  const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
  const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 1));
  const parcelas = await prisma.parcela.findMany({
    where: { vencimento: { gte: inicio, lt: fim } },
    select: { valor: true, pagamento: { select: { valorPago: true } } },
  });
  return centavos(
    parcelas.reduce(
      (total, p) => total + Math.max(0, p.valor.toNumber() - (p.pagamento?.valorPago.toNumber() ?? 0)),
      0,
    ),
  );
}
