import Link from "next/link";
import { Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Paginacao } from "./paginacao";
import { ServicoAcoes } from "./servico-acoes";
import { diasDeAtraso, numeroServico, statusDoServico, type ServicoUI, type StatusServico } from "./types";
import { rotuloCategoriaServico, type PaginaServicos } from "@/lib/db/servicos";

const statusLabel: Record<StatusServico, string> = {
  recebido: "Recebido",
  atrasado: "Atrasado",
  a_receber: "A receber",
};

const statusVariant: Record<StatusServico, "success" | "destructive" | "neutral"> = {
  recebido: "success",
  atrasado: "destructive",
  a_receber: "neutral",
};

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataCurta(data: Date) {
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function ServicosTabela({
  pagina,
  params,
  temFiltro,
}: {
  pagina: PaginaServicos;
  params: URLSearchParams;
  temFiltro: boolean;
}) {
  if (pagina.total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <Briefcase className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Nenhum serviço avulso registrado</p>
        <p className="max-w-md text-xs text-muted-foreground">
          {temFiltro
            ? "Ajuste a busca ou os filtros."
            : "Consulta, parecer, petição avulsa, audiência fora do contrato — registre aqui o que você cobra sem contrato."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Serviço</TableHead>
            <TableHead className="w-20">Nº</TableHead>
            <TableHead className="w-44">Cliente</TableHead>
            <TableHead className="w-28 text-right">Valor</TableHead>
            <TableHead className="w-28">Vencimento</TableHead>
            <TableHead className="w-28">Situação</TableHead>
            <TableHead className="w-32 text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pagina.itens.map((servico) => (
            <LinhaServico key={servico.id} servico={servico} />
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
        rotuloItens="serviços"
      />
    </div>
  );
}

function LinhaServico({ servico }: { servico: ServicoUI }) {
  const status = statusDoServico(servico);
  const dias = status === "atrasado" ? diasDeAtraso(servico.vencimento) : 0;

  return (
    <TableRow>
      <TableCell className="max-w-[260px]">
        <span className="block truncate font-medium">{servico.descricao}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {rotuloCategoriaServico[servico.categoria]}
          {/* O vínculo com o caso é o que diferencia um extra de um avulso solto. */}
          {servico.contrato && ` · dentro do CT-${String(servico.contrato.numero).padStart(4, "0")}`}
        </span>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{numeroServico(servico)}</TableCell>
      <TableCell className="max-w-[176px] text-xs">
        {servico.contrato ? (
          <Link href={`/pagamentos/contratos/${servico.contrato.id}`} className="block truncate hover:underline">
            {servico.cliente?.nome ?? "ver caso"}
          </Link>
        ) : (
          <span className="block truncate">{servico.cliente?.nome ?? "—"}</span>
        )}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">{moeda(servico.valor)}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{dataCurta(servico.vencimento)}</TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <Badge variant={statusVariant[status]} dot>
            {statusLabel[status]}
          </Badge>
          {dias > 0 && <span className="text-[11px] text-destructive">{dias} dia(s)</span>}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <ServicoAcoes id={servico.id} recebido={status === "recebido"} />
      </TableCell>
    </TableRow>
  );
}
