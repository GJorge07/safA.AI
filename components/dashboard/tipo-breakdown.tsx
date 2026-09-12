import type { ContratoComRelacoes } from "./types";

const labels: Record<string, string> = { fixo: "Fixo", exito: "Êxito", misto: "Misto" };

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function TipoBreakdown({ contratos }: { contratos: ContratoComRelacoes[] }) {
  if (contratos.length === 0) {
    return <p className="text-xs text-muted-foreground">Nenhum contrato no filtro atual.</p>;
  }

  const porTipo = ["fixo", "exito", "misto"]
    .map((tipo) => ({
      tipo,
      valor: contratos.filter((c) => c.tipoPagamento === tipo).reduce((soma, c) => soma + c.valorTotal, 0),
    }))
    .filter((item) => item.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  return (
    <ul className="flex flex-col">
      {porTipo.map(({ tipo, valor }, i) => (
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
