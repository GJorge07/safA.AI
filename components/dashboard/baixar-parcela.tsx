"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MotivoBaixa } from "@/lib/types";

// Só desfechos que extinguem a dívida. Inadimplência não está aqui de
// propósito: nesse caso o honorário continua devido e a parcela segue em
// cobrança — dar baixa apagaria um crédito real do advogado.
const MOTIVOS: { valor: MotivoBaixa; texto: string; ajuda: string }[] = [
  {
    valor: "sem_exito",
    texto: "A causa não teve êxito",
    ajuda: "Ação julgada improcedente ou perdida — o honorário de êxito não é devido.",
  },
  {
    valor: "acordo_menor",
    texto: "Acordo por valor menor",
    ajuda: "Registre o que recebeu como pagamento e dê baixa no que sobrou.",
  },
  {
    valor: "desistencia",
    texto: "Desistência ou processo encerrado",
    ajuda: "O cliente desistiu ou o processo foi arquivado sem resolução de mérito.",
  },
  { valor: "outro", texto: "Outro motivo", ajuda: "Descreva abaixo o que aconteceu." },
];

interface BaixarParcelaProps {
  descricaoParcela: string;
  valor: string;
  onConfirmar: (motivo: MotivoBaixa, nota: string) => Promise<void>;
  onCancelar: () => void;
}

// Sem prop `aberto`: quem abre é o pai, montando o componente. Assim o estado
// do formulário nasce limpo a cada abertura, sem precisar zerá-lo num effect.
export function BaixarParcela({
  descricaoParcela,
  valor,
  onConfirmar,
  onCancelar,
}: BaixarParcelaProps) {
  const [motivo, setMotivo] = useState<MotivoBaixa>("sem_exito");
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onCancelar();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onCancelar]);

  const escolhido = MOTIVOS.find((m) => m.valor === motivo) ?? MOTIVOS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "var(--overlay)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="baixa-titulo"
      onClick={onCancelar}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="baixa-titulo" className="text-sm font-semibold">
          Não vou receber este valor
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {descricaoParcela} · {valor}
        </p>

        <fieldset className="mt-4">
          <legend className="mb-2 text-xs font-medium text-muted-foreground">O que aconteceu?</legend>
          <div className="flex flex-col gap-1.5">
            {MOTIVOS.map((opcao) => (
              <label
                key={opcao.valor}
                className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-hover"
              >
                <input
                  type="radio"
                  name="motivo-baixa"
                  value={opcao.valor}
                  checked={motivo === opcao.valor}
                  onChange={() => setMotivo(opcao.valor)}
                  className="mt-1 h-3.5 w-3.5 shrink-0"
                />
                <span className="min-w-0">{opcao.texto}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <p className="mt-2 text-xs text-muted-foreground">{escolhido.ajuda}</p>

        <label className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
          Observação {motivo === "outro" ? "" : "(opcional)"}
          <Input
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Ex.: sentença de improcedência em 02/09, sem recurso."
            maxLength={2000}
          />
        </label>

        {/* O advogado precisa saber que isso mexe nos números antes de confirmar. */}
        <p className="mt-4 flex items-start gap-2 rounded-md bg-warning-bg px-3 py-2 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            O valor sai do previsto e deixa de contar como atraso. Dá para desfazer depois se o desfecho
            mudar.
          </span>
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={onCancelar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={salvando || (motivo === "outro" && !nota.trim())}
            onClick={async () => {
              setSalvando(true);
              await onConfirmar(motivo, nota.trim());
              setSalvando(false);
            }}
          >
            {salvando && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Dar baixa
          </Button>
        </div>
      </div>
    </div>
  );
}
