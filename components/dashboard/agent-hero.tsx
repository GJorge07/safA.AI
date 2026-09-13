"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, MessageSquareText, Trash2 } from "lucide-react";
import { ConfirmarExclusao } from "./confirmar-exclusao";
import { excluirConversa, listarConversas, type Conversa } from "./conversas";

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
  // A conversa que o diálogo está prestes a apagar; null = diálogo fechado.
  const [aExcluir, setAExcluir] = useState<Conversa | null>(null);
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
            placeholder="Pergunte qualquer coisa sobre seus pagamentos..."
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
                // O grupo é um div, não um button: o botão de apagar mora
                // dentro dele, e button aninhado em button é HTML inválido.
                <li key={c.id} className="group flex items-center gap-1 rounded-md pr-1 hover:bg-hover">
                  <button
                    onClick={() => router.push(`/agente?conversaId=${c.id}`)}
                    className="flex min-w-0 flex-1 items-start gap-2 rounded-md px-1.5 py-1.5 text-left text-xs"
                  >
                    <MessageSquareText
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
                    <span className="shrink-0 text-muted-foreground">{formatData(c.criadoEm)}</span>
                  </button>

                  {/* Discreto: aparece no hover ou no foco pelo teclado, para
                      não poluir a lista com um ícone de risco sempre visível. */}
                  <button
                    type="button"
                    onClick={() => setAExcluir(c)}
                    title={`Apagar "${c.titulo}"`}
                    aria-label={`Apagar conversa "${c.titulo}"`}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-card hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmarExclusao
        aberto={aExcluir !== null}
        titulo="Apagar esta conversa?"
        descricao={
          aExcluir
            ? `"${aExcluir.titulo}" será apagada definitivamente. Não dá para recuperar depois.`
            : ""
        }
        onConfirmar={() => {
          if (aExcluir) excluirConversa(aExcluir.id);
          setAExcluir(null);
        }}
        onCancelar={() => setAExcluir(null)}
      />
    </div>
  );
}
