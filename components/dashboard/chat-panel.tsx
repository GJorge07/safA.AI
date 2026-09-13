"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowUp, Loader2, MessageCircle, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { gerarTitulo, salvarConversa, obterConversa, type MensagemConversa } from "./conversas";
import type { ContratoComRelacoes } from "./types";

interface ChatPanelProps {
  contratos: ContratoComRelacoes[];
  perguntaInicial?: string;
  conversaId?: string;
}

const EXEMPLOS = [
  "Quanto vou receber em outubro?",
  "Qual cliente está mais atrasado?",
  "Compare o contrato da Construtora Alvorada com o do João Pereira",
];

// Envia ao chat o mesmo conjunto de contratos apresentado no dashboard.
export function ChatPanel({ contratos, perguntaInicial, conversaId }: ChatPanelProps) {
  const idRef = useRef(conversaId ?? crypto.randomUUID());
  const [mensagens, setMensagens] = useState<MensagemConversa[]>(() => {
    if (conversaId) return obterConversa(conversaId)?.mensagens ?? [];
    return [];
  });
  const [pergunta, setPergunta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const jaEnviouInicial = useRef(false);
  const ultimaPergunta = useRef("");
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (perguntaInicial && !jaEnviouInicial.current && contratos.length > 0) {
      jaEnviouInicial.current = true;
      enviar(perguntaInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perguntaInicial, contratos.length]);

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

  if (contratos.length === 0) {
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

  async function enviar(textoParam?: string, reenvio = false) {
    const texto = (textoParam ?? pergunta).trim();
    if (!texto || carregando) return;
    setErro(null);
    setPergunta("");
    setCarregando(true);
    ultimaPergunta.current = texto;
    if (!reenvio) {
      setMensagens((atuais) => {
        const comUsuario = [...atuais, { autor: "usuario", texto } as MensagemConversa];
        persistir(comUsuario);
        return comUsuario;
      });
    }
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pergunta: texto,
          dados: {
            dataReferencia: new Date().toISOString().slice(0, 10),
            resumo: contratos.flatMap(c => c.parcelas).reduce((total, p) => {
              const recebido = p.pagamento?.valorPago ?? 0;
              const saldo = Math.max(0, p.valor - recebido);
              return {
                previsto: total.previsto + p.valor,
                recebido: total.recebido + recebido,
                pendente: total.pendente + saldo,
                atrasado: total.atrasado + (p.vencimento.toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10) ? saldo : 0),
              };
            }, { previsto: 0, recebido: 0, pendente: 0, atrasado: 0 }),
            contratos: contratos.map(c => ({
              id: c.id, clienteId: c.clienteId, cliente: c.cliente.nome,
              tipoPagamento: c.tipoPagamento, valorTotal: c.valorTotal,
              parcelas: c.parcelas.map(p => ({
                id: p.id, valor: p.valor, vencimento: p.vencimento.toISOString().slice(0, 10),
                status: (p.pagamento?.valorPago ?? 0) >= p.valor ? 'paga'
                  : p.vencimento.toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10) ? 'atrasada' : 'prevista',
              })),
            })),
          },
        }),
      });
      if (!res.ok) {
        const corpo = await res.json().catch(() => null);
        throw new Error(corpo?.erro ?? `Falha na resposta (HTTP ${res.status}).`);
      }
      const data = await res.json();
      setMensagens((atuais) => {
        const comResposta = [...atuais, { autor: "assistente", texto: data.resposta.resposta } as MensagemConversa];
        persistir(comResposta);
        return comResposta;
      });
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não consegui responder agora.");
    } finally {
      setCarregando(false);
    }
  }

  // TODO(ia): reaproveitar o pipeline real de extração (o mesmo de
  // components/dashboard/upload-contrato.tsx) quando app/api/contratos
  // existir de verdade — aqui é uma simulação para o anexo funcionar ponta
  // a ponta no chat.
  function anexarArquivo(arquivo: File | undefined) {
    if (!arquivo) return;
    setErro(null);
    setMensagens((atuais) => [...atuais, { autor: "usuario", texto: `📎 ${arquivo.name}` }]);
    setCarregando(true);
    setTimeout(() => {
      setMensagens((atuais) => {
        const comResposta: MensagemConversa[] = [
          ...atuais,
          {
            autor: "assistente",
            texto:
              `Li o contrato e extraí: cliente Construtora Alvorada Ltda., pagamento misto, ` +
              `R$ 45.000 em 3 parcelas de R$ 15.000. Quer conferir a cláusula original na aba Contratos?`,
          },
        ];
        persistir(comResposta);
        return comResposta;
      });
      setCarregando(false);
    }, 1400);
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
              {m.texto}
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
            <div className="mr-auto flex max-w-[80%] flex-col gap-2 rounded-2xl bg-destructive-bg px-3.5 py-2 text-sm text-destructive">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="break-words">{erro}</span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="self-start"
                onClick={() => enviar(ultimaPergunta.current, true)}
              >
                Tentar de novo
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex shrink-0 items-end gap-2 rounded-2xl border border-border bg-card p-2.5">
        <input
          ref={inputArquivoRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => anexarArquivo(e.target.files?.[0])}
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-10 w-10 shrink-0 rounded-full p-0"
          onClick={() => inputArquivoRef.current?.click()}
          disabled={carregando}
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
          disabled={carregando}
          rows={2}
          className="max-h-48 min-h-[3.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-base outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />
        <Button
          size="sm"
          className="h-10 w-10 shrink-0 rounded-full p-0"
          onClick={() => enviar()}
          disabled={carregando || !pergunta.trim()}
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
