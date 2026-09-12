import { ArrowDown, ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  proximoVencimento,
  statusDoContrato,
  totalRecebidoNoMes,
  type ContratoComRelacoes,
  type StatusContrato,
} from "./types";

const statusLabel: Record<StatusContrato, string> = {
  em_dia: "Em dia",
  atrasado: "Atrasado",
  quitado: "Quitado",
};

const statusVariant: Record<StatusContrato, "success" | "destructive" | "neutral"> = {
  em_dia: "success",
  atrasado: "destructive",
  quitado: "neutral",
};

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ContratoCard({ contrato }: { contrato: ContratoComRelacoes }) {
  const status = statusDoContrato(contrato);
  const vencimento = proximoVencimento(contrato);

  const hoje = new Date();
  const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const recebidoEsteMes = totalRecebidoNoMes([contrato], hoje.getFullYear(), hoje.getMonth());
  const recebidoMesAnterior = totalRecebidoNoMes([contrato], mesAnterior.getFullYear(), mesAnterior.getMonth());

  // Só compara se há uma base real no mês anterior — contrato novo não
  // ganha uma variação de "0%" inventada.
  const temComparacao = recebidoMesAnterior > 0;
  const variacaoPct = temComparacao
    ? Math.round(((recebidoEsteMes - recebidoMesAnterior) / recebidoMesAnterior) * 100)
    : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{contrato.cliente.nome}</p>
          <Badge variant="neutral" className="mt-1 capitalize">
            {contrato.tipoPagamento}
          </Badge>
        </div>
        <Badge variant={statusVariant[status]} dot className="shrink-0">
          {statusLabel[status]}
        </Badge>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-xl font-semibold tabular-nums">{formatMoeda(contrato.valorTotal)}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {vencimento ? `vence ${vencimento.toLocaleDateString("pt-BR")}` : "sem parcelas em aberto"}
        </span>
      </div>

      {temComparacao && variacaoPct !== null && (
        <div
          className={`flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1.5 text-xs font-medium ${
            variacaoPct >= 0 ? "text-success" : "text-destructive"
          }`}
        >
          {variacaoPct >= 0 ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span className="font-mono tabular-nums">{formatMoeda(recebidoEsteMes)}</span>
          <span className="text-muted-foreground">
            recebidos — {variacaoPct >= 0 ? "↑" : "↓"} {Math.abs(variacaoPct)}% vs. mês passado
          </span>
        </div>
      )}
    </div>
  );
}
