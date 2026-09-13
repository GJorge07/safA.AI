"use client";

import { EstimativaEsforco } from "./estimativa-esforco";
import { temEstimativaEsforco, type ContextoEsforco } from "@/lib/ai/case-effort";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { opiniaoContratoSchema, type OpiniaoContrato } from "@/lib/ai/schemas";
import { OpiniaoDetalhada } from "./opiniao-contrato";

export function AvaliacaoCadastrada({ contratoId }: { contratoId: string }) {
  const [estimativa, setEstimativa] = useState<ContextoEsforco>({ fatores: [] });
  const [opiniao, setOpiniao] = useState<OpiniaoContrato | null>(null);
  const [aberta, setAberta] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [alterada, setAlterada] = useState(false);
  const [fontes, setFontes] = useState<{ campo: string; trecho: string }[]>([]);
  const [data, setData] = useState("");

  async function consultar(simular = temEstimativaEsforco(estimativa)) {
    setAberta(true);
    setCarregando(true);
    setErro(null);

    try {
      const res = await fetch(`/api/contratos/${encodeURIComponent(contratoId)}/opiniao`, { cache: "no-store", ...(simular ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(estimativa) } : {}) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.erro ?? "Não foi possível consultar a avaliação.");
      if (!simular && body.contextoSugerido) setEstimativa(body.contextoSugerido);
      setFontes(body.evidenciasContexto ?? []);
      setOpiniao(opiniaoContratoSchema.parse(body.opiniao));
      setAlterada(false);
      setData(body.dataReferencia);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível consultar a avaliação.");
    } finally {
      setCarregando(false);
    }
  }

  return <div className="border-t border-border pt-3">
    <Button size="sm" variant="secondary" disabled={carregando} onClick={() => aberta ? setAberta(false) : consultar()} aria-expanded={aberta}>
      {carregando ? "Consultando…" : aberta ? "Ocultar avaliação" : "Este é um bom caso?"}
    </Button>
    {aberta && <div className="mt-3 space-y-3" aria-live="polite">
      {erro && <p className="text-xs text-destructive">{erro}</p>}
      {alterada && <p className="text-xs text-warning">Estimativas alteradas. Recalcule para atualizar o parecer abaixo.</p>}
      {opiniao && <OpiniaoDetalhada opiniao={opiniao} />}
      <EstimativaEsforco value={estimativa} onChange={value => { setEstimativa(value); setAlterada(true); }} disabled={carregando}>
        <Button size="sm" variant="secondary" disabled={carregando} onClick={() => consultar(true)}>{carregando ? "Calculando…" : "Recalcular com estas estimativas"}</Button>
      </EstimativaEsforco>
      {fontes.length > 0 && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">Conferir dados extraídos</summary><ul className="mt-2 space-y-1">{fontes.map((fonte, i) => <li key={i}>“{fonte.trecho}”</li>)}</ul></details>}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{data ? `Dados de ${data.split("-").reverse().join("/")}` : "Consulta local"}</span>
        <button type="button" className="underline underline-offset-2 disabled:opacity-50" disabled={carregando} onClick={() => consultar()}>{carregando ? "Atualizando…" : "Atualizar"}</button>
      </div>
    </div>}
  </div>;
}
