export interface ReferenciaContrato {
  id: string;
  cliente: string;
  createdAt?: string;
}
export const normalizarReferencia = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const recente = /\b(?:ultimo|ultima|mais recente|recem cadastrad[oa]|recem importad[oa])\b/;
function menciona(texto: string, valor: string) {
  if (!valor.trim()) return false;
  const escapado = normalizarReferencia(valor).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escapado}($|[^\\p{L}\\p{N}_])`, "u").test(texto);
}

export function resolverContratos<T extends ReferenciaContrato>(pergunta: string, contratos: T[], contratoId?: string): { selecionados: T[]; criterio?: string; aviso?: string; usaData?: boolean } {
  const texto = normalizarReferencia(pergunta);
  const mencionados = contratos.filter(c => menciona(texto, c.id) || menciona(texto, c.cliente));
  if (recente.test(texto)) {
    if (!mencionados.length && /\b(?:do|da|de)\s+(?!meu\b|minha\b|cadastro\b|carteira\b)[\p{L}]/u.test(texto)) {
      return { selecionados: [], aviso: "Não identifiquei o cliente mencionado. Informe o nome completo ou selecione o contrato." };
    }
    const candidatos = mencionados.length ? mencionados : contratos;
    if (!candidatos.length) return { selecionados: [], aviso: "Não há contratos cadastrados para avaliar." };
    if (candidatos.some(c => !c.createdAt || !Number.isFinite(Date.parse(c.createdAt)))) {
      return { selecionados: [], aviso: "Faltam datas de cadastro para identificar o último caso com segurança. Selecione o contrato." };
    }
    const ordenados = [...candidatos].sort((a, b) => Date.parse(b.createdAt!) - Date.parse(a.createdAt!));
    if (ordenados[1] && Date.parse(ordenados[0].createdAt!) === Date.parse(ordenados[1].createdAt!)) {
      return { selecionados: [], aviso: "Há contratos com a mesma data e hora de cadastro. Selecione qual deles deseja avaliar." };
    }
    return { selecionados: [ordenados[0]], usaData: true, criterio: "Considerei o contrato cadastrado mais recentemente." };
  }
  if (contratoId) return { selecionados: contratos.filter(c => c.id === contratoId) };
  if (mencionados.length) return { selecionados: mencionados };
  if (/\b(todos|carteira)\b|\b(quais|meus) contratos\b/.test(texto)) return { selecionados: contratos };
  return { selecionados: [], aviso: "Qual contrato você quer avaliar? Selecione o contrato ou informe o nome completo do cliente." };
}
