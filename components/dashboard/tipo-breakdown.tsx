import type { FatiaTipo } from "@/lib/db/inicio";

const labels: Record<string, string> = { fixo: "Fixo", exito: "Êxito", misto: "Misto" };

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Quanto da carteira depende de ganhar a causa: para quem está começando, êxito
// é receita incerta, e essa proporção é a leitura de risco da carteira.
export function TipoBreakdown({ fatias }: { fatias: FatiaTipo[] }) {
  if (fatias.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhum contrato cadastrado.</p>;
  }

  return (
    <ul className="flex flex-col">
      {fatias.map(({ tipo, valor }, i) => (
        <li
          key={tipo}
          className={`flex items-center justify-between gap-3 py-2.5 text-xs ${i > 0 ? "border-t border-border/60" : ""}`}
        >
          <span className="text-muted-foreground">{labels[tipo]}</span>
          <span className="font-mono tabular-nums font-medium">{formatMoeda(valor)}</span>
        </li>
      ))}
    </ul>
  );
}
