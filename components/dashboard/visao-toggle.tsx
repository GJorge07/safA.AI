"use client";

// A visão preferida (tabela ou cards) fica na URL, para o servidor renderizar
// a certa já no primeiro HTML, e é espelhada no localStorage só como
// conveniência — se o storage falhar (janela privada), cai no padrão.
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";

const CHAVE = "safa:visao-lista";

export function VisaoToggle({ visao }: { visao: "tabela" | "cards" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const naUrl = searchParams.get("visao");

  // Sem parâmetro na URL, respeita a última escolha guardada.
  useEffect(() => {
    if (naUrl) return;
    let salva: string | null = null;
    try {
      salva = localStorage.getItem(CHAVE);
    } catch {
      return;
    }
    if (salva === "cards") {
      const params = new URLSearchParams(searchParams.toString());
      params.set("visao", "cards");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [naUrl, pathname, router, searchParams]);

  function escolher(nova: "tabela" | "cards") {
    try {
      localStorage.setItem(CHAVE, nova);
    } catch {
      // Preferência é conveniência: seguir sem ela é aceitável.
    }
    const params = new URLSearchParams(searchParams.toString());
    if (nova === "tabela") params.delete("visao");
    else params.set("visao", nova);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-md border border-border p-0.5" role="group" aria-label="Formato da lista">
      <Botao ativo={visao === "tabela"} onClick={() => escolher("tabela")} rotulo="Ver em tabela">
        <Rows3 className="h-4 w-4" aria-hidden="true" />
      </Botao>
      <Botao ativo={visao === "cards"} onClick={() => escolher("cards")} rotulo="Ver em cards">
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
      </Botao>
    </div>
  );
}

function Botao({
  ativo,
  onClick,
  rotulo,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={rotulo}
      aria-pressed={ativo}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded transition-colors",
        ativo ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-hover hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
