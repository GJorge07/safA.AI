# Histórico de prompts e regras — Fluxos A e B

## contract-extraction-v1.1 — 12/09/2026

- Exige evidência individual para todo campo preenchido.
- Padroniza caminhos dos campos para validação automática.
- Inclui página e cláusula e rejeita referência não localizada no documento.

## financial-chat-v1.2 — 12/09/2026

- Exige os caminhos exatos do JSON usados nas afirmações factuais.
- Separa fontes de contratos dos totais consolidados.
- Permite ao backend rejeitar IDs e campos inventados.

## contract-extraction-v1 — 12/09/2026

- Primeira versão de extração estruturada de contratos.
- Trata fixo, êxito e misto.
- Exige evidências literais, datas ISO, `null` e avisos para ambiguidades.
- Proíbe criação silenciosa de valores, parcelas ou vencimentos.

## financial-chat-v1.1 — 12/09/2026

- Define schema forte para o contexto financeiro.
- Exige IDs exatos nas citações de contratos.
- Adiciona proteção contra instruções inseridas nos dados do backend.
- Mantém cálculos fora do LLM.

## financial-chat-v1 — 12/09/2026

- Primeira versão do chat sobre dados estruturados.
- Respostas em português e aviso quando faltarem dados.

## automatic-insights-v1 — 12/09/2026

- Atraso de parcelas.
- Concentração dos valores em aberto por cliente.
- Dependência de contratos de êxito ou mistos.
- Margem excluída enquanto o schema não fornecer custos atribuíveis.
