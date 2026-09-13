"use client";

// Filtros que vivem na URL, não em useState: assim o advogado consegue mandar
// o link de "todos os atrasados" para alguém e o estado sobrevive ao refresh.
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

function useAtualizarParam() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (nome: string, valor: string, padrao = "", limpa: string[] = []) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!valor || valor === padrao) params.delete(nome);
    else params.set(nome, valor);
    // Filtros que não podem conviver com este — "pagas" e "vencem em 7 dias"
    // juntos nunca casam com nada e devolveriam uma lista vazia sem explicação.
    for (const outro of limpa) params.delete(outro);
    // Qualquer filtro novo volta para a primeira página — senão a pessoa cai
    // numa página 7 que não existe mais depois de filtrar.
    params.delete("pagina");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };
}

export function BuscaUrl({
  nome = "busca",
  placeholder,
  rotulo,
}: {
  nome?: string;
  placeholder: string;
  rotulo: string;
}) {
  const searchParams = useSearchParams();
  const atualizar = useAtualizarParam();
  const valorNaUrl = searchParams.get(nome) ?? "";
  const [valor, setValor] = useState(valorNaUrl);
  const digitando = useRef(false);

  // Sem debounce, cada tecla vira uma query no banco.
  useEffect(() => {
    if (!digitando.current) return;
    const timer = setTimeout(() => {
      digitando.current = false;
      atualizar(nome, valor);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor, nome]);

  // Navegação externa (chip de filtro, voltar do navegador) reescreve o campo.
  useEffect(() => {
    if (!digitando.current) setValor(valorNaUrl);
  }, [valorNaUrl]);

  return (
    <div className="relative min-w-[200px] flex-1">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={valor}
        onChange={(e) => {
          digitando.current = true;
          setValor(e.target.value);
        }}
        placeholder={placeholder}
        className="pl-8"
        aria-label={rotulo}
      />
    </div>
  );
}

export function SelectUrl({
  nome,
  rotulo,
  padrao = "todos",
  opcoes,
  className = "w-40",
  limpa,
}: {
  nome: string;
  rotulo: string;
  padrao?: string;
  opcoes: { valor: string; texto: string }[];
  className?: string;
  /** Parâmetros conflitantes a remover quando este mudar. */
  limpa?: string[];
}) {
  const searchParams = useSearchParams();
  const atualizar = useAtualizarParam();

  return (
    <Select
      value={searchParams.get(nome) ?? padrao}
      onChange={(e) => atualizar(nome, e.target.value, padrao, limpa)}
      className={className}
      aria-label={rotulo}
    >
      {opcoes.map((opcao) => (
        <option key={opcao.valor} value={opcao.valor}>
          {opcao.texto}
        </option>
      ))}
    </Select>
  );
}
