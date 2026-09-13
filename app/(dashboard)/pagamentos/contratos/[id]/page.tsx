import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BlocoCobranca } from "@/components/dashboard/bloco-cobranca";
import { DespesaForm } from "@/components/dashboard/despesa-form";
import { MargemCaso } from "@/components/dashboard/margem-caso";
import { ServicoForm } from "@/components/dashboard/servico-form";
import { OpiniaoContrato } from "@/components/dashboard/opiniao-contrato";
import { ParcelasContrato, type ParcelaLinha } from "@/components/dashboard/parcelas-contrato";
import {
  aguardandoReembolso,
  diasDeAtraso,
  estaBaixada,
  numeroContrato,
  numeroDespesa,
  numeroServico,
  parcelasAtrasadas,
  saldoEmAberto,
  statusDoContrato,
  statusDoServico,
  totalPagoDoContrato,
  type ContratoComRelacoes,
  type StatusContrato,
} from "@/components/dashboard/types";
import {
  listarClientesParaSelecao,
  listarContratosDoCliente,
  listarContratosParaSelecao,
  obterContratoComRelacoes,
} from "@/lib/db/contratos";
import { listarServicosDoContrato, rotuloCategoriaServico } from "@/lib/db/servicos";
import { listarDespesasDoContrato, margemDoCaso, rotuloCategoria } from "@/lib/db/despesas";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ABAS = ["parcelas", "clausula", "cliente", "despesas", "servicos"] as const;
type Aba = (typeof ABAS)[number];

const rotuloAba: Record<Aba, string> = {
  parcelas: "Parcelas",
  clausula: "Cláusula original",
  cliente: "Cliente",
  despesas: "Gastos do caso",
  servicos: "Serviços extras",
};

const statusLabel: Record<StatusContrato, string> = {
  em_dia: "Em dia",
  atrasado: "Atrasado",
  quitado: "Quitado",
};

const statusVariant: Record<StatusContrato, "success" | "destructive" | "neutral"> = {
  em_dia: "success",
  atrasado: "destructive",
  quitado: "neutral",
};

const rotuloOrigem = { manual: "lançamento manual", upload: "upload", drive: "Google Drive" } as const;

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function data(valor: Date) {
  return valor.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

interface DetalheProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ver?: string }>;
}

export default async function ContratoDetalhePage({ params, searchParams }: DetalheProps) {
  const [{ id }, { ver }] = await Promise.all([params, searchParams]);
  const contrato = await obterContratoComRelacoes(id);
  if (!contrato) notFound();

  const aba: Aba = ABAS.includes(ver as Aba) ? (ver as Aba) : "parcelas";
  const [irmaos, despesas, servicos, margem, contratos, clientes] = await Promise.all([
    aba === "cliente" ? listarContratosDoCliente(contrato.clienteId, contrato.id) : Promise.resolve([]),
    aba === "despesas" ? listarDespesasDoContrato(contrato.id) : Promise.resolve([]),
    aba === "servicos" ? listarServicosDoContrato(contrato.id) : Promise.resolve([]),
    margemDoCaso(contrato.id),
    aba === "despesas" ? listarContratosParaSelecao() : Promise.resolve([]),
    aba === "servicos" ? listarClientesParaSelecao() : Promise.resolve([]),
  ]);

  const status = statusDoContrato(contrato);
  const pago = totalPagoDoContrato(contrato);
  const aberto = saldoEmAberto(contrato);
  const atrasadas = parcelasAtrasadas(contrato);
  const parcelasPagas = contrato.parcelas.filter((p) => p.pagamento).length;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/pagamentos"
        className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Voltar para Pagamentos
      </Link>

      <Cabecalho contrato={contrato} status={status} pago={pago} aberto={aberto} parcelasPagas={parcelasPagas} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          {atrasadas.length > 0 && (
            <BlocoCobranca
              numero={numeroContrato(contrato)}
              cliente={{
                nome: contrato.cliente.nome,
                documento: contrato.cliente.documento,
                email: contrato.cliente.email,
                telefone: contrato.cliente.telefone,
              }}
              parcelas={atrasadas.map((item) => ({
                indice: item.indice,
                total: item.total,
                dias: item.dias,
                saldo: item.saldo,
                vencimento: data(item.parcela.vencimento),
              }))}
              totalAtrasado={atrasadas.reduce((soma, item) => soma + item.saldo, 0)}
            />
          )}

          <nav className="flex flex-wrap gap-1 border-b border-border" aria-label="Conteúdo do contrato">
            {ABAS.map((nome) => (
              <Link
                key={nome}
                href={nome === "parcelas" ? `/pagamentos/contratos/${contrato.id}` : `/pagamentos/contratos/${contrato.id}?ver=${nome}`}
                aria-current={aba === nome ? "page" : undefined}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  aba === nome
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:border-input hover:text-foreground",
                )}
              >
                {rotuloAba[nome]}
              </Link>
            ))}
          </nav>

          {aba === "parcelas" && <ParcelasContrato parcelas={paraLinhas(contrato)} />}
          {aba === "clausula" && <AbaClausula contrato={contrato} />}
          {aba === "cliente" && <AbaCliente contrato={contrato} irmaos={irmaos} />}
          {aba === "despesas" && (
            <AbaDespesas despesas={despesas} contratoId={contrato.id} contratos={contratos} />
          )}
          {aba === "servicos" && (
            <AbaServicos servicos={servicos} contratoId={contrato.id} clientes={clientes} />
          )}
        </div>

        <aside className="flex flex-col gap-4">
          {margem && <MargemCaso margem={margem} />}
          <OpiniaoContrato contratoId={contrato.id} />
        </aside>
      </div>
    </div>
  );
}

