"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Layers, LineChart as IconLine, PieChart as IconPie, SlidersHorizontal, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Select } from "@/components/ui/select";
import type { FluxoCaixaMes } from "@/lib/types";
import type { ContratoComRelacoes } from "./types";

interface ChartModalProps {
  aberto: boolean;
  onFechar: () => void;
  fluxoCaixa: FluxoCaixaMes[];
  contratos: ContratoComRelacoes[];
}

type TipoGrafico = "barra" | "linha" | "pizza";
type Periodo = "3" | "6" | "todos";

// Paleta pequena e fixa por cliente — ok para poucos clientes no MVP; com
// muitos, o ideal seria agrupar em "outros" (fora de escopo aqui).
const CORES_CLIENTE = ["var(--primary)", "var(--success)", "var(--warning)", "var(--accent-foreground)", "var(--destructive)"];

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatMoedaCurta(valor: number) {
  return `R$ ${(valor / 1000).toFixed(1)}k`;
}

export function ChartModal({ aberto, onFechar, fluxoCaixa, contratos }: ChartModalProps) {
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("barra");
  const [periodo, setPeriodo] = useState<Periodo>("todos");
  const [clienteId, setClienteId] = useState("todos");
  const [tipoContrato, setTipoContrato] = useState("todos");

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    if (aberto) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [aberto, onFechar]);

  const clientes = useMemo(() => {
    const mapa = new Map<string, string>();
    contratos.forEach((c) => mapa.set(c.clienteId, c.cliente.nome));
    return Array.from(mapa.entries());
  }, [contratos]);

  const dadosPeriodo = useMemo(() => {
    if (periodo === "todos") return fluxoCaixa;
    return fluxoCaixa.slice(-Number(periodo));
  }, [fluxoCaixa, periodo]);

  const mesesPeriodo = useMemo(() => dadosPeriodo.map((d) => d.mes), [dadosPeriodo]);

  const contratosFiltrados = useMemo(
    () =>
      contratos.filter((c) => {
        if (clienteId !== "todos" && c.clienteId !== clienteId) return false;
        if (tipoContrato !== "todos" && c.tipoPagamento !== tipoContrato) return false;
        return true;
      }),
    [contratos, clienteId, tipoContrato],
  );

  const porCliente = useMemo(() => {
    const mapa = new Map<string, { nome: string; previsto: number; recebido: number }>();
    for (const c of contratosFiltrados) {
      for (const p of c.parcelas) {
        const mesParcela = `${p.vencimento.getFullYear()}-${String(p.vencimento.getMonth() + 1).padStart(2, "0")}`;
        if (!mesesPeriodo.includes(mesParcela)) continue;
        const atual = mapa.get(c.clienteId) ?? { nome: c.cliente.nome, previsto: 0, recebido: 0 };
        atual.previsto += p.valor;
        if (p.pagamento) atual.recebido += p.pagamento.valorPago;
        mapa.set(c.clienteId, atual);
      }
    }
    return Array.from(mapa.values()).sort((a, b) => b.previsto - a.previsto);
  }, [contratosFiltrados, mesesPeriodo]);

  if (!aberto) return null;

  const periodoLabel = periodo === "todos" ? "Todo o período" : `Últimos ${periodo} meses`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Visão expandida do fluxo de caixa"
      onClick={onFechar}
    >
      <div
        className="flex h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Coluna principal — título, tipo de gráfico, gráfico, período */}
        <div className="flex min-w-0 flex-1 flex-col p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Fluxo de caixa</h2>
              <p className="text-xs text-muted-foreground">{periodoLabel}</p>
            </div>
            <button onClick={onFechar} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Fechar">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mb-4 inline-flex w-fit gap-1 rounded-md bg-muted p-1">
            {(
              [
                { tipo: "barra" as const, Icon: BarChart3, label: "Barra" },
                { tipo: "linha" as const, Icon: IconLine, label: "Linha" },
                { tipo: "pizza" as const, Icon: IconPie, label: "Pizza" },
              ]
            ).map(({ tipo, Icon, label }) => (
              <button
                key={tipo}
                onClick={() => setTipoGrafico(tipo)}
                aria-pressed={tipoGrafico === tipo}
                aria-label={label}
                title={label}
                className={`flex h-7 w-9 items-center justify-center rounded transition-colors ${
                  tipoGrafico === tipo ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              {tipoGrafico === "pizza" ? (
                <PieChart>
                  <Tooltip formatter={(v) => formatMoeda(Number(v))} />
                  <Legend />
                  <Pie data={porCliente} dataKey="recebido" nameKey="nome" outerRadius={110} label>
                    {porCliente.map((_, i) => (
                      <Cell key={i} fill={CORES_CLIENTE[i % CORES_CLIENTE.length]} />
                    ))}
                  </Pie>
                </PieChart>
              ) : tipoGrafico === "linha" ? (
                <LineChart data={dadosPeriodo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatMoedaCurta} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={56} />
                  <Tooltip formatter={(v) => formatMoeda(Number(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="previsto" name="Previsto" stroke="var(--muted-foreground)" strokeDasharray="4 3" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="recebido" name="Recebido" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              ) : (
                <BarChart data={dadosPeriodo}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatMoedaCurta} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={56} />
                  <Tooltip formatter={(v) => formatMoeda(Number(v))} />
                  <Legend />
                  <Bar dataKey="previsto" name="Previsto" fill="var(--muted-foreground)" fillOpacity={0.3} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recebido" name="Recebido" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="mt-4 flex justify-center gap-1 border-t border-border pt-3">
            {(["3", "6", "todos"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodo(p)}
                aria-pressed={periodo === p}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  periodo === p ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "3" ? "3 meses" : p === "6" ? "6 meses" : "Todo o período"}
              </button>
            ))}
          </div>
        </div>

        {/* Painel lateral — detalhamento por cliente e filtros */}
        <div className="hidden w-72 shrink-0 flex-col gap-6 overflow-y-auto border-l border-border p-5 sm:flex">
          <div>
            <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              De onde veio o dinheiro
            </div>
            {porCliente.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem dados para esse filtro.</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {porCliente.map((c, i) => (
                  <li key={c.nome} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: CORES_CLIENTE[i % CORES_CLIENTE.length] }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate">{c.nome}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">{formatMoeda(c.recebido)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Filtros
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Tipo de contrato
                <Select value={tipoContrato} onChange={(e) => setTipoContrato(e.target.value)}>
                  <option value="todos">Todos os tipos</option>
                  <option value="fixo">Fixo</option>
                  <option value="exito">Êxito</option>
                  <option value="misto">Misto</option>
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Cliente
                <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="todos">Todos os clientes</option>
                  {clientes.map(([id, nome]) => (
                    <option key={id} value={id}>
                      {nome}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
