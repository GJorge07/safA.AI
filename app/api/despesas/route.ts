import { ApiError, body, date, handle, money, text } from "@/lib/api/http";
import { criarDespesa, listarDespesasPaginado, type FiltroDespesas } from "@/lib/db/despesas";
import type { CategoriaDespesa, Recorrencia } from "@/lib/types";

const CATEGORIAS: CategoriaDespesa[] = [
  "custas_processuais",
  "diligencia",
  "pericia",
  "software",
  "estrutura",
  "tributos",
  "pessoal",
  "outros",
];
const RECORRENCIAS: Recorrencia[] = ["unica", "mensal", "anual"];

export function categoria(valor: unknown): CategoriaDespesa {
  const lida = text(valor, "categoria").toLowerCase() as CategoriaDespesa;
  if (!CATEGORIAS.includes(lida)) throw new ApiError(400, `categoria deve ser uma de: ${CATEGORIAS.join(", ")}`);
  return lida;
}

export function recorrencia(valor: unknown): Recorrencia {
  const lida = text(valor, "recorrencia").toLowerCase() as Recorrencia;
  if (!RECORRENCIAS.includes(lida)) throw new ApiError(400, `recorrencia deve ser uma de: ${RECORRENCIAS.join(", ")}`);
  return lida;
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
      categoria: (url.searchParams.get("categoria") as CategoriaDespesa | "todos" | null) ?? undefined,
      status: (url.searchParams.get("status") as FiltroDespesas["status"]) ?? undefined,
      recorrencia: (url.searchParams.get("recorrencia") as Recorrencia | "todos" | null) ?? undefined,
    };
    return Response.json(await listarDespesasPaginado(filtro));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const dados = await body(request);
    const despesa = await criarDespesa({
      descricao: text(dados.descricao, "descricao", 300),
      categoria: categoria(dados.categoria),
      valor: money(dados.valor, "valor").toNumber(),
      vencimento: date(dados.vencimento, "vencimento"),
      recorrencia: dados.recorrencia === undefined ? "unica" : recorrencia(dados.recorrencia),
      fornecedor: dados.fornecedor === undefined || dados.fornecedor === null ? null : text(dados.fornecedor, "fornecedor"),
      contratoId: dados.contratoId === undefined || dados.contratoId === null ? null : text(dados.contratoId, "contratoId"),
      reembolsavel: dados.reembolsavel === true,
      pagoEm: dados.pagoEm === undefined || dados.pagoEm === null ? null : date(dados.pagoEm, "pagoEm"),
      textoOriginal:
        dados.textoOriginal === undefined || dados.textoOriginal === null
          ? null
          : text(dados.textoOriginal, "textoOriginal", 50000),
    });
    return Response.json(despesa, { status: 201 });
  });
}
