"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, FolderOpen, Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ContratoExtraido } from "@/lib/types";

type ItemStatus = "na_fila" | "enviando" | "lendo" | "extraido" | "erro";

interface ItemFila {
  id: string;
  nome: string;
  status: ItemStatus;
  progresso: number;
  extraido?: ContratoExtraido;
  mensagemErro?: string;
}

const filaInicial: ItemFila[] = [
  {
    id: "seed-1",
    nome: "contrato-mercado-bompreco.pdf",
    status: "extraido",
    progresso: 100,
    extraido: {
      cliente: "Mercado Bom Preço S.A.",
      tipoPagamento: "fixo",
      valorTotal: 12000,
      parcelas: [{ valor: 3000, vencimento: "2026-10-15" }],
      clausulaOriginal:
        "Cláusula 2ª — Dos Honorários Fixos: o valor total de R$ 12.000,00 será pago em 4 parcelas iguais de R$ 3.000,00, com vencimento todo dia 15.",
    },
  },
  { id: "seed-2", nome: "contrato-joao-pereira.pdf", status: "na_fila", progresso: 0 },
];

// TODO(ia): trocar a simulação abaixo por POST real para app/api/contratos,
// que dispara a extração em lib/ai/ e valida o retorno contra ContratoExtraido
// (ver lib/types.ts) antes de gravar no banco.
export function UploadContrato() {
  const [fila, setFila] = useState<ItemFila[]>(filaInicial);
  const [arrastando, setArrastando] = useState(false);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function simularEnvio(nome: string) {
    const id = crypto.randomUUID();
    setFila((f) => [...f, { id, nome, status: "enviando", progresso: 0 }]);
    let progresso = 0;
    const timer = setInterval(() => {
      progresso += 20;
      setFila((f) => f.map((it) => (it.id === id ? { ...it, progresso } : it)));
      if (progresso >= 100) {
        clearInterval(timer);
        setFila((f) => f.map((it) => (it.id === id ? { ...it, status: "lendo" } : it)));
        setTimeout(() => {
          setFila((f) =>
            f.map((it) =>
              it.id === id
                ? {
                    ...it,
                    status: "extraido",
                    extraido: {
                      cliente: "Construtora Alvorada Ltda.",
                      tipoPagamento: "misto",
                      valorTotal: 45000,
                      parcelas: [
                        { valor: 15000, vencimento: "2026-10-05" },
                        { valor: 15000, vencimento: "2026-11-05" },
                        { valor: 15000, vencimento: "2026-12-05" },
                      ],
                      clausulaOriginal:
                        "Cláusula 4ª — Dos Honorários: as partes ajustam o pagamento em 3 parcelas mensais de R$ 15.000,00, vencíveis todo dia 5.",
                    },
                  }
                : it,
            ),
          );
        }, 1100);
      }
    }, 260);
  }

  function simularErro() {
    const id = crypto.randomUUID();
    setFila((f) => [
      ...f,
      {
        id,
        nome: "contrato-ilegivel-scan.pdf",
        status: "erro",
        progresso: 0,
        mensagemErro: "Não conseguimos ler este PDF (parece ser uma imagem escaneada).",
      },
    ]);
  }

  function remover(id: string) {
    setFila((f) => f.filter((it) => it.id !== id));
  }

  function handleFile(file: File | undefined) {
    if (file) simularEnvio(file.name);
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
          <Button size="sm" variant="ia" onClick={() => simularEnvio("contrato-alvorada-2026.docx")}>
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Simular envio
          </Button>
          <Button size="sm" variant="destructive" onClick={simularErro}>
            Simular erro
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
                <div className="mt-3 rounded-md bg-muted p-3 text-xs">
                  <p className="mb-2 font-medium text-foreground">
                    {item.extraido.cliente} · {item.extraido.tipoPagamento} ·{" "}
                    {item.extraido.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                  <p className="italic text-muted-foreground">&ldquo;{item.extraido.clausulaOriginal}&rdquo;</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