function paraLinhas(contrato: ContratoComRelacoes): ParcelaLinha[] {
  return contrato.parcelas.map((parcela, i) => {
    const baixada = estaBaixada(parcela);
    const dias = parcela.pagamento || baixada ? 0 : diasDeAtraso(parcela.vencimento);
    return {
      id: parcela.id,
      indice: i + 1,
      valor: parcela.valor,
      vencimento: parcela.vencimento.toISOString().slice(0, 10),
      vencimentoTexto: data(parcela.vencimento),
      status: baixada ? "baixada" : parcela.pagamento ? "paga" : dias > 0 ? "atrasada" : "prevista",
      diasAtraso: dias,
      valorPago: parcela.pagamento?.valorPago ?? null,
      dataPagoTexto: parcela.pagamento ? data(parcela.pagamento.dataPago) : null,
      motivoBaixa: parcela.motivoBaixa,
      notaBaixa: parcela.notaBaixa,
    };
  });
}

function Cabecalho({
  contrato,
  status,
  pago,
  aberto,
  parcelasPagas,
}: {
  contrato: ContratoComRelacoes;
  status: StatusContrato;
  pago: number;
  aberto: number;
  parcelasPagas: number;
}) {
  const percentual = contrato.valorTotal > 0 ? (pago / contrato.valorTotal) * 100 : 0;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-accent/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{numeroContrato(contrato)}</span>
            <Badge variant={statusVariant[status]} dot>
              {statusLabel[status]}
            </Badge>
            <Badge variant="neutral" className="capitalize">
              {contrato.tipoPagamento}
            </Badge>
          </div>
          <h1 className="mt-1 truncate text-xl font-semibold">{contrato.titulo ?? contrato.cliente.nome}</h1>
          <p className="text-sm text-muted-foreground">
            {contrato.cliente.nome}
            {contrato.processo && ` · processo ${contrato.processo}`}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-3xl font-semibold tabular-nums">{moeda(contrato.valorTotal)}</div>
          <div className="text-xs text-muted-foreground">
            {aberto > 0 ? `${moeda(aberto)} em aberto` : "totalmente recebido"}
          </div>
        </div>
      </div>

      <div>
        <Progress value={percentual} />
        <p className="mt-1.5 text-xs text-muted-foreground">
          {moeda(pago)} de {moeda(contrato.valorTotal)} recebidos · {parcelasPagas} de {contrato.parcelas.length} parcelas
        </p>
      </div>
    </div>
  );
}

function AbaClausula({ contrato }: { contrato: ContratoComRelacoes }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Trecho literal do contrato — é por aqui que você confere o que a IA extraiu. Origem:{" "}
        {rotuloOrigem[contrato.origem]}
        {contrato.arquivoNome && ` · ${contrato.arquivoNome}`}.
      </p>
      <blockquote className="rounded-lg border-l-2 border-primary bg-card p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
        {contrato.clausulaOriginal}
      </blockquote>
    </div>
  );
}

