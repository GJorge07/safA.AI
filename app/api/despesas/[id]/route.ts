import { ApiError, body, Context, date, handle, money, text } from "@/lib/api/http";
import { atualizarDespesa, excluirDespesa, obterDespesa } from "@/lib/db/despesas";
import { categoria, conferirParTipoCategoria, quemPaga, recorrencia, tipoDespesa } from "../route";

export async function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const despesa = await obterDespesa(id);
    if (!despesa) throw new ApiError(404, "Despesa não encontrada");
    return Response.json(despesa);
  });
}

// PATCH porque a tela edita campo a campo — inclusive os dois cliques que
// importam sozinhos: "paguei" e "cobrei do cliente".
export async function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const dados = await body(request);

    const tipo = dados.tipo === undefined ? undefined : tipoDespesa(dados.tipo);
    const cat = dados.categoria === undefined ? undefined : categoria(dados.categoria);
    if (tipo !== undefined || cat !== undefined) {
      const atual = await obterDespesa(id);
      if (!atual) throw new ApiError(404, "Despesa não encontrada");
      conferirParTipoCategoria(tipo ?? atual.tipo, cat ?? atual.categoria);
    }

    return Response.json(
      await atualizarDespesa(id, {
        ...(dados.descricao === undefined ? {} : { descricao: text(dados.descricao, "descricao", 300) }),
        ...(tipo === undefined ? {} : { tipo }),
        ...(cat === undefined ? {} : { categoria: cat }),
        ...(dados.valor === undefined ? {} : { valor: money(dados.valor, "valor").toNumber() }),
        ...(dados.vencimento === undefined ? {} : { vencimento: date(dados.vencimento, "vencimento") }),
        ...(dados.recorrencia === undefined ? {} : { recorrencia: recorrencia(dados.recorrencia) }),
        ...(dados.quemPaga === undefined ? {} : { quemPaga: quemPaga(dados.quemPaga) }),
        ...(dados.fornecedor === undefined
          ? {}
          : { fornecedor: dados.fornecedor === null ? null : text(dados.fornecedor, "fornecedor") }),
        ...(dados.contratoId === undefined
          ? {}
          : { contratoId: dados.contratoId === null ? null : text(dados.contratoId, "contratoId") }),
        ...(dados.pagoEm === undefined ? {} : { pagoEm: dados.pagoEm === null ? null : date(dados.pagoEm, "pagoEm") }),
        ...(dados.cobradoEm === undefined
          ? {}
          : { cobradoEm: dados.cobradoEm === null ? null : date(dados.cobradoEm, "cobradoEm") }),
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
