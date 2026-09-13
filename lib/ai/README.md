# Módulo de IA — Safa.IA

Este módulo usa a Interactions API do Gemini com saída estruturada e validação
Zod. O modelo padrão é `gemini-3.5-flash-lite`.

## Dependências

```bash
npm install @google/genai@^2.3.0 zod mammoth pdf-parse
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

`extractContractFile` já faz essa seleção e aceita PDF, DOCX e TXT, com limite
de 20 MB.

## Rastreabilidade obrigatória

Todo campo não nulo da extração deve trazer `campo`, `trecho`, `pagina` e
`clausula`. Antes de liberar o payload, `validateExtractionEvidence` confirma
que o trecho existe literalmente na página indicada. Campo sem evidência ou
trecho não localizado interrompe a ingestão.

No chat, cada resposta factual inclui `citacoes`, apontando para caminhos que
existem no JSON do backend, por exemplo:

```json
{
  "contratoId": "contrato-1",
  "campos": ["parcelas.0.valor", "parcelas.0.vencimento"]
}
```

Totais consolidados usam `contratoId: null` e caminhos como
`resumo.pendente`. IDs ou campos inexistentes são rejeitados. PDFs precisam
possuir texto pesquisável; arquivos somente com imagem devem passar por OCR.

### Rota integrada da Parte A

`POST /api/contratos/importar` aceita duas formas de entrada:

- `multipart/form-data`, com o arquivo no campo `file`;
- JSON `{ "driveFileId": "..." }`, para baixar o contrato pela API do Drive.

A resposta devolve `extracao` (resultado rico), `payloadBackend` e `status`.
Quando o schema compartilhado não comporta um dado — por exemplo, êxito sem
valor total — retorna HTTP 202, `status: "revisao_necessaria"` e os motivos,
sem gravar zero ou inventar informação.

O fluxo combinado é:

```text
upload/Drive → PDF/DOCX/TXT → Gemini → Zod → revisão → backend → chat/insights
```

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

### Integração pronta

`runFlowB` reúne o chat, os insights e as referências do Google Drive. A rota
`POST /api/chat` recebe o mesmo objeto do mock e, opcionalmente, `driveFileIds`:

```json
{
  "pergunta": "Quanto está atrasado?",
  "dados": { "dataReferencia": "2026-09-12", "resumo": {}, "contratos": [] },
  "driveFileIds": ["ID_DO_ARQUIVO_NO_DRIVE"]
}
```

O Drive é usado apenas para localizar a fonte original (`name`, `mimeType` e
`webViewLink`). O chat recebe os dados financeiros já estruturados pelo backend;
assim, a Parte B não reinterpreta o contrato nem duplica o trabalho da Parte A.

Para habilitar o Drive, ative a Google Drive API no projeto Cloud, crie um
cliente OAuth 2.0 e configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e
`GOOGLE_REDIRECT_URI` (a URL de callback cadastrada no cliente OAuth, ex.:
`http://localhost:3000/callback`) no backend. A chave do Gemini não autentica
o Drive: são credenciais e APIs independentes.

Diferente do Gemini, o Drive não usa um token fixo no `.env` — a conta é
conectada uma vez pela UI em `/contratos` (botão "Conectar ao Google Drive"),
que leva à tela de consentimento do Google; o `refresh_token` resultante fica
salvo no banco (`DriveConexao`), não em variável de ambiente. Rotas
envolvidas: `GET /api/integrations/drive/connect` (inicia o OAuth), `GET
/callback` (troca o code pelo refresh_token e salva a conexão), `GET
/api/integrations/drive/status`, `POST /api/integrations/drive/pasta` (define
a pasta a sincronizar) e `POST /api/integrations/drive/sync` (lista e importa
os contratos novos da pasta, usando o mesmo pipeline de `/api/contratos/importar`).

Sem `driveFileIds`, o chat funciona normalmente e devolve `fontes: []`.

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
