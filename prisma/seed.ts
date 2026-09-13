// Popula o banco com o conjunto de demonstração que já existia em
// lib/mock-data.ts, mais um volume grande gerado por PRNG de semente fixa —
// a lista paginada só se prova com centenas de registros. Os ids são fixos e
// tudo é upsert, então rodar de novo atualiza os mesmos registros.
//
// Os 3 clientes e 4 contratos originais (cli1..cli3, c1..c4) são preservados
// como estão: o chat, os testes de lib/ai e a pergunta "quanto vou receber em
// outubro = R$ 18.000" do pitch dependem deles.
import { PrismaClient } from "../app/generated/prisma/client";
import { contratosMock } from "../lib/mock-data";

const prisma = new PrismaClient();

const paraEnumDb = { fixo: "FIXO", exito: "EXITO", misto: "MISTO" } as const;

// SEED_VOLUME=0 popula só o conjunto de demonstração (3 clientes, 4 contratos)
// — é o modo do pitch, em que "quanto vou receber em outubro" precisa dar os
// R$ 18.000 conhecidos. Sem a variável, gera o volume que a lista paginada
// exige para se provar.
const COM_VOLUME = process.env.SEED_VOLUME !== "0";
const QUANTIDADE_CLIENTES = COM_VOLUME ? 120 : 0;
const QUANTIDADE_CONTRATOS = COM_VOLUME ? 180 : 0;
const QUANTIDADE_DESPESAS = COM_VOLUME ? 60 : 8;
const QUANTIDADE_SERVICOS = COM_VOLUME ? 45 : 5;

