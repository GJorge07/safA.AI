"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, FileUp, Loader2, Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CategoriaDespesa, QuemPaga, TipoDespesa } from "@/lib/types";

// Os atalhos cobrem o que o advogado iniciante mais lança e mais esquece: o
// gasto pequeno de ir até o fórum. Um clique já preenche descrição e categoria.
const ATALHOS: { texto: string; descricao: string; categoria: CategoriaDespesa }[] = [
  { texto: "Ida ao fórum", descricao: "Transporte até o fórum", categoria: "deslocamento" },
  { texto: "Estacionamento", descricao: "Estacionamento no fórum", categoria: "deslocamento" },
  { texto: "Custas", descricao: "Custas iniciais", categoria: "custas" },
  { texto: "Cópias", descricao: "Cópias e autenticação de documentos", categoria: "cartorio" },
  { texto: "Diligência", descricao: "Diligência de oficial de justiça", categoria: "diligencia" },
];

const CATEGORIAS: Record<TipoDespesa, { valor: CategoriaDespesa; texto: string }[]> = {
  processo: [
    { valor: "deslocamento", texto: "Transporte e deslocamento" },
    { valor: "custas", texto: "Custas e guias" },
    { valor: "diligencia", texto: "Diligência de oficial" },
    { valor: "cartorio", texto: "Cartório, cópias e certidões" },
    { valor: "pericia", texto: "Perícia" },
    { valor: "correspondente", texto: "Correspondente" },
    { valor: "outros_processo", texto: "Outros do processo" },
  ],
  escritorio: [
    { valor: "estrutura", texto: "Estrutura (aluguel, luz, internet)" },
    { valor: "software", texto: "Software" },
    { valor: "tributos", texto: "Tributos" },
    { valor: "pessoal", texto: "Pessoal e contabilidade" },
    { valor: "outros_escritorio", texto: "Outros do escritório" },
  ],
};

const hoje = () => new Date().toISOString().slice(0, 10);

// Lançamento manual é a via principal: a ida ao juizado o advogado lança em
// segundos, e procurar um comprovante para ela seria mais lento que a planilha.
export function DespesaForm({
  contratos,
  tipoInicial = "processo",
  contratoFixo,
}: {
  contratos: { id: string; rotulo: string }[];
  tipoInicial?: TipoDespesa;
  contratoFixo?: string;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoDespesa>(tipoInicial);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<CategoriaDespesa>(CATEGORIAS[tipoInicial][0].valor);
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState(hoje);
  const [fornecedor, setFornecedor] = useState("");
  const [contratoId, setContratoId] = useState(contratoFixo ?? "");
  const [quemPaga, setQuemPaga] = useState<QuemPaga>("advogado");
  const [jaPaga, setJaPaga] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [revisao, setRevisao] = useState<string[]>([]);
  const [textoOriginal, setTextoOriginal] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  function trocarTipo(novo: TipoDespesa) {
    setTipo(novo);
    setCategoria(CATEGORIAS[novo][0].valor);
    if (novo === "escritorio") {
      setContratoId("");
      setQuemPaga("advogado");
    }
  }

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
      if (extracao.tipo) trocarTipo(extracao.tipo);
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
          tipo,
          categoria,
          valor: Number(valor.replace(",", ".")),
          vencimento,
          fornecedor: fornecedor.trim() || null,
          contratoId: contratoId || null,
          quemPaga,
          pagoEm: jaPaga ? vencimento : null,
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
      if (!contratoFixo) setContratoId("");
      setTextoOriginal(null);
      setRevisao([]);
      router.refresh();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui lançar a despesa.");
    } finally {
      setSalvando(false);
    }
  }

  const doProcesso = tipo === "processo";

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      {/* A escolha primária é só esta: o gasto é de um caso ou do escritório?
          Tudo abaixo se ajusta a ela. */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de despesa">
        <BotaoTipo ativo={doProcesso} onClick={() => trocarTipo("processo")}>
          <Scale className="h-4 w-4" aria-hidden="true" />
          Do processo
        </BotaoTipo>
        <BotaoTipo ativo={!doProcesso} onClick={() => trocarTipo("escritorio")}>
          <Building2 className="h-4 w-4" aria-hidden="true" />
          Do escritório
        </BotaoTipo>
      </div>

      {doProcesso && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Atalhos:</span>
          {ATALHOS.map((atalho) => (
            <button
              key={atalho.texto}
              type="button"
              onClick={() => {
                setDescricao(atalho.descricao);
                setCategoria(atalho.categoria);
              }}
              className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            >
              {atalho.texto}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Descrição" className="sm:col-span-2">
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={doProcesso ? "Transporte até o Juizado Especial" : "Aluguel da sala"}
            required
            maxLength={300}
          />
        </Campo>
        <Campo rotulo="Categoria">
          <Select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaDespesa)}>
            {CATEGORIAS[tipo].map((c) => (
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
            placeholder="35,00"
            required
          />
        </Campo>
        <Campo rotulo="Data">
          <Input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} required />
        </Campo>
        <Campo rotulo="Fornecedor">
          <Input
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
            placeholder={doProcesso ? "TJPR" : "Imobiliária"}
          />
        </Campo>

        {doProcesso ? (
          <>
            {!contratoFixo && (
              <Campo rotulo="Caso (contrato)" className="sm:col-span-2">
                <Select value={contratoId} onChange={(e) => setContratoId(e.target.value)}>
                  <option value="">Sem caso vinculado</option>
                  {contratos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.rotulo}
                    </option>
                  ))}
                </Select>
              </Campo>
            )}
            <Campo rotulo="Quem arca com esse gasto">
              <Select value={quemPaga} onChange={(e) => setQuemPaga(e.target.value as QuemPaga)}>
                <option value="advogado">Eu (sai do meu bolso)</option>
                <option value="cliente">Cliente (reembolsa)</option>
              </Select>
            </Campo>
          </>
        ) : null}
      </div>

      {doProcesso && quemPaga === "advogado" && (
        <p className="text-xs text-muted-foreground">
          Esse valor vai ser descontado do que você ganha nesse caso.
        </p>
      )}
      {doProcesso && quemPaga === "cliente" && (
        <p className="text-xs text-muted-foreground">
          Fica marcado como <strong>a reembolsar</strong> até você registrar que cobrou do cliente.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={jaPaga}
            onChange={(e) => setJaPaga(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Já paguei
        </label>

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
          variant="ghost"
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

        <Button type="submit" size="sm" disabled={salvando || !descricao.trim() || !valor.trim()}>
          {salvando ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="h-4 w-4" aria-hidden="true" />
          )}
          Lançar
        </Button>
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

      {erro && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {erro}
        </p>
      )}
    </form>
  );
}

function BotaoTipo({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
        ativo
          ? "border-primary bg-accent text-accent-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
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
