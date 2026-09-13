"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, FolderGit2, Loader2, LogOut, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DriveStatus {
  conectado: boolean;
  contaEmail: string | null;
  pastaId: string | null;
}

interface SyncResultado {
  encontrados: number;
  novos: number;
  salvos: number;
  revisao: number;
  erros: number;
}

export function DriveSync() {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [carregandoStatus, setCarregandoStatus] = useState(true);
  const [pastaInput, setPastaInput] = useState("");
  const [salvandoPasta, setSalvandoPasta] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState<SyncResultado | null>(null);
  const [aviso, setAviso] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null);

  async function carregarStatus() {
    setCarregandoStatus(true);
    try {
      const resp = await fetch("/api/integrations/drive/status");
      setStatus(await resp.json());
    } finally {
      setCarregandoStatus(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resultado = params.get("drive");
    if (resultado === "conectado") {
      setAviso({ tipo: "sucesso", texto: "Conta do Google Drive conectada com sucesso." });
    } else if (resultado === "erro") {
      setAviso({ tipo: "erro", texto: `Falha ao conectar o Drive: ${params.get("drive_detalhe") ?? "erro desconhecido"}.` });
    }
    if (resultado) {
      params.delete("drive");
      params.delete("drive_detalhe");
      const query = params.toString();
      window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
    }
    carregarStatus();
  }, []);

  async function salvarPasta() {
    if (!pastaInput.trim()) return;
    setSalvandoPasta(true);
    setAviso(null);
    try {
      const resp = await fetch("/api/integrations/drive/pasta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pasta: pastaInput }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.erro ?? "Não foi possível salvar a pasta.");
      setPastaInput("");
      await carregarStatus();
    } catch (error) {
      setAviso({ tipo: "erro", texto: error instanceof Error ? error.message : "Erro inesperado." });
    } finally {
      setSalvandoPasta(false);
    }
  }

  async function sincronizarAgora() {
    setSincronizando(true);
    setAviso(null);
    try {
      const resp = await fetch("/api/integrations/drive/sync", { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.erro ?? "Não foi possível sincronizar.");
      setUltimoResultado(data);
    } catch (error) {
      setAviso({ tipo: "erro", texto: error instanceof Error ? error.message : "Erro inesperado." });
    } finally {
      setSincronizando(false);
    }
  }

  async function desconectar() {
    await fetch("/api/integrations/drive/desconectar", { method: "POST" });
    setUltimoResultado(null);
    await carregarStatus();
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-accent/50 to-transparent">
      <CardContent className="flex flex-col gap-4 py-5">
        {aviso && (
          <div
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${
              aviso.tipo === "sucesso" ? "bg-success-bg text-success" : "bg-destructive-bg text-destructive"
            }`}
          >
            {aviso.tipo === "sucesso" ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            {aviso.texto}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
              <FolderGit2 className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              {carregandoStatus ? (
                <p className="text-sm text-muted-foreground">Verificando conexão…</p>
              ) : status?.conectado ? (
                <>
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    Google Drive conectado
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {status.contaEmail ?? "conta conectada"}
                    {status.pastaId && (
                      <>
                        {" "}
                        · pasta <span className="font-mono">{status.pastaId}</span>
                      </>
                    )}
                  </p>
                </>
              ) : (
                <div className="text-sm font-medium text-muted-foreground">Google Drive não conectado</div>
              )}
            </div>
          </div>

          {!carregandoStatus && !status?.conectado && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                window.location.href = "/api/integrations/drive/connect";
              }}
            >
              Conectar ao Google Drive
            </Button>
          )}

          {!carregandoStatus && status?.conectado && status.pastaId && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={sincronizarAgora} disabled={sincronizando}>
                {sincronizando ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    Sincronizando…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    Sincronizar agora
                  </>
                )}
              </Button>
              <Button size="sm" variant="ghost" onClick={desconectar} aria-label="Desconectar Google Drive">
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>

        {!carregandoStatus && status?.conectado && !status.pastaId && (
          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
            <Input
              value={pastaInput}
              onChange={(e) => setPastaInput(e.target.value)}
              placeholder="Cole o link ou ID da pasta do Drive com os contratos"
              className="flex-1"
              aria-label="Link ou ID da pasta do Google Drive"
            />
            <Button size="sm" onClick={salvarPasta} disabled={salvandoPasta || !pastaInput.trim()}>
              {salvandoPasta ? "Salvando…" : "Salvar pasta"}
            </Button>
          </div>
        )}

        {ultimoResultado && (
          <p className="border-t border-border pt-3 text-xs text-muted-foreground">
            {ultimoResultado.encontrados} arquivo(s) na pasta · {ultimoResultado.novos} novo(s) processado(s) ·{" "}
            <span className="text-success">{ultimoResultado.salvos} salvo(s)</span>
            {ultimoResultado.revisao > 0 && <> · {ultimoResultado.revisao} para revisão</>}
            {ultimoResultado.erros > 0 && <span className="text-destructive"> · {ultimoResultado.erros} com erro</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
