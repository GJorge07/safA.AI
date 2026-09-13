"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Layers, LineChart as IconLine, PieChart as IconPie, Search, X } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { janelaCentrada, rotuloMes } from "@/lib/utils";
import type { FatiaCliente, MesFluxo, RecebidoClienteMes } from "@/lib/db/inicio";

interface ChartModalProps {
  aberto: boolean;
  onFechar: () => void;
  /** Série de 24 meses; o período escolhido recorta daqui, sem nova consulta. */
  fluxoCaixa: MesFluxo[];
  /** Recebido por cliente e por mês — somado por período já nesta tela. */
  porCliente: RecebidoClienteMes[];
  mesAtual: string;
}

type TipoGrafico = "barra" | "linha" | "pizza";

// Ordem fixa: a cor segue o cliente pela posição dele na lista do período,
// nunca é sorteada nem reciclada. Definidas em app/globals.css, com um degrau
// por tema.
const CORES_CLIENTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

/**
 * Teto de fatias COLORIDAS da pizza — é o tamanho da paleta, e passar dele
 * significaria inventar matizes que o olho (e quem tem daltonismo) não
 * separa. O excedente vira "Outros clientes" só no gráfico: a lista ao lado
 * mostra todo mundo, um a um.
 */
const LIMITE_FATIAS = CORES_CLIENTE.length;

const PERIODOS = [3, 6, 12, 18, 24] as const;

const GRAFICOS = [
  { tipo: "barra" as const, Icon: BarChart3, label: "Barras" },
  { tipo: "linha" as const, Icon: IconLine, label: "Linha" },
  { tipo: "pizza" as const, Icon: IconPie, label: "Por cliente" },
];

