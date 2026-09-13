import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function ContratoNaoEncontrado() {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <FileQuestion className="h-7 w-7 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">Contrato não encontrado</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        O contrato pode ter sido excluído, ou o link está desatualizado.
      </p>
      <Link
        href="/pagamentos"
        className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-hover"
      >
        Voltar para Pagamentos
      </Link>
    </div>
  );
}
