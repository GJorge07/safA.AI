import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O pdf-parse resolve o worker do PDF.js relativamente ao próprio pacote.
  // Se o Next empacotar a biblioteca, esse caminho passa a apontar para
  // .next/server/chunks, onde o worker não existe.
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    // O projeto usa TypeScript 5.9, cuja API JavaScript evita uma falha do
    // processo isolado do tsc no build com Node 24.
    useTypeScriptCli: false,
  },
};

export default nextConfig;
