"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { statusDoContrato, type ContratoComRelacoes } from "./types";

interface ContratoDetalhesModalProps {
  contrato: ContratoComRelacoes | null;
  onFechar: () => void;
}

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const statusContratoLabel = { em_dia: "Em dia", atrasado: "Atrasado", quitado: "Quitado" } as const;
const statusContratoVariant = { em_dia: "success", atrasado: "destructive", quitado: "neutral" } as const;

function statusParcela(parcela: ContratoComRelacoes["parcelas"][number]) {
  if (parcela.pagamento) return { label: "Paga", variant: "success" as const };
  if (parcela.vencimento < new Date()) return { label: "Atrasada", variant: "destructive" as const };
  return { label: "Pendente", variant: "neutral" as const };
}

export function ContratoDetalhesModal({ contrato, onFechar }: ContratoDetalhesModalProps) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    if (contrato) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [contrato, onFechar]);

  if (!contrato) return null;

  const status = statusDoContrato(contrato);
  const parcelasOrdenadas = [...contrato.parcelas].sort(
    (a, b) => a.vencimento.getTime() - b.vencimento.getTime(),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes do contrato de ${contrato.cliente.nome}`}
      onClick={onFechar}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border p-5">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{contrato.cliente.nome}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="neutral" className="capitalize">
                {contrato.tipoPagamento}
              </Badge>
              <Badge variant={statusContratoVariant[status]} dot>
                {statusContratoLabel[status]}
              </Badge>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Valor total</p>
              <p className="font-mono text-lg font-semibold tabular-nums">{formatMoeda(contrato.valorTotal)}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Parcelas</p>
              <p className="font-mono text-lg font-semibold tabular-nums">{contrato.parcelas.length}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Criado em</p>
              <p className="text-lg font-semibold">{contrato.createdAt.toLocaleDateString("pt-BR")}</p>
            </div>
          </div>

          {contrato.clausulaOriginal && (
            <div className="mb-5">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cláusula original
              </p>
              <p className="rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground">
                {contrato.clausulaOriginal}
              </p>
            </div>
          )}

          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Parcelas ({parcelasOrdenadas.length})
          </p>
          {parcelasOrdenadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Este contrato não tem parcelas cadastradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pago em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parcelasOrdenadas.map((p, i) => {
                  const { label, variant } = statusParcela(p);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>{p.vencimento.toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="font-mono tabular-nums">{formatMoeda(p.valor)}</TableCell>
                      <TableCell>
                        <Badge variant={variant} dot>
                          {label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.pagamento ? p.pagamento.dataPago.toLocaleDateString("pt-BR") : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
