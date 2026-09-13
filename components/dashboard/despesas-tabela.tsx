import Link from "next/link";
import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DespesaAcoes } from "./despesa-acoes";
import { Paginacao } from "./paginacao";
import {
  aguardandoReembolso,
  numeroDespesa,
  statusDaDespesa,
  type DespesaUI,
  type StatusDespesa,
} from "./types";
import { rotuloCategoria, type PaginaDespesas } from "@/lib/db/despesas";

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

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataCurta(data: Date) {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function DespesasTabela({
  pagina,
  params,
  temFiltro,
  mostrarCaso = true,
}: {
  pagina: PaginaDespesas;
  params: URLSearchParams;
  temFiltro: boolean;
  /** A coluna de caso não faz sentido na aba do escritório. */
  mostrarCaso?: boolean;
}) {
  if (pagina.total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Receipt className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Nenhuma despesa encontrada</p>
        <p className="text-xs text-muted-foreground">
          {temFiltro ? "Ajuste a busca ou os filtros." : "Lance a primeira no formulário acima."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Despesa</TableHead>
            <TableHead className="w-20">Nº</TableHead>
            {mostrarCaso && <TableHead className="w-44">Caso</TableHead>}
            <TableHead className="w-28 text-right">Valor</TableHead>
            <TableHead className="w-28">Data</TableHead>
            <TableHead className="w-32">Situação</TableHead>
            <TableHead className="w-40 text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagina.itens.map((despesa) => (
            <LinhaDespesa key={despesa.id} despesa={despesa} mostrarCaso={mostrarCaso} />
          ))}
        </TableBody>
      </Table>

      <Paginacao
        pagina={pagina.pagina}
        paginas={pagina.paginas}
        total={pagina.total}
        tamanho={pagina.tamanho}
        params={params}
        basePath="/pagamentos"
        rotuloItens="despesas"
      />
    </div>
  );
}

function LinhaDespesa({ despesa, mostrarCaso }: { despesa: DespesaUI; mostrarCaso: boolean }) {
  const status = statusDaDespesa(despesa);
  const reembolso = aguardandoReembolso(despesa);

  return (
    <TableRow>
      <TableCell className="max-w-[260px]">
        <Link
          href={`/pagamentos/despesas/${despesa.id}`}
          className="block truncate font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {despesa.descricao}
        </Link>
        <span className="block truncate text-xs text-muted-foreground">
          {rotuloCategoria[despesa.categoria]}
          {despesa.fornecedor && ` · ${despesa.fornecedor}`}
        </span>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{numeroDespesa(despesa)}</TableCell>
      {mostrarCaso && (
        <TableCell className="max-w-[176px] text-xs">
          {despesa.contrato ? (
            <Link href={`/pagamentos/contratos/${despesa.contrato.id}`} className="block truncate hover:underline">
              {despesa.contrato.cliente.nome}
            </Link>
          ) : (
            <span className="text-muted-foreground">sem caso</span>
          )}
        </TableCell>
      )}
      <TableCell className="text-right font-mono tabular-nums">{moeda(despesa.valor)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{dataCurta(despesa.vencimento)}</TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <Badge variant={statusVariant[status]} dot>
            {statusLabel[status]}
          </Badge>
          {/* O rótulo que importa: esse dinheiro é do advogado ou volta? */}
          {reembolso ? (
            <Badge variant="warning">a reembolsar</Badge>
          ) : despesa.tipo === "processo" && despesa.quemPaga === "advogado" ? (
            <span className="text-[11px] text-muted-foreground">sai do seu bolso</span>
          ) : despesa.cobradoEm ? (
            <span className="text-[11px] text-success">cobrado</span>
          ) : null}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <DespesaAcoes id={despesa.id} paga={status === "paga"} aReembolsar={reembolso} />
      </TableCell>
    </TableRow>
  );
}
