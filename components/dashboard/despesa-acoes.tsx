"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, HandCoins, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Marca/desmarca pagamento e cobrança e pede ao servidor para revalidar — a
// lista é Server Component, então router.refresh() é o que traz o número novo.
export function DespesaAcoes({
  id,
  paga,
  aReembolsar,
}: {
  id: string;
  paga: boolean;
  /** Era do cliente, já paga e ainda não repassada. */
  aReembolsar?: boolean;
}) {
  const router = useRouter();
  const [salvando, setSalvando] = useState<"pagamento" | "cobranca" | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(campo: "pagoEm" | "cobradoEm", valor: string | null, qual: "pagamento" | "cobranca") {
    setSalvando(qual);
    setErro(null);
    try {
      const res = await fetch(`/api/despesas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [campo]: valor }),
      });
      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        throw new Error(corpo?.error ?? `Falha ao salvar (HTTP ${res.status}).`);
      }
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui salvar.");
    } finally {
      setSalvando(null);
    }
  }

  const hoje = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => enviar("pagoEm", paga ? null : hoje, "pagamento")}
          disabled={salvando !== null}
        >
          {salvando === "pagamento" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : paga ? (
            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {paga ? "Desfazer" : "Paguei"}
        </Button>

        {/* Só aparece quando há mesmo o que cobrar — é o clique que fecha o
            ciclo do dinheiro adiantado. */}
        {aReembolsar && (
          <Button
            size="sm"
            onClick={() => enviar("cobradoEm", hoje, "cobranca")}
            disabled={salvando !== null}
          >
            {salvando === "cobranca" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <HandCoins className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Cobrei
          </Button>
        )}
      </div>
      {erro && <span className="text-[11px] text-destructive">{erro}</span>}
    </div>
  );
}
