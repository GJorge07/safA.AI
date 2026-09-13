"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FileUp, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { CategoriaDespesa, Recorrencia } from "@/lib/types";

const CATEGORIAS: { valor: CategoriaDespesa; texto: string }[] = [
  { valor: "custas_processuais", texto: "Custas processuais" },
  { valor: "diligencia", texto: "Diligência" },
  { valor: "pericia", texto: "Perícia" },
  { valor: "software", texto: "Software" },
  { valor: "estrutura", texto: "Estrutura" },
  { valor: "tributos", texto: "Tributos" },
  { valor: "pessoal", texto: "Pessoal" },
  { valor: "outros", texto: "Outros" },
];

const RECORRENCIAS: { valor: Recorrencia; texto: string }[] = [
  { valor: "unica", texto: "Única" },
  { valor: "mensal", texto: "Mensal" },
  { valor: "anual", texto: "Anual" },
];

const hoje = () => new Date().toISOString().slice(0, 10);

// Lançamento manual é a via principal de despesa: custas e assinaturas o
// advogado já sabe de cabeça e digita em segundos.
export function DespesaForm({ contratos }: { contratos: { id: string; rotulo: string }[] }) {
  const router = useRouter();
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<CategoriaDespesa>("custas_processuais");
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState(hoje);
  const [recorrencia, setRecorrencia] = useState<Recorrencia>("unica");
  const [fornecedor, setFornecedor] = useState("");
  const [contratoId, setContratoId] = useState("");
  const [reembolsavel, setReembolsavel] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [revisao, setRevisao] = useState<string[]>([]);
  const [textoOriginal, setTextoOriginal] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  // O comprovante só preenche o formulário — nada é gravado sem o advogado
  // conferir e clicar em lançar.
  async function lerComprovante(arquivo: File | undefined) {
    if (!arquivo) return;
    setLendo(true);
    setErro(null);
    setRevisao([]);
    try {
      const formData = new FormData();
      formData.append("file", arquivo);
      const res = await fetch("/api/despesas/extrair", { method: "POST", body: formData });
      const corpo = await res.json().catch(() => null);
      if (!res.ok) throw new Error(corpo?.error ?? `Falha ao ler o comprovante (HTTP ${res.status}).`);

      const { extracao, motivosRevisao } = corpo;
      if (extracao.descricao) setDescricao(extracao.descricao);
      if (extracao.categoria) setCategoria(extracao.categoria);
      if (extracao.valor !== null) setValor(String(extracao.valor));
      if (extracao.vencimento) setVencimento(extracao.vencimento);
      if (extracao.fornecedor) setFornecedor(extracao.fornecedor);
      setTextoOriginal(extracao.textoOriginal ?? null);
      setRevisao(motivosRevisao ?? []);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui ler esse comprovante.");
    } finally {
      setLendo(false);
      if (inputArquivo.current) inputArquivo.current.value = "";
    }
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const res = await fetch("/api/despesas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: descricao.trim(),
          categoria,
          valor: Number(valor.replace(",", ".")),
          vencimento,
          recorrencia,
          fornecedor: fornecedor.trim() || null,
          contratoId: contratoId || null,
          reembolsavel,
          textoOriginal,
        }),
      });
      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        throw new Error(corpo?.error ?? `Falha ao lançar (HTTP ${res.status}).`);
      }
      setDescricao("");
      setValor("");
      setFornecedor("");
      setContratoId("");
      setReembolsavel(false);
      setTextoOriginal(null);
      setRevisao([]);
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui lançar a despesa.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border p-3">
        <input
          ref={inputArquivo}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => lerComprovante(e.target.files?.[0])}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => inputArquivo.current?.click()}
          disabled={lendo}
        >
          {lendo ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          Ler de um comprovante
        </Button>
        <span className="text-xs text-muted-foreground">
          Opcional — o recibo só preenche os campos abaixo; nada é lançado sem você confirmar.
        </span>
      </div>

      {revisao.length > 0 && (
        <p className="flex items-start gap-2 rounded-md bg-warning-bg px-3 py-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Confira antes de lançar: {revisao.join("; ")}.</span>
        </p>
      )}

      {textoOriginal && (
        <blockquote className="rounded-md border-l-2 border-primary bg-card p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
          {textoOriginal}
        </blockquote>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Descrição" className="sm:col-span-2">
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Custas iniciais do processo..."
            required
            maxLength={300}
          />
        </Campo>
        <Campo rotulo="Categoria">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaDespesa)}>
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
            placeholder="249,90"
            required
          />
        </Campo>
        <Campo rotulo="Vencimento">
          <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} required />
        </Campo>
        <Campo rotulo="Recorrência">
          <Select value={recorrencia} onChange={(e) => setRecorrencia(e.target.value as Recorrencia)}>
            {RECORRENCIAS.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.texto}
              </option>
            ))}
          </Select>
        </Campo>
        <Campo rotulo="Fornecedor">
          <Input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="TJPR" />
        </Campo>
        <Campo rotulo="Contrato do caso (opcional)">
          <Select value={contratoId} onChange={(e) => setContratoId(e.target.value)}>
            <option value="">Nenhum</option>
            {contratos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo}
              </option>
            ))}
          </Select>
        </Campo>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={reembolsavel}
            onChange={(e) => setReembolsavel(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Reembolsável pelo cliente
        </label>
        <Button type="submit" size="sm" disabled={salvando || !descricao.trim() || !valor.trim()}>
          {salvando ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          Lançar despesa
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
