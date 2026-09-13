"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Marca/desmarca o pagamento e pede ao servidor para revalidar — a lista é
// Server Component, então router.refresh() é o que traz o número novo.
export function DespesaAcoes({ id, paga }: { id: string; paga: boolean }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function alternar() {
    setSalvando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/despesas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagoEm: paga ? null : new Date().toISOString().slice(0, 10) }),
      });
      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        throw new Error(corpo?.error ?? `Falha ao salvar (HTTP ${res.status}).`);
      }
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="secondary" onClick={alternar} disabled={salvando}>
        {salvando ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : paga ? (
          <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {paga ? "Desfazer" : "Pagar"}
      </Button>
      {erro && <span className="text-[11px] text-destructive">{erro}</span>}
    </div>
  );
}
