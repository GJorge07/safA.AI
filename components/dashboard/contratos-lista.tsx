"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, FolderOpen, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ContratoCard } from "./contrato-card";
import { statusDoContrato, type ContratoComRelacoes } from "./types";

const PAGINA_TAMANHO = 10;

interface ContratosListaProps {
  contratos: ContratoComRelacoes[] | null;
  carregando?: boolean;
  erro?: string | null;
  onTentarDeNovo?: () => void;
  /** Mostra a própria busca + filtros de tipo/status (útil quando a lista
   *  não vem pré-filtrada por outro painel, como em /contratos). */
  mostrarFiltros?: boolean;
}

export function ContratosLista({
  contratos,
  carregando,
  erro,
  onTentarDeNovo,
  mostrarFiltros = true,
}: ContratosListaProps) {
  const [busca, setBusca] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [status, setStatus] = useState("todos");
  const [pagina, setPagina] = useState(1);

  const filtrados = useMemo(() => {
    if (!contratos) return [];
    return contratos.filter((c) => {
      if (busca && !c.cliente.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      if (mostrarFiltros) {
        if (tipo !== "todos" && c.tipoPagamento !== tipo) return false;
        if (status !== "todos" && statusDoContrato(c) !== status) return false;
      }
      return true;
    });
  }, [contratos, busca, tipo, status, mostrarFiltros]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGINA_TAMANHO));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const visiveis = filtrados.slice((paginaAtual - 1) * PAGINA_TAMANHO, paginaAtual * PAGINA_TAMANHO);

  function atualizarBusca(valor: string) {
    setBusca(valor);
    setPagina(1);
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
        <p className="text-sm">{erro}</p>
        {onTentarDeNovo && (
          <Button size="sm" variant="secondary" onClick={onTentarDeNovo}>
            Tentar de novo
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={busca}
            onChange={(e) => atualizarBusca(e.target.value)}
            placeholder="Buscar por cliente..."
            className="pl-8"
            aria-label="Buscar contrato por cliente"
          />
        </div>
        {mostrarFiltros && (
          <>
            <Select
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value);
                setPagina(1);
              }}
              className="w-36"
              aria-label="Filtrar por tipo de contrato"
            >
              <option value="todos">Todos os tipos</option>
              <option value="fixo">Fixo</option>
              <option value="exito">Êxito</option>
              <option value="misto">Misto</option>
            </Select>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPagina(1);
              }}
              className="w-36"
              aria-label="Filtrar por status"
            >
              <option value="todos">Todos os status</option>
              <option value="em_dia">Em dia</option>
              <option value="atrasado">Atrasado</option>
              <option value="quitado">Quitado</option>
            </Select>
          </>
        )}
      </div>

      {carregando ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <FolderOpen className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Nenhum contrato encontrado</p>
          <p className="text-xs text-muted-foreground">
            {busca || tipo !== "todos" || status !== "todos"
              ? "Ajuste a busca ou os filtros."
              : "Envie um contrato ou conecte sua pasta do Drive para começar."}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {visiveis.map((c) => (
              <ContratoCard key={c.id} contrato={c} />
            ))}
          </div>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <span>
                Página {paginaAtual} de {totalPaginas} · {filtrados.length} contratos
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={paginaAtual <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={paginaAtual >= totalPaginas}
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
