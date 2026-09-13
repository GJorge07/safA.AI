"use client";

import { EstimativaEsforco } from "./estimativa-esforco";
import { temEstimativaEsforco, type ContextoEsforco } from "@/lib/ai/case-effort";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowUp, Loader2, MessageCircle, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gerarTitulo, salvarConversa, obterConversa, type MensagemConversa } from "./conversas";

interface ChatPanelProps {
  temContratos: boolean;
  perguntaInicial?: string;
  conversaId?: string;
}

const EXEMPLOS = [
  "Quanto vou receber em outubro?",
  "Qual cliente está mais atrasado?",
  "Quais contratos são vantajosos e quais exigem atenção?",
];

const ROTULO_CLASSIFICACAO = {
  favoravel: "favorável",
  atencao: "atenção",
  desfavoravel: "desfavorável",
};

// O contexto financeiro é montado pelo servidor a partir do banco; daqui sobe
// apenas a pergunta.
export function ChatPanel({ temContratos, perguntaInicial, conversaId }: ChatPanelProps) {
  const idRef = useRef(conversaId ?? crypto.randomUUID());
  const [mensagens, setMensagens] = useState<MensagemConversa[]>(() => {
    if (conversaId) return obterConversa(conversaId)?.mensagens ?? [];
    return [];
  });
  const [carregandoContexto, setCarregandoContexto] = useState(false);
  const [avisoContexto, setAvisoContexto] = useState("");
  const [estimativa, setEstimativa] = useState<ContextoEsforco>({ fatores: [] });
  const [contratoId, setContratoId] = useState("");
  const [contratos, setContratos] = useState<{ id: string; cliente: { nome: string } }[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const jaEnviouInicial = useRef(false);
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ativo = true;
    if (temContratos) fetch("/api/contratos/opcoes").then(res => res.ok ? res.json() : null).then(data => {
      if (ativo && Array.isArray(data)) setContratos(data);
    }).catch(() => {});
    return () => { ativo = false; };
  }, [temContratos]);

  useEffect(() => {
    if (!contratoId) return;
    let ativo = true;
    fetch(`/api/contratos/${encodeURIComponent(contratoId)}/opiniao`, { cache: "no-store" }).then(async res => {
      if (!res.ok) throw new Error();
      const dados = await res.json();
      if (ativo) { setEstimativa(dados.contextoSugerido ?? { fatores: [] }); setCarregandoContexto(false); }
    }).catch(() => { if (ativo) { setCarregandoContexto(false); setAvisoContexto("Não foi possível preencher as estimativas do contrato. Você pode completar os campos manualmente."); } });
    return () => { ativo = false; };
  }, [contratoId]);

  useEffect(() => {
    if (perguntaInicial && !jaEnviouInicial.current && temContratos) {
      jaEnviouInicial.current = true;
      enviar(perguntaInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perguntaInicial, temContratos]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens, carregando]);

  function persistir(atualizadas: MensagemConversa[]) {
    const primeiraPergunta = atualizadas.find((m) => m.autor === "usuario")?.texto;
    if (!primeiraPergunta) return;
    salvarConversa({
      id: idRef.current,
      titulo: gerarTitulo(primeiraPergunta),
      criadoEm: new Date().toISOString(),
      mensagens: atualizadas,
    });
  }

  if (!temContratos) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <MessageCircle className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Ainda não há contratos para consultar</p>
        <p className="text-xs text-muted-foreground">
          Envie um contrato primeiro para eu poder responder perguntas sobre ele.
        </p>
      </div>
    );
  }

  async function enviar(textoParam?: string, modo: "conversa" | "opiniao" = "conversa") {
    const texto = (textoParam ?? pergunta).trim();
    if (!texto || carregando || carregandoContexto) return;
    setErro(null);
    setPergunta("");
    setCarregando(true);
    setMensagens((atuais) => {
      const comUsuario = [...atuais, { autor: "usuario", texto } as MensagemConversa];
      persistir(comUsuario);
      return comUsuario;
    });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pergunta: texto, contratoId: contratoId || undefined, modo, contextoEsforco: contratoId && temEstimativaEsforco(estimativa) ? estimativa : undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.erro ?? "Não foi possível responder agora.");
      setMensagens((atuais) => {
        const comResposta = [...atuais, { autor: "assistente", texto: data.resposta.resposta, aviso: data.resposta.aviso, fontes: data.resposta.citacoes } as MensagemConversa];
        persistir(comResposta);
        return comResposta;
      });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível responder agora.");
    } finally {
      setCarregando(false);
    }
  }

  async function anexarArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setMensagens((atuais) => {
      const comArquivo = [...atuais, { autor: "usuario", texto: `📎 ${arquivo.name}` } as MensagemConversa];
      persistir(comArquivo);
      return comArquivo;
    });
    setCarregando(true);
    try {
      const formData = new FormData();
      formData.append("file", arquivo);
      const res = await fetch("/api/contratos/importar", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.erro ?? "Falha ao processar o arquivo.");

      const opiniaoTexto = data.opiniao
        ? `\n\nOpinião (${ROTULO_CLASSIFICACAO[data.opiniao.classificacao as keyof typeof ROTULO_CLASSIFICACAO]}): ${data.opiniao.resumo} ${data.opiniao.recomendacao}`
        : "";
      const texto = data.payloadBackend
        ? `Li o contrato e extraí: cliente ${data.payloadBackend.cliente}, pagamento ${data.payloadBackend.tipoPagamento}, ` +
          `${data.payloadBackend.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} em ` +
          `${data.payloadBackend.parcelas.length} parcela(s). Quer conferir a cláusula original na aba Pagamentos?${opiniaoTexto}`
        : `Consegui ler o arquivo, mas a extração precisa de revisão manual: ${
            (data.motivosRevisao ?? []).join("; ") || "dados insuficientes para confirmar automaticamente."
          }${opiniaoTexto}`;

      setMensagens((atuais) => {
        const comResposta: MensagemConversa[] = [...atuais, { autor: "assistente", texto }];
        persistir(comResposta);
        return comResposta;
      });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível ler o arquivo.");
    } finally {
      setCarregando(false);
    }
  }

  const semMensagens = mensagens.length === 0;

  return (
    <div className="flex h-full flex-col">
      {semMensagens ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent">
            <Sparkles className="h-6 w-6 text-accent-foreground" aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Como posso ajudar?</h2>
            <p className="text-sm text-muted-foreground">
              Pergunte sobre seus contratos e recebimentos — toda resposta cita a fonte.
            </p>
          </div>
          <div className="flex w-full max-w-2xl flex-wrap justify-center gap-2">
            {EXEMPLOS.map((exemplo) => (
              <button
                key={exemplo}
                onClick={() => enviar(exemplo)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                {exemplo}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-1 py-2" role="log" aria-live="polite">
          {mensagens.map((m, i) => (
            <div
              key={i}
              className={
                m.autor === "usuario"
                  ? "ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm leading-relaxed text-primary-foreground"
                  : "mr-auto max-w-[80%] rounded-2xl rounded-bl-sm bg-card px-3.5 py-2 text-sm leading-relaxed text-foreground"
              }
            >
              <span className="whitespace-pre-wrap">{m.texto}</span>
              {m.autor === "assistente" && m.aviso && <p className="mt-2 text-xs text-muted-foreground">{m.aviso}</p>}
              {m.autor === "assistente" && Boolean(m.fontes?.length) && <details className="mt-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer">Fontes da resposta</summary>
                <ul className="mt-1 space-y-1 break-words">{m.fontes?.map((fonte, indice) => <li key={indice}>{fonte.contratoId ? `Contrato ${fonte.contratoId}` : "Resumo da carteira"}: {fonte.campos.map(campo => campo === "opiniao" ? "avaliação calculada" : campo === "createdAt" ? "data de cadastro" : campo).join(", ")}</li>)}</ul>
              </details>}
            </div>
          ))}
          {carregando && (
            <div
              className="mr-auto flex gap-1 rounded-2xl rounded-bl-sm bg-card px-3.5 py-2.5"
              role="status"
              aria-label="IA está pensando"
            >
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.2s]" />
            </div>
          )}
          {erro && (
            <div className="mr-auto flex max-w-[80%] items-center gap-2 rounded-2xl bg-destructive-bg px-3.5 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {erro}
              <Button size="sm" variant="secondary" onClick={() => enviar()}>
                Tentar de novo
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground">
          Contrato de referência
          <select value={contratoId} onChange={e => { setContratoId(e.target.value); setEstimativa({ fatores: [] }); setCarregandoContexto(Boolean(e.target.value)); setAvisoContexto(""); }} disabled={carregando || carregandoContexto} className="min-w-0 rounded-md border border-input bg-card p-2 text-foreground">
            <option value="">Toda a carteira</option>
            {contratos.map(c => <option key={c.id} value={c.id}>{c.cliente.nome} · {c.id.slice(-6)}</option>)}
          </select>
        </label>
        <Button size="sm" variant="secondary" disabled={carregando || carregandoContexto} onClick={() => enviar(contratoId ? "Este contrato é um bom caso?" : "Avalie todos os contratos da carteira", "opiniao")}>Pedir opinião</Button>
      </div>
      {carregandoContexto && <p className="text-xs text-muted-foreground">Buscando dados do contrato e do perfil…</p>}
      {avisoContexto && <p className="text-xs text-warning">{avisoContexto}</p>}
      {contratoId && <div className="mt-2"><EstimativaEsforco value={estimativa} onChange={setEstimativa} disabled={carregando || carregandoContexto} /></div>}
      <div className="mt-3 flex shrink-0 items-end gap-2 rounded-2xl border border-border bg-card p-2.5">
        <input
          ref={inputArquivoRef}
          type="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          className="hidden"
          onChange={(e) => anexarArquivo(e.target.files?.[0])}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-10 w-10 shrink-0 rounded-full p-0"
          onClick={() => inputArquivoRef.current?.click()}
          disabled={carregando || carregandoContexto}
          aria-label="Anexar contrato (PDF ou DOCX)"
        >
          <Plus className="h-5 w-5" aria-hidden="true" />
        </Button>
        <textarea
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar();
            }
          }}
          placeholder="Pergunte alguma coisa..."
          disabled={carregando || carregandoContexto}
          rows={2}
          className="max-h-48 min-h-[3.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-base outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <Button
          size="sm"
          className="h-10 w-10 shrink-0 rounded-full p-0"
          onClick={() => enviar()}
          disabled={carregando || carregandoContexto || !pergunta.trim()}
          aria-label="Enviar pergunta"
        >
          {carregando ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  );
}
