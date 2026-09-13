import Link from "next/link";
import { cn } from "@/lib/utils";

// Paginação numerada, nunca rolagem infinita: numa lista financeira a pessoa
// precisa voltar para onde estava e saber o tamanho do todo.
interface PaginacaoProps {
  pagina: number;
  paginas: number;
  total: number;
  tamanho: number;
  /** Query string atual sem o parâmetro `pagina`. */
  params: URLSearchParams;
  basePath: string;
  rotuloItens: string;
}

// 1 … 4 5 [6] 7 8 … 20 — sempre com as pontas visíveis.
function janela(pagina: number, paginas: number): (number | "…")[] {
  if (paginas <= 7) return Array.from({ length: paginas }, (_, i) => i + 1);
  const set = new Set([1, paginas, pagina, pagina - 1, pagina + 1]);
  if (pagina <= 3) [2, 3, 4].forEach((p) => set.add(p));
  if (pagina >= paginas - 2) [paginas - 3, paginas - 2, paginas - 1].forEach((p) => set.add(p));

  const ordenadas = [...set].filter((p) => p >= 1 && p <= paginas).sort((a, b) => a - b);
  const resultado: (number | "…")[] = [];
  let anterior = 0;
  for (const p of ordenadas) {
    if (anterior && p - anterior > 1) resultado.push("…");
    resultado.push(p);
    anterior = p;
  }
  return resultado;
}

export function Paginacao({ pagina, paginas, total, tamanho, params, basePath, rotuloItens }: PaginacaoProps) {
  if (total === 0) return null;

  const href = (destino: number) => {
    const copia = new URLSearchParams(params.toString());
    if (destino <= 1) copia.delete("pagina");
    else copia.set("pagina", String(destino));
    const query = copia.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const primeiro = (pagina - 1) * tamanho + 1;
  const ultimo = Math.min(total, pagina * tamanho);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-muted-foreground">
      <span>
        Mostrando {primeiro}–{ultimo} de {total} {rotuloItens}
      </span>

      {paginas > 1 && (
        <nav className="flex items-center gap-1" aria-label="Paginação">
          <PaginaLink href={href(pagina - 1)} desabilitado={pagina <= 1}>
            Anterior
          </PaginaLink>
          {janela(pagina, paginas).map((item, i) =>
            item === "…" ? (
              <span key={`sep-${i}`} className="px-1.5" aria-hidden="true">
                …
              </span>
            ) : (
              <PaginaLink key={item} href={href(item)} atual={item === pagina}>
                {item}
              </PaginaLink>
            ),
          )}
          <PaginaLink href={href(pagina + 1)} desabilitado={pagina >= paginas}>
            Próxima
          </PaginaLink>
        </nav>
      )}
    </div>
  );
}

function PaginaLink({
  href,
  children,
  atual,
  desabilitado,
}: {
  href: string;
  children: React.ReactNode;
  atual?: boolean;
  desabilitado?: boolean;
}) {
  const classe = cn(
    "flex h-7 min-w-7 items-center justify-center rounded-md border border-border px-2 transition-colors",
    atual ? "border-primary bg-primary text-primary-foreground" : "hover:bg-card hover:text-foreground",
  );

  if (desabilitado) {
    return (
      <span className={cn(classe, "cursor-not-allowed opacity-40")} aria-disabled="true">
        {children}
      </span>
    );
  }

  return (
    <Link href={href} className={classe} aria-current={atual ? "page" : undefined}>
      {children}
    </Link>
  );
}
