# contract-extraction-v1 — 12/09/2026

Objetivo: converter contratos brasileiros de honorários em JSON auditável.

- Extrair somente o que estiver explícito.
- Usar `null` e `avisos` para ausência ou ambiguidade.
- Nunca converter desconhecido em zero.
- Distinguir honorários fixos, de êxito e mistos.
- Devolver cláusula e evidência literal de cada parcela.
- Normalizar datas para `YYYY-MM-DD` e valores para números em reais.
- Calcular datas subsequentes apenas quando primeira data, quantidade e periodicidade forem inequívocas.

O texto executável está em `prompts.ts`. Mudanças devem gerar nova versão e registro em `HISTORY.md`.
