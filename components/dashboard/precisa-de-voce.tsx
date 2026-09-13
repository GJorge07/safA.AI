import Link from "next/link";
import { CheckCircle2, ChevronRight, Clock, HandCoins, Receipt } from "lucide-react";
import type { AcaoPendente, TipoAcao } from "@/lib/db/inicio";

const icone: Record<TipoAcao, typeof Clock> = {
  parcela: Clock,
  servico: Receipt,
  reembolso: HandCoins,
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function tempoParado(dias: number) {
  if (dias === 0) return "hoje";
  if (dias === 1) return "há 1 dia";
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "há 1 mês" : `há ${meses} meses`;
}

// A única lista do Início. Não navega a carteira — mostra o dinheiro parado,
// do mais antigo para o mais recente, com um caminho direto para resolver.
export function PrecisaDeVoce({ acoes }: { acoes: AcaoPendente[] }) {
  if (acoes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-accent/60 p-8 text-center">
        <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
        <p className="text-sm font-medium">Nada parado</p>
        <p className="text-xs text-muted-foreground">
          Nenhuma parcela vencida, serviço a receber ou reembolso pendente.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl bg-accent/60 p-5">
      {/* Sem total no cabeçalho: seria a soma só do que está listado, e ficaria
          colado no card "Em atraso agora", que traz o valor cheio. */}
      <h2 className="text-sm font-semibold">Precisa de você</h2>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Parcelas vencidas, serviços não recebidos e o que você adiantou e não cobrou.
      </p>

      <ul className="flex flex-col">
        {acoes.map((acao) => {
          const Icone = icone[acao.tipo];
          return (
            <li key={acao.id} className="border-t border-border/60 first:border-t-0">
              <Link
                href={acao.href}
                className="group flex items-center gap-3 py-2.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icone className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{acao.titulo}</span>
                  <span className="block truncate text-xs text-muted-foreground">{acao.detalhe}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-sm tabular-nums">{moeda(acao.valor)}</span>
                  <span className="block text-xs text-destructive">{tempoParado(acao.dias)}</span>
                </span>
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
