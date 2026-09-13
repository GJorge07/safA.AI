import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DriveSync } from "@/components/dashboard/drive-sync";
import { UploadContrato } from "@/components/dashboard/upload-contrato";
import { ContratosLista } from "@/components/dashboard/contratos-lista";
import { listarContratosComRelacoes } from "@/lib/db/contratos";

export const dynamic = "force-dynamic";

export default async function ContratosPage() {
  const contratos = await listarContratosComRelacoes();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Contratos</h1>
        <p className="text-sm text-muted-foreground">
          A forma principal de importar contratos é sincronizar a pasta do Google Drive — o
          upload manual é só um atalho para casos avulsos.
        </p>
      </div>

      <DriveSync />

      <details className="group rounded-lg border border-border">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">+ Enviar manualmente (alternativa)</span>
          <span className="hidden group-open:inline">− Enviar manualmente (alternativa)</span>
        </summary>
        <div className="border-t border-border p-4">
          <UploadContrato />
        </div>
      </details>

      <Card>
        <CardHeader>
          <CardTitle>Todos os contratos</CardTitle>
        </CardHeader>
        <CardContent>
          <ContratosLista contratos={contratos} carregando={false} erro={null} mostrarFiltros />
        </CardContent>
      </Card>
    </div>
  );
}
