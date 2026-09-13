// Dados mock no MESMO shape que app/api/ vai devolver (Prisma com relações
// incluídas) — só para o dashboard funcionar antes do backend estar de pé.
// TODO(frontend): trocar pelas chamadas reais assim que app/api/contratos,
// /fluxo-caixa e /insights existirem.
import type { ContratoComRelacoes } from "@/components/dashboard/types";
import type { FluxoCaixaMes, Insight } from "./types";

// Documentos e contatos são fictícios — servem só para a tela de cobrança ter
// o que mostrar na demonstração.
const cliente1 = {
  id: "cli1",
  nome: "Construtora Alvorada Ltda.",
  documento: "12.345.678/0001-90",
  email: "financeiro@alvorada.exemplo.br",
  telefone: "(41) 3333-1010",
  createdAt: new Date("2026-01-10"),
};
const cliente2 = {
  id: "cli2",
  nome: "João Pereira",
  documento: "123.456.789-00",
  email: "joao.pereira@exemplo.br",
  telefone: "(41) 99888-2020",
  createdAt: new Date("2026-02-02"),
};
const cliente3 = {
  id: "cli3",
  nome: "Mercado Bom Preço S.A.",
  documento: "98.765.432/0001-10",
  email: "contas@bompreco.exemplo.br",
  telefone: "(41) 3555-3030",
  createdAt: new Date("2026-03-15"),
};

const origemPadrao = { origem: "manual", arquivoNome: null, processo: null } as const;

export const contratosMock: ContratoComRelacoes[] = [
  {
    id: "c1",
    numero: 1,
    titulo: "Assessoria contratual — obra Batel",
    ...origemPadrao,
    clienteId: cliente1.id,
    cliente: cliente1,
    tipoPagamento: "misto",
    valorTotal: 45000,
    clausulaOriginal:
      "Cláusula 4ª — Dos Honorários: as partes ajustam o pagamento em 3 parcelas mensais de R$ 15.000,00, vencíveis todo dia 5, referentes aos honorários fixos, sem prejuízo do êxito de 10% sobre eventual proveito econômico.",
    createdAt: new Date("2026-07-01"),
    parcelas: [
      { id: "p1", contratoId: "c1", valor: 15000, vencimento: new Date("2026-09-05"), baixadaEm: null, motivoBaixa: null, notaBaixa: null, pagamento: { id: "pg1", parcelaId: "p1", valorPago: 15000, dataPago: new Date("2026-09-04") } },
      { id: "p2", contratoId: "c1", valor: 15000, vencimento: new Date("2026-10-05"), baixadaEm: null, motivoBaixa: null, notaBaixa: null, pagamento: null },
      { id: "p3", contratoId: "c1", valor: 15000, vencimento: new Date("2026-11-05"), baixadaEm: null, motivoBaixa: null, notaBaixa: null, pagamento: null },
    ],
  },
  {
    id: "c2",
    numero: 2,
    titulo: "Reclamatória trabalhista",
    ...origemPadrao,
    clienteId: cliente2.id,
    cliente: cliente2,
    tipoPagamento: "exito",
    valorTotal: 18000,
    clausulaOriginal:
      "Cláusula 3ª — Do Êxito: o CONTRATANTE pagará à CONTRATADA 18.000,00 (dezoito mil reais) em parcela única, no prazo de 5 dias úteis contados do trânsito em julgado, sob pena de multa de 2% ao mês.",
    createdAt: new Date("2026-06-20"),
    parcelas: [
      { id: "p4", contratoId: "c2", valor: 18000, vencimento: new Date("2026-09-01"), baixadaEm: null, motivoBaixa: null, notaBaixa: null, pagamento: null },
    ],
  },
  {
    id: "c3",
    numero: 3,
    titulo: "Defesa em ação de consumo",
    ...origemPadrao,
    clienteId: cliente3.id,
    cliente: cliente3,
    tipoPagamento: "fixo",
    valorTotal: 12000,
    clausulaOriginal:
      "Cláusula 2ª — Dos Honorários Fixos: o valor total de R$ 12.000,00 será pago em 4 parcelas iguais de R$ 3.000,00, com vencimento todo dia 15.",
    createdAt: new Date("2026-08-05"),
    parcelas: [
      { id: "p5", contratoId: "c3", valor: 3000, vencimento: new Date("2026-10-15"), baixadaEm: null, motivoBaixa: null, notaBaixa: null, pagamento: null },
    ],
  },
  {
    id: "c4",
    numero: 4,
    titulo: "Parecer societário",
    ...origemPadrao,
    clienteId: cliente1.id,
    cliente: cliente1,
    tipoPagamento: "fixo",
    valorTotal: 9000,
    clausulaOriginal: "Cláusula 2ª — Honorários fixos de R$ 9.000,00, pagos em parcela única na assinatura.",
    createdAt: new Date("2026-05-12"),
    parcelas: [
      { id: "p6", contratoId: "c4", valor: 9000, vencimento: new Date("2026-05-20"), baixadaEm: null, motivoBaixa: null, notaBaixa: null, pagamento: { id: "pg2", parcelaId: "p6", valorPago: 9000, dataPago: new Date("2026-05-19") } },
    ],
  },
];

export const fluxoCaixaMock: FluxoCaixaMes[] = [
  { mes: "2026-06", previsto: 14000, recebido: 14000 },
  { mes: "2026-07", previsto: 16500, recebido: 15000 },
  { mes: "2026-08", previsto: 19000, recebido: 12000 },
  { mes: "2026-09", previsto: 21000, recebido: 8000 },
  { mes: "2026-10", previsto: 23500, recebido: 0 },
  { mes: "2026-11", previsto: 17000, recebido: 0 },
];

export const insightsMock: Insight[] = [
  {
    tipo: "atraso",
    descricao: "Parcela de João Pereira venceu em 01/09 e ainda não foi registrada como paga.",
    contratoId: "c2",
  },
  {
    tipo: "concentracao_cliente",
    descricao:
      "54% da receita prevista dos próximos 3 meses vem de um único cliente (Construtora Alvorada).",
    contratoId: "c1",
  },
  {
    tipo: "margem_baixa",
    descricao:
      "Contrato de êxito com João Pereira tem valor por hora estimado abaixo da média dos seus outros contratos.",
    contratoId: "c2",
  },
];
