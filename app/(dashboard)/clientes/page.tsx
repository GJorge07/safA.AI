import Link from "next/link";
import { AlertTriangle, ArrowLeft, ChevronRight, PieChart, Users, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BuscaUrl, SelectUrl } from "@/components/dashboard/filtros-url";
import { listarClientesAtivos, type ClienteAtivo } from "@/lib/db/clientes";

export const dynamic = "force-dynamic";

type Busca = Record<string, string | string[] | undefined>;
type Situacao = "todos" | "atraso" | "em_dia";
type Ordenacao = "atraso" | "aberto" | "vencimento" | "nome";

interface ClientesPageProps {
  searchParams: Promise<Busca>;
}

function texto(busca: Busca, nome: string): string | undefined {
  const valor = busca[nome];
  return Array.isArray(valor) ? valor[0] : valor;
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function data(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}

/** "hoje", "amanhã", "em 5 dias" — o número seco não diz se é urgente. */
function quandoVence(iso: string, hoje: Date): string {
  const alvo = Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  const base = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate());
  const dias = Math.round((alvo - base) / 86400000);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias < 30) return `em ${dias} dias`;
  const meses = Math.round(dias / 30);
  return meses === 1 ? "em 1 mês" : `em ${meses} meses`;
}

/** Iniciais do nome — duas no máximo, ignorando "de", "da", "Ltda" e afins. */
function iniciais(nome: string): string {
  const partes = nome
    .split(/\s+/)
    .filter((parte) => parte.length > 2 && !/^(ltda|s\.?a\.?|me|eireli|epp|de|da|do|das|dos)$/i.test(parte));
  const escolhidas = partes.length > 0 ? partes : nome.split(/\s+/);
  return (escolhidas[0][0] + (escolhidas[1]?.[0] ?? "")).toUpperCase();
}

/** Cor estável por cliente: mesmo nome, mesma cor, em qualquer tela. */
function corDoNome(nome: string): string {
  let soma = 0;
  for (const char of nome) soma = (soma + char.charCodeAt(0)) % 997;
  return `var(--chart-${(soma % 8) + 1})`;
}

const ordenacoes: Record<Ordenacao, (a: ClienteAtivo, b: ClienteAtivo) => number> = {
  atraso: (a, b) => b.emAtraso - a.emAtraso || b.emAberto - a.emAberto,
  aberto: (a, b) => b.emAberto - a.emAberto,
  nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
  // Sem próxima parcela significa "só tem atraso": vai para o fim da fila
  // de datas, mas continua na lista.
  vencimento: (a, b) =>
    (a.proximoVencimento ?? "9999").localeCompare(b.proximoVencimento ?? "9999") ||
    b.emAtraso - a.emAtraso,
};

