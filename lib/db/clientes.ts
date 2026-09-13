// Destino do card "Clientes ativos" do Início. Existe para que o número do
// card tenha onde aterrissar: clicar nele mostra exatamente quem são.
import { prisma } from "@/lib/prisma";

export interface ClienteAtivo {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  contratos: number;
  /** Parcelas ainda sem pagamento. */
  emAberto: number;
  /** A fatia de emAberto que já venceu. */
  emAtraso: number;
  /** YYYY-MM-DD da próxima parcela a vencer, ou null se só há atraso. */
  proximoVencimento: string | null;
}

function centavos(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Mesma definição de "ativo" usada por `resumoDoInicio`: tem ao menos uma
 * parcela em aberto. As duas precisam concordar — se divergirem, o card diz
 * "5 clientes" e esta lista mostra outro número.
 */
export async function listarClientesAtivos(hoje = new Date()): Promise<ClienteAtivo[]> {
  const clientes = await prisma.cliente.findMany({
    where: { contratos: { some: { parcelas: { some: { pagamento: { is: null }, baixadaEm: null } } } } },
    select: {
      id: true,
      nome: true,
      email: true,
      telefone: true,
      contratos: {
        select: {
          id: true,
          parcelas: {
            where: { pagamento: { is: null }, baixadaEm: null },
            select: { valor: true, vencimento: true },
          },
        },
      },
    },
  });

  return clientes
    .map((cliente) => {
      const parcelas = cliente.contratos.flatMap((contrato) => contrato.parcelas);
      const futuras = parcelas
        .filter((parcela) => parcela.vencimento >= hoje)
        .sort((a, b) => a.vencimento.getTime() - b.vencimento.getTime());

      return {
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        contratos: cliente.contratos.length,
        emAberto: centavos(parcelas.reduce((total, p) => total + p.valor.toNumber(), 0)),
        emAtraso: centavos(
          parcelas
            .filter((parcela) => parcela.vencimento < hoje)
            .reduce((total, p) => total + p.valor.toNumber(), 0),
        ),
        proximoVencimento: futuras[0]?.vencimento.toISOString().slice(0, 10) ?? null,
      };
    })
    // Quem deve e está vencido primeiro: é a ordem em que o advogado age.
    .sort((a, b) => b.emAtraso - a.emAtraso || b.emAberto - a.emAberto);
}
