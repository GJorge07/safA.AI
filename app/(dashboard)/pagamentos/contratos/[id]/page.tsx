import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BlocoCobranca } from "@/components/dashboard/bloco-cobranca";
import { OpiniaoContrato } from "@/components/dashboard/opiniao-contrato";
import { ParcelasContrato, type ParcelaLinha } from "@/components/dashboard/parcelas-contrato";
import {
  diasDeAtraso,
  numeroContrato,
  numeroDespesa,
  parcelasAtrasadas,
  saldoEmAberto,
  statusDoContrato,
  totalPagoDoContrato,
  type ContratoComRelacoes,
  type StatusContrato,
} from "@/components/dashboard/types";
import { listarContratosDoCliente, obterContratoComRelacoes } from "@/lib/db/contratos";
import { listarDespesasDoContrato, rotuloCategoria } from "@/lib/db/despesas";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ABAS = ["parcelas", "clausula", "cliente", "despesas"] as const;
type Aba = (typeof ABAS)[number];

const rotuloAba: Record<Aba, string> = {
  parcelas: "Parcelas",
  clausula: "Cláusula original",
  cliente: "Cliente",
  despesas: "Despesas do caso",
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
  const [irmaos, despesas] = await Promise.all([
    aba === "cliente" ? listarContratosDoCliente(contrato.clienteId, contrato.id) : Promise.resolve([]),
    aba === "despesas" ? listarDespesasDoContrato(contrato.id) : Promise.resolve([]),
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
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {rotuloAba[nome]}
              </Link>
            ))}
          </nav>

          {aba === "parcelas" && <ParcelasContrato parcelas={paraLinhas(contrato)} />}
          {aba === "clausula" && <AbaClausula contrato={contrato} />}
          {aba === "cliente" && <AbaCliente contrato={contrato} irmaos={irmaos} />}
          {aba === "despesas" && <AbaDespesas despesas={despesas} />}
        </div>

        <aside className="flex flex-col gap-4">
          <OpiniaoContrato contratoId={contrato.id} />
        </aside>
      </div>
    </div>
  );
}

function paraLinhas(contrato: ContratoComRelacoes): ParcelaLinha[] {
  return contrato.parcelas.map((parcela, i) => {
    const dias = parcela.pagamento ? 0 : diasDeAtraso(parcela.vencimento);
    return {
      id: parcela.id,
      indice: i + 1,
      valor: parcela.valor,
      vencimento: parcela.vencimento.toISOString().slice(0, 10),
      vencimentoTexto: data(parcela.vencimento),
      status: parcela.pagamento ? "paga" : dias > 0 ? "atrasada" : "prevista",
      diasAtraso: dias,
      valorPago: parcela.pagamento?.valorPago ?? null,
      dataPagoTexto: parcela.pagamento ? data(parcela.pagamento.dataPago) : null,
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

function AbaDespesas({ despesas }: { despesas: Awaited<ReturnType<typeof listarDespesasDoContrato>> }) {
  if (despesas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <FileText className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Nenhuma despesa lançada neste caso</p>
        <p className="text-xs text-muted-foreground">
          Custas, diligências e perícias lançadas na aba Despesas aparecem aqui quando amarradas a este contrato.
        </p>
      </div>
    );
  }

  const total = despesas.reduce((soma, d) => soma + d.valor, 0);
  const reembolsavel = despesas.filter((d) => d.reembolsavel).reduce((soma, d) => soma + d.valor, 0);

  return (
    <div className="flex flex-col gap-3">
      {/* O que sobra do caso: sem isto o advogado só enxerga o bruto. */}
      <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-card p-3 text-sm">
        <span>
          Total de despesas: <strong className="font-mono tabular-nums">{moeda(total)}</strong>
        </span>
        <span className="text-muted-foreground">
          Reembolsável: <strong className="font-mono tabular-nums">{moeda(reembolsavel)}</strong>
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead className="w-24">Nº</TableHead>
            <TableHead className="w-40">Categoria</TableHead>
            <TableHead className="w-32 text-right">Valor</TableHead>
            <TableHead className="w-28">Vencimento</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {despesas.map((despesa) => (
            <TableRow key={despesa.id}>
              <TableCell>
                <Link href={`/pagamentos/despesas/${despesa.id}`} className="font-medium hover:underline">
                  {despesa.descricao}
                </Link>
                {despesa.reembolsavel && (
                  <Badge variant="warning" className="ml-1.5">
                    reembolsável
                  </Badge>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{numeroDespesa(despesa)}</TableCell>
              <TableCell className="text-xs">{rotuloCategoria[despesa.categoria]}</TableCell>
              <TableCell className="text-right font-mono tabular-nums">{moeda(despesa.valor)}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{data(despesa.vencimento)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
