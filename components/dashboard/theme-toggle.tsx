"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const CHAVE = "safa:tema";

// Escuro é o padrão do produto — o atributo data-theme="light" na tag
// <html> é a única coisa que muda. Ver o script anti-flash em app/layout.tsx.
export function ThemeToggle() {
  const [tema, setTema] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const atual = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    setTema(atual);
  }, []);

  function alternar() {
    const novo = tema === "dark" ? "light" : "dark";
    setTema(novo);
    if (novo === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      window.localStorage.setItem(CHAVE, novo);
    } catch {
      // localStorage indisponível (modo privado etc.) — ignora silenciosamente
    }
  }

  return (
    <button
      onClick={alternar}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"
      aria-label={tema === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
    >
      {tema === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}