function AbaCliente({ contrato, irmaos }: { contrato: ContratoComRelacoes; irmaos: ContratoComRelacoes[] }) {
  const { cliente } = contrato;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium">{cliente.nome}</p>
        {cliente.documento && <p className="text-xs text-muted-foreground">{cliente.documento}</p>}
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          {cliente.telefone && (
            <a href={`tel:${cliente.telefone.replace(/\D/g, "")}`} className="flex items-center gap-1.5 hover:underline">
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {cliente.telefone}
            </a>
          )}
          {cliente.email && (
            <a href={`mailto:${cliente.email}`} className="flex items-center gap-1.5 hover:underline">
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              {cliente.email}
            </a>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Cliente desde {data(cliente.createdAt)}</p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium">Outros contratos deste cliente</h2>
        {irmaos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Este é o único contrato do cliente.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contrato</TableHead>
                <TableHead className="w-24">Tipo</TableHead>
                <TableHead className="w-32 text-right">Total</TableHead>
                <TableHead className="w-32 text-right">Em aberto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {irmaos.map((irmao) => (
                <TableRow key={irmao.id}>
                  <TableCell>
                    <Link href={`/pagamentos/contratos/${irmao.id}`} className="font-medium hover:underline">
                      {numeroContrato(irmao)} · {irmao.titulo ?? "sem título"}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">{irmao.tipoPagamento}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{moeda(irmao.valorTotal)}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{moeda(saldoEmAberto(irmao))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function AbaDespesas({
  despesas,
  contratoId,
  contratos,
}: {
  despesas: Awaited<ReturnType<typeof listarDespesasDoContrato>>;
  contratoId: string;
  contratos: { id: string; rotulo: string }[];
}) {
  const total = despesas.reduce((soma, d) => soma + d.valor, 0);
  const porContaDoAdvogado = despesas
    .filter((d) => d.quemPaga === "advogado")
    .reduce((soma, d) => soma + d.valor, 0);
  const aReembolsar = despesas.filter(aguardandoReembolso).reduce((soma, d) => soma + d.valor, 0);

  return (
    <div className="flex flex-col gap-4">
      <details className="group rounded-lg border border-border" open={despesas.length === 0}>
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">+ Lançar um gasto neste caso</span>
          <span className="hidden group-open:inline">− Lançar um gasto neste caso</span>
        </summary>
        <div className="border-t border-border p-4">
          <DespesaForm contratos={contratos} tipoInicial="processo" contratoFixo={contratoId} />
        </div>
      </details>

      {despesas.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <FileText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Nenhum gasto lançado neste caso</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Transporte até o fórum, custas, cópias, diligência. São valores pequenos que passam batido — e são
            eles que decidem quanto realmente sobra deste processo.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-card p-3 text-sm">
            <span>
              Total gasto: <strong className="font-mono tabular-nums">{moeda(total)}</strong>
            </span>
            <span className="text-destructive">
              Do seu bolso: <strong className="font-mono tabular-nums">{moeda(porContaDoAdvogado)}</strong>
            </span>
            {aReembolsar > 0 && (
              <span className="text-warning">
                A reembolsar: <strong className="font-mono tabular-nums">{moeda(aReembolsar)}</strong>
              </span>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gasto</TableHead>
                <TableHead className="w-20">Nº</TableHead>
                <TableHead className="w-48">Categoria</TableHead>
                <TableHead className="w-28 text-right">Valor</TableHead>
                <TableHead className="w-28">Data</TableHead>
                <TableHead className="w-32">Quem arca</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {despesas.map((despesa) => (
                <TableRow key={despesa.id}>
                  <TableCell>
                    <Link href={`/pagamentos/despesas/${despesa.id}`} className="font-medium hover:underline">
                      {despesa.descricao}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{numeroDespesa(despesa)}</TableCell>
                  <TableCell className="text-xs">{rotuloCategoria[despesa.categoria]}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{moeda(despesa.valor)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{data(despesa.vencimento)}</TableCell>
                  <TableCell>
                    {aguardandoReembolso(despesa) ? (
                      <Badge variant="warning">a reembolsar</Badge>
                    ) : despesa.quemPaga === "cliente" ? (
                      <span className="text-xs text-success">cliente</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">você</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}

// O que foi cobrado além do contrato dentro deste mesmo caso — a audiência
// extra, o parecer pedido no meio do processo. Entra na receita do caso.
function AbaServicos({
  servicos,
  contratoId,
  clientes,
}: {
  servicos: Awaited<ReturnType<typeof listarServicosDoContrato>>;
  contratoId: string;
  clientes: { id: string; nome: string }[];
}) {
  const total = servicos.reduce((soma, s) => soma + s.valor, 0);
  const recebido = servicos.filter((s) => s.recebidoEm).reduce((soma, s) => soma + s.valor, 0);

  return (
    <div className="flex flex-col gap-4">
      <details className="group rounded-lg border border-border" open={servicos.length === 0}>
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">+ Registrar serviço extra neste caso</span>
          <span className="hidden group-open:inline">− Registrar serviço extra neste caso</span>
        </summary>
        <div className="border-t border-border p-4">
          <ServicoForm clientes={clientes} contratos={[]} contratoFixo={contratoId} />
        </div>
      </details>

      {servicos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <FileText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Nenhum serviço extra neste caso</p>
          <p className="max-w-md text-xs text-muted-foreground">
            Audiência que não estava no contrato, parecer pedido no meio do processo, petição avulsa —
            registre aqui para não trabalhar de graça.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-card p-3 text-sm">
            <span>
              Total cobrado: <strong className="font-mono tabular-nums">{moeda(total)}</strong>
            </span>
            <span className="text-success">
              Já recebido: <strong className="font-mono tabular-nums">{moeda(recebido)}</strong>
            </span>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead className="w-20">Nº</TableHead>
                <TableHead className="w-44">Tipo</TableHead>
                <TableHead className="w-28 text-right">Valor</TableHead>
                <TableHead className="w-28">Prestado em</TableHead>
                <TableHead className="w-28">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicos.map((servico) => {
                const status = statusDoServico(servico);
                return (
                  <TableRow key={servico.id}>
                    <TableCell className="font-medium">{servico.descricao}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {numeroServico(servico)}
                    </TableCell>
                    <TableCell className="text-xs">{rotuloCategoriaServico[servico.categoria]}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{moeda(servico.valor)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{data(servico.realizadoEm)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          status === "recebido" ? "success" : status === "atrasado" ? "destructive" : "neutral"
                        }
                        dot
                      >
                        {status === "recebido" ? "Recebido" : status === "atrasado" ? "Atrasado" : "A receber"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}
    </div>
  );
}
