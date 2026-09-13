// Contrato de tipos compartilhado entre banco, backend, IA e frontend.
// Qualquer mudança aqui afeta as outras 3 camadas — avisar o grupo antes de editar.

export type TipoPagamento = "fixo" | "exito" | "misto";

// Por que uma parcela deixou de ser devida. Só entram desfechos que extinguem
// a dívida — inadimplência não é baixa, é atraso, e continua em cobrança.
export type MotivoBaixa = "sem_exito" | "acordo_menor" | "desistencia" | "outro";

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

// O que o advogado cobra fora do contrato: consulta, parecer, audiência
// avulsa. Cobrança única, sem parcela nem cláusula.
export type CategoriaServico =
  | "consulta"
  | "parecer"
  | "peticao"
  | "audiencia"
  | "elaboracao_contrato"
  | "outros_servico";

// O que sai do caixa. Espelha o modelo Despesa do schema, com os enums em
// minúsculas como TipoPagamento já faz.
//
// A divisão é entre gasto DO PROCESSO (ida ao fórum, custas, diligência) — o
// que come a margem de um caso — e gasto DO ESCRITÓRIO, que é custo fixo e
// não pertence a caso nenhum.
export type TipoDespesa = "processo" | "escritorio";

export type CategoriaDespesaProcesso =
  | "deslocamento"
  | "custas"
  | "diligencia"
  | "cartorio"
  | "pericia"
  | "correspondente"
  | "outros_processo";

export type CategoriaDespesaEscritorio =
  | "estrutura"
  | "software"
  | "tributos"
  | "pessoal"
  | "outros_escritorio";

export type CategoriaDespesa = CategoriaDespesaProcesso | CategoriaDespesaEscritorio;

/** Quem o contrato prevê que arca com o gasto. */
export type QuemPaga = "cliente" | "advogado";

export type OrigemRegistro = "manual" | "upload" | "drive";

export interface DespesaExtraida {
  descricao: string;
  tipo: TipoDespesa;
  categoria: CategoriaDespesa;
  valor: number;
  vencimento: string; // ISO date
  fornecedor: string | null;
  textoOriginal: string; // trecho literal do recibo/NF, para checagem do advogado
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
