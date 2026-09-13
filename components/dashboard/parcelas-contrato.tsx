"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BaixarParcela } from "./baixar-parcela";
import type { MotivoBaixa } from "@/lib/types";

export interface ParcelaLinha {
  id: string;
  indice: number;
  valor: number;
  vencimento: string; // ISO date (YYYY-MM-DD)
  vencimentoTexto: string;
  status: "paga" | "atrasada" | "prevista" | "baixada";
  diasAtraso: number;
  valorPago: number | null;
  dataPagoTexto: string | null;
  motivoBaixa: MotivoBaixa | null;
  notaBaixa: string | null;
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const rotulo = { paga: "Paga", atrasada: "Atrasada", prevista: "Prevista", baixada: "Não recebida" } as const;
const variante = {
  paga: "success",
  atrasada: "destructive",
  prevista: "neutral",
  baixada: "neutral",
} as const;

const rotuloMotivo: Record<MotivoBaixa, string> = {
  sem_exito: "sem êxito na causa",
  acordo_menor: "acordo por valor menor",
  desistencia: "desistência ou processo encerrado",
  outro: "outro motivo",
};

export function ParcelasContrato({ parcelas }: { parcelas: ParcelaLinha[] }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aBaixar, setABaixar] = useState<ParcelaLinha | null>(null);

  async function chamar(url: string, init: RequestInit, seErro: string) {
    setErro(null);
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        throw new Error(corpo?.error ?? `${seErro} (HTTP ${res.status}).`);
      }
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : seErro);
    }
  }

  async function darBaixa(parcela: ParcelaLinha, motivo: MotivoBaixa, nota: string) {
    setSalvando(parcela.id);
    await chamar(
      `/api/parcelas/${parcela.id}/baixa`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo, nota: nota || null }),
      },
      "Não consegui dar baixa",
    );
    setSalvando(null);
    setABaixar(null);
  }

  async function desfazerBaixa(parcela: ParcelaLinha) {
    setSalvando(parcela.id);
    await chamar(`/api/parcelas/${parcela.id}/baixa`, { method: "DELETE" }, "Não consegui desfazer a baixa");
    setSalvando(null);
  }

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
              <TableCell
                className={`text-right font-mono tabular-nums ${
                  parcela.status === "baixada" ? "text-muted-foreground line-through" : ""
                }`}
              >
                {moeda(parcela.valor)}
              </TableCell>
              <TableCell>
                <Badge variant={variante[parcela.status]} dot>
                  {rotulo[parcela.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {parcela.status === "baixada" ? (
                  <>
                    <span>Não recebida — {rotuloMotivo[parcela.motivoBaixa ?? "outro"]}</span>
                    {parcela.notaBaixa && <span className="block italic">{parcela.notaBaixa}</span>}
                  </>
                ) : parcela.valorPago !== null ? (
                  `${moeda(parcela.valorPago)} em ${parcela.dataPagoTexto}`
                ) : parcela.status === "atrasada" ? (
                  `${parcela.diasAtraso} dia(s) de atraso`
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-right">
                {parcela.status === "baixada" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={salvando !== null}
                    onClick={() => desfazerBaixa(parcela)}
                  >
                    {salvando === parcela.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Desfazer
                  </Button>
                ) : (
                  parcela.valorPago === null && (
                    <div className="flex justify-end gap-1">
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
                        Recebi
                      </Button>
                      {/* Honorário de êxito pode simplesmente não vir, e isso
                          não é atraso — precisa de um caminho próprio. */}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={salvando !== null}
                        title="Marcar que este valor não será recebido"
                        onClick={() => setABaixar(parcela)}
                      >
                        <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                        Não recebi
                      </Button>
                    </div>
                  )
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

      {aBaixar && (
        <BaixarParcela
          descricaoParcela={`Parcela ${aBaixar.indice}, vencimento em ${aBaixar.vencimentoTexto}`}
          valor={moeda(aBaixar.valor)}
          onConfirmar={(motivo, nota) => darBaixa(aBaixar, motivo, nota)}
          onCancelar={() => setABaixar(null)}
        />
      )}
    </div>
  );
}
