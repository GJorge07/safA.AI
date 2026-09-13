// Consultas da tela inicial. Tudo aqui é agregado de propósito: o Início
// responde "como estou?" e "o que faço agora?", não navega contratos — quem
// navega é /pagamentos. Antes esta tela serializava a carteira inteira para o
// cliente só para paginar dez itens.
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { FluxoCaixaMes, TipoPagamento } from "@/lib/types";

function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

function inicioDoMes(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1));
}

function somaDecimais(linhas: { valor: Prisma.Decimal }[]): number {
  return centavos(linhas.reduce((total, l) => total + l.valor.toNumber(), 0));
}

// ---------------------------------------------------------------------------
// Entra x sai, mês a mês

export interface MesFluxo extends FluxoCaixaMes {
  /** Despesas pagas no mês — sem elas o gráfico só conta metade da história. */
  pago: number;
}

export async function carregarFluxoComDespesas(hoje = new Date(), meses = 6): Promise<MesFluxo[]> {
  const gte = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - Math.floor(meses / 2), 1));
  const lt = new Date(Date.UTC(gte.getUTCFullYear(), gte.getUTCMonth() + meses, 1));

  const [parcelas, pagamentos, servicos, despesas] = await prisma.$transaction([
    // O previsto do gráfico ignora baixadas: esse dinheiro não vem mais.
    prisma.parcela.findMany({
      where: { vencimento: { gte, lt }, baixadaEm: null },
      select: { valor: true, vencimento: true },
    }),
    prisma.pagamento.findMany({ where: { dataPago: { gte, lt } }, select: { valorPago: true, dataPago: true } }),
    prisma.servico.findMany({
      where: { vencimento: { gte, lt } },
      select: { valor: true, vencimento: true, recebidoEm: true },
    }),
    prisma.despesa.findMany({
      where: { pagoEm: { gte, lt } },
      select: { valor: true, pagoEm: true },
    }),
  ]);

  const porMes = new Map<string, MesFluxo>();
  const cursor = new Date(gte);
  while (cursor < lt) {
    porMes.set(cursor.toISOString().slice(0, 7), {
      mes: cursor.toISOString().slice(0, 7),
      previsto: 0,
      recebido: 0,
      pago: 0,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const mesDe = (data: Date) => porMes.get(data.toISOString().slice(0, 7));

  for (const parcela of parcelas) {
    const mes = mesDe(parcela.vencimento);
    if (mes) mes.previsto += parcela.valor.toNumber();
  }
  for (const pagamento of pagamentos) {
    const mes = mesDe(pagamento.dataPago);
    if (mes) mes.recebido += pagamento.valorPago.toNumber();
  }
  // Serviço avulso também é receita: previsto no vencimento, recebido quando pago.
  for (const servico of servicos) {
    const mes = mesDe(servico.vencimento);
    if (!mes) continue;
    mes.previsto += servico.valor.toNumber();
    if (servico.recebidoEm) mes.recebido += servico.valor.toNumber();
  }
  for (const despesa of despesas) {
    const mes = despesa.pagoEm && mesDe(despesa.pagoEm);
    if (mes) mes.pago += despesa.valor.toNumber();
  }

  return Array.from(porMes.values()).map((mes) => ({
    mes: mes.mes,
    previsto: centavos(mes.previsto),
    recebido: centavos(mes.recebido),
    pago: centavos(mes.pago),
  }));
}

// ---------------------------------------------------------------------------
// Os números do topo

export interface ResumoInicio {
  recebido: number;
  recebidoMesAnterior: number;
  pago: number;
  /** recebido - pago: o que de fato sobrou no mês. */
  sobrou: number;
  emAtraso: number;
  clientesAtivos: number;
}

export async function resumoDoInicio(hoje = new Date()): Promise<ResumoInicio> {
  const comeco = inicioDoMes(hoje);
  const proximo = new Date(Date.UTC(comeco.getUTCFullYear(), comeco.getUTCMonth() + 1, 1));
  const anterior = new Date(Date.UTC(comeco.getUTCFullYear(), comeco.getUTCMonth() - 1, 1));

  const [pagamentosMes, servicosMes, pagamentosAnterior, servicosAnterior, despesasMes, parcelasVencidas, servicosVencidos, clientesAtivos] =
    await prisma.$transaction([
      prisma.pagamento.findMany({ where: { dataPago: { gte: comeco, lt: proximo } }, select: { valorPago: true } }),
      prisma.servico.findMany({ where: { recebidoEm: { gte: comeco, lt: proximo } }, select: { valor: true } }),
      prisma.pagamento.findMany({ where: { dataPago: { gte: anterior, lt: comeco } }, select: { valorPago: true } }),
      prisma.servico.findMany({ where: { recebidoEm: { gte: anterior, lt: comeco } }, select: { valor: true } }),
      prisma.despesa.findMany({ where: { pagoEm: { gte: comeco, lt: proximo } }, select: { valor: true } }),
      prisma.parcela.findMany({
        // Baixada não é atraso: o honorário de êxito que não veio não é dívida.
        where: { pagamento: { is: null }, baixadaEm: null, vencimento: { lt: hoje } },
        select: { valor: true },
      }),
      prisma.servico.findMany({
        where: { recebidoEm: null, vencimento: { lt: hoje } },
        select: { valor: true },
      }),
      // "Ativo" = tem ao menos uma parcela ainda em aberto.
      prisma.cliente.count({
        where: { contratos: { some: { parcelas: { some: { pagamento: { is: null }, baixadaEm: null } } } } },
      }),
    ]);

  const somaPagos = (linhas: { valorPago: Prisma.Decimal }[]) =>
    centavos(linhas.reduce((total, l) => total + l.valorPago.toNumber(), 0));

  const recebido = centavos(somaPagos(pagamentosMes) + somaDecimais(servicosMes));
  const pago = somaDecimais(despesasMes);

  return {
    recebido,
    recebidoMesAnterior: centavos(somaPagos(pagamentosAnterior) + somaDecimais(servicosAnterior)),
    pago,
    sobrou: centavos(recebido - pago),
    emAtraso: centavos(somaDecimais(parcelasVencidas) + somaDecimais(servicosVencidos)),
    clientesAtivos,
  };
}

// ---------------------------------------------------------------------------
// "Pendências": o dinheiro parado, em uma lista curta e acionável

export type TipoAcao = "parcela" | "servico" | "reembolso";

export interface AcaoPendente {
  id: string;
  tipo: TipoAcao;
  titulo: string;
  detalhe: string;
  valor: number;
  dias: number;
  href: string;
}

function diasDesde(data: Date, hoje: Date): number {
  const diff =
    Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()) -
    Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
  return Math.max(0, Math.floor(diff / 86400000));
}

// Três fontes de dinheiro parado que hoje vivem em telas diferentes. Cada
// consulta traz só o topo: a lista existe para caber numa olhada, não para
// navegar.
export async function acoesPendentes(hoje = new Date(), limite = 5): Promise<AcaoPendente[]> {
  const [parcelas, servicos, reembolsos] = await prisma.$transaction([
    prisma.parcela.findMany({
      where: { pagamento: { is: null }, baixadaEm: null, vencimento: { lt: hoje } },
      select: {
        id: true,
        valor: true,
        vencimento: true,
        contratoId: true,
        contrato: { select: { numero: true, cliente: { select: { nome: true } } } },
      },
      orderBy: { vencimento: "asc" },
      take: limite,
    }),
    prisma.servico.findMany({
      where: { recebidoEm: null, vencimento: { lt: hoje } },
      select: { id: true, valor: true, vencimento: true, descricao: true, cliente: { select: { nome: true } } },
      orderBy: { vencimento: "asc" },
      take: limite,
    }),
    prisma.despesa.findMany({
      where: { quemPaga: "CLIENTE", pagoEm: { not: null }, cobradoEm: null },
      select: {
        id: true,
        valor: true,
        pagoEm: true,
        descricao: true,
        contratoId: true,
        contrato: { select: { cliente: { select: { nome: true } } } },
      },
      orderBy: { pagoEm: "asc" },
      take: limite,
    }),
  ]);

  const porParcela: AcaoPendente[] = [
    ...parcelas.map((parcela) => ({
      id: `parcela-${parcela.id}`,
      tipo: "parcela" as const,
      titulo: parcela.contrato.cliente.nome,
      detalhe: `Parcela vencida · CT-${String(parcela.contrato.numero).padStart(4, "0")}`,
      valor: parcela.valor.toNumber(),
      dias: diasDesde(parcela.vencimento, hoje),
      href: `/pagamentos/contratos/${parcela.contratoId}`,
    })),
  ];

  const porServico: AcaoPendente[] = [
    ...servicos.map((servico) => ({
      id: `servico-${servico.id}`,
      tipo: "servico" as const,
      titulo: servico.cliente?.nome ?? servico.descricao,
      detalhe: `Serviço não recebido · ${servico.descricao}`,
      valor: servico.valor.toNumber(),
      dias: diasDesde(servico.vencimento, hoje),
      href: "/pagamentos?sub=servicos&status=atrasado",
    })),
  ];

  const porReembolso: AcaoPendente[] = [
    ...reembolsos.map((despesa) => ({
      id: `reembolso-${despesa.id}`,
      tipo: "reembolso" as const,
      titulo: despesa.contrato?.cliente.nome ?? despesa.descricao,
      detalhe: `Você adiantou · ${despesa.descricao}`,
      valor: despesa.valor.toNumber(),
      dias: despesa.pagoEm ? diasDesde(despesa.pagoEm, hoje) : 0,
      href: despesa.contratoId
        ? `/pagamentos/contratos/${despesa.contratoId}?ver=despesas`
        : "/pagamentos?aba=despesas&status=a_reembolsar",
    })),
  ];

  // Parcela vencida é quase sempre mais antiga que um serviço ou um reembolso,
  // então ordenar tudo por dias encheria a lista só de parcelas e esconderia as
  // outras duas fontes — que é justamente o que este painel existe para expor.
  // Por isso a seleção é alternada entre as três, e a ordenação vem depois.
  const filas = [porParcela, porServico, porReembolso].map((fila) =>
    [...fila].sort((a, b) => b.dias - a.dias),
  );

  const escolhidas: AcaoPendente[] = [];
  for (let volta = 0; escolhidas.length < limite; volta += 1) {
    const disponiveis = filas.filter((fila) => fila.length > volta);
    if (disponiveis.length === 0) break;
    for (const fila of disponiveis) {
      if (escolhidas.length === limite) break;
      escolhidas.push(fila[volta]);
    }
  }

  // O mais antigo primeiro: é a ordem em que o dinheiro parado dói.
  return escolhidas.sort((a, b) => b.dias - a.dias);
}

// ---------------------------------------------------------------------------
// Composição da carteira

export interface FatiaTipo {
  tipo: TipoPagamento;
  valor: number;
}

// Quanto da carteira depende de ganhar a causa — a pergunta que o "por tipo"
// responde para quem está começando.
export async function carteiraPorTipo(): Promise<FatiaTipo[]> {
  const grupos = await prisma.contrato.groupBy({
    by: ["tipoPagamento"],
    _sum: { valorTotal: true },
  });

  return grupos
    .map((grupo) => ({
      tipo: grupo.tipoPagamento.toLowerCase() as TipoPagamento,
      valor: centavos(grupo._sum.valorTotal?.toNumber() ?? 0),
    }))
    .filter((fatia) => fatia.valor > 0)
    .sort((a, b) => b.valor - a.valor);
}

export interface FatiaCliente {
  nome: string;
  recebido: number;
}

/**
 * Recebido por cliente **e por mês**. Vem quebrado por mês porque a visão
 * expandida troca o período (3/6/12 meses) sem ir ao servidor de novo — a
 * soma por cliente e o agrupamento em "outros clientes" acontecem lá, já
 * sobre o recorte escolhido.
 */
export interface RecebidoClienteMes extends FatiaCliente {
  /** YYYY-MM, na mesma chave usada por carregarFluxoComDespesas. */
  mes: string;
}

// De onde veio o dinheiro. Conta pagamento de parcela E serviço avulso pelo
// mesmo critério de "recebido" do gráfico de fluxo — senão a soma das fatias
// não fecha com a barra de Recebido do mesmo mês.
export async function receitaPorCliente(hoje = new Date(), meses = 12): Promise<RecebidoClienteMes[]> {
  const gte = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - Math.floor(meses / 2), 1));
  const lt = new Date(Date.UTC(gte.getUTCFullYear(), gte.getUTCMonth() + meses, 1));

  const [pagamentos, servicos] = await prisma.$transaction([
    prisma.pagamento.findMany({
      where: { dataPago: { gte, lt } },
      select: {
        valorPago: true,
        dataPago: true,
        parcela: { select: { contrato: { select: { cliente: { select: { nome: true } } } } } },
      },
    }),
    prisma.servico.findMany({
      where: { recebidoEm: { gte, lt } },
      select: { valor: true, recebidoEm: true, cliente: { select: { nome: true } } },
    }),
  ]);

  const porChave = new Map<string, RecebidoClienteMes>();
  const somar = (nome: string, data: Date, valor: number) => {
    const mes = data.toISOString().slice(0, 7);
    const chave = `${mes}|${nome}`;
    const atual = porChave.get(chave);
    if (atual) atual.recebido += valor;
    else porChave.set(chave, { nome, mes, recebido: valor });
  };

  for (const pagamento of pagamentos) {
    somar(pagamento.parcela.contrato.cliente.nome, pagamento.dataPago, pagamento.valorPago.toNumber());
  }
  for (const servico of servicos) {
    if (!servico.recebidoEm) continue;
    somar(servico.cliente?.nome ?? "Serviços avulsos", servico.recebidoEm, servico.valor.toNumber());
  }

  return Array.from(porChave.values(), (linha) => ({ ...linha, recebido: centavos(linha.recebido) }));
}
