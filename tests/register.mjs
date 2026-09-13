import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
registerHooks({
  resolve(specifier, context, nextResolve) {
    let candidate;
    if (specifier.startsWith('@/')) candidate = path.join(root, specifier.slice(2));
    else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) candidate = fileURLToPath(new URL(specifier, context.parentURL));
    if (candidate && !path.extname(candidate) && existsSync(`${candidate}.ts`)) {
      return nextResolve(pathToFileURL(`${candidate}.ts`).href, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === pathToFileURL(path.join(root, 'lib/prisma.ts')).href) {
      return {
        format: 'module', shortCircuit: true,
        source: `
          const unexpected = () => { throw new Error('Consulta ao banco sem mock no teste'); };
          const delegate = () => Object.fromEntries(['findMany', 'findUnique', 'create', 'update', 'delete'].map(name => [name, unexpected]));
          export const prisma = { perfilAdvogado: { findUnique: async () => null, upsert: unexpected }, cliente: delegate(), contrato: delegate(), parcela: delegate(), pagamento: delegate(), $transaction: unexpected };
        `,
      };
    }
    if (url.startsWith('file:') && url.endsWith('.ts') && !url.includes('/node_modules/')) {
      const source = ts.transpileModule(readFileSync(fileURLToPath(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText;
      return { format: 'module', source, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
