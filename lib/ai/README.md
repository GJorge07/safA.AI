# Módulo de IA — Safa.IA

Este módulo usa a Interactions API do Gemini com saída estruturada e validação
Zod. O modelo padrão é `gemini-3.5-flash-lite`.

## Dependências

```bash
npm install @google/genai@^2.3.0 zod mammoth
```

## Ambiente

```env
GEMINI_API_KEY=sua_chave
GEMINI_MODEL=gemini-3.5-flash-lite
```

Não exponha `GEMINI_API_KEY` em código enviado ao navegador. As funções deste
diretório devem ser chamadas apenas pelo backend/rotas de API.

## Extração

```ts
import { extractContract, adaptToBackend } from "@/lib/ai";

const extraction = await extractContract({ kind: "text", text: contrato });

// Só converte quando todos os campos obrigatórios do contrato compartilhado
// estiverem presentes. Caso contrário, lança ExtractionNeedsReviewError.
const payload = adaptToBackend(extraction);
```

Para PDF, envie os bytes em Base64:

```ts
const extraction = await extractContract({
  kind: "pdf",
  base64: buffer.toString("base64"),
});
```

DOCX deve ser convertido para texto no servidor antes da chamada. Isso preserva
o controle sobre o parser e evita enviar um formato não visual como se fosse PDF.

`extractContractFile` já faz essa seleção e aceita PDF, DOCX e TXT, com limite
de 20 MB.

## Avaliação

`eval-cases.ts` contém seis cenários fictícios: fixo à vista, fixo parcelado,
êxito, misto e dois casos ambíguos. Com TypeScript configurado para execução,
rode `run-evals.ts` usando a chave do ambiente. O script mostra a quantidade de
casos integralmente aprovados e nunca deve ser executado com documentos reais
em um projeto Gemini sem faturamento e proteção de dados adequadamente
configurados.

## Fluxo B — chat e insights

`answerFinancialQuestion` valida tanto a pergunta quanto o JSON enviado pelo
backend. A resposta também é estruturada, e IDs de contratos inexistentes são
rejeitados antes de chegar ao frontend.

Enquanto o backend não estiver pronto, use `mocks/financial-context.json`.

Os insights de `insights.ts` são determinísticos:

- parcela atrasada;
- concentração de valores em aberto por cliente;
- dependência de contratos de êxito ou mistos.

As regras e o histórico exigidos pelo edital estão em `prompts/`.

## Decisão pendente do schema compartilhado

O schema atual exige `valorTotal: number`, mas contratos exclusivamente de êxito
podem não ter valor conhecido. Ele também não possui campos para percentual e
base de cálculo do êxito. Por isso, a extração interna preserva:

- `valorTotal: number | null`;
- `honorariosExito.percentual`;
- `honorariosExito.baseCalculo`;
- `confianca` e `avisos`.

O adaptador nunca converte `null` em zero. Até o time decidir como persistir
esses campos, contratos incompatíveis devem passar pela confirmação do usuário.

## Versionamento

As versões dos prompts ficam em `prompts.ts`:

- `contract-extraction-v1`;
- `financial-chat-v1`.
