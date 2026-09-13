"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { rotuloMes } from "@/lib/utils";
import type { MesFluxo } from "@/lib/db/inicio";

function formatMoedaCurta(valor: number) {
  const absoluto = Math.abs(valor);
  return `${valor < 0 ? "-" : ""}R$ ${(absoluto / 1000).toFixed(0)}k`;
}

function formatMoeda(valor: number) {
  return Math.abs(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface FluxoCaixaChartProps {
  dados: MesFluxo[];
  /** Mês corrente: separa o que aconteceu do que ainda é projeção. */
  mesAtual?: string;
  altura?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TickMes({ x, y, payload, mesAtual }: any) {
  const ativo = mesAtual && payload.value === mesAtual;
  // "set/26" em vez de "2026-09": cabe no pill e lê mais rápido.
  const rotulo = rotuloMes(payload.value);
  if (!ativo) {
    return (
      <text x={x} y={y + 14} textAnchor="middle" fontSize={11} fill="var(--muted-foreground)">
        {rotulo}
      </text>
    );
  }
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x={-19} y={4} width={38} height={17} rx={8.5} fill="var(--primary)" />
      <text x={0} y={16} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="var(--primary-foreground)">
        {rotulo}
      </text>
    </g>
  );
}

export function FluxoCaixaChart({ dados, mesAtual, altura = 240 }: FluxoCaixaChartProps) {
  // Saída entra no gráfico como valor negativo: é o que coloca entrada e saída
  // em lados opostos do zero, na mesma escala, sem precisar de um segundo eixo.
  const pontos = dados.map((ponto) => ({ ...ponto, saida: ponto.pago === 0 ? 0 : -ponto.pago }));

  const indiceAtual = mesAtual ? dados.findIndex((ponto) => ponto.mes === mesAtual) : -1;
  const divisor = indiceAtual > 0 ? dados[indiceAtual - 1].mes : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <ResponsiveContainer width="100%" height={altura}>
        <ComposedChart data={pontos} margin={{ top: 8, right: 0, left: 0, bottom: 4 }} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="mes"
            axisLine={false}
            tickLine={false}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tick={(props: any) => <TickMes {...props} mesAtual={mesAtual} />}
          />
          {/* Um eixo só. Com dois, a despesa de R$ 2.700 podia ser desenhada mais
              alta que o recebimento de R$ 363.000 ao lado — e a comparação visual
              entre barras vizinhas é exatamente o que um gráfico promete. */}
          <YAxis
            tickFormatter={formatMoedaCurta}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            cursor={{ fill: "var(--chart-cursor)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              boxShadow: "var(--shadow-lg)",
              color: "var(--popover-foreground)",
            }}
            labelFormatter={(mes) => rotuloMes(String(mes))}
            formatter={(valor, nome) => [formatMoeda(Number(valor)), nome]}
          />

          <ReferenceLine y={0} stroke="var(--border)" />
          {/* A partir daqui nada aconteceu ainda: sem essa marca, o recebido
              caindo a zero no futuro parece despenque em vez de projeção. */}
          {divisor && (
            <ReferenceLine
              x={divisor}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              label={{
                value: "hoje",
                position: "insideTopRight",
                fontSize: 10,
                fill: "var(--muted-foreground)",
              }}
            />
          )}

          <Bar dataKey="previsto" name="Previsto" fill="var(--muted-foreground)" fillOpacity={0.25} radius={[4, 4, 0, 0]} />
          <Bar dataKey="recebido" name="Recebido" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="saida" name="Despesas pagas" fill="var(--destructive)" radius={[0, 0, 4, 4]} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pl-13 text-[11px] text-muted-foreground">
        <Serie cor="var(--muted-foreground)" opacidade={0.35}>Previsto</Serie>
        <Serie cor="var(--primary)">Recebido</Serie>
        <Serie cor="var(--destructive)">Despesas pagas</Serie>
      </div>
    </div>
  );
}

function Serie({ cor, opacidade = 1, children }: { cor: string; opacidade?: number; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-sm"
        style={{ background: cor, opacity: opacidade }}
        aria-hidden="true"
      />
      {children}
    </span>
  );
}
