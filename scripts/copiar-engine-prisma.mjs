// O client do Prisma é gerado em app/generated/prisma (fora de node_modules).
// Quando o Next empacota esse client, ele passa a rodar de .next/server/chunks
// e procura o engine ali — mas o .node é carregado em tempo de execução, então
// o rastreamento de arquivos do Next não o segue e ele nunca é copiado.
//
// Sem isso o deploy sobe normalmente e só quebra na primeira consulta, com
// "Prisma Client could not locate the Query Engine". Copiar os engines para
// junto do bundle é a correção que a própria mensagem de erro recomenda.
import { copyFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const origem = "app/generated/prisma";
const destinos = [".next/server/chunks", ".next/server"];

const engines = (await readdir(origem)).filter((nome) => nome.endsWith(".node"));
if (engines.length === 0) {
  console.error(`Nenhum engine .node encontrado em ${origem}. Rodou 'prisma generate'?`);
  process.exit(1);
}

for (const destino of destinos) {
  await mkdir(destino, { recursive: true });
  for (const engine of engines) {
    await copyFile(join(origem, engine), join(destino, engine));
  }
}

console.log(`Engines copiados para ${destinos.join(" e ")}: ${engines.join(", ")}`);
