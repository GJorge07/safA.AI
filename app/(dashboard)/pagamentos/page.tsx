import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChipsFiltro, type Chip } from "@/components/dashboard/chips-filtro";
import { ContratosTabela } from "@/components/dashboard/contratos-tabela";
import { DespesaForm } from "@/components/dashboard/despesa-form";
import { DespesasTabela } from "@/components/dashboard/despesas-tabela";
import { DriveSync } from "@/components/dashboard/drive-sync";
import { BuscaUrl, SelectUrl } from "@/components/dashboard/filtros-url";
import { UploadContrato } from "@/components/dashboard/upload-contrato";
import { VisaoToggle } from "@/components/dashboard/visao-toggle";
import {
  contadoresContratos,
  listarContratosPaginado,
  listarContratosParaSelecao,
  type OrdenacaoContratos,
  type StatusFiltro,
} from "@/lib/db/contratos";
import {
  aReceberNoMes,
  contadoresDespesas,
  listarDespesasPaginado,
  resumoDespesasDoMes,
  type FiltroDespesas,
} from "@/lib/db/despesas";
import type { CategoriaDespesa, Recorrencia, TipoPagamento } from "@/lib/types";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Busca = Record<string, string | string[] | undefined>;

interface PagamentosPageProps {
  searchParams: Promise<Busca>;
}

