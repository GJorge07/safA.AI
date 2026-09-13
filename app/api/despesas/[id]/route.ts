import { ApiError, body, Context, date, handle, money, text } from "@/lib/api/http";
import { atualizarDespesa, excluirDespesa, obterDespesa } from "@/lib/db/despesas";
import { categoria, recorrencia } from "../route";

export async function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const despesa = await obterDespesa(id);
    if (!despesa) throw new ApiError(404, "Despesa não encontrada");
    return Response.json(despesa);
  });
}

// PATCH porque a tela edita campo a campo — inclusive só o "marcar como paga".
export async function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const dados = await body(request);
    return Response.json(
      await atualizarDespesa(id, {
        ...(dados.descricao === undefined ? {} : { descricao: text(dados.descricao, "descricao", 300) }),
        ...(dados.categoria === undefined ? {} : { categoria: categoria(dados.categoria) }),
        ...(dados.valor === undefined ? {} : { valor: money(dados.valor, "valor").toNumber() }),
        ...(dados.vencimento === undefined ? {} : { vencimento: date(dados.vencimento, "vencimento") }),
        ...(dados.recorrencia === undefined ? {} : { recorrencia: recorrencia(dados.recorrencia) }),
        ...(dados.fornecedor === undefined
          ? {}
          : { fornecedor: dados.fornecedor === null ? null : text(dados.fornecedor, "fornecedor") }),
        ...(dados.contratoId === undefined
          ? {}
          : { contratoId: dados.contratoId === null ? null : text(dados.contratoId, "contratoId") }),
        ...(dados.reembolsavel === undefined ? {} : { reembolsavel: dados.reembolsavel === true }),
        ...(dados.pagoEm === undefined ? {} : { pagoEm: dados.pagoEm === null ? null : date(dados.pagoEm, "pagoEm") }),
      }),
    );
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    await excluirDespesa(id);
    return new Response(null, { status: 204 });
  });
}
