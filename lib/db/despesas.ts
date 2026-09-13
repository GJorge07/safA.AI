// Espelho de lib/db/contratos.ts para o que sai do caixa. Traduz as mesmas
// duas diferenças entre banco e UI: enum em maiúsculas e Decimal → number.
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { DespesaUI } from "@/components/dashboard/types";
import type {
  CategoriaDespesa,
  CategoriaDespesaEscritorio,
  CategoriaDespesaProcesso,
  OrigemRegistro,
  QuemPaga,
  TipoDespesa,
} from "@/lib/types";

const comContrato = {
  contrato: { select: { id: true, numero: true, cliente: { select: { nome: true } } } },
} satisfies Prisma.DespesaInclude;

type DespesaRow = Prisma.DespesaGetPayload<{ include: typeof comContrato }>;

export const categoriaParaDb = {
  deslocamento: "DESLOCAMENTO",
  custas: "CUSTAS",
  diligencia: "DILIGENCIA",
  cartorio: "CARTORIO",
  pericia: "PERICIA",
  correspondente: "CORRESPONDENTE",
  outros_processo: "OUTROS_PROCESSO",
  estrutura: "ESTRUTURA",
  software: "SOFTWARE",
  tributos: "TRIBUTOS",
  pessoal: "PESSOAL",
  outros_escritorio: "OUTROS_ESCRITORIO",
} as const;

export const tipoParaDb = { processo: "PROCESSO", escritorio: "ESCRITORIO" } as const;
export const quemPagaParaDb = { cliente: "CLIENTE", advogado: "ADVOGADO" } as const;
const origemParaDb = { manual: "MANUAL", upload: "UPLOAD", drive: "DRIVE" } as const;

// Rótulos no vocabulário do dia a dia — "Transporte até o fórum", não
// "custas processuais diversas".
export const rotuloCategoria: Record<CategoriaDespesa, string> = {
  deslocamento: "Transporte e deslocamento",
  custas: "Custas e guias",
  diligencia: "Diligência de oficial",
  cartorio: "Cartório, cópias e certidões",
  pericia: "Perícia",
  correspondente: "Correspondente",
  outros_processo: "Outros do processo",
  estrutura: "Estrutura",
  software: "Software",
  tributos: "Tributos",
  pessoal: "Pessoal",
  outros_escritorio: "Outros do escritório",
};

export const CATEGORIAS_PROCESSO: CategoriaDespesaProcesso[] = [
  "deslocamento",
  "custas",
  "diligencia",
  "cartorio",
  "pericia",
  "correspondente",
  "outros_processo",
];

export const CATEGORIAS_ESCRITORIO: CategoriaDespesaEscritorio[] = [
  "estrutura",
  "software",
  "tributos",
  "pessoal",
  "outros_escritorio",
];

export const rotuloTipo: Record<TipoDespesa, string> = {
  processo: "Do processo",
  escritorio: "Do escritório",
};

function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function paraUI(despesa: DespesaRow): DespesaUI {
  return {
    id: despesa.id,
    numero: despesa.numero,
    descricao: despesa.descricao,
    tipo: despesa.tipo.toLowerCase() as TipoDespesa,
    categoria: despesa.categoria.toLowerCase() as CategoriaDespesa,
    valor: despesa.valor.toNumber(),
    vencimento: despesa.vencimento,
    pagoEm: despesa.pagoEm,
    fornecedor: despesa.fornecedor,
    contratoId: despesa.contratoId,
    contrato: despesa.contrato,
    quemPaga: despesa.quemPaga.toLowerCase() as QuemPaga,
    cobradoEm: despesa.cobradoEm,
    origem: despesa.origem.toLowerCase() as OrigemRegistro,
    textoOriginal: despesa.textoOriginal,
    createdAt: despesa.createdAt,
  };
}

// "em_aberto" é tudo que não foi pago, vencido ou não — é a pergunta que o
// advogado faz ("o que eu ainda devo?"), e que "prevista" sozinha não responde.
export type StatusDespesaFiltro =
  | "todos"
  | "em_aberto"
  | "atrasada"
  | "vence_7"
  | "paga"
  | "a_reembolsar";

export type OrdenacaoDespesas = "recentes" | "maior_valor" | "vencimento";