// mulberry32: PRNG minúsculo e determinístico. Semente fixa para o seed gerar
// exatamente a mesma base toda vez, sem dependência nova no projeto.
function prng(semente: number) {
  let estado = semente;
  return () => {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const aleatorio = prng(20260913);

function escolher<T>(lista: readonly T[]): T {
  return lista[Math.floor(aleatorio() * lista.length)];
}

function inteiro(min: number, max: number): number {
  return min + Math.floor(aleatorio() * (max - min + 1));
}

function id(prefixo: string, indice: number): string {
  return `${prefixo}-${String(indice).padStart(3, "0")}`;
}

const NOMES = [
  "Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela",
  "Jonas", "Karina", "Lucas", "Mariana", "Nelson", "Olívia", "Paulo", "Queila", "Rafael",
  "Sabrina", "Thiago", "Úrsula", "Vinícius", "Wagner", "Yasmin", "Zeca", "Beatriz", "Caio",
  "Daniela", "Elias", "Fernanda",
];
const SOBRENOMES = [
  "Almeida", "Barbosa", "Cardoso", "Duarte", "Esteves", "Ferreira", "Gonçalves", "Horta",
  "Iglesias", "Jardim", "Klein", "Lima", "Moraes", "Nogueira", "Oliveira", "Pacheco",
  "Quirino", "Ribeiro", "Santos", "Teixeira", "Vasconcelos", "Xavier",
];
const EMPRESAS = [
  "Metalúrgica Paraná", "Transportes Iguaçu", "Padaria Central", "Clínica Vida Nova",
  "Auto Peças Curitiba", "Construtora Horizonte", "Supermercado Bandeirantes",
  "Gráfica Araucária", "Laboratório Santa Rita", "Confecções Bela Vista",
  "Distribuidora Pinheirão", "Serralheria Boa Vista", "Escola Aprender Mais",
  "Hotel Portal do Sul", "Farmácia São Jorge",
];
const SUFIXOS = ["Ltda.", "S.A.", "ME", "EIRELI"];

const TITULOS = [
  "Reclamatória trabalhista", "Ação de cobrança", "Defesa em execução fiscal",
  "Revisional de contrato", "Inventário e partilha", "Ação de despejo",
  "Recuperação de crédito", "Assessoria contratual", "Defesa consumerista",
  "Ação previdenciária", "Mandado de segurança", "Dissolução societária",
];

const CLAUSULAS = {
  fixo: (total: number, n: number, parcela: number) =>
    `Cláusula 2ª — Dos Honorários Fixos: o valor total de R$ ${moeda(total)} será pago em ${n} parcela(s) de R$ ${moeda(parcela)}, com vencimento todo dia 10, corrigidas pelo IPCA em caso de atraso.`,
  exito: (total: number) =>
    `Cláusula 3ª — Do Êxito: o CONTRATANTE pagará à CONTRATADA R$ ${moeda(total)} em parcela única, no prazo de 10 dias contados do trânsito em julgado, sob pena de multa de 2% e juros de 1% ao mês.`,
  misto: (total: number, n: number, parcela: number) =>
    `Cláusula 4ª — Dos Honorários: ${n} parcela(s) mensal(is) de R$ ${moeda(parcela)}, totalizando R$ ${moeda(total)} a título de honorários fixos, sem prejuízo do êxito de 10% sobre o proveito econômico obtido.`,
} as const;

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dia(ano: number, mes: number, diaDoMes: number): Date {
  return new Date(Date.UTC(ano, mes, diaDoMes));
}

function documentoFicticio(pessoaJuridica: boolean, indice: number): string {
  const base = String(indice).padStart(3, "0");
  // Sequências claramente fictícias — nenhum documento real tem esse formato.
  return pessoaJuridica ? `00.000.${base}/0001-00` : `000.000.${base}-00`;
}

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

async function semearBase() {
  const clientes = new Map(contratosMock.map((contrato) => [contrato.clienteId, contrato.cliente]));

  for (const cliente of clientes.values()) {
    const dados = {
      nome: cliente.nome,
      documento: cliente.documento,
      email: cliente.email,
      telefone: cliente.telefone,
    };
    await prisma.cliente.upsert({
      where: { id: cliente.id },
      update: dados,
      create: { id: cliente.id, ...dados, createdAt: cliente.createdAt },
    });
  }

  for (const contrato of contratosMock) {
    const dados = {
      clienteId: contrato.clienteId,
      titulo: contrato.titulo,
      tipoPagamento: paraEnumDb[contrato.tipoPagamento],
      valorTotal: contrato.valorTotal,
      clausulaOriginal: contrato.clausulaOriginal,
    };
    await prisma.contrato.upsert({
      where: { id: contrato.id },
      update: dados,
      create: { id: contrato.id, ...dados, createdAt: contrato.createdAt },
    });

    for (const parcela of contrato.parcelas) {
      await prisma.parcela.upsert({
        where: { id: parcela.id },
        update: { valor: parcela.valor, vencimento: parcela.vencimento },
        create: {
          id: parcela.id,
          contratoId: contrato.id,
          valor: parcela.valor,
          vencimento: parcela.vencimento,
        },
      });

      if (!parcela.pagamento) continue;
      await prisma.pagamento.upsert({
        where: { id: parcela.pagamento.id },
        update: { valorPago: parcela.pagamento.valorPago, dataPago: parcela.pagamento.dataPago },
        create: {
          id: parcela.pagamento.id,
          parcelaId: parcela.id,
          valorPago: parcela.pagamento.valorPago,
          dataPago: parcela.pagamento.dataPago,
        },
      });
    }
  }
}

async function semearClientes(): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 1; i <= QUANTIDADE_CLIENTES; i += 1) {
    const clienteId = id("cli-seed", i);
    const pessoaJuridica = aleatorio() < 0.4;
    const nome = pessoaJuridica
      ? `${escolher(EMPRESAS)} ${escolher(SUFIXOS)}`
      : `${escolher(NOMES)} ${escolher(SOBRENOMES)}`;
    const usuario = normalizar(nome).slice(0, 16) || "cliente";
    const dados = {
      nome,
      documento: documentoFicticio(pessoaJuridica, i),
      email: `${usuario}${i}@exemplo.br`,
      telefone: `(41) 9${inteiro(1000, 9999)}-${String(inteiro(0, 9999)).padStart(4, "0")}`,
    };
    await prisma.cliente.upsert({
      where: { id: clienteId },
      update: dados,
      create: { id: clienteId, ...dados, createdAt: dia(2026, inteiro(0, 8), inteiro(1, 28)) },
    });
    ids.push(clienteId);
  }
  return ids;
}

// ~15% atrasados, ~25% quitados, o resto em dia — o suficiente para os chips de
// filtro e o bloco de cobrança terem o que mostrar.
function sortearPerfil(): "atrasado" | "quitado" | "em_dia" {
  const sorteio = aleatorio();
  if (sorteio < 0.15) return "atrasado";
  if (sorteio < 0.4) return "quitado";
  return "em_dia";
}

