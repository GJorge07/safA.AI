import Link from "next/link";
import { Plus } from "lucide-react";
import { ChatPanel } from "@/components/dashboard/chat-panel";
import { contarContratos } from "@/lib/db/contratos";

interface AgentePageProps {
  searchParams: Promise<{ q?: string; conversaId?: string }>;
}

export default async function AgentePage({ searchParams }: AgentePageProps) {
  const [{ q, conversaId }, totalContratos] = await Promise.all([searchParams, contarContratos()]);

  return (
    <div className="mx-auto flex h-[85vh] w-full max-w-3xl flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h1 className="text-sm font-semibold">Safa AI</h1>
          <p className="text-xs text-muted-foreground">Toda resposta cita a fonte no contrato original.</p>
        </div>
        <Link
          href="/agente"
          className="flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium hover:bg-hover"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Novo chat
        </Link>
      </div>

      <div className="min-h-0 flex-1">
        <ChatPanel
          key={conversaId ?? q ?? "novo"}
          temContratos={totalContratos > 0}
          perguntaInicial={q}
          conversaId={conversaId}
        />
      </div>
    </div>
  );
}
