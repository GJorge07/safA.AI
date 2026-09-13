"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OpiniaoContrato } from "@/lib/ai/schemas";
import { rotulosDimensao, rotulosStatus, sintetizarOpiniao } from "@/lib/ai/opinion-summary";

const CLASSIFICACAO_ESTILO = {
  favoravel: { rotulo: "Favorável", classe: "text-success", Icone: ShieldCheck },
  atencao: { rotulo: "Atenção", classe: "text-warning", Icone: ShieldQuestion },
  desfavoravel: { rotulo: "Desfavorável", classe: "text-destructive", Icone: ShieldAlert },
};

export function SeloClassificacao({ classificacao }: { classificacao: OpiniaoContrato["classificacao"] }) {
  const { Icone, rotulo, classe } = CLASSIFICACAO_ESTILO[classificacao];
  return <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${classe}`}><Icone className="h-3.5 w-3.5" aria-hidden="true" />{rotulo}</span>;
}

export function OpiniaoDetalhada({ opiniao }: { opiniao: OpiniaoContrato }) {
  const sintese = sintetizarOpiniao(opiniao);
  return <section className="space-y-3 rounded-lg bg-muted/50 p-3 text-xs" aria-label="Avaliação do caso">
    <div className="flex items-center justify-between gap-2"><span className="font-medium">Parecer do caso</span><SeloClassificacao classificacao={opiniao.classificacao} /></div>
    <p className="text-sm font-medium leading-snug">{sintese.titulo}</p>
    {sintese.motivos[0] && <p className="leading-relaxed text-muted-foreground">{sintese.motivos[0]}</p>}
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
      {Object.entries(opiniao.avaliacoes).map(([campo, avaliacao]) => <div key={campo} className="min-w-0">
        <dt className="text-muted-foreground">{rotulosDimensao[campo as keyof typeof rotulosDimensao]}</dt>
        <dd className={`mt-0.5 font-medium ${avaliacao.status === "dados_insuficientes" ? "text-muted-foreground" : CLASSIFICACAO_ESTILO[avaliacao.status].classe}`}>{rotulosStatus[avaliacao.status]}</dd>
      </div>)}
    </dl>
    <p className="border-t border-border pt-2"><span className="font-medium">Próximo passo: </span>{sintese.proximoPasso}</p>
    <details className="border-t border-border pt-2">
      <summary className="cursor-pointer font-medium text-muted-foreground">Ver motivos{ sintese.faltantes.length ? ` e ${sintese.faltantes.length} dados pendentes` : " e fontes" }</summary>
      <div className="mt-3 space-y-4">
        {Object.entries(opiniao.avaliacoes).map(([campo, avaliacao]) => <section key={campo} className="space-y-1">
          <h4 className="font-medium">{rotulosDimensao[campo as keyof typeof rotulosDimensao]}</h4>
          <p className="leading-relaxed">{avaliacao.justificativa}</p>
          {avaliacao.dadosFaltantes.length > 0 && <p className="text-warning">Falta: {avaliacao.dadosFaltantes.join("; ")}.</p>}
          {avaliacao.evidencias.length > 0 && <p className="break-words text-muted-foreground">Fontes: {[...new Set(avaliacao.evidencias)].join("; ")}</p>}
        </section>)}
        {opiniao.pontosFortes.length > 0 && <div><h4 className="mb-1 font-medium">Pontos positivos</h4><ul className="list-disc space-y-1 pl-4">{opiniao.pontosFortes.map((p, i) => <li key={i}>{p}</li>)}</ul></div>}
        {opiniao.riscos.length > 0 && <div><h4 className="mb-1 font-medium">Alertas</h4><ul className="list-disc space-y-1 pl-4">{opiniao.riscos.map((r, i) => <li key={i}>{r.descricao}</li>)}</ul></div>}
        <p className="border-t border-border pt-2"><span className="font-medium">Recomendação completa: </span>{opiniao.recomendacao}</p>
      </div>
    </details>
  </section>;
}

// O detalhe da main mantém a análise sob demanda, mas usa a avaliação local e
// auditável da branch do agente. Assim, abrir a página não consome cota de IA.
export function OpiniaoContrato({ contratoId }: { contratoId: string }) {
  const [opiniao, setOpiniao] = useState<OpiniaoContrato | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function analisar() {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/contratos/${contratoId}/opiniao`, { cache: "no-store" });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) throw new Error(corpo?.erro ?? "Não foi possível avaliar o contrato.");
      setOpiniao(corpo.opiniao);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível avaliar o contrato.");
    } finally {
      setCarregando(false);
    }
  }

  if (opiniao) return <OpiniaoDetalhada opiniao={opiniao} />;

  return <section className="space-y-2 rounded-lg border border-border bg-card p-4" aria-label="Avaliação do caso">
    <p className="text-sm font-medium">Este é um bom caso?</p>
    <p className="text-xs text-muted-foreground">Compare valor, pagamentos, dificuldade e área de atuação com os dados cadastrados.</p>
    <Button size="sm" variant="secondary" onClick={analisar} disabled={carregando}>
      {carregando ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
      Avaliar caso
    </Button>
    {erro && <p className="flex items-start gap-1.5 text-xs text-destructive"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />{erro}</p>}
  </section>;
}
