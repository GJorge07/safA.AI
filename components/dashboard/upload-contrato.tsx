"use client";

import { useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FolderOpen, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

import { enviarContrato, resumoDocumento, type DocumentoEnviado } from "./contract-upload";

type ItemStatus = "lendo" | "extraido" | "erro";
interface ItemFila {
  id: string;
  nome: string;
  status: ItemStatus;
  documento?: DocumentoEnviado;
  mensagemErro?: string;
}

export function UploadContrato() {
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const id = crypto.randomUUID();
    setFila(f => [...f, { id, nome: file.name, status: "lendo" }]);
    try {
      const documento = await enviarContrato(file);
      setFila(f => f.map(it => it.id === id ? { ...it, status: "extraido", documento } : it));
      setAbertoId(id);
    } catch (error) {
      setFila(f => f.map(it => it.id === id ? { ...it, status: "erro", mensagemErro: error instanceof Error ? error.message : "Falha ao enviar arquivo." } : it));
    }
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
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => { void handleFile(e.target.files?.[0]); e.target.value = ""; }}
        />
        <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Arraste um PDF, DOCX ou TXT aqui</p>
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
                {item.status === "lendo" && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
                )}
                <span className="flex-1 truncate text-sm">{item.nome}</span>

                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.status === "lendo" && "Lendo cláusulas com IA…"}
                  {item.status === "extraido" && (item.documento?.motivosRevisao.length ? "Revisão necessária" : "Extraído")}
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
                  <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()}>
                    Tentar de novo
                  </Button>
                )}
              </div>

              {item.status === "erro" && item.mensagemErro && (
                <p className="mt-2 text-xs text-destructive">{item.mensagemErro}</p>
              )}

              {item.status === "extraido" && abertoId === item.id && item.documento && (
                <div className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                  {resumoDocumento(item.documento)}
                  <p className="mt-2">Disponível para consulta no agente neste navegador. Ainda não salvo no controle financeiro.</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
