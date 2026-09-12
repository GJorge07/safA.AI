"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, MessageSquareText } from "lucide-react";
import { listarConversas, type Conversa } from "./conversas";

function observarConversas(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("safa:conversas", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("safa:conversas", onChange);
  };
}

function lerConversas() {
  return JSON.stringify(listarConversas().slice(0, 5));
}

function formatData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function saudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function emojiSaudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return "☀️";
  if (hora < 18) return "🌤️";
  return "🌙";
}

// Presença do agente na Início — o elemento central da tela, não um
// detalhe. Enviar aqui leva para /agente com a pergunta já preenchida.
export function AgentHero() {
  const router = useRouter();
  const [pergunta, setPergunta] = useState("");
  const snapshot = useSyncExternalStore(observarConversas, lerConversas, () => "[]");
  const conversas: Conversa[] = JSON.parse(snapshot);

  function enviar() {
    const texto = pergunta.trim();
    router.push(texto ? `/agente?q=${encodeURIComponent(texto)}` : "/agente");
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">
        {saudacao()}, Gabriel! <span aria-hidden="true">{emojiSaudacao()}</span>
      </h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
        <div className="flex flex-col justify-between rounded-2xl bg-card p-4 shadow-lg shadow-black/10">
          <input
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviar()}
            placeholder="Pergunte qualquer coisa sobre seus contratos..."
            className="w-full bg-transparent px-1 py-2 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <div className="mt-3 flex items-center justify-end border-t border-border pt-3">
            <button
              onClick={enviar}
              disabled={!pergunta.trim()}
              aria-label="Perguntar ao agente"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
            >
              <ArrowUp className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="mb-1 px-1 text-xs font-medium text-muted-foreground">Conversas recentes</p>
          {conversas.length === 0 ? (
            <p className="px-1 text-xs text-muted-foreground">Suas conversas com o agente aparecem aqui.</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {conversas.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => router.push(`/agente?conversaId=${c.id}`)}
                    className="flex w-full items-start gap-2 rounded-md px-1.5 py-1.5 text-left text-xs hover:bg-card"
                  >
                    <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
                    <span className="shrink-0 text-muted-foreground">{formatData(c.criadoEm)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
