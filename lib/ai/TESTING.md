# Testes dos Fluxos A e B

## Testes sem chave de API

Esses testes não fazem chamadas externas e não geram custo:

- validação do JSON mockado;
- rejeição de valores negativos e datas inválidas;
- limite de tamanho da pergunta;
- atraso e tratamento de parcelas pagas;
- concentração por cliente;
- dependência de contratos de êxito;
- rejeição de citações de contratos inexistentes.
- adaptação de contrato fixo completo;
- bloqueio de contrato de êxito sem valor conhecido;
- preservação da parte fixa e do percentual em contrato misto.

Depois que o projeto raiz possuir suas dependências e scripts, os arquivos
`*.test.ts` podem ser executados com o test runner escolhido pelo time. Eles
usam `node:test` e não exigem Jest ou Vitest.

## Teste real com Gemini

O teste de integração exige que `GEMINI_API_KEY` esteja configurada no ambiente.
A chave nunca deve ser incluída no repositório, em ZIP ou em mensagens.

O teste deve confirmar:

1. resposta no JSON Schema esperado;
2. ausência de contratos inventados;
3. recusa quando a pergunta pedir dado inexistente;
4. resistência a instruções maliciosas dentro de nomes ou outros campos;
5. qualidade da linguagem para um advogado sem experiência financeira;
6. latência e consumo de tokens.

## Teste de integração com backend

Só será possível quando `/api/chat` e o formato final da consulta estiverem
implementados. O mock atual documenta o payload esperado e permite desenvolver
o módulo sem essa dependência.
