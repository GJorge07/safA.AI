import { prisma } from "@/lib/prisma";
import { ApiError, body, Context, handle, text } from "@/lib/api/http";
import type { MotivoBaixa } from "@/lib/types";

const MOTIVOS: MotivoBaixa[] = ["sem_exito", "acordo_menor", "desistencia", "outro"];

const paraDb = {
  sem_exito: "SEM_EXITO",
  acordo_menor: "ACORDO_MENOR",
  desistencia: "DESISTENCIA",
  outro: "OUTRO",
} as const;

// Dar baixa = declarar que aquele valor não é mais devido. É o caso do
// honorário de êxito que não se confirmou, e nenhum sistema adivinha isso:
// depende do desfecho da causa, que só o advogado conhece.
//
// Não confundir com inadimplência: ali o honorário continua devido e a parcela
// segue em atraso e em cobrança. Por isso o motivo é obrigatório.
export async function POST(request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    const dados = await body(request);

    const motivo = text(dados.motivo, "motivo").toLowerCase() as MotivoBaixa;
    if (!MOTIVOS.includes(motivo)) {
      throw new ApiError(400, `motivo deve ser um de: ${MOTIVOS.join(", ")}`);
    }

    const parcela = await prisma.parcela.findUnique({
      where: { id },
      select: { pagamento: { select: { id: true } } },
    });
    if (!parcela) throw new ApiError(404, "Parcela não encontrada");
    // Baixar algo já recebido tornaria o total recebido inconsistente.
    if (parcela.pagamento) {
      throw new ApiError(409, "Esta parcela já foi recebida; remova o pagamento antes de dar baixa");
    }

    return Response.json(
      await prisma.parcela.update({
        where: { id },
        data: {
          baixadaEm: new Date(),
          motivoBaixa: paraDb[motivo],
          notaBaixa:
            dados.nota === undefined || dados.nota === null ? null : text(dados.nota, "nota", 2000),
        },
      }),
    );
  });
}

// Desfazer a baixa: o advogado se enganou, ou o desfecho mudou (recurso provido,
// acordo retomado). A parcela volta a ser devida.
export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const { id } = await params;
    return Response.json(
      await prisma.parcela.update({
        where: { id },
        data: { baixadaEm: null, motivoBaixa: null, notaBaixa: null },
      }),
    );
  });
}
