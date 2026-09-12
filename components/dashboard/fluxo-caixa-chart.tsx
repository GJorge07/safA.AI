"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FluxoCaixaMes } from "@/lib/types";

function formatMoedaCurta(valor: number) {
  return `R$ ${(valor / 1000).toFixed(1)}k`;
}

interface FluxoCaixaChartProps {
  dados: FluxoCaixaMes[];
  mesSelecionado?: string | null;
  onSelecionarMes?: (mes: string) => void;
  /** Mês que ganha o "pill" de destaque no eixo (geralmente o mais recente). */
  mesEmDestaque?: string;
  altura?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TickMes({ x, y, payload, mesEmDestaque }: any) {
  const ativo = mesEmDestaque && payload.value === mesEmDestaque;
  if (!ativo) {
    return (
      <text x={x} y={y + 14} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
        {payload.value}
      </text>
    );
  }
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-17} y={4} width={34} height={17} rx={8.5} fill="var(--primary)" />
      <text x={0} y={16} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="var(--primary-foreground)">
        {payload.value}
      </text>
    </g>
  );
}

export function FluxoCaixaChart({ dados, mesSelecionado, onSelecionarMes, mesEmDestaque, altura = 240 }: FluxoCaixaChartProps) {
  function fator(mes: string) {
    if (!mesSelecionado) return 1;
    return mes === mesSelecionado ? 1 : 0.3;
  }

  function clicar(data: { payload?: FluxoCaixaMes }) {
    const mes = data.payload?.mes;
    if (!mes || !onSelecionarMes) return;
    onSelecionarMes(mes === mesSelecionado ? "" : mes);
  }

  return (
    <ResponsiveContainer width="100%" height={altura}>
      <BarChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 4 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="mes"
          axisLine={false}
          tickLine={false}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tick={(props: any) => <TickMes {...props} mesEmDestaque={mesEmDestaque} />}
        />
        <YAxis tickFormatter={formatMoedaCurta} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          cursor={{ fill: "var(--card-2)" }}
          contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          formatter={(value) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        />
        <Bar
          dataKey="previsto"
          name="Previsto"
          fill="var(--muted-foreground)"
          radius={[4, 4, 0, 0]}
          cursor={onSelecionarMes ? "pointer" : undefined}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={(data: any) => clicar(data)}
        >
          {dados.map((entry) => (
            <Cell key={entry.mes} fillOpacity={0.3 * fator(entry.mes)} />
          ))}
        </Bar>
        <Bar
          dataKey="recebido"
          name="Recebido"
          fill="var(--primary)"
          radius={[4, 4, 0, 0]}
          cursor={onSelecionarMes ? "pointer" : undefined}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={(data: any) => clicar(data)}
        >
          {dados.map((entry) => (
            <Cell key={entry.mes} fillOpacity={fator(entry.mes)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