async function semearContratos(clienteIds: string[], hoje: Date): Promise<string[]> {
  const criados: string[] = [];

  for (let i = 1; i <= QUANTIDADE_CONTRATOS; i += 1) {
    const contratoId = id("ct-seed", i);
    // Os 25 primeiros clientes recebem mais de um contrato, para a aba
    // "Cliente" do detalhe ter contratos irmãos para listar.
    const clienteId = i <= 40 ? clienteIds[i % 25] : escolher(clienteIds);
    const tipo = escolher(["fixo", "exito", "misto"] as const);
    const perfil = sortearPerfil();
    const quantidadeParcelas = tipo === "exito" ? 1 : inteiro(2, 6);
    const valorParcela = inteiro(8, 90) * 250;
    const valorTotal = valorParcela * quantidadeParcelas;
    const clausula =
      tipo === "exito"
        ? CLAUSULAS.exito(valorTotal)
        : CLAUSULAS[tipo](valorTotal, quantidadeParcelas, valorParcela);

    // Contrato atrasado começa no passado; em dia começa perto de agora.
    const mesInicial =
      perfil === "atrasado" ? inteiro(-10, -3) : perfil === "quitado" ? inteiro(-14, -5) : inteiro(-2, 4);

    const dados = {
      clienteId,
      titulo: escolher(TITULOS),
      processo: aleatorio() < 0.6 ? `${inteiro(100000, 999999)}-${inteiro(10, 99)}.2026.8.16.0001` : null,
      tipoPagamento: paraEnumDb[tipo],
      valorTotal,
      clausulaOriginal: clausula,
      origem: escolher(["MANUAL", "UPLOAD", "DRIVE"] as const),
    };

    await prisma.contrato.upsert({
      where: { id: contratoId },
      update: dados,
      create: {
        id: contratoId,
        ...dados,
        createdAt: dia(hoje.getUTCFullYear(), hoje.getUTCMonth() + mesInicial - 1, inteiro(1, 28)),
      },
    });
    criados.push(contratoId);

    for (let p = 0; p < quantidadeParcelas; p += 1) {
      const parcelaId = `${contratoId}-p${p + 1}`;
      const vencimento = dia(hoje.getUTCFullYear(), hoje.getUTCMonth() + mesInicial + p, escolher([5, 10, 15, 20]));
      await prisma.parcela.upsert({
        where: { id: parcelaId },
        update: { valor: valorParcela, vencimento },
        create: { id: parcelaId, contratoId, valor: valorParcela, vencimento },
      });

      const jaVenceu = vencimento < hoje;
      // Quitado paga tudo; atrasado deixa pelo menos a primeira vencida em
      // aberto; em dia paga só o que já venceu.
      const pago = perfil === "quitado" ? true : perfil === "atrasado" ? jaVenceu && p > 0 : jaVenceu;
      const pagamentoId = `${parcelaId}-pg`;

      if (!pago) {
        await prisma.pagamento.deleteMany({ where: { id: pagamentoId } });
        continue;
      }

      const dataPago = new Date(vencimento.getTime() + inteiro(-3, 4) * 86400000);
      await prisma.pagamento.upsert({
        where: { id: pagamentoId },
        update: { valorPago: valorParcela, dataPago },
        create: { id: pagamentoId, parcelaId, valorPago: valorParcela, dataPago },
      });
    }
  }

  return criados;
}

const DESPESAS_ESCRITORIO = [
  { descricao: "Assinatura do sistema jurídico", categoria: "SOFTWARE", valor: 249.9, fornecedor: "Jurídico Cloud" },
  { descricao: "Aluguel da sala comercial", categoria: "ESTRUTURA", valor: 1800, fornecedor: "Imobiliária Centro" },
  { descricao: "Internet e telefonia", categoria: "ESTRUTURA", valor: 189.9, fornecedor: "Conecta Telecom" },
  { descricao: "Contabilidade mensal", categoria: "PESSOAL", valor: 450, fornecedor: "Contábil Paraná" },
  { descricao: "Simples Nacional (DAS)", categoria: "TRIBUTOS", valor: 980, fornecedor: "Receita Federal" },
] as const;

