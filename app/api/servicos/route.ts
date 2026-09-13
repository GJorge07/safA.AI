import { ApiError, body, date, handle, money, text } from "@/lib/api/http";
import { criarServico, listarServicosPaginado, type FiltroServicos } from "@/lib/db/servicos";
import type { CategoriaServico } from "@/lib/types";

const CATEGORIAS: CategoriaServico[] = [
  "consulta",
  "parecer",
  "peticao",
  "audiencia",
  "elaboracao_contrato",
  "outros_servico",
];

export function categoriaServico(valor: unknown): CategoriaServico {
  const lida = text(valor, "categoria").toLowerCase() as CategoriaServico;
  if (!CATEGORIAS.includes(lida)) throw new ApiError(400, `categoria deve ser uma de: ${CATEGORIAS.join(", ")}`);
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
    const filtro: FiltroServicos = {
      pagina: inteiro(url, "pagina", 1),
      tamanho: inteiro(url, "tamanho", 20),
      busca: url.searchParams.get("busca") ?? undefined,
      categoria: (url.searchParams.get("categoria") as CategoriaServico | "todos" | null) ?? undefined,
      status: (url.searchParams.get("status") as FiltroServicos["status"]) ?? undefined,
      contratoId: url.searchParams.get("contratoId") ?? undefined,
    };
    return Response.json(await listarServicosPaginado(filtro));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const dados = await body(request);
    const realizadoEm = date(dados.realizadoEm, "realizadoEm");
    // Sem vencimento informado, cobra-se no mesmo dia da prestação — é o mais
    // comum numa consulta avulsa.
    const vencimento = dados.vencimento === undefined ? realizadoEm : date(dados.vencimento, "vencimento");

    const servico = await criarServico({
      descricao: text(dados.descricao, "descricao", 300),
      categoria: categoriaServico(dados.categoria),
      valor: money(dados.valor, "valor").toNumber(),
      realizadoEm,
      vencimento,
      recebidoEm: dados.recebidoEm === undefined || dados.recebidoEm === null ? null : date(dados.recebidoEm, "recebidoEm"),
      clienteId: dados.clienteId === undefined || dados.clienteId === null ? null : text(dados.clienteId, "clienteId"),
      contratoId:
        dados.contratoId === undefined || dados.contratoId === null ? null : text(dados.contratoId, "contratoId"),
    });
    return Response.json(servico, { status: 201 });
  });
}
