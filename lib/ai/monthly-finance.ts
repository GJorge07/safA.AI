import type { DadosFinanceiros, RespostaFinanceira } from "./schemas";

const meses = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
} as const;

const moeda = (valor: number) => valor.toLocaleString("pt-BR", {
  style: "currency", currency: "BRL",
});

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function identificarConsultaMensal(pergunta: string, dataReferencia: string) {
  const texto = normalizar(pergunta);
  const entrada = Object.entries(meses).find(([nome]) => new RegExp(`\\b${nome}\\b`).test(texto));
  const formato = texto.match(/\b(0?[1-9]|1[0-2])[/-](20\d{2})\b/);
  const relativo = texto.match(/\b(?:este|nesse|no) mes\b|\bmes atual\b/) ? 0
    : texto.match(/\b(?:proximo|seguinte) mes\b/) ? 1 : null;
  if (!entrada && !formato && relativo === null) return null;
  if (!/receb|ganh|entr|fatur|previst|esper|pag|vence|venc|quanto|fluxo/.test(texto)) return null;

  const referencia = new Date(`${dataReferencia}T12:00:00Z`);
  let mes: number;
  let ano: number;
  if (formato) {
    mes = Number(formato[1]);
    ano = Number(formato[2]);
  } else if (relativo !== null) {
    const alvo = new Date(Date.UTC(referencia.getUTCFullYear(), referencia.getUTCMonth() + relativo, 1));
    mes = alvo.getUTCMonth() + 1;
    ano = alvo.getUTCFullYear();
  } else {
    mes = entrada![1];
    const explicito = texto.match(/\b(20\d{2})\b/);
    ano = explicito ? Number(explicito[1]) : referencia.getUTCFullYear();
  }
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export function responderConsultaMensal(pergunta: string, dados: DadosFinanceiros, contratoReferencia?: string): RespostaFinanceira | null {
  const alvo = identificarConsultaMensal(pergunta, dados.dataReferencia);
  if (!alvo) return null;
  const contratos = contratoReferencia
    ? dados.contratos.filter(contrato => contrato.id === contratoReferencia)
    : dados.contratos;
  const itens = contratos.flatMap(contrato => contrato.parcelas
    .filter(parcela => parcela.vencimento.startsWith(alvo))
    .map(parcela => ({ contrato, parcela })));
  const previsto = itens.reduce((soma, item) => soma + item.parcela.valor, 0);
  const pendente = itens.reduce((soma, item) => soma + (item.parcela.saldo ?? (item.parcela.status === "paga" ? 0 : item.parcela.valor)), 0);
  const recebido = previsto - pendente;
  const [ano, mes] = alvo.split("-");
  const rotulo = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${alvo}-01T12:00:00Z`));
  if (!itens.length) return {
    resposta: `Não há parcelas com vencimento em ${rotulo}.`,
    contratosCitados: [], citacoes: [],
    aviso: `Consulta calculada localmente para ${mes}/${ano}; não há valores cadastrados nesse mês.`,
  };
  const ids = [...new Set(itens.map(item => item.contrato.id))];
  return {
    resposta: `Em ${rotulo}, há ${moeda(previsto)} previstos. Desse total, ${moeda(recebido)} já foi recebido e ${moeda(pendente)} continua pendente.`,
    contratosCitados: ids,
    citacoes: itens.map(({ contrato, parcela }) => ({
      contratoId: contrato.id,
      campos: [`parcelas.${contrato.parcelas.indexOf(parcela)}.valor`, `parcelas.${contrato.parcelas.indexOf(parcela)}.saldo`],
    })),
    aviso: `Resposta calculada diretamente dos vencimentos e pagamentos cadastrados${contratoReferencia ? " para o contrato selecionado" : ""}, sem geração por IA.`,
  };
}
