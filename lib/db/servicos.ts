// O lado do recebimento que não passa por contrato: consulta, parecer,
// petição avulsa, audiência fora do que foi contratado. Mesma tradução de
// Decimal → number e enum maiúsculo → minúsculo das outras camadas de dados.
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { ServicoUI } from "@/components/dashboard/types";
import type { CategoriaServico } from "@/lib/types";

const comRelacoes = {
  cliente: { select: { id: true, nome: true } },
  contrato: { select: { id: true, numero: true } },
} satisfies Prisma.ServicoInclude;

type ServicoRow = Prisma.ServicoGetPayload<{ include: typeof comRelacoes }>;

export const categoriaServicoParaDb = {
  consulta: "CONSULTA",
  parecer: "PARECER",
  peticao: "PETICAO",
  audiencia: "AUDIENCIA",
  elaboracao_contrato: "ELABORACAO_CONTRATO",
  outros_servico: "OUTROS_SERVICO",
} as const;

export const rotuloCategoriaServico: Record<CategoriaServico, string> = {
  consulta: "Consulta / orientação",
  parecer: "Parecer",
  peticao: "Petição avulsa",
  audiencia: "Audiência avulsa",
  elaboracao_contrato: "Elaboração de contrato",
  outros_servico: "Outros",
};

export const CATEGORIAS_SERVICO: CategoriaServico[] = [
  "consulta",
  "parecer",
  "peticao",
  "audiencia",
  "elaboracao_contrato",
  "outros_servico",
];

function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function paraUI(servico: ServicoRow): ServicoUI {
  return {
    id: servico.id,
    numero: servico.numero,
    descricao: servico.descricao,
    categoria: servico.categoria.toLowerCase() as CategoriaServico,
    valor: servico.valor.toNumber(),
    realizadoEm: servico.realizadoEm,
    vencimento: servico.vencimento,
    recebidoEm: servico.recebidoEm,
    clienteId: servico.clienteId,
    cliente: servico.cliente,
    contratoId: servico.contratoId,
    contrato: servico.contrato,
    createdAt: servico.createdAt,
  };
}

export type StatusServicoFiltro = "todos" | "recebido" | "atrasado" | "a_receber";

export interface FiltroServicos {
  pagina?: number;
  tamanho?: number;
  busca?: string;
  categoria?: CategoriaServico | "todos";
  status?: StatusServicoFiltro;
  contratoId?: string;
  hoje?: Date;
}

export interface PaginaServicos {
  itens: ServicoUI[];
  total: number;
  paginas: number;
  pagina: number;
  tamanho: number;
}

function where({ busca, categoria, status, contratoId, hoje = new Date() }: FiltroServicos): Prisma.ServicoWhereInput {
  const filtros: Prisma.ServicoWhereInput[] = [];

  const termo = busca?.trim();
  if (termo) {
    const comoNumero = Number(termo.replace(/\D/g, ""));
    filtros.push({
      OR: [
        { descricao: { contains: termo, mode: "insensitive" } },
        { cliente: { nome: { contains: termo, mode: "insensitive" } } },
        ...(Number.isFinite(comoNumero) && comoNumero > 0 ? [{ numero: comoNumero }] : []),
      ],
    });
  }

  if (categoria && categoria !== "todos") filtros.push({ categoria: categoriaServicoParaDb[categoria] });
  if (contratoId) filtros.push({ contratoId });

  if (status === "recebido") filtros.push({ recebidoEm: { not: null } });
  if (status === "atrasado") filtros.push({ recebidoEm: null, vencimento: { lt: hoje } });
  if (status === "a_receber") filtros.push({ recebidoEm: null, vencimento: { gte: hoje } });

  return filtros.length === 0 ? {} : { AND: filtros };
}

export async function listarServicosPaginado(filtro: FiltroServicos = {}): Promise<PaginaServicos> {
  const tamanho = Math.min(Math.max(filtro.tamanho ?? 20, 1), 100);
  const condicao = where(filtro);
  const [total, servicos] = await prisma.$transaction([
    prisma.servico.count({ where: condicao }),
    prisma.servico.findMany({
      where: condicao,
      include: comRelacoes,
      orderBy: [{ realizadoEm: "desc" }, { id: "desc" }],
      skip: (Math.max(filtro.pagina ?? 1, 1) - 1) * tamanho,
      take: tamanho,
    }),
  ]);

  const paginas = Math.max(1, Math.ceil(total / tamanho));
  return {
    itens: servicos.map(paraUI),
    total,
    paginas,
    pagina: Math.min(Math.max(filtro.pagina ?? 1, 1), paginas),
    tamanho,
  };
}

