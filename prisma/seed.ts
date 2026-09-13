// Popula o banco com o conjunto de demonstração que já existia em
// lib/mock-data.ts. Os ids são fixos e tudo é upsert, então rodar de novo
// atualiza os mesmos registros em vez de duplicar.
import { PrismaClient } from "../app/generated/prisma/client";
import { contratosMock } from "../lib/mock-data";

const prisma = new PrismaClient();

const paraEnumDb = { fixo: "FIXO", exito: "EXITO", misto: "MISTO" } as const;

async function main() {
  const clientes = new Map(contratosMock.map((contrato) => [contrato.clienteId, contrato.cliente]));

  for (const cliente of clientes.values()) {
    await prisma.cliente.upsert({
      where: { id: cliente.id },
      update: { nome: cliente.nome },
      create: { id: cliente.id, nome: cliente.nome, createdAt: cliente.createdAt },
    });
  }

  for (const contrato of contratosMock) {
    const dados = {
      clienteId: contrato.clienteId,
      tipoPagamento: paraEnumDb[contrato.tipoPagamento],
      valorTotal: contrato.valorTotal,
      clausulaOriginal: contrato.clausulaOriginal,
    };
    await prisma.contrato.upsert({
      where: { id: contrato.id },
      update: dados,
      create: { id: contrato.id, ...dados, createdAt: contrato.createdAt },
    });

    for (const parcela of contrato.parcelas) {
      await prisma.parcela.upsert({
        where: { id: parcela.id },
        update: { valor: parcela.valor, vencimento: parcela.vencimento },
        create: {
          id: parcela.id,
          contratoId: contrato.id,
          valor: parcela.valor,
          vencimento: parcela.vencimento,
        },
      });

      if (!parcela.pagamento) continue;
      await prisma.pagamento.upsert({
        where: { id: parcela.pagamento.id },
        update: { valorPago: parcela.pagamento.valorPago, dataPago: parcela.pagamento.dataPago },
        create: {
          id: parcela.pagamento.id,
          parcelaId: parcela.id,
          valorPago: parcela.pagamento.valorPago,
          dataPago: parcela.pagamento.dataPago,
        },
      });
    }
  }

  const [totalClientes, totalContratos, totalParcelas, totalPagamentos] = await Promise.all([
    prisma.cliente.count(),
    prisma.contrato.count(),
    prisma.parcela.count(),
    prisma.pagamento.count(),
  ]);
  console.log(
    `Seed concluído: ${totalClientes} clientes, ${totalContratos} contratos, ${totalParcelas} parcelas, ${totalPagamentos} pagamentos.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
