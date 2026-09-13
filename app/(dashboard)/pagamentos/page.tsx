import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Briefcase, Building2, FileText, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContratosTabela } from "@/components/dashboard/contratos-tabela";
import { DespesaForm } from "@/components/dashboard/despesa-form";
import { DespesasTabela } from "@/components/dashboard/despesas-tabela";
import { DriveSync } from "@/components/dashboard/drive-sync";
import { ServicoForm } from "@/components/dashboard/servico-form";
import { ServicosTabela } from "@/components/dashboard/servicos-tabela";
import { BuscaUrl, SelectUrl } from "@/components/dashboard/filtros-url";
import { UploadContrato } from "@/components/dashboard/upload-contrato";
import { VisaoToggle } from "@/components/dashboard/visao-toggle";
import {
  contadoresContratos,
  type ContadoresContratos,
  listarClientesParaSelecao,
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
  rotuloCategoria,
  type OrdenacaoDespesas,
  type ResumoDespesas,
  CATEGORIAS_ESCRITORIO,
  CATEGORIAS_PROCESSO,
  type FiltroDespesas,
} from "@/lib/db/despesas";
import {
  contadoresServicos,
  listarServicosPaginado,
  resumoServicosDoMes,
  rotuloCategoriaServico,
  CATEGORIAS_SERVICO,
  type ContadoresServicos,
  type FiltroServicos,
} from "@/lib/db/servicos";
import type { CategoriaDespesa, CategoriaServico, TipoDespesa, TipoPagamento } from "@/lib/types";
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

  // A query string atual é a base dos links de paginação.
  const params = new URLSearchParams();
  for (const [nome, valor] of Object.entries(busca)) {
    const primeiro = Array.isArray(valor) ? valor[0] : valor;
    if (primeiro) params.set(nome, primeiro);
  }

  const [receber, despesasResumo] = await Promise.all([aReceberNoMes(), resumoDespesasDoMes()]);
  const saldo = receber.total - despesasResumo.emAbertoMes;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Pagamentos</h1>
        <p className="text-sm text-muted-foreground">
          O que entra — por contrato e por serviço avulso — e o que sai em despesas, no mesmo lugar.
        </p>
      </div>

      {/* Os três números só fazem sentido juntos — é o que justifica entrada e
          saída dividirem a mesma tela. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Resumo
          icone={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
          rotulo="A receber neste mês"
          valor={moeda(receber.total)}
          tom="success"
          detalhe={
            receber.servicos > 0
              ? `${moeda(receber.contratos)} de contratos + ${moeda(receber.servicos)} de serviços`
              : undefined
          }
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
        <SecaoDespesas busca={busca} params={params} resumo={despesasResumo} />
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
  // As duas vias pelas quais o dinheiro entra: o contrato de honorários, com
  // parcelas e cláusula, e o serviço avulso, que é cobrança única.
  const sub = texto(busca, "sub") === "servicos" ? "servicos" : "contratos";

  // Contados uma vez só e repassados: sub-abas e lista pedem os mesmos números.
  const [contratos, servicos] = await Promise.all([contadoresContratos(), contadoresServicos()]);

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex flex-wrap gap-2" aria-label="Origem do recebimento">
        <SubAba href="/pagamentos" ativa={sub === "contratos"} contagem={contratos.total}>
          <FileText className="h-4 w-4" aria-hidden="true" />
          Por contrato
        </SubAba>
        <SubAba href={hrefServicos(params)} ativa={sub === "servicos"} contagem={servicos.total}>
          <Briefcase className="h-4 w-4" aria-hidden="true" />
          Serviços avulsos
        </SubAba>
      </nav>

      {sub === "contratos" ? (
        <ViaContratos busca={busca} params={params} contadores={contratos} />
      ) : (
        <ViaServicos busca={busca} params={params} contadores={servicos} />
      )}
    </div>
  );
}

// Mesma regra das despesas: a situação do recebimento vale nos dois lados, o
// resto é específico de contrato.
function hrefServicos(params: URLSearchParams) {
  const copia = new URLSearchParams({ sub: "servicos" });
  const status = params.get("status");
  if (status === "atrasado") copia.set("status", "atrasado");
  return `/pagamentos?${copia.toString()}`;
}

async function ViaContratos({
  busca,
  params,
  contadores,
}: {
  busca: Busca;
  params: URLSearchParams;
  contadores: ContadoresContratos;
}) {
  const visao = texto(busca, "visao") === "cards" ? "cards" : "tabela";
  const filtro = {
    pagina: Number(texto(busca, "pagina") ?? 1) || 1,
    busca: texto(busca, "busca"),
    tipo: (texto(busca, "tipo") ?? "todos") as TipoPagamento | "todos",
    status: (texto(busca, "status") ?? "todos") as StatusFiltro,
    ordenar: (texto(busca, "ordenar") ?? "recentes") as OrdenacaoContratos,
  };

  const pagina = await listarContratosPaginado(filtro);


  const temFiltro = Boolean(filtro.busca || filtro.tipo !== "todos" || filtro.status !== "todos");

  return (
    <>
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
              rotulo="Filtrar por situação"
              className="w-48"
              opcoes={[
                { valor: "todos", texto: `Todos (${contadores.total})` },
                { valor: "atrasado", texto: `Atrasados (${contadores.atrasados})` },
                { valor: "vence_7", texto: `Vencem em 7 dias (${contadores.vencendoEm7Dias})` },
                { valor: "em_dia", texto: "Em dia" },
                { valor: "quitado", texto: `Quitados (${contadores.quitados})` },
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
    </>
  );
}

async function ViaServicos({
  busca,
  params,
  contadores,
}: {
  busca: Busca;
  params: URLSearchParams;
  contadores: ContadoresServicos;
}) {
  const filtro: FiltroServicos = {
    pagina: Number(texto(busca, "pagina") ?? 1) || 1,
    busca: texto(busca, "busca"),
    categoria: (texto(busca, "categoria") ?? "todos") as CategoriaServico | "todos",
    status: (texto(busca, "status") ?? "todos") as FiltroServicos["status"],
  };

  const [pagina, resumo, clientes, contratos] = await Promise.all([
    listarServicosPaginado(filtro),
    resumoServicosDoMes(),
    listarClientesParaSelecao(),
    listarContratosParaSelecao(),
  ]);


  const temFiltro = Boolean(filtro.busca || filtro.categoria !== "todos" || filtro.status !== "todos");

  return (
    <>
      <p className="text-sm text-muted-foreground">
        O que você cobra sem contrato: consulta, parecer, petição avulsa, audiência fora do que foi
        contratado. Cobrança única, sem parcela — e justamente por isso é o que mais deixa de ser cobrado.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MiniResumo
          rotulo="Serviços no mês"
          valor={moeda(resumo.totalMes)}
          detalhe={`${resumo.quantidadeMes} serviço(s)`}
        />
        <MiniResumo rotulo="Já recebido" valor={moeda(resumo.recebidoMes)} />
        <MiniResumo
          rotulo="Vencido e não recebido"
          valor={moeda(resumo.atrasado)}
          destaque={resumo.atrasado > 0}
        />
      </div>

      <details className="group rounded-lg border border-border" open={pagina.total === 0}>
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">+ Registrar serviço</span>
          <span className="hidden group-open:inline">− Registrar serviço</span>
        </summary>
        <div className="border-t border-border p-4">
          <ServicoForm clientes={clientes} contratos={contratos} />
        </div>
      </details>

      <Card>
        <CardHeader>
          <CardTitle>Serviços avulsos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">

          <div className="flex flex-wrap items-center gap-2">
            <BuscaUrl placeholder="Buscar por serviço, cliente ou nº..." rotulo="Buscar serviço" />
            <SelectUrl
              nome="categoria"
              rotulo="Filtrar por tipo de serviço"
              className="w-52"
              opcoes={[
                { valor: "todos", texto: "Todos os tipos" },
                ...CATEGORIAS_SERVICO.map((categoria) => ({
                  valor: categoria,
                  texto: rotuloCategoriaServico[categoria],
                })),
              ]}
            />
            <SelectUrl
              nome="status"
              rotulo="Filtrar por situação do recebimento"
              className="w-44"
              opcoes={[
                { valor: "todos", texto: `Todos (${contadores.total})` },
                { valor: "a_receber", texto: `A receber (${contadores.aReceber})` },
                { valor: "atrasado", texto: `Atrasados (${contadores.atrasados})` },
                { valor: "recebido", texto: `Recebidos (${contadores.recebidos})` },
              ]}
            />
          </div>

          <ServicosTabela pagina={pagina} params={params} temFiltro={temFiltro} />
        </CardContent>
      </Card>
    </>
  );
}


async function SecaoDespesas({
  busca,
  params,
  resumo,
}: {
  busca: Busca;
  params: URLSearchParams;
  // Vem pronto da página: era a mesma consulta rodando duas vezes por render.
  resumo: ResumoDespesas;
}) {
  // A separação que o advogado precisa enxergar: gasto de caso (que come a
  // margem daquele processo) x custo fixo do escritório.
  const sub: TipoDespesa = texto(busca, "sub") === "escritorio" ? "escritorio" : "processo";
  const doProcesso = sub === "processo";

  const filtro: FiltroDespesas = {
    pagina: Number(texto(busca, "pagina") ?? 1) || 1,
    busca: texto(busca, "busca"),
    tipo: sub,
    categoria: (texto(busca, "categoria") ?? "todos") as CategoriaDespesa | "todos",
    status: (texto(busca, "status") ?? "todos") as FiltroDespesas["status"],
    ordenar: (texto(busca, "ordenar") ?? "recentes") as OrdenacaoDespesas,
  };

  const [pagina, contadores, contratos] = await Promise.all([
    listarDespesasPaginado(filtro),
    contadoresDespesas(new Date(), sub),
    doProcesso ? listarContratosParaSelecao() : Promise.resolve([]),
  ]);


  const temFiltro = Boolean(filtro.busca || filtro.categoria !== "todos" || filtro.status !== "todos");

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex gap-2" aria-label="Tipo de despesa">
        <SubAba href={hrefSub(params, "processo")} ativa={doProcesso} contagem={contadores.doProcesso}>
          <Scale className="h-4 w-4" aria-hidden="true" />
          Do processo
        </SubAba>
        <SubAba href={hrefSub(params, "escritorio")} ativa={!doProcesso} contagem={contadores.doEscritorio}>
          <Building2 className="h-4 w-4" aria-hidden="true" />
          Do escritório
        </SubAba>
      </nav>

      {doProcesso ? (
        <>
          <p className="text-sm text-muted-foreground">
            Transporte até o fórum, custas, diligência, cópias. São gastos pequenos e frequentes — somados,
            são eles que decidem quanto sobra de cada caso.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniResumo rotulo="Gasto em processos no mês" valor={moeda(resumo.doProcessoNoMes)} />
            <MiniResumo
              rotulo="A reembolsar"
              valor={moeda(resumo.aReembolsar)}
              detalhe={
                resumo.aReembolsarQuantidade > 0
                  ? `${resumo.aReembolsarQuantidade} gasto(s) que você adiantou e ainda não cobrou`
                  : "nada pendente de cobrança"
              }
              destaque={resumo.aReembolsar > 0}
            />
            <MiniResumo rotulo="Vencendo em 7 dias" valor={moeda(resumo.vencendoEm7Dias)} />
          </div>
        </>
      ) : (
        <MiniResumo rotulo="Custo fixo no mês" valor={moeda(resumo.doEscritorioNoMes)} />
      )}

      <details className="group rounded-lg border border-border" open={pagina.total === 0}>
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">+ Lançar despesa</span>
          <span className="hidden group-open:inline">− Lançar despesa</span>
        </summary>
        <div className="border-t border-border p-4">
          <DespesaForm contratos={contratos} tipoInicial={sub} />
        </div>
      </details>

      <Card>
        <CardHeader>
          <CardTitle>{doProcesso ? "Gastos dos processos" : "Custos do escritório"}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">

          <div className="flex flex-wrap items-center gap-2">
            <BuscaUrl
              placeholder={doProcesso ? "Buscar por gasto, cliente ou nº..." : "Buscar por gasto, fornecedor ou nº..."}
              rotulo="Buscar despesa"
            />
            <SelectUrl
              nome="categoria"
              rotulo="Filtrar por categoria"
              className="w-52"
              opcoes={[
                { valor: "todos", texto: "Todas as categorias" },
                ...(doProcesso ? CATEGORIAS_PROCESSO : CATEGORIAS_ESCRITORIO).map((categoria) => ({
                  valor: categoria,
                  texto: rotuloCategoria[categoria],
                })),
              ]}
            />
            <SelectUrl
              nome="status"
              rotulo="Filtrar por situação do pagamento"
              className="w-48"
              // Cobre todos os valores que o filtro aceita — assim nenhuma URL
              // válida deixa o campo em branco.
              opcoes={[
                { valor: "todos", texto: `Todas (${contadores.total})` },
                { valor: "em_aberto", texto: `Não pagas (${contadores.emAberto})` },
                { valor: "atrasada", texto: `Atrasadas (${contadores.atrasadas})` },
                { valor: "vence_7", texto: `Vencem em 7 dias (${contadores.vencendoEm7Dias})` },
                { valor: "paga", texto: `Pagas (${contadores.pagas})` },
                ...(doProcesso
                  ? [{ valor: "a_reembolsar", texto: `A reembolsar (${contadores.aReembolsar})` }]
                  : []),
              ]}
            />
            <SelectUrl
              nome="ordenar"
              rotulo="Ordenar despesas"
              padrao="recentes"
              className="w-44"
              opcoes={[
                { valor: "recentes", texto: "Mais recentes" },
                { valor: "maior_valor", texto: "Maior valor" },
                { valor: "vencimento", texto: "Vence primeiro" },
              ]}
            />
          </div>

          <DespesasTabela
            pagina={pagina}
            params={params}
            temFiltro={temFiltro}
            mostrarCaso={doProcesso}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Trocar de sub-aba zera categoria e página — as categorias de processo não
// existem no escritório — mas preserva a situação do pagamento, que vale nos
// dois lados. A exceção é "a reembolsar", que só existe em gasto de processo.
function hrefSub(params: URLSearchParams, sub: TipoDespesa) {
  const copia = new URLSearchParams();
  copia.set("aba", "despesas");
  if (sub === "escritorio") copia.set("sub", "escritorio");

  const status = params.get("status");
  if (status && !(sub === "escritorio" && status === "a_reembolsar")) copia.set("status", status);

  return `/pagamentos?${copia.toString()}`;
}

function SubAba({
  href,
  ativa,
  contagem,
  children,
}: {
  href: string;
  ativa: boolean;
  contagem: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={ativa ? "true" : undefined}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
        ativa
          ? "border-primary bg-accent text-accent-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      <span className="font-mono text-xs opacity-70">{contagem}</span>
    </Link>
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
      {detalhe && (
        <div className={cn("mt-0.5 text-xs", tom === "success" ? "text-muted-foreground" : "text-destructive")}>
          {detalhe}
        </div>
      )}
    </div>
  );
}

function MiniResumo({
  rotulo,
  valor,
  detalhe,
  destaque,
}: {
  rotulo: string;
  valor: string;
  detalhe?: string;
  destaque?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border bg-card p-4", destaque ? "border-warning/50" : "border-border")}>
      <div className="text-xs text-muted-foreground">{rotulo}</div>
      <div
        className={cn(
          "mt-1 font-mono text-lg font-semibold tabular-nums",
          destaque && "text-warning",
        )}
      >
        {valor}
      </div>
      {detalhe && <div className="text-xs text-muted-foreground">{detalhe}</div>}
    </div>
  );
}
