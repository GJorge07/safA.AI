import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O pdf-parse resolve o worker do PDF.js relativamente ao próprio pacote.
  // Se o Next empacotar a biblioteca, esse caminho passa a apontar para
  // .next/server/chunks, onde o worker não existe.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