export interface FiltroDespesas {
  pagina?: number;
  tamanho?: number;
  busca?: string;
  tipo?: TipoDespesa | "todos";
  categoria?: CategoriaDespesa | "todos";
  status?: StatusDespesaFiltro;
  ordenar?: OrdenacaoDespesas;
  contratoId?: string;
  hoje?: Date;
}

export interface PaginaDespesas {
  itens: DespesaUI[];
  total: number;
  paginas: number;
  pagina: number;
  tamanho: number;
}

// Despesa que o contrato diz ser do cliente, já paga pelo advogado e ainda
// não repassada: dinheiro emprestado ao cliente sem ninguém perceber.
const A_REEMBOLSAR: Prisma.DespesaWhereInput = {
  quemPaga: "CLIENTE",
  pagoEm: { not: null },
  cobradoEm: null,
};

function where({
  busca,
  tipo,
  categoria,
  status,
  contratoId,
  hoje = new Date(),
}: FiltroDespesas): Prisma.DespesaWhereInput {
  const filtros: Prisma.DespesaWhereInput[] = [];

  const termo = busca?.trim();
  if (termo) {
    const comoNumero = Number(termo.replace(/\D/g, ""));
    filtros.push({
      OR: [
        { descricao: { contains: termo, mode: "insensitive" } },
        { fornecedor: { contains: termo, mode: "insensitive" } },
        { contrato: { cliente: { nome: { contains: termo, mode: "insensitive" } } } },
        ...(Number.isFinite(comoNumero) && comoNumero > 0 ? [{ numero: comoNumero }] : []),
      ],
    });
  }

  if (tipo && tipo !== "todos") filtros.push({ tipo: tipoParaDb[tipo] });
  if (categoria && categoria !== "todos") filtros.push({ categoria: categoriaParaDb[categoria] });
  if (contratoId) filtros.push({ contratoId });

  if (status === "paga") filtros.push({ pagoEm: { not: null } });
  if (status === "em_aberto") filtros.push({ pagoEm: null });
  if (status === "atrasada") filtros.push({ pagoEm: null, vencimento: { lt: hoje } });
  if (status === "vence_7") {
    filtros.push({ pagoEm: null, vencimento: { gte: hoje, lt: new Date(hoje.getTime() + 7 * 86400000) } });
  }
  if (status === "a_reembolsar") filtros.push(A_REEMBOLSAR);

  return filtros.length === 0 ? {} : { AND: filtros };
}

const ordenacoes: Record<OrdenacaoDespesas, Prisma.DespesaOrderByWithRelationInput[]> = {
  recentes: [{ vencimento: "desc" }, { id: "desc" }],
  maior_valor: [{ valor: "desc" }, { id: "desc" }],
  vencimento: [{ vencimento: "asc" }, { id: "desc" }],
};

