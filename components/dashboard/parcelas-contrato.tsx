"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface ParcelaLinha {
  id: string;
  indice: number;
  valor: number;
  vencimento: string; // ISO date (YYYY-MM-DD)
  vencimentoTexto: string;
  status: "paga" | "atrasada" | "prevista";
  diasAtraso: number;
  valorPago: number | null;
  dataPagoTexto: string | null;
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const rotulo = { paga: "Paga", atrasada: "Atrasada", prevista: "Prevista" } as const;
const variante = { paga: "success", atrasada: "destructive", prevista: "neutral" } as const;

export function ParcelasContrato({ parcelas }: { parcelas: ParcelaLinha[] }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function registrarPagamento(parcela: ParcelaLinha) {
    setSalvando(parcela.id);
    setErro(null);
    try {
      const res = await fetch(`/api/parcelas/${parcela.id}/pagamento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          valorPago: parcela.valor,
          dataPago: new Date().toISOString().slice(0, 10),
        }),
      });
      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        throw new Error(corpo?.error ?? `Falha ao registrar (HTTP ${res.status}).`);
      }
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui registrar o pagamento.");
    } finally {
      setSalvando(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Nº</TableHead>
            <TableHead className="w-32">Vencimento</TableHead>
            <TableHead className="w-32 text-right">Valor</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead className="w-40 text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parcelas.map((parcela) => (
            <TableRow key={parcela.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">{parcela.indice}</TableCell>
              <TableCell className="text-sm">{parcela.vencimentoTexto}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{moeda(parcela.valor)}</TableCell>
              <TableCell>
                <Badge variant={variante[parcela.status]} dot>
                  {rotulo[parcela.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {parcela.valorPago !== null
                  ? `${moeda(parcela.valorPago)} em ${parcela.dataPagoTexto}`
                  : parcela.status === "atrasada"
                    ? `${parcela.diasAtraso} dia(s) de atraso`
                    : "—"}
              </TableCell>
              <TableCell className="text-right">
                {parcela.valorPago === null && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={salvando !== null}
                    onClick={() => registrarPagamento(parcela)}
                  >
                    {salvando === parcela.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Registrar pagamento
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {erro && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {erro}
        </p>
      )}
    </div>
  );
}
