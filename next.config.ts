import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O pdf-parse resolve o worker do PDF.js relativamente ao próprio pacote.
  // Se o Next empacotar a biblioteca, esse caminho passa a apontar para
  // .next/server/chunks, onde o worker não existe.
  serverExternalPackages: ["pdf-parse"],
  // O client do Prisma é gerado em app/generated/prisma, fora de node_modules.
  // O rastreamento de arquivos do Next não segue o .node carregado em tempo de
  // execução, então o engine não ia junto para a função e toda consulta
  // falhava com "could not locate the Query Engine".
  outputFileTracingIncludes: {
    "/**": ["./app/generated/prisma/*.node"],
  },
  experimental: {
    // O projeto usa TypeScript 5.9, cuja API JavaScript evita uma falha do
    // processo isolado do tsc no build com Node 24.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
