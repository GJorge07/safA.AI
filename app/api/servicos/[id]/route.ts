import { ApiError, body, Context, date, handle, money, text } from "@/lib/api/http";
import { atualizarServico, excluirServico, obterServico } from "@/lib/db/servicos";
import { categoriaServico } from "../route";

export async function GET(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const servico = await obterServico(id);
    if (!servico) throw new ApiError(404, "Serviço não encontrado");
    return Response.json(servico);
  });
}

// O PATCH mais usado é de um campo só: "recebi".
export async function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const dados = await body(request);
    return Response.json(
      await atualizarServico(id, {
        ...(dados.descricao === undefined ? {} : { descricao: text(dados.descricao, "descricao", 300) }),
        ...(dados.categoria === undefined ? {} : { categoria: categoriaServico(dados.categoria) }),
        ...(dados.valor === undefined ? {} : { valor: money(dados.valor, "valor").toNumber() }),
        ...(dados.realizadoEm === undefined ? {} : { realizadoEm: date(dados.realizadoEm, "realizadoEm") }),
        ...(dados.vencimento === undefined ? {} : { vencimento: date(dados.vencimento, "vencimento") }),
        ...(dados.recebidoEm === undefined
          ? {}
          : { recebidoEm: dados.recebidoEm === null ? null : date(dados.recebidoEm, "recebidoEm") }),
        ...(dados.clienteId === undefined
          ? {}
          : { clienteId: dados.clienteId === null ? null : text(dados.clienteId, "clienteId") }),
        ...(dados.contratoId === undefined
          ? {}
          : { contratoId: dados.contratoId === null ? null : text(dados.contratoId, "contratoId") }),
      }),
    );
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    await excluirServico(id);
    return new Response(null, { status: 204 });
  });
}