// Aterrissagem do card "Clientes ativos" do Início: quem deve, quanto deve,
// o que já venceu e o quanto a carteira depende de cada um.
export default async function ClientesPage({ searchParams }: ClientesPageProps) {
  const params = await searchParams;
  const termo = (texto(params, "busca") ?? "").trim();
  const situacao = (texto(params, "situacao") ?? "todos") as Situacao;
  const ordenar = (texto(params, "ordenar") ?? "atraso") as Ordenacao;

  const todos = await listarClientesAtivos();
  const hoje = new Date();

  const carteira = todos.reduce((total, cliente) => total + cliente.emAberto, 0);
  const atrasoTotal = todos.reduce((total, cliente) => total + cliente.emAtraso, 0);
  const comAtraso = todos.filter((cliente) => cliente.emAtraso > 0);
  const maior = todos.reduce<ClienteAtivo | null>(
    (topo, cliente) => (!topo || cliente.emAberto > topo.emAberto ? cliente : topo),
    null,
  );
  const concentracao = maior && carteira > 0 ? Math.round((maior.emAberto / carteira) * 100) : 0;

  const clientes = todos
    .filter((cliente) => {
      if (situacao === "atraso" && cliente.emAtraso <= 0) return false;
      if (situacao === "em_dia" && cliente.emAtraso > 0) return false;
      if (!termo) return true;
      const alvo = `${cliente.nome} ${cliente.email ?? ""} ${cliente.telefone ?? ""}`.toLowerCase();
      return alvo.includes(termo.toLowerCase());
    })
    .sort(ordenacoes[ordenar] ?? ordenacoes.atraso);

  const filtrado = termo !== "" || situacao !== "todos";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/"
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Início
        </Link>
        <h1 className="text-xl font-semibold">Clientes ativos</h1>
        <p className="text-sm text-muted-foreground">
          Quem ainda tem parcela em aberto, quanto deve e o quanto a sua carteira depende de cada um.
        </p>
      </div>

      {/* Os três números que mudam a conduta: o tamanho da carteira, o que já
          venceu e o risco de depender de um cliente só. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Resumo
          icone={<Wallet className="h-4 w-4" aria-hidden="true" />}
          rotulo="Em aberto na carteira"
          valor={moeda(carteira)}
          detalhe={`${todos.length === 1 ? "1 cliente ativo" : `${todos.length} clientes ativos`}`}
        />
        <Resumo
          icone={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
          rotulo="Em atraso"
          valor={moeda(atrasoTotal)}
          tom={atrasoTotal > 0 ? "destructive" : undefined}
          detalhe={
            comAtraso.length === 0
              ? "Ninguém atrasado"
              : `${comAtraso.length === 1 ? "1 cliente" : `${comAtraso.length} clientes`} com parcela vencida`
          }
        />
        <Resumo
          icone={<PieChart className="h-4 w-4" aria-hidden="true" />}
          rotulo="Maior concentração"
          valor={maior ? `${concentracao}%` : "—"}
          tom={concentracao >= 50 ? "warning" : undefined}
          detalhe={maior ? `da carteira é ${maior.nome}` : "Sem carteira em aberto"}
        />
      </div>

      {todos.length === 0 ? (
        <Vazio
          titulo="Nenhum cliente ativo"
          detalhe="Não há parcelas em aberto na carteira — nada a cobrar por enquanto."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <BuscaUrl placeholder="Buscar por nome, e-mail ou telefone..." rotulo="Buscar cliente" />
            <SelectUrl
              nome="situacao"
              rotulo="Filtrar por situação"
              className="w-48"
              opcoes={[
                { valor: "todos", texto: `Todos (${todos.length})` },
                { valor: "atraso", texto: `Com atraso (${comAtraso.length})` },
                { valor: "em_dia", texto: `Em dia (${todos.length - comAtraso.length})` },
              ]}
            />
            <SelectUrl
              nome="ordenar"
              rotulo="Ordenar clientes"
              padrao="atraso"
              className="w-52"
              opcoes={[
                { valor: "atraso", texto: "Maior atraso" },
                { valor: "aberto", texto: "Maior valor em aberto" },
                { valor: "vencimento", texto: "Próximo vencimento" },
                { valor: "nome", texto: "Nome (A–Z)" },
              ]}
            />
          </div>

          {clientes.length === 0 ? (
            <Vazio titulo="Nenhum cliente encontrado" detalhe="Ajuste a busca ou o filtro de situação." />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="w-20 text-right">Contratos</TableHead>
                    <TableHead className="w-36 text-right">Em aberto</TableHead>
                    <TableHead className="w-40">% da carteira</TableHead>
                    <TableHead className="w-36 text-right">Em atraso</TableHead>
                    <TableHead className="w-40">Próx. venc.</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((cliente) => (
                    <LinhaCliente key={cliente.id} cliente={cliente} carteira={carteira} hoje={hoje} />
                  ))}
                </TableBody>
              </Table>

              <p className="text-xs text-muted-foreground">
                {filtrado
                  ? `${clientes.length} de ${todos.length} clientes · ${moeda(
                      clientes.reduce((total, cliente) => total + cliente.emAberto, 0),
                    )} em aberto no filtro.`
                  : "Clique em um cliente para ver os contratos dele."}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LinhaCliente({
  cliente,
  carteira,
  hoje,
}: {
  cliente: ClienteAtivo;
  carteira: number;
  hoje: Date;
}) {
  const fatia = carteira > 0 ? (cliente.emAberto / carteira) * 100 : 0;
  const contato = [cliente.email, cliente.telefone].filter(Boolean).join(" · ");
  // A busca de contratos casa pelo nome do cliente — é o filtro que o
  // advogado teria montado à mão ao clicar aqui.
  const href = `/pagamentos?busca=${encodeURIComponent(cliente.nome)}`;

  return (
    <TableRow>
      <TableCell className="max-w-[260px]">
        <div className="flex items-center gap-3">
          {/* Tinta clara com a cor do cliente: legível nos dois temas, ao
              contrário de texto branco sobre a cor cheia. */}
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-foreground"
            style={{
              background: `color-mix(in oklab, ${corDoNome(cliente.nome)} 22%, transparent)`,
              boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${corDoNome(cliente.nome)} 45%, transparent)`,
            }}
            aria-hidden="true"
          >
            {iniciais(cliente.nome)}
          </span>
          <span className="min-w-0">
            <Link
              href={href}
              className="block truncate font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {cliente.nome}
            </Link>
            {contato && <span className="block truncate text-xs text-muted-foreground">{contato}</span>}
          </span>
        </div>
      </TableCell>

      <TableCell className="text-right tabular-nums text-muted-foreground">{cliente.contratos}</TableCell>

      <TableCell className="text-right font-mono tabular-nums">{moeda(cliente.emAberto)}</TableCell>

      <TableCell>
        {/* A barra existe para o olho comparar sem ler número nenhum: é assim
            que a concentração num cliente só aparece sozinha. */}
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(2, Math.min(100, fatia))}%`,
                background: fatia >= 50 ? "var(--warning)" : "var(--primary)",
              }}
            />
          </div>
          <span className="font-mono text-xs tabular-nums text-muted-foreground">{Math.round(fatia)}%</span>
        </div>
      </TableCell>

      <TableCell className="text-right">
        {cliente.emAtraso > 0 ? (
          <Badge variant="destructive" dot>
            {moeda(cliente.emAtraso)}
          </Badge>
        ) : (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="text-xs text-muted-foreground">
        {cliente.proximoVencimento ? (
          <>
            <span className="block tabular-nums text-foreground">{data(cliente.proximoVencimento)}</span>
            <span className="block">{quandoVence(cliente.proximoVencimento, hoje)}</span>
          </>
        ) : (
          <span>só atraso</span>
        )}
      </TableCell>

      <TableCell>
        <Link
          href={href}
          aria-label={`Ver contratos de ${cliente.nome}`}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </TableCell>
    </TableRow>
  );
}

function Resumo({
  icone,
  rotulo,
  valor,
  detalhe,
  tom,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
  detalhe?: string;
  tom?: "destructive" | "warning";
}) {
  return (
    <div className="rounded-2xl bg-accent/60 p-5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icone}
        {rotulo}
      </div>
      <div
        className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
          tom === "destructive" ? "text-destructive" : tom === "warning" ? "text-warning" : "text-foreground"
        }`}
      >
        {valor}
      </div>
      {detalhe && <div className="mt-0.5 truncate text-xs text-muted-foreground">{detalhe}</div>}
    </div>
  );
}

function Vazio({ titulo, detalhe }: { titulo: string; detalhe: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-accent/60 p-10 text-center">
      <Users className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">{titulo}</p>
      <p className="text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );
}
