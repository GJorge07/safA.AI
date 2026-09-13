"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Opiniao {
  classificacao: "favoravel" | "atencao" | "desfavoravel";
  resumo: string;
  pontosFortes: string[];
  riscos: { categoria: "financeiro" | "juridico" | "carteira"; descricao: string }[];
  recomendacao: string;
}

const rotulo = { favoravel: "Favorável", atencao: "Atenção", desfavoravel: "Desfavorável" } as const;
const variante = { favoravel: "success", atencao: "warning", desfavoravel: "destructive" } as const;
const rotuloRisco = { financeiro: "Financeiro", juridico: "Jurídico", carteira: "Carteira" } as const;

// Nada é chamado no carregamento da página: a IA custa tempo e cota, então
// quem decide analisar é o advogado.
export function OpiniaoContrato({ contratoId }: { contratoId: string }) {
  const [opiniao, setOpiniao] = useState<Opiniao | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function analisar() {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/contratos/${contratoId}/opiniao`, { method: "POST" });
      const corpo = await res.json().catch(() => null);
      if (!res.ok) throw new Error(corpo?.error ?? `Falha na análise (HTTP ${res.status}).`);
      setOpiniao(corpo.opiniao);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui analisar agora.");
    } finally {
      setCarregando(false);
    }
  }

  if (!opiniao) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium">Opinião da IA</p>
        <p className="text-xs text-muted-foreground">
          Avalia risco financeiro, o que falta na cláusula e como este contrato se compara aos seus outros.
        </p>
        <Button size="sm" variant="secondary" className="self-start" onClick={analisar} disabled={carregando}>
          {carregando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Analisar contrato
        </Button>
        {erro && (
          <p className="flex items-start gap-1.5 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="break-words">{erro}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Opinião da IA</p>
        <Badge variant={variante[opiniao.classificacao]} dot>
          {rotulo[opiniao.classificacao]}
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">{opiniao.resumo}</p>

      {opiniao.pontosFortes.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pontos fortes</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
            {opiniao.pontosFortes.map((ponto, i) => (
              <li key={i}>{ponto}</li>
            ))}
          </ul>
        </div>
      )}

      {opiniao.riscos.length > 0 && (
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Riscos</p>
          <ul className="mt-1 space-y-1 text-sm">
            {opiniao.riscos.map((risco, i) => (
              <li key={i}>
                <span className="text-xs text-muted-foreground">{rotuloRisco[risco.categoria]} · </span>
                {risco.descricao}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="border-t border-border pt-2 text-sm">{opiniao.recomendacao}</p>
    </div>
  );
}
