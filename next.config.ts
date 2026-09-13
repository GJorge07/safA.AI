import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse usa pdfjs-dist, que resolve o worker (pdf.worker.mjs) por um
  // caminho relativo ao próprio pacote em node_modules — empacotado pelo
  // bundler do Next, esse caminho quebra ("Setting up fake worker failed").
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
