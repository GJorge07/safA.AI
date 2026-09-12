// Histórico de conversas do agente — só localStorage por enquanto (MVP),
// sem persistir em banco. Ver CLAUDE.md: escopo de hackathon.
export interface MensagemConversa {
  autor: "usuario" | "assistente";
  texto: string;
}

export interface Conversa {
  id: string;
  titulo: string;
  criadoEm: string; // ISO
  mensagens: MensagemConversa[];
}

const CHAVE = "safa:conversas";
const MAX_CONVERSAS = 20;

export function listarConversas(): Conversa[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CHAVE);
    if (!raw) return [];
    const lista = JSON.parse(raw) as Conversa[];
    return lista.sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1));
  } catch {
    return [];
  }
}

export function obterConversa(id: string): Conversa | undefined {
  return listarConversas().find((c) => c.id === id);
}

export function salvarConversa(conversa: Conversa): void {
  if (typeof window === "undefined") return;
  try {
    const lista = listarConversas().filter((c) => c.id !== conversa.id);
    lista.unshift(conversa);
    window.localStorage.setItem(CHAVE, JSON.stringify(lista.slice(0, MAX_CONVERSAS)));
  } catch {
    // localStorage indisponível (modo privado, quota etc.) — ignora.
  }
}

export function gerarTitulo(pergunta: string): string {
  const limpo = pergunta.trim();
  return limpo.length > 48 ? `${limpo.slice(0, 48)}…` : limpo;
}
