"use client";

import { useState } from "react";
import { CheckCircle2, FolderGit2, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

// TODO(backend/ia): trocar pela integração real com Google Drive API + OAuth
// (ver CLAUDE.md — lib/ai/ ou lib/integrations/drive.ts). Esta é a via
// principal de entrada de contratos; o upload manual é só um atalho.
export function DriveSync() {
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSync, setUltimaSync] = useState("há 12 minutos");
  const [autoSync, setAutoSync] = useState(true);
  const [novosEncontrados, setNovosEncontrados] = useState<number | null>(null);

  function sincronizarAgora() {
    setSincronizando(true);
    setNovosEncontrados(null);
    setTimeout(() => {
      setSincronizando(false);
      setUltimaSync("agora mesmo");
      setNovosEncontrados(1);
    }, 1300);
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-accent/50 to-transparent">
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
            <FolderGit2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              Google Drive conectado
              <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            </div>
            <p className="text-xs text-muted-foreground">
              Pasta <span className="font-mono">/Contratos/Ativos</span> · última sincronização {ultimaSync}
              {novosEncontrados !== null && (
                <span className="text-success"> · {novosEncontrados} novo contrato encontrado</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
            Sincronizar automaticamente
          </label>
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
        </div>
      </CardContent>
    </Card>
  );
}
