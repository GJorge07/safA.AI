"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Filter, Maximize2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { AgentHero } from "./agent-hero";
import { FluxoCaixaChart } from "./fluxo-caixa-chart";
import { ChartModal } from "./chart-modal";
import { TipoBreakdown } from "./tipo-breakdown";
import { ContratosLista } from "./contratos-lista";
import {
  clientesAtivos,
  statusDoContrato,
  totalEmAtraso,
  totalPrevistoNoMes,
  totalRecebidoNoMes,
  type ContratoComRelacoes,
} from "./types";
import type { FluxoCaixaMes } from "@/lib/types";

interface HomeDashboardProps {
  contratos: ContratoComRelacoes[];
  fluxoCaixa: FluxoCaixaMes[];
}

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatMesCurto(mes: string) {
  const [ano, m] = mes.split("-");
  const nomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${nomes[Number(m) - 1]}/${ano.slice(2)}`;
}

export function HomeDashboard({ contratos, fluxoCaixa }: HomeDashboardProps) {
  const [tipo, setTipo] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [clienteId, setClienteId] = useState("todos");
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);
  const [modalAberto, setModalAberto] = useState(false);

  const clientes = useMemo(() => {
    const mapa = new Map<string, string>();
    contratos.forEach((c) => mapa.set(c.clienteId, c.cliente.nome));
    return Array.from(mapa.entries());
  }, [contratos]);

  const filtradosPorCampos = useMemo(
    () =>
      contratos.filter((c) => {
        if (tipo !== "todos" && c.tipoPagamento !== tipo) return false;
        if (status !== "todos" && statusDoContrato(c) !== status) return false;
        if (clienteId !== "todos" && c.clienteId !== clienteId) return false;
        return true;
      }),
    [contratos, tipo, status, clienteId],
  );

  const filtrados = useMemo(() => {
    if (!mesSelecionado) return filtradosPorCampos;
    return filtradosPorCampos.filter((c) =>
      c.parcelas.some((p) => {
        const mesParcela = `${p.vencimento.getFullYear()}-${String(p.vencimento.getMonth() + 1).padStart(2, "0")}`;
        return mesParcela === mesSelecionado;
      }),
    );
  }, [filtradosPorCampos, mesSelecionado]);

  const hoje = new Date();
  const proximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
  const mesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const recebido = totalRecebidoNoMes(filtradosPorCampos, hoje.getFullYear(), hoje.getMonth());
  const recebidoMesAnterior = totalRecebidoNoMes(filtradosPorCampos, mesAnterior.getFullYear(), mesAnterior.getMonth());
  const previsto = totalPrevistoNoMes(filtradosPorCampos, proximoMes.getFullYear(), proximoMes.getMonth());
  const atraso = totalEmAtraso(filtradosPorCampos, hoje);
  const clientesResumo = clientesAtivos(filtradosPorCampos, hoje);

  const temComparacaoRecebido = recebidoMesAnterior > 0;
  const variacaoRecebido = temComparacaoRecebido
    ? Math.round(((recebido - recebidoMesAnterior) / recebidoMesAnterior) * 100)
    : null;

  const filtrosAtivos = [tipo !== "todos", status !== "todos", clienteId !== "todos"].filter(Boolean).length;
  const mesMaisRecente = fluxoCaixa[fluxoCaixa.length - 1]?.mes;

  return (
    <div className="flex flex-col gap-6">
      <AgentHero />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Card principal — número + gráfico + detalhamento, no estilo do
            "Revenue" da referência (Steep): número e variação no topo,
            gráfico embaixo, breakdown lateral separado por um fio. */}
        <div className="rounded-2xl bg-accent/60 p-5 lg:col-span-2">
          <div className="mb-1 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Fluxo de caixa</h2>
                <button
                  onClick={() => setModalAberto(true)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-card/60 hover:text-foreground"
                  aria-label="Expandir gráfico"
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <FiltroPopover
                  tipo={tipo}
                  setTipo={setTipo}
                  status={status}
                  setStatus={setStatus}
                  clienteId={clienteId}
                  setClienteId={setClienteId}
                  clientes={clientes}
                  ativos={filtrosAtivos}
                />
              </div>
              {mesSelecionado && (
                <button
                  onClick={() => setMesSelecionado(null)}
                  className="mt-1.5 flex w-fit items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[11px] font-medium hover:brightness-110"
                >
                  {formatMesCurto(mesSelecionado)}
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="shrink-0 text-right">
              <div className="font-mono text-3xl font-semibold tabular-nums">{formatMoeda(recebido)}</div>
              {temComparacaoRecebido && variacaoRecebido !== null && (
                <div className={`text-xs font-medium ${variacaoRecebido >= 0 ? "text-success" : "text-destructive"}`}>
                  {variacaoRecebido >= 0 ? "↑" : "↓"} {Math.abs(variacaoRecebido)}% vs. mês passado
                </div>
              )}
            </div>
          </div>

          <p className="mb-1 text-[11px] text-muted-foreground">Clique num mês para filtrar os contratos abaixo.</p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_180px] md:items-center">
            <FluxoCaixaChart
              dados={fluxoCaixa}
              mesSelecionado={mesSelecionado}
              onSelecionarMes={(m) => setMesSelecionado(m || null)}
              mesEmDestaque={mesMaisRecente}
            />
            <div className="hidden h-full w-px bg-border/60 md:block" />
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Por tipo</p>
              <TipoBreakdown contratos={filtradosPorCampos} />
            </div>
          </div>
        </div>

        {/* Coluna secundária — cards menores no mesmo tratamento tonal,
            como o card "Transactions" da referência. */}
        <div className="flex flex-col gap-4">
          <StatTintado label="Previsto próximo mês" value={formatMoeda(previsto)} />
          <StatTintado
            label="Em atraso agora"
            value={formatMoeda(atraso)}
            tone={atraso > 0 ? "destructive" : undefined}
          />
          <StatTintado
            label="Clientes ativos"
            value={String(clientesResumo.total)}
            subtitulo={clientesResumo.novosEsteMes > 0 ? `${clientesResumo.novosEsteMes} novo(s) este mês` : undefined}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>
            Contratos
            {mesSelecionado && <span className="ml-1 font-normal text-muted-foreground">— {formatMesCurto(mesSelecionado)}</span>}
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {filtrados.length} de {contratos.length}
          </span>
        </CardHeader>
        <CardContent>
          <ContratosLista contratos={filtrados} carregando={false} erro={null} mostrarFiltros={false} />
        </CardContent>
      </Card>

      <ChartModal aberto={modalAberto} onFechar={() => setModalAberto(false)} fluxoCaixa={fluxoCaixa} contratos={contratos} />
    </div>
  );
}

interface FiltroPopoverProps {
  tipo: string;
  setTipo: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  clienteId: string;
  setClienteId: (v: string) => void;
  clientes: [string, string][];
  ativos: number;
}

function FiltroPopover({ tipo, setTipo, status, setStatus, clienteId, setClienteId, clientes, ativos }: FiltroPopoverProps) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setAberto(false);
    }
    if (aberto) {
      document.addEventListener("mousedown", onClickFora);
      document.addEventListener("keydown", onEsc);
    }
    return () => {
      document.removeEventListener("mousedown", onClickFora);
      document.removeEventListener("keydown", onEsc);
    };
  }, [aberto]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        className="flex items-center gap-1 rounded-md p-1 text-muted-foreground hover:bg-card/60 hover:text-foreground"
        aria-label="Filtros"
      >
        <Filter className="h-3.5 w-3.5" aria-hidden="true" />
        {ativos > 0 && (
          <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
            {ativos}
          </span>
        )}
      </button>
      {aberto && (
        <div
          role="dialog"
          aria-label="Filtros do dashboard"
          className="absolute left-0 top-full z-20 mt-2 w-64 rounded-lg border border-border bg-popover p-3 shadow-lg shadow-black/40"
        >
          <div className="flex flex-col gap-3">
            <FilterField label="Tipo de contrato">
              <Select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="fixo">Fixo</option>
                <option value="exito">Êxito</option>
                <option value="misto">Misto</option>
              </Select>
            </FilterField>
            <FilterField label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="todos">Todos</option>
                <option value="em_dia">Em dia</option>
                <option value="atrasado">Atrasado</option>
                <option value="quitado">Quitado</option>
              </Select>
            </FilterField>
            <FilterField label="Cliente">
              <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="todos">Todos</option>
                {clientes.map(([id, nome]) => (
                  <option key={id} value={id}>
                    {nome}
                  </option>
                ))}
              </Select>
            </FilterField>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      {children}
    </label>
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
      <div className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${tone === "destructive" ? "text-destructive" : "text-foreground"}`}>
        {value}
      </div>
      {subtitulo && <div className="mt-0.5 text-xs text-success">{subtitulo}</div>}
    </div>
  );
}