// Gastos de processo do jeito que aparecem na vida real: em maioria pequenos,
// frequentes e pagos do bolso. Somados, são eles que comem a margem do caso —
// a ida ao juizado é o exemplo que a advogada deu.
const DESPESAS_PROCESSO = [
  { descricao: "Transporte até o Juizado Especial", categoria: "DESLOCAMENTO", min: 18, max: 60, fornecedor: "App de transporte" },
  { descricao: "Estacionamento no fórum", categoria: "DESLOCAMENTO", min: 12, max: 35, fornecedor: "Estacionamento Fórum" },
  { descricao: "Combustível para audiência em comarca vizinha", categoria: "DESLOCAMENTO", min: 60, max: 180, fornecedor: "Posto" },
  { descricao: "Custas iniciais", categoria: "CUSTAS", min: 120, max: 900, fornecedor: "TJPR" },
  { descricao: "Guia de preparo recursal", categoria: "CUSTAS", min: 200, max: 1200, fornecedor: "TJPR" },
  { descricao: "Porte de remessa e retorno", categoria: "CUSTAS", min: 35, max: 90, fornecedor: "TJPR" },
  { descricao: "Diligência de oficial de justiça", categoria: "DILIGENCIA", min: 90, max: 260, fornecedor: "TJPR" },
  { descricao: "Cópias e autenticação de documentos", categoria: "CARTORIO", min: 8, max: 70, fornecedor: "Cartório 2º Ofício" },
  { descricao: "Certidão de distribuição", categoria: "CARTORIO", min: 15, max: 60, fornecedor: "Cartório distribuidor" },
  { descricao: "Honorários periciais", categoria: "PERICIA", min: 800, max: 3500, fornecedor: "Perito nomeado" },
  { descricao: "Correspondente para audiência no interior", categoria: "CORRESPONDENTE", min: 150, max: 400, fornecedor: "Rede Correspondentes" },
] as const;

async function semearDespesas(contratoIds: string[], hoje: Date) {
  for (let i = 1; i <= QUANTIDADE_DESPESAS; i += 1) {
    const despesaId = id("dp-seed", i);
    // Só um quarto é custo fixo de escritório: o volume do dia a dia de quem
    // está começando é gasto de processo.
    const doEscritorio = i % 4 === 0;
    const mes = inteiro(-3, 2);
    const vencimento = dia(hoje.getUTCFullYear(), hoje.getUTCMonth() + mes, escolher([5, 10, 15, 20, 25]));
    const jaVenceu = vencimento < hoje;

    const base = doEscritorio
      ? {
          ...escolher(DESPESAS_ESCRITORIO),
          tipo: "ESCRITORIO" as const,
          contratoId: null,
          quemPaga: "ADVOGADO" as const,
        }
      : (() => {
          const modelo = escolher(DESPESAS_PROCESSO);
          return {
            descricao: modelo.descricao,
            categoria: modelo.categoria,
            fornecedor: modelo.fornecedor,
            valor: inteiro(modelo.min, modelo.max),
            tipo: "PROCESSO" as const,
            contratoId: escolher(contratoIds),
            // Metade dos contratos não prevê reembolso: esse gasto sai do
            // bolso do advogado e nunca volta.
            quemPaga: aleatorio() < 0.55 ? ("CLIENTE" as const) : ("ADVOGADO" as const),
          };
        })();

    // Nem tudo o que venceu está pago — é o que dá conteúdo ao filtro "atrasada".
    const pagoEm = jaVenceu && aleatorio() < 0.8 ? new Date(vencimento.getTime() + inteiro(0, 5) * 86400000) : null;

    // Só parte do que era do cliente foi efetivamente repassada: o resto é o
    // dinheiro que o advogado adiantou sem perceber.
    const cobradoEm =
      base.quemPaga === "CLIENTE" && pagoEm && aleatorio() < 0.35
        ? new Date(pagoEm.getTime() + inteiro(1, 20) * 86400000)
        : null;

    const dados = {
      descricao: base.descricao,
      tipo: base.tipo,
      categoria: base.categoria,
      valor: base.valor,
      vencimento,
      pagoEm,
      cobradoEm,
      fornecedor: base.fornecedor,
      contratoId: base.contratoId,
      quemPaga: base.quemPaga,
      origem: doEscritorio ? ("MANUAL" as const) : escolher(["MANUAL", "UPLOAD", "DRIVE"] as const),
    };

    await prisma.despesa.upsert({
      where: { id: despesaId },
      update: dados,
      create: { id: despesaId, ...dados },
    });
  }
}


