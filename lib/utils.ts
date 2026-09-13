import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "2026-09" vira "set/26" — o eixo do gráfico não precisa do ano inteiro. */
export function rotuloMes(mes: string): string {
  const [ano, numero] = mes.split("-");
  return `${MESES_CURTOS[Number(numero) - 1] ?? numero}/${ano.slice(2)}`;
}

/**
 * Recorta uma série mensal contígua em torno do mês corrente, com a mesma
 * regra do servidor (`floor(meses / 2)` para trás). Assim "6 meses" na tela
 * significa exatamente a mesma janela que `carregarFluxoComDespesas(…, 6)`
 * traria do banco.
 */
export function janelaCentrada<T extends { mes: string }>(serie: T[], meses: number, mesAtual: string): T[] {
  if (serie.length <= meses) return serie;
  const indiceAtual = serie.findIndex((ponto) => ponto.mes === mesAtual);
  const centro = indiceAtual === -1 ? Math.floor(serie.length / 2) : indiceAtual;
  const inicio = Math.max(0, Math.min(centro - Math.floor(meses / 2), serie.length - meses));
  return serie.slice(inicio, inicio + meses);
}
