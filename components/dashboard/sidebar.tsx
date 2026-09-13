"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Home, PanelLeftClose, PanelLeftOpen, UserRound, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const nav = [
  { href: "/", label: "Início", icon: Home },
  { href: "/pagamentos", label: "Pagamentos", icon: Wallet },
  { href: "/agente", label: "Safa AI", icon: Bot },
  { href: "/perfil", label: "Meu perfil", icon: UserRound },
];

export function Sidebar() {
  const pathname = usePathname();
  const [aberta, setAberta] = useState(true);

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200",
        aberta ? "w-60" : "w-16",
      )}
    >
      <div className={cn("flex items-center gap-2 px-5 py-5", !aberta && "flex-col gap-3 px-0")}>
        <Link href="/" className={cn("flex min-w-0 flex-1 items-center gap-2", !aberta && "flex-none")}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            S
          </span>
          {aberta && <span className="truncate text-sm font-semibold">Safa</span>}
        </Link>
        <button
          type="button"
          onClick={() => setAberta((v) => !v)}
          aria-label={aberta ? "Ocultar barra lateral" : "Mostrar barra lateral"}
          aria-pressed={!aberta}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover-strong hover:text-foreground"
        >
          {aberta ? (
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      <nav
        className={cn("flex flex-col gap-1 px-3", !aberta && "items-center px-2")}
        aria-label="Navegação principal"
      >
        {nav.map((item) => {
          // O detalhe de um contrato mora sob /pagamentos — o item precisa
          // continuar marcado como atual lá dentro.
          const active =
            item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md text-sm font-medium transition-colors",
                aberta ? "px-3 py-2" : "h-9 w-9 justify-center",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-hover-strong hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {aberta && item.label}
            </Link>
          );
        })}
      </nav>

      <div
        className={cn(
          "mt-auto flex items-center gap-2 border-t border-border px-5 py-4",
          !aberta && "flex-col-reverse justify-center px-2",
        )}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-card-2 text-xs font-semibold">
          GJ
        </span>
        {aberta && (
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-xs font-medium">Gabriel Jorge</span>
          </div>
        )}
        <ThemeToggle />
      </div>
    </aside>
  );
}