// Saída é plotada negativa, mas no texto o sinal já está dito pelo rótulo.
function formatMoeda(valor: number) {
  return Math.abs(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatMoedaCurta(valor: number) {
  return `${valor < 0 ? "-" : ""}R$ ${(Math.abs(valor) / 1000).toFixed(0)}k`;
}

// Soma o recebido por cliente dentro do recorte escolhido. Devolve TODOS,
// do maior para o menor — quem agrupa é só a pizza, logo abaixo.
function agregarPorCliente(linhas: RecebidoClienteMes[], meses: Set<string>): FatiaCliente[] {
  const porNome = new Map<string, number>();
  for (const linha of linhas) {
    if (!meses.has(linha.mes)) continue;
    porNome.set(linha.nome, (porNome.get(linha.nome) ?? 0) + linha.recebido);
  }

  return Array.from(porNome, ([nome, recebido]) => ({ nome, recebido })).sort(
    (a, b) => b.recebido - a.recebido,
  );
}

// A pizza só aguenta uma fatia por cor da paleta; o resto vira uma fatia só.
// A lista lateral continua mostrando cada um desses clientes separadamente.
function fatiasDaPizza(clientes: FatiaCliente[]): FatiaCliente[] {
  if (clientes.length <= LIMITE_FATIAS) return clientes;
  const resto = clientes.slice(LIMITE_FATIAS).reduce((total, c) => total + c.recebido, 0);
  return [...clientes.slice(0, LIMITE_FATIAS), { nome: "Outros clientes", recebido: resto }];
}

// A mesma janela do gráfico da tela, em três leituras e cinco períodos. Sem
// filtro de contrato: o que se filtra são contratos, e isso é trabalho da tela
// de Pagamentos.
export function ChartModal({ aberto, onFechar, fluxoCaixa, porCliente, mesAtual }: ChartModalProps) {
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("barra");
  const [meses, setMeses] = useState<number>(6);
  const [busca, setBusca] = useState("");

  // Reabrir não deve herdar a busca da consulta anterior, então toda saída
  // passa por aqui — inclusive o Esc.
  function fechar() {
    setBusca("");
    onFechar();
  }

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setBusca("");
        onFechar();
      }
    }
    if (aberto) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [aberto, onFechar]);

  const dadosPeriodo = useMemo(
    () =>
      janelaCentrada(fluxoCaixa, meses, mesAtual).map((ponto) => ({
        ...ponto,
        // Mesma convenção do card: saída abaixo do zero, uma escala só.
        saida: ponto.pago === 0 ? 0 : -ponto.pago,
      })),
    [fluxoCaixa, meses, mesAtual],
  );

  const clientesPeriodo = useMemo(
    () => agregarPorCliente(porCliente, new Set(dadosPeriodo.map((ponto) => ponto.mes))),
    [porCliente, dadosPeriodo],
  );

  const fatias = useMemo(() => fatiasDaPizza(clientesPeriodo), [clientesPeriodo]);

  const totalRecebido = clientesPeriodo.reduce((total, c) => total + c.recebido, 0);

  const termo = busca.trim().toLowerCase();
  const clientesVisiveis = termo
    ? clientesPeriodo.filter((c) => c.nome.toLowerCase().includes(termo))
    : clientesPeriodo;
  const recebidoVisivel = clientesVisiveis.reduce((total, c) => total + c.recebido, 0);

  if (!aberto) return null;

  const primeiro = dadosPeriodo[0]?.mes;
  const ultimo = dadosPeriodo[dadosPeriodo.length - 1]?.mes;
  const semDados = clientesPeriodo.length === 0;

  // Tooltip com as cores do tema. O padrão do Recharts é um retângulo branco
  // fixo, que no tema escuro aparece como um bloco estourado sobre o gráfico.
  const tooltipTema = {
    contentStyle: {
      background: "var(--popover)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      fontSize: 12,
      color: "var(--popover-foreground)",
      boxShadow: "var(--shadow-lg)",
    },
    labelStyle: { color: "var(--foreground)", fontWeight: 600, marginBottom: 4 },
    itemStyle: { color: "var(--popover-foreground)", padding: "1px 0" },
  };

  const eixos = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
      <XAxis
        dataKey="mes"
        tickFormatter={rotuloMes}
        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        axisLine={false}
        tickLine={false}
      />
      {/* Um eixo só, como no card. Dois eixos deixavam a despesa de R$ 2.700
          ser desenhada mais alta que o recebimento de R$ 363.000 ao lado. */}
      <YAxis
        tickFormatter={formatMoedaCurta}
        tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        axisLine={false}
        tickLine={false}
        width={60}
      />
      <ReferenceLine y={0} stroke="var(--border)" />
      <Legend
        wrapperStyle={{ fontSize: 12 }}
        formatter={(value) => <span style={{ color: "var(--muted-foreground)" }}>{value}</span>}
      />
    </>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--overlay)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Visão expandida do fluxo de caixa"
      onClick={fechar}
    >
      <div
        className="flex h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl border border-border bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-w-0 flex-1 flex-col p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Fluxo de caixa</h2>
              <p className="text-xs text-muted-foreground">
                {primeiro && ultimo ? `${rotuloMes(primeiro)} a ${rotuloMes(ultimo)}` : "Sem período"} ·{" "}
                {formatMoeda(totalRecebido)} recebidos
              </p>
            </div>
            <button
              onClick={fechar}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-hover hover:text-foreground"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Os dois controles ficam rotulados e com texto: ícone sozinho
              obriga o advogado a adivinhar o que cada botão faz. */}
          <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-3">
            <div>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Período
              </div>
              <div className="inline-flex gap-1 rounded-md bg-muted p-1" role="group" aria-label="Período">
                {PERIODOS.map((opcao) => (
                  <button
                    key={opcao}
                    onClick={() => setMeses(opcao)}
                    aria-pressed={meses === opcao}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      meses === opcao
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-hover-strong hover:text-foreground"
                    }`}
                  >
                    {opcao}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Ver como
              </div>
              <div className="inline-flex gap-1 rounded-md bg-muted p-1" role="group" aria-label="Tipo de gráfico">
                {GRAFICOS.map(({ tipo, Icon, label }) => (
                  <button
                    key={tipo}
                    onClick={() => setTipoGrafico(tipo)}
                    aria-pressed={tipoGrafico === tipo}
                    className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      tipoGrafico === tipo
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-hover-strong hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            {tipoGrafico === "pizza" && semDados ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Nada recebido neste período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {tipoGrafico === "pizza" ? (
                  <PieChart>
                    <Tooltip {...tooltipTema} formatter={(v, nome) => [formatMoeda(Number(v)), nome]} />
                    <Legend
                      wrapperStyle={{ fontSize: 12 }}
                      formatter={(value) => <span style={{ color: "var(--muted-foreground)" }}>{value}</span>}
                    />
                    <Pie
                      data={fatias}
                      dataKey="recebido"
                      nameKey="nome"
                      outerRadius={110}
                      paddingAngle={1}
                      stroke="var(--card)"
                      strokeWidth={2}
                      label={({ percent }: { percent?: number }) =>
                        percent && percent > 0.05 ? `${Math.round(percent * 100)}%` : ""
                      }
                    >
                      {fatias.map((fatia, i) => (
                        // A última fatia é "Outros clientes" quando houve
                        // corte: cinza de propósito, para não passar por um
                        // cliente de verdade.
                        <Cell
                          key={fatia.nome}
                          fill={i < LIMITE_FATIAS ? CORES_CLIENTE[i] : "var(--muted-foreground)"}
                          // Com busca ativa, só quem casa fica aceso.
                          fillOpacity={!termo || fatia.nome.toLowerCase().includes(termo) ? 1 : 0.15}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                ) : tipoGrafico === "linha" ? (
                  <ComposedChart data={dadosPeriodo}>
                    {eixos}
                    <Tooltip
                      {...tooltipTema}
                      cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                      labelFormatter={(label) => rotuloMes(String(label))}
                      formatter={(v, nome) => [formatMoeda(Number(v)), nome]}
                    />
                    <Line type="monotone" dataKey="previsto" name="Previsto" stroke="var(--muted-foreground)" strokeDasharray="4 3" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="recebido" name="Recebido" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="saida" name="Despesas pagas" stroke="var(--destructive)" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                ) : (
                  <ComposedChart data={dadosPeriodo}>
                    {eixos}
                    <Tooltip
                      {...tooltipTema}
                      cursor={{ fill: "var(--chart-cursor)" }}
                      labelFormatter={(label) => rotuloMes(String(label))}
                      formatter={(v, nome) => [formatMoeda(Number(v)), nome]}
                    />
                    <Bar dataKey="previsto" name="Previsto" fill="var(--muted-foreground)" fillOpacity={0.3} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="recebido" name="Recebido" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="saida" name="Despesas pagas" fill="var(--destructive)" radius={[0, 0, 4, 4]} />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l border-border p-5 sm:flex">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              De onde veio o dinheiro
            </div>
            <p className="text-[11px] text-muted-foreground">
              {formatMoeda(totalRecebido)} de{" "}
              {clientesPeriodo.length === 1 ? "1 cliente" : `${clientesPeriodo.length} clientes`} no período.
            </p>
          </div>

          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente..."
              aria-label="Buscar cliente"
              className="w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-2 text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </div>

          {semDados ? (
            <p className="text-xs text-muted-foreground">Nada recebido no período.</p>
          ) : termo && clientesVisiveis.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum cliente com “{busca.trim()}”.</p>
          ) : termo ? (
            // Uma linha de resultado, não uma lista: a busca acende a fatia
            // no gráfico e diz quanto ela representa.
            <p className="text-xs text-muted-foreground">
              <span className="font-mono tabular-nums text-foreground">{formatMoeda(recebidoVisivel)}</span>{" "}
              em {clientesVisiveis.length === 1 ? "1 cliente" : `${clientesVisiveis.length} clientes`}
              {totalRecebido > 0 && ` · ${Math.round((recebidoVisivel / totalRecebido) * 100)}% do período`}
              {tipoGrafico !== "pizza" && " · veja em “Por cliente”"}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