// Serviços avulsos: o que o advogado cobra fora do contrato. Dois sabores —
// o solto (consulta de balcão) e o extra dentro de um caso já contratado.
const SERVICOS = [
  { descricao: "Consulta sobre rescisão contratual", categoria: "CONSULTA", min: 150, max: 400 },
  { descricao: "Consulta inicial sobre ação trabalhista", categoria: "CONSULTA", min: 150, max: 350 },
  { descricao: "Parecer sobre cláusula de não concorrência", categoria: "PARECER", min: 600, max: 2500 },
  { descricao: "Petição avulsa de habilitação", categoria: "PETICAO", min: 300, max: 900 },
  { descricao: "Audiência de conciliação fora do contrato", categoria: "AUDIENCIA", min: 400, max: 1200 },
  { descricao: "Elaboração de contrato de prestação de serviços", categoria: "ELABORACAO_CONTRATO", min: 500, max: 2000 },
] as const;

async function semearServicos(clienteIds: string[], contratoIds: string[], hoje: Date) {
  for (let i = 1; i <= QUANTIDADE_SERVICOS; i += 1) {
    const servicoId = id("sv-seed", i);
    const modelo = escolher(SERVICOS);
    // Um terço acontece dentro de um caso já contratado — é o "extra" que o
    // advogado presta no meio do processo e esquece de cobrar.
    const dentroDeUmCaso = i % 3 === 0 && contratoIds.length > 0;
    const realizadoEm = new Date(hoje.getTime() - inteiro(0, 90) * 86400000);
    const vencimento = new Date(realizadoEm.getTime() + escolher([0, 7, 15, 30]) * 86400000);
    const jaVenceu = vencimento < hoje;

    const dados = {
      descricao: modelo.descricao,
      categoria: modelo.categoria,
      valor: inteiro(modelo.min, modelo.max),
      realizadoEm,
      vencimento,
      // Boa parte do que venceu ainda não foi recebida: é o buraco que a aba
      // de serviços existe para mostrar.
      recebidoEm: jaVenceu && aleatorio() < 0.6 ? new Date(vencimento.getTime() + inteiro(0, 10) * 86400000) : null,
      clienteId: clienteIds.length > 0 ? escolher(clienteIds) : null,
      contratoId: dentroDeUmCaso ? escolher(contratoIds) : null,
    };

    await prisma.servico.upsert({
      where: { id: servicoId },
      update: dados,
      create: { id: servicoId, ...dados },
    });
  }
}

// Serviços fixos nos contratos da demonstração, para a receita do caso mostrar
// as duas vias somadas já no pitch.
const SERVICOS_DEMO = [
  {
    id: "sv-demo-001",
    contratoId: "c1",
    clienteId: "cli1",
    descricao: "Audiência de conciliação não prevista no contrato",
    categoria: "AUDIENCIA",
    valor: 900,
    diasAtras: 20,
    recebido: false,
  },
  {
    id: "sv-demo-002",
    contratoId: null,
    clienteId: "cli2",
    descricao: "Consulta sobre acordo extrajudicial",
    categoria: "CONSULTA",
    valor: 300,
    diasAtras: 9,
    recebido: true,
  },
] as const;

async function semearServicosDemo(hoje: Date) {
  for (const modelo of SERVICOS_DEMO) {
    const realizadoEm = new Date(hoje.getTime() - modelo.diasAtras * 86400000);
    const dados = {
      descricao: modelo.descricao,
      categoria: modelo.categoria,
      valor: modelo.valor,
      realizadoEm,
      vencimento: realizadoEm,
      recebidoEm: modelo.recebido ? realizadoEm : null,
      clienteId: modelo.clienteId,
      contratoId: modelo.contratoId,
    };
    await prisma.servico.upsert({
      where: { id: modelo.id },
      update: dados,
      create: { id: modelo.id, ...dados },
    });
  }
}