export async function listarDespesasPaginado(filtro: FiltroDespesas = {}): Promise<PaginaDespesas> {
  const tamanho = Math.min(Math.max(filtro.tamanho ?? 20, 1), 100);
  const condicao = where(filtro);
  const [total, despesas] = await prisma.$transaction([
    prisma.despesa.count({ where: condicao }),
    prisma.despesa.findMany({
      where: condicao,
      include: comContrato,
      orderBy: ordenacoes[filtro.ordenar ?? "recentes"],
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
  tipo: TipoDespesa;
  categoria: CategoriaDespesa;
  valor: number;
  vencimento: Date;
  fornecedor?: string | null;
  contratoId?: string | null;
  quemPaga?: QuemPaga;
  pagoEm?: Date | null;
  cobradoEm?: Date | null;
  origem?: OrigemRegistro;
  textoOriginal?: string | null;
}

export async function criarDespesa(dados: NovaDespesa): Promise<DespesaUI> {
  const despesa = await prisma.despesa.create({
    data: {
      descricao: dados.descricao,
      tipo: tipoParaDb[dados.tipo],
      categoria: categoriaParaDb[dados.categoria],
      valor: new Prisma.Decimal(dados.valor),
      vencimento: dados.vencimento,
      pagoEm: dados.pagoEm ?? null,
      fornecedor: dados.fornecedor ?? null,
      // Gasto de escritório nunca pertence a um caso.
      contratoId: dados.tipo === "escritorio" ? null : (dados.contratoId ?? null),
      quemPaga: quemPagaParaDb[dados.tipo === "escritorio" ? "advogado" : (dados.quemPaga ?? "advogado")],
      cobradoEm: dados.cobradoEm ?? null,
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
      ...(dados.tipo === undefined ? {} : { tipo: tipoParaDb[dados.tipo] }),
      ...(dados.categoria === undefined ? {} : { categoria: categoriaParaDb[dados.categoria] }),
      ...(dados.valor === undefined ? {} : { valor: new Prisma.Decimal(dados.valor) }),
      ...(dados.vencimento === undefined ? {} : { vencimento: dados.vencimento }),
      ...(dados.pagoEm === undefined ? {} : { pagoEm: dados.pagoEm }),
      ...(dados.cobradoEm === undefined ? {} : { cobradoEm: dados.cobradoEm }),
      ...(dados.fornecedor === undefined ? {} : { fornecedor: dados.fornecedor }),
      ...(dados.contratoId === undefined ? {} : { contratoId: dados.contratoId }),
      ...(dados.quemPaga === undefined ? {} : { quemPaga: quemPagaParaDb[dados.quemPaga] }),
    },
    include: comContrato,
  });
  return paraUI(despesa);
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
  /** Adiantado pelo advogado em gasto que era do cliente e nunca foi cobrado. */
  aReembolsar: number;
  aReembolsarQuantidade: number;
  /** Gasto de processo que sai do bolso do advogado — o que corrói a margem. */
  doProcessoNoMes: number;
  doEscritorioNoMes: number;
}

export async function resumoDespesasDoMes(hoje = new Date()): Promise<ResumoDespesas> {
  const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
  const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 1));
  const em7Dias = new Date(hoje.getTime() + 7 * 86400000);

  const [doMes, atrasadas, proximas, aReembolsar] = await prisma.$transaction([
    prisma.despesa.findMany({
      where: { vencimento: { gte: inicio, lt: fim } },
      select: { valor: true, pagoEm: true, tipo: true },
    }),
    prisma.despesa.findMany({ where: { pagoEm: null, vencimento: { lt: hoje } }, select: { valor: true } }),
    prisma.despesa.findMany({
      where: { pagoEm: null, vencimento: { gte: hoje, lt: em7Dias } },
      select: { valor: true },
    }),
    prisma.despesa.findMany({ where: A_REEMBOLSAR, select: { valor: true } }),
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
    aReembolsar: soma(aReembolsar),
    aReembolsarQuantidade: aReembolsar.length,
    doProcessoNoMes: soma(doMes.filter((d) => d.tipo === "PROCESSO")),
    doEscritorioNoMes: soma(doMes.filter((d) => d.tipo === "ESCRITORIO")),
  };
}

export interface ContadoresDespesas {
  total: number;
  doProcesso: number;
  doEscritorio: number;
  pagas: number;
  emAberto: number;
  atrasadas: number;
  vencendoEm7Dias: number;
  aReembolsar: number;
}

export async function contadoresDespesas(
  hoje = new Date(),
  tipo?: TipoDespesa | "todos",
): Promise<ContadoresDespesas> {
  const em7Dias = new Date(hoje.getTime() + 7 * 86400000);
  const doTipo: Prisma.DespesaWhereInput = tipo && tipo !== "todos" ? { tipo: tipoParaDb[tipo] } : {};

  const [total, doProcesso, doEscritorio, pagas, emAberto, atrasadas, vencendoEm7Dias, aReembolsar] =
    await prisma.$transaction([
      prisma.despesa.count({ where: doTipo }),
      prisma.despesa.count({ where: { tipo: "PROCESSO" } }),
      prisma.despesa.count({ where: { tipo: "ESCRITORIO" } }),
      prisma.despesa.count({ where: { ...doTipo, pagoEm: { not: null } } }),
      prisma.despesa.count({ where: { ...doTipo, pagoEm: null } }),
      prisma.despesa.count({ where: { ...doTipo, pagoEm: null, vencimento: { lt: hoje } } }),
      prisma.despesa.count({ where: { ...doTipo, pagoEm: null, vencimento: { gte: hoje, lt: em7Dias } } }),
      prisma.despesa.count({ where: { ...doTipo, ...A_REEMBOLSAR } }),
    ]);

  return { total, doProcesso, doEscritorio, pagas, emAberto, atrasadas, vencendoEm7Dias, aReembolsar };
}

export interface MargemDoCaso {
  honorarios: number;
  /** Serviços avulsos prestados dentro deste caso — também são receita dele. */
  servicos: number;
  receita: number;
  recebido: number;
  /** Tudo que o caso consumiu, independentemente de quem arca. */
  despesasTotal: number;
  /** O que sai do bolso do advogado e não volta. */
  porContaDoAdvogado: number;
  /** Era do cliente, o advogado pagou e ainda não repassou. */
  aReembolsar: number;
  /** receita - porContaDoAdvogado. */
  margem: number;
  /** Quanto da receita do caso as despesas do advogado já consumiram, em %. */
  percentualConsumido: number;
}

// A conta que o advogado iniciante não faz: o honorário contratado não é o que
// sobra. Cada ida ao fórum sai daqui.
export async function margemDoCaso(contratoId: string): Promise<MargemDoCaso | null> {
  const contrato = await prisma.contrato.findUnique({
    where: { id: contratoId },
    select: {
      valorTotal: true,
      parcelas: { select: { pagamento: { select: { valorPago: true } } } },
      despesas: { select: { valor: true, quemPaga: true, pagoEm: true, cobradoEm: true } },
      servicos: { select: { valor: true, recebidoEm: true } },
    },
  });
  if (!contrato) return null;

  const honorarios = contrato.valorTotal.toNumber();
  const servicos = contrato.servicos.reduce((t, s) => t + s.valor.toNumber(), 0);
  const recebido =
    contrato.parcelas.reduce((t, p) => t + (p.pagamento?.valorPago.toNumber() ?? 0), 0) +
    contrato.servicos.reduce((t, s) => t + (s.recebidoEm ? s.valor.toNumber() : 0), 0);

  let despesasTotal = 0;
  let porContaDoAdvogado = 0;
  let aReembolsar = 0;
  for (const despesa of contrato.despesas) {
    const valor = despesa.valor.toNumber();
    despesasTotal += valor;
    if (despesa.quemPaga === "ADVOGADO") porContaDoAdvogado += valor;
    else if (despesa.pagoEm && !despesa.cobradoEm) aReembolsar += valor;
  }

  const receita = honorarios + servicos;

  return {
    honorarios: centavos(honorarios),
    servicos: centavos(servicos),
    receita: centavos(receita),
    recebido: centavos(recebido),
    despesasTotal: centavos(despesasTotal),
    porContaDoAdvogado: centavos(porContaDoAdvogado),
    aReembolsar: centavos(aReembolsar),
    margem: centavos(receita - porContaDoAdvogado),
    percentualConsumido: receita > 0 ? Math.round((porContaDoAdvogado / receita) * 1000) / 10 : 0,
  };
}

export interface AReceber {
  /** Parcelas de contrato ainda em aberto no mês. */
  contratos: number;
  /** Serviços avulsos ainda não recebidos no mês. */
  servicos: number;
  total: number;
}

// Par do resumo de despesas. Soma as duas vias de entrada — sem os serviços
// avulsos, o "a receber" mentiria para quem cobra consulta e parecer.
export async function aReceberNoMes(hoje = new Date()): Promise<AReceber> {
  const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
  const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 1));

  const [parcelas, servicos] = await prisma.$transaction([
    prisma.parcela.findMany({
      where: { vencimento: { gte: inicio, lt: fim } },
      select: { valor: true, pagamento: { select: { valorPago: true } } },
    }),
    prisma.servico.findMany({
      where: { recebidoEm: null, vencimento: { gte: inicio, lt: fim } },
      select: { valor: true },
    }),
  ]);

  const contratos = centavos(
    parcelas.reduce(
      (total, p) => total + Math.max(0, p.valor.toNumber() - (p.pagamento?.valorPago.toNumber() ?? 0)),
      0,
    ),
  );
  const avulsos = centavos(servicos.reduce((total, s) => total + s.valor.toNumber(), 0));

  return { contratos, servicos: avulsos, total: centavos(contratos + avulsos) };
}
