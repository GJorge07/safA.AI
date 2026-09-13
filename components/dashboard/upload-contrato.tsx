"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, FolderOpen, Loader2, ShieldAlert, ShieldCheck, ShieldQuestion, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ContratoExtraido } from "@/lib/types";
import type { OpiniaoContrato } from "@/lib/ai/schemas";

type ItemStatus = "na_fila" | "enviando" | "lendo" | "extraido" | "erro";

interface ItemFila {
  id: string;
  nome: string;
  status: ItemStatus;
  progresso: number;
  extraido?: ContratoExtraido;
  opiniao?: OpiniaoContrato | null;
  mensagemErro?: string;
}

const CLASSIFICACAO_ESTILO: Record<OpiniaoContrato["classificacao"], { rotulo: string; classe: string; Icone: typeof ShieldCheck }> = {
  favoravel: { rotulo: "Favorável", classe: "text-success", Icone: ShieldCheck },
  atencao: { rotulo: "Atenção", classe: "text-warning", Icone: ShieldQuestion },
  desfavoravel: { rotulo: "Desfavorável", classe: "text-destructive", Icone: ShieldAlert },
};

export function UploadContrato() {
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function enviarArquivo(file: File) {
    const id = crypto.randomUUID();
    setFila((f) => [...f, { id, nome: file.name, status: "enviando", progresso: 0 }]);

    const progressTimer = setInterval(() => {
      setFila((f) =>
        f.map((it) => (it.id === id && it.progresso < 90 ? { ...it, progresso: it.progresso + 10 } : it)),
      );
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/contratos/importar", { method: "POST", body: formData });
      clearInterval(progressTimer);
      setFila((f) => f.map((it) => (it.id === id ? { ...it, progresso: 100, status: "lendo" } : it)));

      const data = await res.json();
      if (!res.ok) throw new Error(data?.erro ?? "Não foi possível processar o arquivo.");
      if (!data.payloadBackend) {
        const motivos: string[] = data.motivosRevisao ?? [];
        throw new Error(
          motivos.length > 0
            ? `Revisão manual necessária: ${motivos.join("; ")}`
            : "A extração precisa de revisão manual antes de salvar.",
        );
      }

      setFila((f) =>
        f.map((it) =>
          it.id === id ? { ...it, status: "extraido", extraido: data.payloadBackend, opiniao: data.opiniao ?? null } : it,
        ),
      );
    } catch (error) {
      clearInterval(progressTimer);
      setFila((f) =>
        f.map((it) =>
          it.id === id
            ? {
                ...it,
                status: "erro",
                mensagemErro: error instanceof Error ? error.message : "Erro ao enviar o arquivo.",
              }
            : it,
        ),
      );
    }
  }

  function remover(id: string) {
    setFila((f) => f.filter((it) => it.id !== id));
  }

  function handleFile(file: File | undefined) {
    if (file) enviarArquivo(file);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          arrastando ? "border-primary bg-accent" : "border-input"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Arraste um PDF ou DOCX aqui</p>
        <p className="text-xs text-muted-foreground">ou clique para escolher — máx. 20MB</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
            Escolher arquivo
          </Button>
        </div>
      </div>

      {fila.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border py-10 text-center">
          <FolderOpen className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Nenhum contrato enviado ainda</p>
          <p className="text-xs text-muted-foreground">Arraste um arquivo acima para começar.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" aria-live="polite">
          {fila.map((item) => (
            <li key={item.id} className="rounded-md border border-border p-3">
              <div className="flex items-center gap-3">
                {item.status === "extraido" && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                )}
                {item.status === "erro" && (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                )}
                {(item.status === "enviando" || item.status === "lendo") && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
                )}
                {item.status === "na_fila" && (
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}

                <span className="flex-1 truncate text-sm">{item.nome}</span>

                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.status === "na_fila" && "Na fila"}
                  {item.status === "enviando" && `Enviando… ${item.progresso}%`}
                  {item.status === "lendo" && "Lendo cláusulas com IA…"}
                  {item.status === "extraido" && `Extraído — ${item.extraido?.parcelas.length} parcela(s)`}
                  {item.status === "erro" && "Falha na extração"}
                </span>

                {item.status === "extraido" && item.opiniao && <SeloClassificacao classificacao={item.opiniao.classificacao} />}

                {item.status === "extraido" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAbertoId(abertoId === item.id ? null : item.id)}
                  >
                    {abertoId === item.id ? "Ocultar" : "Ver cláusula"}
                  </Button>
                )}
                {item.status === "erro" && (
                  <Button size="sm" variant="secondary" onClick={() => remover(item.id)}>
                    Tentar de novo
                  </Button>
                )}
              </div>

              {item.status === "enviando" && (
                <Progress value={item.progresso} className="mt-2" />
              )}

              {item.status === "erro" && item.mensagemErro && (
                <p className="mt-2 text-xs text-destructive">{item.mensagemErro}</p>
              )}

              {item.status === "extraido" && abertoId === item.id && item.extraido && (
                <div className="mt-3 flex flex-col gap-3">
                  <div className="rounded-md bg-muted p-3 text-xs">
                    <p className="mb-2 font-medium text-foreground">
                      {item.extraido.cliente} · {item.extraido.tipoPagamento} ·{" "}
                      {item.extraido.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                    <p className="italic text-muted-foreground">&ldquo;{item.extraido.clausulaOriginal}&rdquo;</p>
                  </div>
                  {item.opiniao && <OpiniaoDetalhada opiniao={item.opiniao} />}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SeloClassificacao({ classificacao }: { classificacao: OpiniaoContrato["classificacao"] }) {
  const { Icone, rotulo, classe } = CLASSIFICACAO_ESTILO[classificacao];
  return (
    <span className={`flex shrink-0 items-center gap-1 text-xs font-medium ${classe}`}>
      <Icone className="h-3.5 w-3.5" aria-hidden="true" />
      {rotulo}
    </span>
  );
}

const CATEGORIA_ROTULO: Record<OpiniaoContrato["riscos"][number]["categoria"], string> = {
  financeiro: "Financeiro",
  juridico: "Jurídico",
  carteira: "Carteira",
};

function OpiniaoDetalhada({ opiniao }: { opiniao: OpiniaoContrato }) {
  return (
    <div className="rounded-md border border-border p-3 text-xs">
      <div className="mb-2 flex items-center gap-2">
        <SeloClassificacao classificacao={opiniao.classificacao} />
        <span className="text-muted-foreground">Opinião da IA para o advogado</span>
      </div>
      <p className="mb-2 text-foreground">{opiniao.resumo}</p>

      {opiniao.pontosFortes.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1">
          {opiniao.pontosFortes.map((ponto, i) => (
            <li key={i} className="flex gap-1.5 text-success">
              <span aria-hidden="true">+</span>
              <span className="text-foreground">{ponto}</span>
            </li>
          ))}
        </ul>
      )}

      {opiniao.riscos.length > 0 && (
        <ul className="mb-2 flex flex-col gap-1">
          {opiniao.riscos.map((risco, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="shrink-0 font-medium text-warning">[{CATEGORIA_ROTULO[risco.categoria]}]</span>
              <span className="text-foreground">{risco.descricao}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="border-t border-border pt-2 font-medium text-foreground">{opiniao.recomendacao}</p>
    </div>
  );
}