// Trocar de volume para demo precisa limpar o que o modo anterior criou,
// senão os 180 contratos gerados continuariam distorcendo os totais do pitch.
// Gastos fixos nos contratos da demonstração: sem eles, a ficha de c1 abriria
// sem margem nenhuma para mostrar no pitch — e é justamente a conta que a
// tela existe para fazer.
const DESPESAS_DEMO = [
  {
    id: "dp-demo-001",
    contratoId: "c1",
    descricao: "Transporte até o Juizado Especial",
    categoria: "DESLOCAMENTO",
    valor: 42,
    quemPaga: "ADVOGADO",
    diasAtras: 21,
    cobrada: false,
  },
  {
    id: "dp-demo-002",
    contratoId: "c1",
    descricao: "Estacionamento no fórum",
    categoria: "DESLOCAMENTO",
    valor: 18,
    quemPaga: "ADVOGADO",
    diasAtras: 21,
    cobrada: false,
  },
  {
    id: "dp-demo-003",
    contratoId: "c1",
    descricao: "Custas iniciais",
    categoria: "CUSTAS",
    valor: 680,
    quemPaga: "CLIENTE",
    diasAtras: 45,
    cobrada: false,
  },
  {
    id: "dp-demo-004",
    contratoId: "c1",
    descricao: "Cópias e autenticação de documentos",
    categoria: "CARTORIO",
    valor: 34,
    quemPaga: "ADVOGADO",
    diasAtras: 38,
    cobrada: false,
  },
  {
    id: "dp-demo-005",
    contratoId: "c2",
    descricao: "Diligência de oficial de justiça",
    categoria: "DILIGENCIA",
    valor: 145,
    quemPaga: "CLIENTE",
    diasAtras: 30,
    cobrada: true,
  },
  {
    id: "dp-demo-006",
    contratoId: "c2",
    descricao: "Combustível para audiência em comarca vizinha",
    categoria: "DESLOCAMENTO",
    valor: 120,
    quemPaga: "ADVOGADO",
    diasAtras: 14,
    cobrada: false,
  },
] as const;

async function semearDespesasDemo(hoje: Date) {
  for (const modelo of DESPESAS_DEMO) {
    const vencimento = new Date(hoje.getTime() - modelo.diasAtras * 86400000);
    const dados = {
      descricao: modelo.descricao,
      tipo: "PROCESSO" as const,
      categoria: modelo.categoria,
      valor: modelo.valor,
      vencimento,
      pagoEm: vencimento,
      cobradoEm: modelo.cobrada ? new Date(vencimento.getTime() + 5 * 86400000) : null,
      fornecedor: null,
      contratoId: modelo.contratoId,
      quemPaga: modelo.quemPaga,
      origem: "MANUAL" as const,
    };
    await prisma.despesa.upsert({
      where: { id: modelo.id },
      update: dados,
      create: { id: modelo.id, ...dados },
    });
  }
}

async function limparVolume() {
  await prisma.servico.deleteMany({ where: { id: { startsWith: "sv-seed-" } } });
  await prisma.despesa.deleteMany({ where: { id: { startsWith: "dp-seed-" } } });
  await prisma.contrato.deleteMany({ where: { id: { startsWith: "ct-seed-" } } });
  await prisma.cliente.deleteMany({ where: { id: { startsWith: "cli-seed-" } } });
}

async function main() {
  const hoje = new Date();

  if (!COM_VOLUME) await limparVolume();
  await semearBase();
  const clienteIds = await semearClientes();
  const contratoIds = await semearContratos(clienteIds, hoje);
  await semearDespesas([...contratoIds, ...contratosMock.map((c) => c.id)], hoje);
  await semearDespesasDemo(hoje);
  await semearServicos(
    [...clienteIds, ...contratosMock.map((c) => c.clienteId)],
    [...contratoIds, ...contratosMock.map((c) => c.id)],
    hoje,
  );
  await semearServicosDemo(hoje);

  const [totalClientes, totalContratos, totalParcelas, totalPagamentos, totalDespesas, totalServicos] =
    await Promise.all([
    prisma.cliente.count(),
    prisma.contrato.count(),
    prisma.parcela.count(),
    prisma.pagamento.count(),
    prisma.despesa.count(),
    prisma.servico.count(),
  ]);
  console.log(
    `Seed concluído: ${totalClientes} clientes, ${totalContratos} contratos, ${totalParcelas} parcelas, ` +
      `${totalPagamentos} pagamentos, ${totalServicos} serviços, ${totalDespesas} despesas.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
