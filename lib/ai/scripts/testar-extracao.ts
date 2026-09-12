import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { extrairContrato } from "../extractContract.js";

const PASTA_CONTRATOS = "contratos-exemplo";

async function main() {
  const arquivos = (await readdir(PASTA_CONTRATOS)).filter(
    (arquivo) => arquivo.endsWith(".pdf") || arquivo.endsWith(".docx"),
  );

  if (arquivos.length === 0) {
    console.log(`Nenhum .pdf/.docx encontrado em ${PASTA_CONTRATOS}/`);
    return;
  }

  for (const arquivo of arquivos) {
    const caminho = join(PASTA_CONTRATOS, arquivo);
    console.log(`\n=== ${arquivo} ===`);
    try {
      const contrato = await extrairContrato(caminho);
      console.log(JSON.stringify(contrato, null, 2));
    } catch (erro) {
      console.error("Falhou:", erro instanceof Error ? erro.message : erro);
    }
  }
}

main();
