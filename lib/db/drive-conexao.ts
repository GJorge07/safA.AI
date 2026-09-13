import { prisma } from "@/lib/prisma";

const ID_SINGLETON = "default";

export interface DriveConexaoInfo {
  conectado: boolean;
  contaEmail: string | null;
  pastaId: string | null;
}

export async function obterConexaoDrive(): Promise<DriveConexaoInfo> {
  const conexao = await prisma.driveConexao.findUnique({ where: { id: ID_SINGLETON } });
  if (!conexao) return { conectado: false, contaEmail: null, pastaId: null };
  return { conectado: true, contaEmail: conexao.contaEmail, pastaId: conexao.pastaId };
}

export async function obterRefreshTokenDrive(): Promise<string | null> {
  const conexao = await prisma.driveConexao.findUnique({ where: { id: ID_SINGLETON } });
  return conexao?.refreshToken ?? null;
}

export async function obterPastaDrive(): Promise<string | null> {
  const conexao = await prisma.driveConexao.findUnique({ where: { id: ID_SINGLETON } });
  return conexao?.pastaId ?? null;
}

export async function salvarConexaoDrive(dados: { refreshToken: string; contaEmail: string | null }): Promise<void> {
  await prisma.driveConexao.upsert({
    where: { id: ID_SINGLETON },
    create: { id: ID_SINGLETON, refreshToken: dados.refreshToken, contaEmail: dados.contaEmail },
    update: { refreshToken: dados.refreshToken, contaEmail: dados.contaEmail },
  });
}

export async function salvarPastaDrive(pastaId: string): Promise<void> {
  await prisma.driveConexao.update({ where: { id: ID_SINGLETON }, data: { pastaId } });
}

export async function desconectarDrive(): Promise<void> {
  await prisma.driveConexao.deleteMany({ where: { id: ID_SINGLETON } });
}

export async function arquivosJaImportados(driveFileIds: string[]): Promise<Set<string>> {
  if (driveFileIds.length === 0) return new Set();
  const linhas = await prisma.driveArquivoImportado.findMany({
    where: { driveFileId: { in: driveFileIds } },
    select: { driveFileId: true },
  });
  return new Set(linhas.map((l) => l.driveFileId));
}

export async function marcarArquivoImportado(dados: {
  driveFileId: string;
  status: "importado" | "revisao_necessaria" | "erro";
  contratoId?: string | null;
}): Promise<void> {
  await prisma.driveArquivoImportado.upsert({
    where: { driveFileId: dados.driveFileId },
    create: { driveFileId: dados.driveFileId, status: dados.status, contratoId: dados.contratoId ?? null },
    update: { status: dados.status, contratoId: dados.contratoId ?? null },
  });
}
