# Insights automáticos — v1

Os insights são calculados por funções determinísticas. O LLM não soma valores,
não compara datas e não decide os percentuais.

## Atraso

Gerado para toda parcela não paga cuja data de vencimento seja anterior à data
de referência. Informa contrato, valor e dias de atraso.

## Concentração por cliente

Soma valores em aberto por cliente. Gera alerta quando o maior cliente representa
40% ou mais do total em aberto.

## Dependência de êxito

Calcula a proporção de contratos `exito` ou `misto`. Gera alerta quando eles
representam 40% ou mais dos contratos cadastrados.

## Por que não há margem abaixo da média

O schema atual não contém custo, horas trabalhadas ou despesas por contrato.
Qualquer margem seria inventada. Esse indicador só poderá ser incluído se o
backend fornecer receita e custo atribuível a cada contrato.
