"use client";

import type { ReactNode } from "react";
import type { ContextoEsforco } from "@/lib/ai/case-effort";

const campos = [
  ["horasMinimas", "Horas totais — mínimo", 0.01],
  ["horasMaximas", "Horas totais — máximo", 0.01],
  ["custosEstimados", "Custos totais estimados (R$)", 0],
  ["valorHoraMinimo", "Meta de remuneração por hora (R$)", 0.01],
  ["horasTrabalhadas", "Horas já trabalhadas (opcional)", 0.01],
  ["custosIncorridos", "Custos já incorridos (R$, opcional)", 0],
] as const;
const fatores = [["pericia", "Perícia"], ["recursos", "Recursos"], ["audiencias", "Audiências"], ["provas", "Análise ou produção de provas"], ["urgencia", "Prazos urgentes"]] as const;

export function EstimativaEsforco({ value, onChange, disabled, children }: { value: ContextoEsforco; onChange: (value: ContextoEsforco) => void; disabled?: boolean; children?: ReactNode }) {
  return <details className="rounded-md border border-border p-3 text-xs">
    <summary className="cursor-pointer font-medium">Comparar dificuldade e remuneração</summary>
    <p className="my-2 text-muted-foreground">Confira os campos encontrados no contrato ou no perfil e complete as lacunas. Informe estimativas do caso inteiro, incluindo o trabalho já feito. Inclua despesas e tributos nos custos. As estimativas valem apenas nesta consulta e não alteram o contrato.</p>
    <fieldset disabled={disabled} className="space-y-3">
      <label className="flex flex-col gap-1">Dificuldade estimada por você
        <select value={value.dificuldade ?? ""} onChange={e => onChange({ ...value, dificuldade: (e.target.value || undefined) as ContextoEsforco["dificuldade"] })} className="rounded border border-input bg-card p-2">
          <option value="">Não informada</option><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-3">{fatores.map(([campo, rotulo]) => <label key={campo} className="flex items-center gap-1">
        <input type="checkbox" checked={value.fatores.includes(campo)} onChange={e => onChange({ ...value, fatores: e.target.checked ? [...value.fatores, campo] : value.fatores.filter(f => f !== campo) })} />{rotulo}
      </label>)}</div>
      <div className="grid gap-2 sm:grid-cols-2">{campos.map(([campo, rotulo, min]) => <label key={campo} className="flex flex-col gap-1">{rotulo}
        <input type="number" min={min} step="0.01" value={value[campo] ?? ""} onChange={e => onChange({ ...value, [campo]: e.target.value === "" ? undefined : Number(e.target.value) })} className="min-w-0 rounded border border-input bg-card p-2" />
      </label>)}</div>
      <p className="text-muted-foreground">O valor recebido vem do banco. Nenhuma chance de vitória é presumida; honorários de êxito são tratados como cenário condicionado.</p>
    </fieldset>
    {children && <div className="mt-3">{children}</div>}
  </details>;
}
