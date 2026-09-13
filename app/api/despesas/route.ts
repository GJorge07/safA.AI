import { ApiError, body, date, handle, money, text } from "@/lib/api/http";
import { criarDespesa, listarDespesasPaginado, type FiltroDespesas } from "@/lib/db/despesas";
import type { CategoriaDespesa, QuemPaga, Recorrencia, TipoDespesa } from "@/lib/types";

const CATEGORIAS: CategoriaDespesa[] = [
  "deslocamento",
  "custas",
  "diligencia",
  "cartorio",
  "pericia",
  "correspondente",
  "outros_processo",
  "estrutura",
  "software",
  "tributos",
  "pessoal",
  "outros_escritorio",
];

// Um gasto de processo com categoria de escritório (ou vice-versa) tornaria os
// totais de margem mentirosos — então o par tipo/categoria é validado junto.
const CATEGORIAS_POR_TIPO: Record<TipoDespesa, CategoriaDespesa[]> = {
  processo: ["deslocamento", "custas", "diligencia", "cartorio", "pericia", "correspondente", "outros_processo"],
  escritorio: ["estrutura", "software", "tributos", "pessoal", "outros_escritorio"],
};

const TIPOS: TipoDespesa[] = ["processo", "escritorio"];
const RECORRENCIAS: Recorrencia[] = ["unica", "mensal", "anual"];
const QUEM_PAGA: QuemPaga[] = ["cliente", "advogado"];

export function tipoDespesa(valor: unknown): TipoDespesa {
  const lido = text(valor, "tipo").toLowerCase() as TipoDespesa;
  if (!TIPOS.includes(lido)) throw new ApiError(400, `tipo deve ser um de: ${TIPOS.join(", ")}`);
  return lido;
}

export function categoria(valor: unknown): CategoriaDespesa {
  const lida = text(valor, "categoria").toLowerCase() as CategoriaDespesa;
  if (!CATEGORIAS.includes(lida)) throw new ApiError(400, `categoria deve ser uma de: ${CATEGORIAS.join(", ")}`);
  return lida;
}

export function conferirParTipoCategoria(tipo: TipoDespesa, cat: CategoriaDespesa) {
  if (!CATEGORIAS_POR_TIPO[tipo].includes(cat)) {
    throw new ApiError(400, `categoria ${cat} não pertence a uma despesa do tipo ${tipo}`);
  }
}

export function recorrencia(valor: unknown): Recorrencia {
  const lida = text(valor, "recorrencia").toLowerCase() as Recorrencia;
  if (!RECORRENCIAS.includes(lida)) throw new ApiError(400, `recorrencia deve ser uma de: ${RECORRENCIAS.join(", ")}`);
  return lida;
}

export function quemPaga(valor: unknown): QuemPaga {
  const lido = text(valor, "quemPaga").toLowerCase() as QuemPaga;
  if (!QUEM_PAGA.includes(lido)) throw new ApiError(400, `quemPaga deve ser um de: ${QUEM_PAGA.join(", ")}`);
  return lido;
}

function inteiro(url: URL, nome: string, padrao: number): number {
  const bruto = url.searchParams.get(nome);
  if (bruto === null) return padrao;
  if (!/^\d+$/.test(bruto) || Number(bruto) < 1) throw new ApiError(400, `${nome} inválido`);
  return Number(bruto);
}

export async function GET(request: Request) {
  return handle(async () => {
    const url = new URL(request.url);
    const filtro: FiltroDespesas = {
      pagina: inteiro(url, "pagina", 1),
      tamanho: inteiro(url, "tamanho", 20),
      busca: url.searchParams.get("busca") ?? undefined,
      tipo: (url.searchParams.get("tipo") as TipoDespesa | "todos" | null) ?? undefined,
      categoria: (url.searchParams.get("categoria") as CategoriaDespesa | "todos" | null) ?? undefined,
      status: (url.searchParams.get("status") as FiltroDespesas["status"]) ?? undefined,
      recorrencia: (url.searchParams.get("recorrencia") as Recorrencia | "todos" | null) ?? undefined,
      contratoId: url.searchParams.get("contratoId") ?? undefined,
    };
    return Response.json(await listarDespesasPaginado(filtro));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const dados = await body(request);
    const tipo = dados.tipo === undefined ? "processo" : tipoDespesa(dados.tipo);
    const cat = categoria(dados.categoria);
    conferirParTipoCategoria(tipo, cat);

    const despesa = await criarDespesa({
      descricao: text(dados.descricao, "descricao", 300),
      tipo,
      categoria: cat,
      valor: money(dados.valor, "valor").toNumber(),
      vencimento: date(dados.vencimento, "vencimento"),
      recorrencia: dados.recorrencia === undefined ? "unica" : recorrencia(dados.recorrencia),
      fornecedor:
        dados.fornecedor === undefined || dados.fornecedor === null ? null : text(dados.fornecedor, "fornecedor"),
      contratoId:
        dados.contratoId === undefined || dados.contratoId === null ? null : text(dados.contratoId, "contratoId"),
      quemPaga: dados.quemPaga === undefined ? "advogado" : quemPaga(dados.quemPaga),
      pagoEm: dados.pagoEm === undefined || dados.pagoEm === null ? null : date(dados.pagoEm, "pagoEm"),
      cobradoEm: dados.cobradoEm === undefined || dados.cobradoEm === null ? null : date(dados.cobradoEm, "cobradoEm"),
      textoOriginal:
        dados.textoOriginal === undefined || dados.textoOriginal === null
          ? null
          : text(dados.textoOriginal, "textoOriginal", 50000),
    });
    return Response.json(despesa, { status: 201 });
  });
}
