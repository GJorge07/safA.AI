"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function NovoChat() {
  const router = useRouter();
  return <button type="button" onClick={() => router.push(`/agente?novo=${crypto.randomUUID()}`)} className="flex items-center gap-1.5 rounded-md border border-input bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted">
    <Plus className="h-3.5 w-3.5" aria-hidden="true" />Novo chat
  </button>;
}
