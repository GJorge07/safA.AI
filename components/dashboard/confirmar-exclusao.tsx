"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmarExclusaoProps {
  aberto: boolean;
  titulo: string;
  descricao: string;
  rotuloConfirmar?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

// Diálogo para ação que não tem desfazer. O foco começa em "Cancelar": se o
// advogado abriu sem querer, um Enter não apaga nada.
export function ConfirmarExclusao({
  aberto,
  titulo,
  descricao,
  rotuloConfirmar = "Apagar",
  onConfirmar,
  onCancelar,
}: ConfirmarExclusaoProps) {
  useEffect(() => {
    if (!aberto) return;

    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onCancelar();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [aberto, onCancelar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--overlay)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmar-titulo"
      aria-describedby="confirmar-descricao"
      onClick={onCancelar}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive-bg">
            <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="confirmar-titulo" className="text-sm font-semibold">
              {titulo}
            </h2>
            <p id="confirmar-descricao" className="mt-1 text-xs text-muted-foreground">
              {descricao}
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button autoFocus size="sm" variant="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button size="sm" variant="destructive" onClick={onConfirmar}>
            {rotuloConfirmar}
          </Button>
        </div>
      </div>
    </div>
  );
}
