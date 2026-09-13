# Histórico de prompts e regras — Fluxos A e B

## contract-extraction-v1.1 — 12/09/2026

- Exige evidência individual para todo campo preenchido.
- Padroniza caminhos dos campos para validação automática.
- Inclui página e cláusula e rejeita referência não localizada no documento.

## expense-extraction-v1.1 — 13/09/2026

- Passa a classificar a despesa em tipo processo x escritório, e amarra a
  categoria ao tipo — categoria de escritório num gasto de caso tornaria a
  margem do processo mentirosa.
- Categorias reescritas no vocabulário do dia a dia (deslocamento, custas,
  cartório) no lugar das genéricas da v1.
- Instrui a não descartar valores pequenos: corrida até o fórum,
  estacionamento e cópias são os gastos que o advogado iniciante mais esquece
  de lançar e que, somados, comem a margem do caso.

## expense-extraction-v1 — 13/09/2026

- Primeira versão da leitura de recibo/nota/guia para lançar despesa.
- Todo campo ausente vem null com o motivo em avisos: comprovante é documento
  bagunçado, e palpite em valor ou vencimento vira lançamento errado.
- Exige textoOriginal literal, mesmo papel de clausulaOriginal no contrato — o
  resultado é rascunho e só o advogado confirma a gravação.

## contract-opinion-v1 — 12/09/2026

- Primeira versão da opinião automática do contrato para o advogado.
- Avalia risco financeiro (dependência de êxito, prazo, valor), risco
  jurídico lendo a cláusula original (ausência de mora/correção monetária) e
  comparação com a carteira de contratos já cadastrados, quando existir.
- Classifica em favoravel / atencao / desfavoravel; nunca afirma ausência de
  cláusula sem checar o texto fornecido.

## financial-chat-v1.4 — 12/09/2026

- Adiciona clausulaOriginal ao contexto de cada contrato, permitindo ao chat
  responder perguntas de avaliação ("esse contrato é bom?") citando a
  cláusula e comparando com os demais contratos do advogado presentes nos
  dados, com a mesma exigência de citação da v1.2.

## financial-chat-v1.3 — 12/09/2026

- Torna obrigatório citacoes não-vazio OU aviso não-nulo em toda resposta,
  cobrindo explicitamente cumprimentos e perguntas fora do escopo financeiro.
- Corrige 502 sistemático: o validador já exigia essa condição, mas o prompt
  só cobria "dados insuficientes", então o modelo deixava os dois vazios em
  perguntas que não citavam um dado específico.

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
