import { NovoChat } from "@/components/dashboard/novo-chat";
import { ChatPanel } from "@/components/dashboard/chat-panel";
import { contarContratos } from "@/lib/db/contratos";

interface AgentePageProps {
  searchParams: Promise<{ q?: string; conversaId?: string; novo?: string }>;
}

export default async function AgentePage({ searchParams }: AgentePageProps) {
  const [{ q, conversaId, novo }, totalContratos] = await Promise.all([searchParams, contarContratos()]);

  return (
    <div className="mx-auto flex h-[85vh] w-full max-w-3xl flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h1 className="text-sm font-semibold">Safa AI</h1>
          <p className="text-xs text-muted-foreground">Toda resposta cita a fonte no contrato original.</p>
        </div>
        <NovoChat />
      </div>

      <div className="min-h-0 flex-1">
        <ChatPanel
          key={novo ?? conversaId ?? q ?? "novo"}
          temContratos={totalContratos > 0}
          perguntaInicial={q}
          conversaId={conversaId}
        />
      </div>
    </div>
  );
}
