import type { DadosFinanceiros, RespostaFinanceira } from "./schemas";

// Allowlist: nunca envia o texto livre das cláusulas ou nomes do cadastro.
// A máscara de identificadores em perguntas é uma redução de exposição, não
// uma garantia de anonimização de qualquer texto que o usuário possa digitar.
export function prepararConsultaFinanceira(pergunta: string, dados: DadosFinanceiros) {
  const substituicoes = new Map<string, string>();
  const clientes = new Map<string, string>();
  const contratos = dados.contratos.map((c, indice) => {
    const cliente = clientes.get(c.clienteId) ?? `Cliente_${clientes.size + 1}`;
    clientes.set(c.clienteId, cliente);
    substituicoes.set(c.id, `Contrato_${indice + 1}`);
    substituicoes.set(c.clienteId, cliente);
    substituicoes.set(c.cliente, cliente);
    return {
      createdAt: c.createdAt,
      id: `Contrato_${indice + 1}`, clienteId: cliente, cliente,
      tipoPagamento: c.tipoPagamento, valorTotal: c.valorTotal,
      clausulaOriginal: "Texto não compartilhado nesta consulta.",
      opiniao: c.opiniao,
      parcelas: c.parcelas.map((p, i) => ({ ...p, id: `Parcela_${indice + 1}_${i + 1}` })),
    };
  });
  // Uma única substituição impede que IDs curtos alterem os aliases recém-criados.
  const entradas = [...substituicoes].filter(([chave]) => chave.length > 0).sort((a, b) => b[0].length - a[0].length);
  const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const expressao = entradas.length ? new RegExp(`(?<![\\p{L}\\p{N}_])(?:${entradas.map(([chave]) => escapar(chave)).join("|")})(?![\\p{L}\\p{N}_])`, "giu") : null;
  let perguntaProtegida = expressao ? pergunta.replace(expressao, match => entradas.find(([chave]) => chave.toLowerCase() === match.toLowerCase())![1]) : pergunta;
  perguntaProtegida = perguntaProtegida
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[email omitido]")
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[documento omitido]")
    .replace(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, "[documento omitido]");
  const protegidos: DadosFinanceiros = { dataReferencia: dados.dataReferencia, resumo: { ...dados.resumo }, contratos };
  const idsOriginais = new Map(contratos.map((c, i) => [c.id, dados.contratos[i].id]));
  const nomesOriginais = new Map(contratos.map((c, i) => [c.cliente, dados.contratos[i].cliente]));
  function restaurarResposta(resposta: RespostaFinanceira): RespostaFinanceira {
    const restaurarTexto = (texto: string) => texto.replace(/\b(?:Contrato|Cliente)_\d+\b/g, alias => idsOriginais.get(alias) ?? nomesOriginais.get(alias) ?? alias);
    return {
      ...resposta,
      resposta: restaurarTexto(resposta.resposta),
      aviso: resposta.aviso && restaurarTexto(resposta.aviso),
      contratosCitados: resposta.contratosCitados.map(id => idsOriginais.get(id) ?? id),
      citacoes: resposta.citacoes.map(c => ({ ...c, contratoId: c.contratoId === null ? null : idsOriginais.get(c.contratoId) ?? c.contratoId })),
    };
  }
  return { pergunta: perguntaProtegida, dados: protegidos, restaurarResposta };
}
