SAFA — backend de contratos de honorários, parcelas e pagamentos, construído com Next.js e Prisma/PostgreSQL.

Consulte [a documentação da API](docs/api.md) para rotas, exemplos, regras financeiras, configuração do Gemini e testes. O dashboard está em `/`, com telas em `/contratos` e `/agente`. As telas ainda usam dados de demonstração; upload e sincronização visual do Drive ainda são simulados.

Os módulos de IA e chat estão documentados em [lib/ai/README.md](lib/ai/README.md). `POST /api/contratos/extrair` mantém a extração simples de PDF/TXT/texto; `POST /api/contratos/importar` preserva o pipeline com evidências, DOCX e referências do Drive. Nenhuma dessas rotas grava contratos automaticamente. O chat recebe o contexto financeiro exibido pela interface.

`npm test` executa as suítes de API e IA; `npm run typecheck` verifica TypeScript.

Para um ambiente novo, copie `.env.example` para `.env`, configure `DATABASE_URL`, instale as dependências e rode `npx prisma generate`. Prepare o banco conforme `prisma/schema.prisma`; este repositório ainda não possui migrations versionadas. Gemini é opcional para as rotas financeiras e obrigatório apenas para extração.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the dashboard by modifying `app/(dashboard)/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
