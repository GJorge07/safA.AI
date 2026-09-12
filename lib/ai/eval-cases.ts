import type { ExtracaoContrato } from "./schemas";

export interface ExtractionEvalCase {
  id: string;
  description: string;
  contractText: string;
  expected: Pick<
    ExtracaoContrato,
    "cliente" | "tipoPagamento" | "valorTotal" | "honorariosExito" | "parcelas"
  >;
}

export const extractionEvalCases: ExtractionEvalCase[] = [
  {
    id: "fixo-a-vista",
    description: "Honorários fixos pagos à vista",
    contractText: `CONTRATANTE: Ana Lima. CLÁUSULA 4ª — Pelos serviços, a contratante pagará honorários fixos de R$ 2.500,00, em parcela única, com vencimento em 20/09/2026.`,
    expected: {
      cliente: "Ana Lima",
      tipoPagamento: "fixo",
      valorTotal: 2500,
      honorariosExito: null,
      parcelas: [{ valor: 2500, vencimento: "2026-09-20", evidencia: "" }],
    },
  },
  {
    id: "fixo-parcelado",
    description: "Honorários fixos com datas explícitas",
    contractText: `CONTRATANTE: Bruno Alves. CLÁUSULA 5ª — Honorários de R$ 3.000,00, pagos em três parcelas de R$ 1.000,00, vencíveis em 10/10/2026, 10/11/2026 e 10/12/2026.`,
    expected: {
      cliente: "Bruno Alves",
      tipoPagamento: "fixo",
      valorTotal: 3000,
      honorariosExito: null,
      parcelas: [
        { valor: 1000, vencimento: "2026-10-10", evidencia: "" },
        { valor: 1000, vencimento: "2026-11-10", evidencia: "" },
        { valor: 1000, vencimento: "2026-12-10", evidencia: "" },
      ],
    },
  },
  {
    id: "exito-liquido",
    description: "Êxito sem valor monetário conhecido",
    contractText: `CONTRATANTE: Carla Mendes. CLÁUSULA 6ª — Em caso de êxito, serão devidos honorários de 20% sobre o valor líquido efetivamente recebido pela contratante.`,
    expected: {
      cliente: "Carla Mendes",
      tipoPagamento: "exito",
      valorTotal: null,
      honorariosExito: {
        percentual: 20,
        baseCalculo: "valor líquido efetivamente recebido pela contratante",
      },
      parcelas: [],
    },
  },
  {
    id: "misto",
    description: "Parcela fixa e percentual de êxito",
    contractText: `CONTRATANTE: Daniel Rocha. CLÁUSULA 3ª — O cliente pagará R$ 1.500,00 em 30/09/2026, além de 15% sobre o proveito econômico bruto obtido ao final da ação.`,
    expected: {
      cliente: "Daniel Rocha",
      tipoPagamento: "misto",
      valorTotal: 1500,
      honorariosExito: { percentual: 15, baseCalculo: "proveito econômico bruto" },
      parcelas: [{ valor: 1500, vencimento: "2026-09-30", evidencia: "" }],
    },
  },
  {
    id: "data-ambigua",
    description: "Parcelamento sem primeiro vencimento",
    contractText: `CONTRATANTE: Elisa Nunes. CLÁUSULA 4ª — Honorários de R$ 4.000,00, em quatro parcelas mensais iguais.`,
    expected: {
      cliente: "Elisa Nunes",
      tipoPagamento: "fixo",
      valorTotal: 4000,
      honorariosExito: null,
      parcelas: [
        { valor: 1000, vencimento: null, evidencia: "" },
        { valor: 1000, vencimento: null, evidencia: "" },
        { valor: 1000, vencimento: null, evidencia: "" },
        { valor: 1000, vencimento: null, evidencia: "" },
      ],
    },
  },
  {
    id: "valor-ambíguo",
    description: "Êxito com faixa percentual ambígua",
    contractText: `CONTRATANTE: Fernando Dias. CLÁUSULA 7ª — Os honorários de êxito serão fixados entre 10% e 20%, conforme ajuste posterior entre as partes.`,
    expected: {
      cliente: "Fernando Dias",
      tipoPagamento: "exito",
      valorTotal: null,
      honorariosExito: { percentual: null, baseCalculo: null },
      parcelas: [],
    },
  },
];
