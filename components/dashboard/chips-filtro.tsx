import Link from "next/link";
import { cn } from "@/lib/utils";

// Atalhos para os recortes que o advogado abre todo dia. Os contadores vêm do
// banco, não de contar o array da página atual.
export interface Chip {
  texto: string;
  /** Parâmetros que este chip aplica; `null` remove o parâmetro. */
  aplica: Record<string, string | null>;
  contagem?: number;
  tom?: "destructive" | "warning";
}

export function ChipsFiltro({
  chips,
  params,
  basePath,
}: {
  chips: Chip[];
  params: URLSearchParams;
  basePath: string;
}) {
  function href(chip: Chip) {
    const copia = new URLSearchParams(params.toString());
    for (const [nome, valor] of Object.entries(chip.aplica)) {
      if (valor === null) copia.delete(nome);
      else copia.set(nome, valor);
    }
    copia.delete("pagina");
    const query = copia.toString();
    return query ? `${basePath}?${query}` : basePath;
  }

  function ativo(chip: Chip) {
    return Object.entries(chip.aplica).every(([nome, valor]) =>
      valor === null ? !params.get(nome) : params.get(nome) === valor,
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const selecionado = ativo(chip);
        return (
          <Link
            key={chip.texto}
            href={href(chip)}
            aria-current={selecionado ? "true" : undefined}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              selecionado
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {chip.texto}
            {chip.contagem !== undefined && (
              <span
                className={cn(
                  "font-mono tabular-nums",
                  selecionado
                    ? "opacity-80"
                    : chip.tom === "destructive"
                      ? "text-destructive"
                      : chip.tom === "warning"
                        ? "text-warning"
                        : "opacity-70",
                )}
              >
                {chip.contagem}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