function texto(busca: Busca, nome: string): string | undefined {
  const valor = busca[nome];
  return Array.isArray(valor) ? valor[0] : valor;
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PagamentosPage({ searchParams }: PagamentosPageProps) {
  const busca = await searchParams;
  const aba = texto(busca, "aba") === "despesas" ? "despesas" : "recebimentos";

  // A query string atual é a base dos links de paginação e dos chips.
  const params = new URLSearchParams();
  for (const [nome, valor] of Object.entries(busca)) {
    const primeiro = Array.isArray(valor) ? valor[0] : valor;
    if (primeiro) params.set(nome, primeiro);
  }

  const [receber, despesasResumo] = await Promise.all([aReceberNoMes(), resumoDespesasDoMes()]);
  const saldo = receber - despesasResumo.emAbertoMes;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">
          O que entra pelos contratos de honorários e o que sai em despesas do escritório, no mesmo lugar.
        </p>
      </div>

      {/* Os três números só fazem sentido juntos — é o que justifica entrada e
          saída dividirem a mesma tela. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Resumo
          icone={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
          rotulo="A receber neste mês"
          valor={moeda(receber)}
          tom="success"
        />
        <Resumo
          icone={<ArrowDownRight className="h-4 w-4" aria-hidden="true" />}
          rotulo="A pagar neste mês"
          valor={moeda(despesasResumo.emAbertoMes)}
          tom="destructive"
          detalhe={
            despesasResumo.atrasado > 0 ? `${moeda(despesasResumo.atrasado)} já vencidos` : undefined
          }
        />
        <Resumo
          icone={<Scale className="h-4 w-4" aria-hidden="true" />}
          rotulo="Saldo projetado"
          valor={moeda(saldo)}
          tom={saldo >= 0 ? "success" : "destructive"}
        />
      </div>

      <nav className="flex gap-1 border-b border-border" aria-label="Seções de pagamentos">
        <Aba href={hrefAba(params, "recebimentos")} ativa={aba === "recebimentos"}>
          Recebimentos
        </Aba>
        <Aba href={hrefAba(params, "despesas")} ativa={aba === "despesas"}>
          Despesas
        </Aba>
      </nav>

      {aba === "recebimentos" ? (
        <SecaoRecebimentos busca={busca} params={params} />
      ) : (
        <SecaoDespesas busca={busca} params={params} />
      )}
    </div>
  );
}

// Trocar de aba zera filtros e página: os parâmetros de contrato não querem
// dizer nada em despesa, e vice-versa.
function hrefAba(params: URLSearchParams, aba: "recebimentos" | "despesas") {
  const copia = new URLSearchParams();
  const visao = params.get("visao");
  if (visao) copia.set("visao", visao);
  if (aba === "despesas") copia.set("aba", "despesas");
  const query = copia.toString();
  return query ? `/pagamentos?${query}` : "/pagamentos";
}

async function SecaoRecebimentos({ busca, params }: { busca: Busca; params: URLSearchParams }) {
  const visao = texto(busca, "visao") === "cards" ? "cards" : "tabela";
  const filtro = {
    pagina: Number(texto(busca, "pagina") ?? 1) || 1,
    busca: texto(busca, "busca"),
    tipo: (texto(busca, "tipo") ?? "todos") as TipoPagamento | "todos",
    status: (texto(busca, "status") ?? "todos") as StatusFiltro,
    ordenar: (texto(busca, "ordenar") ?? "recentes") as OrdenacaoContratos,
    vence7: texto(busca, "vence") === "7",
  };

  const [pagina, contadores] = await Promise.all([
    listarContratosPaginado(filtro),
    contadoresContratos(),
  ]);

  const chips: Chip[] = [
    { texto: "Todos", aplica: { status: null, vence: null }, contagem: contadores.total },
    { texto: "Atrasados", aplica: { status: "atrasado", vence: null }, contagem: contadores.atrasados, tom: "destructive" },
    { texto: "Vencem em 7 dias", aplica: { status: null, vence: "7" }, contagem: contadores.vencendoEm7Dias, tom: "warning" },
    { texto: "Quitados", aplica: { status: "quitado", vence: null }, contagem: contadores.quitados },
  ];

  const temFiltro = Boolean(
    filtro.busca || filtro.tipo !== "todos" || filtro.status !== "todos" || filtro.vence7,
  );

  return (
    <div className="flex flex-col gap-6">
      <DriveSync />

      <details className="group rounded-lg border border-border">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">+ Enviar manualmente (alternativa)</span>
          <span className="hidden group-open:inline">− Enviar manualmente (alternativa)</span>
        </summary>
        <div className="border-t border-border p-4">
          <UploadContrato />
        </div>
      </details>

      <Card>
        <CardHeader>
          <CardTitle>Contratos de honorários</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ChipsFiltro chips={chips} params={params} basePath="/pagamentos" />

          <div className="flex flex-wrap items-center gap-2">
            <BuscaUrl placeholder="Buscar por cliente, documento ou nº..." rotulo="Buscar contrato" />
            <SelectUrl
              nome="tipo"
              rotulo="Filtrar por tipo de contrato"
              opcoes={[
                { valor: "todos", texto: "Todos os tipos" },
                { valor: "fixo", texto: "Fixo" },
                { valor: "exito", texto: "Êxito" },
                { valor: "misto", texto: "Misto" },
              ]}
            />
            <SelectUrl
              nome="status"
              rotulo="Filtrar por status"
              opcoes={[
                { valor: "todos", texto: "Todos os status" },
                { valor: "em_dia", texto: "Em dia" },
                { valor: "atrasado", texto: "Atrasado" },
                { valor: "quitado", texto: "Quitado" },
              ]}
            />
            <SelectUrl
              nome="ordenar"
              rotulo="Ordenar contratos"
              padrao="recentes"
              opcoes={[
                { valor: "recentes", texto: "Mais recentes" },
                { valor: "maior_valor", texto: "Maior valor" },
                { valor: "cliente", texto: "Cliente (A-Z)" },
                { valor: "vencimento", texto: "Mais parcelas" },
              ]}
            />
            <VisaoToggle visao={visao} />
          </div>

          <ContratosTabela pagina={pagina} visao={visao} params={params} temFiltro={temFiltro} />
        </CardContent>
      </Card>
    </div>
  );
}

async function SecaoDespesas({ busca, params }: { busca: Busca; params: URLSearchParams }) {
  const filtro: FiltroDespesas = {
    pagina: Number(texto(busca, "pagina") ?? 1) || 1,
    busca: texto(busca, "busca"),
    categoria: (texto(busca, "categoria") ?? "todos") as CategoriaDespesa | "todos",
    status: (texto(busca, "status") ?? "todos") as FiltroDespesas["status"],
    recorrencia: (texto(busca, "recorrencia") ?? "todos") as Recorrencia | "todos",
    vence7: texto(busca, "vence") === "7",
  };

  const [pagina, contadores, resumo, contratos] = await Promise.all([
    listarDespesasPaginado(filtro),
    contadoresDespesas(),
    resumoDespesasDoMes(),
    listarContratosParaSelecao(),
  ]);

  const chips: Chip[] = [
    { texto: "Todas", aplica: { status: null, vence: null }, contagem: contadores.total },
    { texto: "Atrasadas", aplica: { status: "atrasada", vence: null }, contagem: contadores.atrasadas, tom: "destructive" },
    { texto: "Vencem em 7 dias", aplica: { status: null, vence: "7" }, contagem: contadores.vencendoEm7Dias, tom: "warning" },
    { texto: "Pagas", aplica: { status: "paga", vence: null }, contagem: contadores.pagas },
  ];

  const temFiltro = Boolean(
    filtro.busca ||
      filtro.categoria !== "todos" ||
      filtro.status !== "todos" ||
      filtro.recorrencia !== "todos" ||
      filtro.vence7,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MiniResumo rotulo="Total do mês" valor={moeda(resumo.totalMes)} />
        <MiniResumo rotulo="Vencendo em 7 dias" valor={moeda(resumo.vencendoEm7Dias)} />
        <MiniResumo
          rotulo="Reembolsável em aberto"
          valor={moeda(resumo.reembolsavelEmAberto)}
          detalhe="cobrável do cliente"
        />
      </div>

      <details className="group rounded-lg border border-border" open={pagina.total === 0}>
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">+ Lançar despesa</span>
          <span className="hidden group-open:inline">− Lançar despesa</span>
        </summary>
        <div className="border-t border-border p-4">
          <DespesaForm contratos={contratos} />
        </div>
      </details>

      <Card>
        <CardHeader>
          <CardTitle>Despesas do escritório</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ChipsFiltro chips={chips} params={params} basePath="/pagamentos" />

          <div className="flex flex-wrap items-center gap-2">
            <BuscaUrl placeholder="Buscar por descrição, fornecedor ou nº..." rotulo="Buscar despesa" />
            <SelectUrl
              nome="categoria"
              rotulo="Filtrar por categoria"
              className="w-48"
              opcoes={[
                { valor: "todos", texto: "Todas as categorias" },
                { valor: "custas_processuais", texto: "Custas processuais" },
                { valor: "diligencia", texto: "Diligência" },
                { valor: "pericia", texto: "Perícia" },
                { valor: "software", texto: "Software" },
                { valor: "estrutura", texto: "Estrutura" },
                { valor: "tributos", texto: "Tributos" },
                { valor: "pessoal", texto: "Pessoal" },
                { valor: "outros", texto: "Outros" },
              ]}
            />
            <SelectUrl
              nome="recorrencia"
              rotulo="Filtrar por recorrência"
              opcoes={[
                { valor: "todos", texto: "Toda recorrência" },
                { valor: "unica", texto: "Única" },
                { valor: "mensal", texto: "Mensal" },
                { valor: "anual", texto: "Anual" },
              ]}
            />
          </div>

          <DespesasTabela pagina={pagina} params={params} temFiltro={temFiltro} />
        </CardContent>
      </Card>
    </div>
  );
}

function Aba({ href, ativa, children }: { href: string; ativa: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={ativa ? "page" : undefined}
      className={cn(
        "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors",
        ativa
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

function Resumo({
  icone,
  rotulo,
  valor,
  tom,
  detalhe,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
  tom: "success" | "destructive";
  detalhe?: string;
}) {
  return (
    <div className="rounded-2xl bg-accent/60 p-5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className={tom === "success" ? "text-success" : "text-destructive"}>{icone}</span>
        {rotulo}
      </div>
      <div
        className={cn(
          "mt-1 font-mono text-2xl font-semibold tabular-nums",
          tom === "destructive" ? "text-destructive" : "text-foreground",
        )}
      >
        {valor}
      </div>
      {detalhe && <div className="mt-0.5 text-xs text-destructive">{detalhe}</div>}
    </div>
  );
}

function MiniResumo({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{rotulo}</div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums">{valor}</div>
      {detalhe && <div className="text-xs text-muted-foreground">{detalhe}</div>}
    </div>
  );
}
