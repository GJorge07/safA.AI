import Link from "next/link";
import { Receipt } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DespesaAcoes } from "./despesa-acoes";
import { Paginacao } from "./paginacao";
import { numeroDespesa, statusDaDespesa, type DespesaUI, type StatusDespesa } from "./types";
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
}: {
  pagina: PaginaDespesas;
  params: URLSearchParams;
  temFiltro: boolean;
}) {
  if (pagina.total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Receipt className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Nenhuma despesa encontrada</p>
        <p className="text-xs text-muted-foreground">
          {temFiltro ? "Ajuste a busca ou os filtros." : "Lance a primeira despesa no formulário acima."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Descrição</TableHead>
            <TableHead className="w-24">Nº</TableHead>
            <TableHead className="w-40">Categoria</TableHead>
            <TableHead className="w-32 text-right">Valor</TableHead>
            <TableHead className="w-28">Vencimento</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-28 text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagina.itens.map((despesa) => (
            <LinhaDespesa key={despesa.id} despesa={despesa} />
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

function LinhaDespesa({ despesa }: { despesa: DespesaUI }) {
  const status = statusDaDespesa(despesa);

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
          {despesa.fornecedor ?? "sem fornecedor"}
          {despesa.recorrencia !== "unica" && ` · ${despesa.recorrencia}`}
          {despesa.contrato && ` · ${despesa.contrato.cliente.nome}`}
        </span>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{numeroDespesa(despesa)}</TableCell>
      <TableCell className="text-xs">
        {rotuloCategoria[despesa.categoria]}
        {despesa.reembolsavel && (
          <Badge variant="warning" className="ml-1.5">
            reembolsável
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">{moeda(despesa.valor)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{dataCurta(despesa.vencimento)}</TableCell>
      <TableCell>
        <Badge variant={statusVariant[status]} dot>
          {statusLabel[status]}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <DespesaAcoes id={despesa.id} paga={status === "paga"} />
      </TableCell>
    </TableRow>
  );
}
