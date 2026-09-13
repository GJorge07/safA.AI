"use client";

import { useState } from "react";
import { AgentHero } from "./agent-hero";
import { FluxoCaixaChart } from "./fluxo-caixa-chart";
import { ChartModal } from "./chart-modal";
import { TipoBreakdown } from "./tipo-breakdown";
import { PrecisaDeVoce } from "./precisa-de-voce";
import type { AcaoPendente, FatiaCliente, FatiaTipo, MesFluxo, ResumoInicio } from "@/lib/db/inicio";

interface HomeDashboardProps {
  resumo: ResumoInicio;
  fluxoCaixa: MesFluxo[];
  porTipo: FatiaTipo[];
  porCliente: FatiaCliente[];
  acoes: AcaoPendente[];
}

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// O Início responde duas perguntas, nesta ordem: "como estou?" e "o que faço
// agora?". Navegar contratos é trabalho de /pagamentos — por isso não há lista
// de contratos aqui.
export function HomeDashboard({ resumo, fluxoCaixa, porTipo, porCliente, acoes }: HomeDashboardProps) {
  const [modalAberto, setModalAberto] = useState(false);

  // Só compara quando houve base real no mês anterior — mês novo não ganha uma
  // variação de "0%" inventada.
  const temComparacao = resumo.recebidoMesAnterior > 0;
  const variacao = temComparacao
    ? Math.round(((resumo.recebido - resumo.recebidoMesAnterior) / resumo.recebidoMesAnterior) * 100)
    : null;

  const mesMaisRecente = fluxoCaixa[fluxoCaixa.length - 1]?.mes;

  return (
    <div className="flex flex-col gap-6">
      <AgentHero />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* O card inteiro abre a visão expandida — não há um alvo pequeno de
            "expandir" para acertar. Div com role=button porque o conteúdo traz
            o gráfico, que não pode ficar aninhado dentro de um <button>. */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Abrir visão expandida do fluxo de caixa"
          onClick={() => setModalAberto(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setModalAberto(true);
            }
          }}
          className="cursor-pointer rounded-2xl bg-accent/60 p-5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:col-span-2"
        >
          <div className="mb-3 flex items-start justify-between gap-3">
            <h2 className="text-sm font-semibold">Entra e sai</h2>
            <div className="shrink-0 text-right">
              <div className="text-[11px] text-muted-foreground">Recebido este mês</div>
              <div className="font-mono text-3xl font-semibold tabular-nums">{formatMoeda(resumo.recebido)}</div>
              {temComparacao && variacao !== null && (
                <div className={`text-xs font-medium ${variacao >= 0 ? "text-success" : "text-destructive"}`}>
                  {variacao >= 0 ? "↑" : "↓"} {Math.abs(variacao)}% vs. mês passado
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_180px] md:items-center">
            <FluxoCaixaChart dados={fluxoCaixa} mesEmDestaque={mesMaisRecente} />
            <div className="hidden h-full w-px bg-border/60 md:block" />
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Carteira por tipo
              </p>
              <TipoBreakdown fatias={porTipo} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <StatTintado
            label="Sobrou este mês"
            value={formatMoeda(resumo.sobrou)}
            subtitulo={resumo.pago > 0 ? `depois de ${formatMoeda(resumo.pago)} em despesas` : undefined}
            tone={resumo.sobrou < 0 ? "destructive" : undefined}
          />
          <StatTintado
            label="Em atraso agora"
            value={formatMoeda(resumo.emAtraso)}
            tone={resumo.emAtraso > 0 ? "destructive" : undefined}
          />
          <StatTintado label="Clientes ativos" value={String(resumo.clientesAtivos)} />
        </div>
      </div>

      <PrecisaDeVoce acoes={acoes} />

      <ChartModal
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        fluxoCaixa={fluxoCaixa}
        porCliente={porCliente}
      />
    </div>
  );
}

function StatTintado({
  label,
  value,
  tone,
  subtitulo,
}: {
  label: string;
  value: string;
  tone?: "destructive";
  subtitulo?: string;
}) {
  return (
    <div className="flex-1 rounded-2xl bg-accent/60 p-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
          tone === "destructive" ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </div>
      {subtitulo && <div className="mt-0.5 text-xs text-muted-foreground">{subtitulo}</div>}
    </div>
  );
}
