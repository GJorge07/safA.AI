import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DespesaAcoes } from "@/components/dashboard/despesa-acoes";
import {
  aguardandoReembolso,
  numeroDespesa,
  statusDaDespesa,
  type StatusDespesa,
} from "@/components/dashboard/types";
import { obterDespesa, rotuloCategoria, rotuloRecorrencia, rotuloTipo } from "@/lib/db/despesas";

export const dynamic = "force-dynamic";

const statusLabel: Record<StatusDespesa, string> = {
  paga: "Paga",
  atrasada: "Atrasada",
  prevista: "Prevista",
};

const statusVariant: Record<StatusDespesa, "success" | "destructive" | "neutral"> = {
  paga: "success",
  atrasada: "destructive",
  prevista: "neutral",
};

const rotuloOrigem = { manual: "Lançamento manual", upload: "Upload", drive: "Google Drive" } as const;

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function data(valor: Date) {
  return valor.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export default async function DespesaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const despesa = await obterDespesa(id);
  if (!despesa) notFound();

  const status = statusDaDespesa(despesa);
  const reembolso = aguardandoReembolso(despesa);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/pagamentos?aba=despesas"
        className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Voltar para Despesas
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl bg-accent/60 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{numeroDespesa(despesa)}</span>
              <Badge variant={statusVariant[status]} dot>
                {statusLabel[status]}
              </Badge>
              <Badge variant="neutral">{rotuloTipo[despesa.tipo]}</Badge>
              {reembolso && <Badge variant="warning">a reembolsar</Badge>}
            </div>
            <h1 className="mt-1 text-xl font-semibold">{despesa.descricao}</h1>
            <p className="text-sm text-muted-foreground">
              {rotuloCategoria[despesa.categoria]}
              {despesa.fornecedor && ` · ${despesa.fornecedor}`}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-3xl font-semibold tabular-nums">{moeda(despesa.valor)}</div>
            <div className="text-xs text-muted-foreground">vence em {data(despesa.vencimento)}</div>
          </div>
        </div>
        <DespesaAcoes id={despesa.id} paga={status === "paga"} aReembolsar={reembolso} />
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo rotulo="Recorrência" valor={rotuloRecorrencia[despesa.recorrencia]} />
        <Campo rotulo="Pagamento" valor={despesa.pagoEm ? `pago em ${data(despesa.pagoEm)}` : "em aberto"} />
        <Campo
          rotulo="Quem arca com o gasto"
          valor={
            despesa.quemPaga === "cliente"
              ? despesa.cobradoEm
                ? `cliente — cobrado em ${data(despesa.cobradoEm)}`
                : "cliente — ainda não cobrado"
              : "você (sai do seu bolso)"
          }
        />
        <Campo rotulo="Origem do registro" valor={rotuloOrigem[despesa.origem]} />
        <Campo rotulo="Lançada em" valor={data(despesa.createdAt)} />
        <div className="rounded-lg border border-border bg-card p-4">
          <dt className="text-xs text-muted-foreground">Caso vinculado</dt>
          <dd className="mt-1 text-sm">
            {despesa.contrato ? (
              <Link href={`/pagamentos/contratos/${despesa.contrato.id}`} className="font-medium hover:underline">
                CT-{String(despesa.contrato.numero).padStart(4, "0")} · {despesa.contrato.cliente.nome}
              </Link>
            ) : (
              <span className="text-muted-foreground">despesa do escritório, sem caso vinculado</span>
            )}
          </dd>
        </div>
      </dl>

      {despesa.textoOriginal && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium">Texto original do comprovante</h2>
          <p className="text-xs text-muted-foreground">
            Trecho literal extraído do recibo ou nota — confira antes de considerar o lançamento correto.
          </p>
          <blockquote className="rounded-lg border-l-2 border-primary bg-card p-4 font-mono text-sm leading-relaxed whitespace-pre-wrap">
            {despesa.textoOriginal}
          </blockquote>
        </div>
      )}
    </div>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="mt-1 text-sm">{valor}</dd>
    </div>
  );
}
