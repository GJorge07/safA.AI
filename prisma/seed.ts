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

const DESPESAS_FIXAS = [
  { descricao: "Assinatura do sistema jurídico", categoria: "SOFTWARE", valor: 249.9, fornecedor: "Jurídico Cloud" },
  { descricao: "Aluguel da sala comercial", categoria: "ESTRUTURA", valor: 1800, fornecedor: "Imobiliária Centro" },
  { descricao: "Internet e telefonia", categoria: "ESTRUTURA", valor: 189.9, fornecedor: "Conecta Telecom" },
  { descricao: "Contabilidade mensal", categoria: "PESSOAL", valor: 450, fornecedor: "Contábil Paraná" },
  { descricao: "Simples Nacional (DAS)", categoria: "TRIBUTOS", valor: 980, fornecedor: "Receita Federal" },
] as const;

const DESPESAS_AVULSAS = [
  { descricao: "Custas iniciais", categoria: "CUSTAS_PROCESSUAIS", fornecedor: "TJPR" },
  { descricao: "Diligência de oficial de justiça", categoria: "DILIGENCIA", fornecedor: "TJPR" },
  { descricao: "Honorários periciais", categoria: "PERICIA", fornecedor: "Perito nomeado" },
  { descricao: "Correspondente em comarca do interior", categoria: "PESSOAL", fornecedor: "Rede Correspondentes" },
  { descricao: "Cópias e autenticações", categoria: "OUTROS", fornecedor: "Cartório 2º Ofício" },
  { descricao: "Guia de preparo recursal", categoria: "CUSTAS_PROCESSUAIS", fornecedor: "TJPR" },
] as const;

async function semearDespesas(contratoIds: string[], hoje: Date) {
  for (let i = 1; i <= QUANTIDADE_DESPESAS; i += 1) {
    const despesaId = id("dp-seed", i);
    // Um terço é custo recorrente do escritório; o resto é custo de caso,
    // amarrado a um contrato e normalmente reembolsável.
    const recorrente = i % 3 === 0;
    const mes = inteiro(-3, 2);
    const vencimento = dia(hoje.getUTCFullYear(), hoje.getUTCMonth() + mes, escolher([5, 10, 15, 20, 25]));
    const jaVenceu = vencimento < hoje;

    const base = recorrente
      ? { ...escolher(DESPESAS_FIXAS), recorrencia: "MENSAL" as const, contratoId: null, reembolsavel: false }
      : {
          ...escolher(DESPESAS_AVULSAS),
          valor: inteiro(4, 240) * 25,
          recorrencia: "UNICA" as const,
          contratoId: escolher(contratoIds),
          reembolsavel: aleatorio() < 0.7,
        };

    // Nem tudo o que venceu está pago — é o que dá conteúdo ao filtro "atrasada".
    const pagoEm = jaVenceu && aleatorio() < 0.75 ? new Date(vencimento.getTime() + inteiro(0, 5) * 86400000) : null;

    const dados = {
      descricao: base.descricao,
      categoria: base.categoria,
      valor: base.valor,
      vencimento,
      pagoEm,
      recorrencia: base.recorrencia,
      fornecedor: base.fornecedor,
      contratoId: base.contratoId,
      reembolsavel: base.reembolsavel,
      origem: recorrente ? ("MANUAL" as const) : escolher(["MANUAL", "UPLOAD", "DRIVE"] as const),
    };

    await prisma.despesa.upsert({
      where: { id: despesaId },
      update: dados,
      create: { id: despesaId, ...dados },
    });
  }
}

// Trocar de volume para demo precisa limpar o que o modo anterior criou,
// senão os 180 contratos gerados continuariam distorcendo os totais do pitch.
async function limparVolume() {
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

  const [totalClientes, totalContratos, totalParcelas, totalPagamentos, totalDespesas] = await Promise.all([
    prisma.cliente.count(),
    prisma.contrato.count(),
    prisma.parcela.count(),
    prisma.pagamento.count(),
    prisma.despesa.count(),
  ]);
  console.log(
    `Seed concluído: ${totalClientes} clientes, ${totalContratos} contratos, ${totalParcelas} parcelas, ` +
      `${totalPagamentos} pagamentos, ${totalDespesas} despesas.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
