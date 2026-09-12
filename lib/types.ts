// Contrato de tipos compartilhado entre banco, backend, IA e frontend.
// Qualquer mudança aqui afeta as outras 3 camadas — avisar o grupo antes de editar.

export type TipoPagamento = "fixo" | "exito" | "misto";

export interface ContratoExtraido {
  cliente: string;
  tipoPagamento: TipoPagamento;
  valorTotal: number;
  parcelas: {
    valor: number;
    vencimento: string; // ISO date
  }[];
  clausulaOriginal: string; // trecho literal do contrato, para checagem do advogado
}

export interface FluxoCaixaMes {
  mes: string; // "2026-10"
  previsto: number;
  recebido: number;
}

export interface Insight {
  tipo: "atraso" | "margem_baixa" | "concentracao_cliente";
  descricao: string;
  contratoId: string;
}
