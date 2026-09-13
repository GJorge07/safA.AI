import { AlertTriangle, HandCoins } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { MargemDoCaso } from "@/lib/db/despesas";

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// A conta que o advogado iniciante não faz: o honorário contratado não é o que
// sobra. Cada ida ao fórum, cada guia, sai daqui.
export function MargemCaso({ margem }: { margem: MargemDoCaso }) {
  const semDespesas = margem.despesasTotal === 0;
  const alerta = margem.percentualConsumido >= 20;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">Quanto sobra deste caso</p>
        <span
          className={cn(
            "font-mono text-lg font-semibold tabular-nums",
            margem.margem < 0 ? "text-destructive" : "text-foreground",
          )}
        >
          {moeda(margem.margem)}
        </span>
      </div>

      {semDespesas ? (
        <p className="text-xs text-muted-foreground">
          Nenhum gasto lançado ainda. Lance transporte, custas e cópias deste processo para ver a margem real.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1 text-xs">
            <Linha rotulo="Honorários contratados" valor={moeda(margem.honorarios)} />
            {/* Serviço extra prestado dentro do caso também é receita dele. */}
            {margem.servicos > 0 && (
              <Linha rotulo="Serviços extras neste caso" valor={`+ ${moeda(margem.servicos)}`} positivo />
            )}
            <Linha rotulo="Gastos por sua conta" valor={`− ${moeda(margem.porContaDoAdvogado)}`} negativo />
            {margem.aReembolsar > 0 && (
              <Linha rotulo="Adiantado, a reembolsar" valor={moeda(margem.aReembolsar)} aviso />
            )}
          </div>

          <div>
            <Progress value={Math.min(100, margem.percentualConsumido)} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Os gastos que saem do seu bolso já consomem{" "}
              <strong className={alerta ? "text-warning" : undefined}>{margem.percentualConsumido}%</strong> do
              honorário deste caso.
            </p>
          </div>

          {alerta && (
            <p className="flex items-start gap-2 rounded-md bg-warning-bg px-3 py-2 text-xs text-warning">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                Proporção alta para um caso só. Vale conferir se o contrato prevê o reembolso desses gastos.
              </span>
            </p>
          )}

          {margem.aReembolsar > 0 && (
            <p className="flex items-start gap-2 rounded-md bg-muted px-3 py-2 text-xs">
              <HandCoins className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden="true" />
              <span>
                Você adiantou <strong>{moeda(margem.aReembolsar)}</strong> que, pelo contrato, é do cliente e
                ainda não foi cobrado.
              </span>
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Linha({
  rotulo,
  valor,
  negativo,
  positivo,
  aviso,
}: {
  rotulo: string;
  valor: string;
  negativo?: boolean;
  positivo?: boolean;
  aviso?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-muted-foreground">{rotulo}</span>
      <span
        className={cn(
          "font-mono tabular-nums",
          negativo && "text-destructive",
          positivo && "text-success",
          aviso && "text-warning",
        )}
      >
        {valor}
      </span>
    </div>
  );
}
