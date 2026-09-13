"use client";

import { useState } from "react";
import { AlertTriangle, Check, Copy, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ParcelaAtrasadaResumo {
  indice: number;
  total: number;
  dias: number;
  saldo: number;
  vencimento: string; // já formatado em pt-BR pelo servidor
}

export interface BlocoCobrancaProps {
  numero: string;
  cliente: { nome: string; documento: string | null; email: string | null; telefone: string | null };
  parcelas: ParcelaAtrasadaResumo[];
  totalAtrasado: number;
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function plural(n: number, singular: string, pluralForma: string) {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}

// Responde "de quem é o atraso e de quanto" sem nenhum clique extra — é a
// pergunta que traz o advogado até esta tela.
export function BlocoCobranca({ numero, cliente, parcelas, totalAtrasado }: BlocoCobrancaProps) {
  const [copiado, setCopiado] = useState(false);
  const pior = parcelas[0];

  async function copiarCobranca() {
    const linhas = parcelas.map(
      (p) =>
        `• Parcela ${p.indice} de ${p.total} — ${moeda(p.saldo)}, vencida em ${p.vencimento} (${plural(p.dias, "dia", "dias")} de atraso)`,
    );
    const texto =
      `Prezado(a) ${cliente.nome},\n\n` +
      `Consta em aberto no contrato ${numero}:\n${linhas.join("\n")}\n\n` +
      `Total em aberto: ${moeda(totalAtrasado)}.\n` +
      `Por gentileza, confirme a data prevista para o pagamento.`;

    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem permissão de área de transferência não há o que fazer aqui; o
      // advogado ainda consegue ler os dados na própria tela.
      setCopiado(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-destructive/40 bg-destructive-bg p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-destructive">
            {pior.dias >= 1 && `${plural(pior.dias, "dia", "dias")} de atraso`}
            {parcelas.length > 1 && ` · ${plural(parcelas.length, "parcela vencida", "parcelas vencidas")}`}
          </p>
          <p className="text-xs text-destructive/90">
            {moeda(totalAtrasado)} em aberto neste contrato
          </p>
        </div>
      </div>

      <ul className="flex flex-col gap-1.5 text-sm">
        {parcelas.map((p) => (
          <li key={p.indice} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-destructive/20 pb-1.5 last:border-0">
            <span className="font-medium">
              Parcela {p.indice} de {p.total}
            </span>
            <span className="font-mono tabular-nums">{moeda(p.saldo)}</span>
            <span className="text-xs text-muted-foreground">
              venceu em {p.vencimento} · {plural(p.dias, "dia", "dias")}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1 border-t border-destructive/20 pt-3 text-sm">
        <p className="font-medium">{cliente.nome}</p>
        {cliente.documento && <p className="text-xs text-muted-foreground">{cliente.documento}</p>}
        <div className="mt-1 flex flex-wrap gap-3 text-xs">
          {cliente.telefone && (
            <a href={`tel:${cliente.telefone.replace(/\D/g, "")}`} className="flex items-center gap-1.5 hover:underline">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {cliente.telefone}
            </a>
          )}
          {cliente.email && (
            <a href={`mailto:${cliente.email}`} className="flex items-center gap-1.5 hover:underline">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              {cliente.email}
            </a>
          )}
        </div>
      </div>

      <Button size="sm" variant="secondary" className="self-start" onClick={copiarCobranca}>
        {copiado ? (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {copiado ? "Copiado" : "Copiar cobrança"}
      </Button>
    </div>
  );
}
