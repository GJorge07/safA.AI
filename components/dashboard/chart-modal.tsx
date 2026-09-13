"use client";

import { useEffect, useState } from "react";
import { BarChart3, Layers, LineChart as IconLine, PieChart as IconPie, X } from "lucide-react";
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
import type { FatiaCliente, MesFluxo } from "@/lib/db/inicio";

interface ChartModalProps {
  aberto: boolean;
  onFechar: () => void;
  fluxoCaixa: MesFluxo[];
  /** Já agregado no servidor, com o excedente somado em "outros clientes". */
  porCliente: FatiaCliente[];
}

type TipoGrafico = "barra" | "linha" | "pizza";

const CORES_CLIENTE = [
  "var(--primary)",
  "var(--success)",
  "var(--warning)",
  "var(--accent-foreground)",
  "var(--destructive)",
  "var(--muted-foreground)",
];

function formatMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatMoedaCurta(valor: number) {
  return `R$ ${(valor / 1000).toFixed(1)}k`;
}

// A mesma janela do gráfico da tela, em três leituras. Sem filtros próprios: o
// que se filtra são contratos, e isso é trabalho da tela de Pagamentos.
export function ChartModal({ aberto, onFechar, fluxoCaixa, porCliente }: ChartModalProps) {
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("barra");

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    if (aberto) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [aberto, onFechar]);

  if (!aberto) return null;

  const eixos = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
      <YAxis
        tickFormatter={formatMoedaCurta}
        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        axisLine={false}
        tickLine={false}
        width={56}
      />
      <Tooltip formatter={(v) => formatMoeda(Number(v))} />
      <Legend />
    </>
  );

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
        <div className="flex min-w-0 flex-1 flex-col p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Entra e sai</h2>
              <p className="text-xs text-muted-foreground">Últimos meses</p>
            </div>
            <button
              onClick={onFechar}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Fechar"
            >
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
                <LineChart data={fluxoCaixa}>
                  {eixos}
                  <Line type="monotone" dataKey="previsto" name="Previsto" stroke="var(--muted-foreground)" strokeDasharray="4 3" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="recebido" name="Recebido" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="pago" name="Pago" stroke="var(--destructive)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              ) : (
                <BarChart data={fluxoCaixa}>
                  {eixos}
                  <Bar dataKey="previsto" name="Previsto" fill="var(--muted-foreground)" fillOpacity={0.3} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recebido" name="Recebido" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pago" name="Pago" fill="var(--destructive)" fillOpacity={0.75} radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="hidden w-72 shrink-0 flex-col gap-6 overflow-y-auto border-l border-border p-5 sm:flex">
          <div>
            <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              De onde veio o dinheiro
            </div>
            {porCliente.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nada recebido no período.</p>
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
        </div>
      </div>
    </div>
  );
}
