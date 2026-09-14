// lib/prisma.ts
import { join } from 'node:path';
import { PrismaClient } from '@/app/generated/prisma/client';

// Nas funções da Vercel o client vai empacotado em .next/server/chunks e
// procura o engine ali, mas o .node é carregado dinamicamente e o
// rastreamento de arquivos do Next não o segue até lá. O next.config põe o
// arquivo no pacote (outputFileTracingIncludes); aqui dizemos onde ele está.
//
// Tem de ser em runtime, e não como variável de ambiente do projeto: no build
// esse caminho ainda não existe, e o `prisma generate` falha ao resolvê-lo.
if (process.env.VERCEL && !process.env.PRISMA_QUERY_ENGINE_LIBRARY) {
  process.env.PRISMA_QUERY_ENGINE_LIBRARY = join(
    process.cwd(),
    'app/generated/prisma/libquery_engine-rhel-openssl-3.0.x.so.node',
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  (globalForPrisma.prisma?.perfilAdvogado ? globalForPrisma.prisma : undefined) ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
