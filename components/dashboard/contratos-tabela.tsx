import Link from "next/link";
import { FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ContratoCard } from "./contrato-card";
import { Paginacao } from "./paginacao";
import {
  numeroContrato,
  proximoVencimento,
  saldoEmAberto,
  statusDoContrato,
  type ContratoComRelacoes,
  type StatusContrato,
} from "./types";
import type { PaginaContratos } from "@/lib/db/contratos";

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

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function hrefContrato(id: string) {
  return `/pagamentos/contratos/${id}`;
}

interface ContratosTabelaProps {
  pagina: PaginaContratos;
  visao: "tabela" | "cards";
  params: URLSearchParams;
  temFiltro: boolean;
}

export function ContratosTabela({ pagina, visao, params, temFiltro }: ContratosTabelaProps) {
  if (pagina.total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <FolderOpen className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Nenhum contrato encontrado</p>
        <p className="text-xs text-muted-foreground">
          {temFiltro
            ? "Ajuste a busca ou os filtros."
            : "Envie um contrato ou conecte sua pasta do Drive para começar."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {visao === "cards" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {pagina.itens.map((contrato) => (
            <Link
              key={contrato.id}
              href={hrefContrato(contrato.id)}
              className="rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ContratoCard contrato={contrato} />
            </Link>
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead className="w-24">Nº</TableHead>
              <TableHead className="w-24">Tipo</TableHead>
              <TableHead className="w-32 text-right">Valor total</TableHead>
              <TableHead className="w-32 text-right">Em aberto</TableHead>
              <TableHead className="w-32">Próx. venc.</TableHead>
              <TableHead className="w-28">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagina.itens.map((contrato) => (
              <LinhaContrato key={contrato.id} contrato={contrato} />
            ))}
          </TableBody>
        </Table>
      )}

      <Paginacao
        pagina={pagina.pagina}
        paginas={pagina.paginas}
        total={pagina.total}
        tamanho={pagina.tamanho}
        params={params}
        basePath="/pagamentos"
        rotuloItens="contratos"
      />
    </div>
  );
}

function LinhaContrato({ contrato }: { contrato: ContratoComRelacoes }) {
  const status = statusDoContrato(contrato);
  const vencimento = proximoVencimento(contrato);
  const aberto = saldoEmAberto(contrato);

  return (
    <TableRow>
      <TableCell className="max-w-[220px]">
        {/* A linha inteira é link, mas a âncora fica na célula do nome para
            continuar abrindo em nova aba e ser anunciada por leitor de tela. */}
        <Link
          href={hrefContrato(contrato.id)}
          className="block truncate font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {contrato.cliente.nome}
        </Link>
        {contrato.titulo && <span className="block truncate text-xs text-muted-foreground">{contrato.titulo}</span>}
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{numeroContrato(contrato)}</TableCell>
      <TableCell className="capitalize">{contrato.tipoPagamento}</TableCell>
      <TableCell className="text-right font-mono tabular-nums">{moeda(contrato.valorTotal)}</TableCell>
      <TableCell className="text-right font-mono tabular-nums">
        {aberto > 0 ? moeda(aberto) : <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {vencimento ? vencimento.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"}
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant[status]} dot>
          {statusLabel[status]}
        </Badge>
      </TableCell>
    </TableRow>
  );
}
