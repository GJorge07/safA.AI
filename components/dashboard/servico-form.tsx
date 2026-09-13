"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CategoriaServico } from "@/lib/types";

const CATEGORIAS: { valor: CategoriaServico; texto: string }[] = [
  { valor: "consulta", texto: "Consulta / orientação" },
  { valor: "parecer", texto: "Parecer" },
  { valor: "peticao", texto: "Petição avulsa" },
  { valor: "audiencia", texto: "Audiência avulsa" },
  { valor: "elaboracao_contrato", texto: "Elaboração de contrato" },
  { valor: "outros_servico", texto: "Outros" },
];

const hoje = () => new Date().toISOString().slice(0, 10);

// Serviço avulso é o que o advogado cobra sem contrato — e é onde ele mais
// perde dinheiro por não registrar. O formulário é curto de propósito.
export function ServicoForm({
  clientes,
  contratos,
  contratoFixo,
}: {
  clientes: { id: string; nome: string }[];
  contratos: { id: string; rotulo: string }[];
  contratoFixo?: string;
}) {
  const router = useRouter();
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<CategoriaServico>("consulta");
  const [valor, setValor] = useState("");
  const [realizadoEm, setRealizadoEm] = useState(hoje);
  const [vencimento, setVencimento] = useState(hoje);
  const [clienteId, setClienteId] = useState("");
  const [contratoId, setContratoId] = useState(contratoFixo ?? "");
  const [jaRecebido, setJaRecebido] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const res = await fetch("/api/servicos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: descricao.trim(),
          categoria,
          valor: Number(valor.replace(",", ".")),
          realizadoEm,
          vencimento,
          clienteId: clienteId || null,
          contratoId: contratoId || null,
          recebidoEm: jaRecebido ? realizadoEm : null,
        }),
      });
      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        throw new Error(corpo?.error ?? `Falha ao registrar (HTTP ${res.status}).`);
      }
      setDescricao("");
      setValor("");
      setClienteId("");
      if (!contratoFixo) setContratoId("");
      setJaRecebido(false);
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui registrar o serviço.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="O que foi feito" className="sm:col-span-2">
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Consulta sobre rescisão contratual"
            required
            maxLength={300}
          />
        </Campo>
        <Campo rotulo="Tipo de serviço">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaServico)}>
            {CATEGORIAS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.texto}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Valor (R$)">
          <Input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            inputMode="decimal"
            placeholder="350,00"
            required
          />
        </Campo>
        <Campo rotulo="Prestado em">
          <Input type="date" value={realizadoEm} onChange={(e) => setRealizadoEm(e.target.value)} required />
        </Campo>
        <Campo rotulo="Vence em">
          <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} required />
        </Campo>
        <Campo rotulo="Cliente">
          <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
            <option value="">Sem cliente cadastrado</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </Campo>
        {!contratoFixo && (
          <Campo rotulo="Dentro de um caso? (opcional)">
            <Select value={contratoId} onChange={(e) => setContratoId(e.target.value)}>
              <option value="">Serviço solto, fora de contrato</option>
              {contratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rotulo}
                </option>
              ))}
            </Select>
          </Campo>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Vinculado a um caso, o valor entra na receita daquele processo. Sem vínculo, conta como
        recebimento avulso do mês.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={jaRecebido}
            onChange={(e) => setJaRecebido(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Já recebi
        </label>
        <Button type="submit" size="sm" disabled={salvando || !descricao.trim() || !valor.trim()}>
          {salvando ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          Registrar
        </Button>
      </div>

      {erro && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {erro}
        </p>
      )}
    </form>
  );
}

function Campo({
  rotulo,
  children,
  className,
}: {
  rotulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-muted-foreground ${className ?? ""}`}>
      {rotulo}
      {children}
    </label>
  );
}