export async function obterServico(id: string): Promise<ServicoUI | null> {
  const servico = await prisma.servico.findUnique({ where: { id }, include: comRelacoes });
  return servico && paraUI(servico);
}

export async function listarServicosDoContrato(contratoId: string): Promise<ServicoUI[]> {
  const servicos = await prisma.servico.findMany({
    where: { contratoId },
    include: comRelacoes,
    orderBy: [{ realizadoEm: "desc" }],
  });
  return servicos.map(paraUI);
}

export interface NovoServico {
  descricao: string;
  categoria: CategoriaServico;
  valor: number;
  realizadoEm: Date;
  vencimento: Date;
  recebidoEm?: Date | null;
  clienteId?: string | null;
  contratoId?: string | null;
}

export async function criarServico(dados: NovoServico): Promise<ServicoUI> {
  const servico = await prisma.servico.create({
    data: {
      descricao: dados.descricao,
      categoria: categoriaServicoParaDb[dados.categoria],
      valor: new Prisma.Decimal(dados.valor),
      realizadoEm: dados.realizadoEm,
      vencimento: dados.vencimento,
      recebidoEm: dados.recebidoEm ?? null,
      clienteId: dados.clienteId ?? null,
      contratoId: dados.contratoId ?? null,
    },
    include: comRelacoes,
  });
  return paraUI(servico);
}

export async function atualizarServico(id: string, dados: Partial<NovoServico>): Promise<ServicoUI> {
  const servico = await prisma.servico.update({
    where: { id },
    data: {
      ...(dados.descricao === undefined ? {} : { descricao: dados.descricao }),
      ...(dados.categoria === undefined ? {} : { categoria: categoriaServicoParaDb[dados.categoria] }),
      ...(dados.valor === undefined ? {} : { valor: new Prisma.Decimal(dados.valor) }),
      ...(dados.realizadoEm === undefined ? {} : { realizadoEm: dados.realizadoEm }),
      ...(dados.vencimento === undefined ? {} : { vencimento: dados.vencimento }),
      ...(dados.recebidoEm === undefined ? {} : { recebidoEm: dados.recebidoEm }),
      ...(dados.clienteId === undefined ? {} : { clienteId: dados.clienteId }),
      ...(dados.contratoId === undefined ? {} : { contratoId: dados.contratoId }),
    },
    include: comRelacoes,
  });
  return paraUI(servico);
}

export function excluirServico(id: string): Promise<unknown> {
  return prisma.servico.delete({ where: { id } });
}

export interface ResumoServicos {
  totalMes: number;
  recebidoMes: number;
  aReceberMes: number;
  atrasado: number;
  quantidadeMes: number;
}

export async function resumoServicosDoMes(hoje = new Date()): Promise<ResumoServicos> {
  const inicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));
  const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 1));

  const [doMes, atrasados] = await prisma.$transaction([
    prisma.servico.findMany({
      where: { vencimento: { gte: inicio, lt: fim } },
      select: { valor: true, recebidoEm: true },
    }),
    prisma.servico.findMany({
      where: { recebidoEm: null, vencimento: { lt: hoje } },
      select: { valor: true },
    }),
  ]);

  const soma = (linhas: { valor: Prisma.Decimal }[]) =>
    centavos(linhas.reduce((total, l) => total + l.valor.toNumber(), 0));

  const totalMes = soma(doMes);
  const recebidoMes = soma(doMes.filter((s) => s.recebidoEm !== null));

  return {
    totalMes,
    recebidoMes,
    aReceberMes: centavos(totalMes - recebidoMes),
    atrasado: soma(atrasados),
    quantidadeMes: doMes.length,
  };
}

export interface ContadoresServicos {
  total: number;
  atrasados: number;
  aReceber: number;
  recebidos: number;
}

export async function contadoresServicos(hoje = new Date()): Promise<ContadoresServicos> {
  const [total, atrasados, aReceber, recebidos] = await prisma.$transaction([
    prisma.servico.count(),
    prisma.servico.count({ where: { recebidoEm: null, vencimento: { lt: hoje } } }),
    prisma.servico.count({ where: { recebidoEm: null, vencimento: { gte: hoje } } }),
    prisma.servico.count({ where: { recebidoEm: { not: null } } }),
  ]);
  return { total, atrasados, aReceber, recebidos };
}
