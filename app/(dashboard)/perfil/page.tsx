"use client";

import { useEffect, useState } from "react";
import { areasAtuacao, perfilAdvogadoSchema, type PerfilAtuacao } from "@/lib/ai/practice-profile";
import { Button } from "@/components/ui/button";

export default function PerfilPage() {
  const [areas, setAreas] = useState<PerfilAtuacao["areas"]>([]);
  const [meta, setMeta] = useState("");
  const [pronto, setPronto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tentativa, setTentativa] = useState(0);
  useEffect(() => {
    let ativo = true;
    fetch("/api/perfil", { cache: "no-store" }).then(async res => {
      if (!res.ok) throw new Error();
      const perfil = perfilAdvogadoSchema.parse(await res.json());
      if (ativo) { setAreas(perfil.areas); setMeta(perfil.valorHoraMinimo?.toString() ?? ""); setPronto(true); setMensagem(""); }
    }).catch(() => { if (ativo) setMensagem("Não foi possível carregar seu perfil. Tente novamente."); });
    return () => { ativo = false; };
  }, [tentativa]);

  async function salvar(event: React.FormEvent) {
    event.preventDefault(); setSalvando(true); setMensagem("");
    try {
      const res = await fetch("/api/perfil", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ areas, valorHoraMinimo: meta === "" ? null : Number(meta) }) });
      if (!res.ok) throw new Error();
      setMensagem("Perfil salvo. As próximas avaliações usarão suas áreas e sua meta por hora.");
    } catch { setMensagem("Não foi possível salvar. Confira a meta e tente novamente."); }
    finally { setSalvando(false); }
  }
  return <div className="mx-auto max-w-2xl space-y-5">
    <div><h1 className="text-xl font-semibold">Meu perfil de atuação</h1><p className="mt-2 text-sm text-muted-foreground">Perfil do advogado ou escritório usado nesta aplicação. Selecione as áreas em que atua para comparar com as áreas mencionadas nos contratos.</p></div>
    <form onSubmit={salvar} className="space-y-5 rounded-lg border border-border bg-card p-5">
      <fieldset disabled={!pronto || salvando} className="space-y-4">
        <legend className="mb-3 text-sm font-medium">Áreas de atuação</legend>
        <div className="grid grid-cols-2 gap-3">{Object.entries(areasAtuacao).map(([area, rotulo]) => <label key={area} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={areas.includes(area as PerfilAtuacao["areas"][number])} onChange={e => { const valor = area as PerfilAtuacao["areas"][number]; setAreas(e.target.checked ? [...areas, valor] : areas.filter(a => a !== valor)); setMensagem(""); }} />{rotulo}
        </label>)}</div>
        <label className="flex flex-col gap-2 text-sm">Meta mínima de remuneração por hora (R$, opcional)
          <input type="number" min="0.01" max="999999999999.99" step="0.01" value={meta} onChange={e => { setMeta(e.target.value); setMensagem(""); }} className="rounded-md border border-input bg-background p-2" />
        </label>
        <p className="text-xs text-muted-foreground">A área não comprova experiência específica. A meta é sua referência pessoal para comparar honorários, custos e esforço; não é uma tabela de mercado.</p>
        <Button type="submit" disabled={!pronto || salvando}>{salvando ? "Salvando…" : "Salvar perfil"}</Button>
      </fieldset>
      <p role="status" className="text-sm">{mensagem || (!pronto ? "Carregando perfil…" : "")}</p>
      {!pronto && mensagem && <Button type="button" variant="secondary" onClick={() => setTentativa(t => t + 1)}>Tentar novamente</Button>}
    </form>
  </div>;
}
