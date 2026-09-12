# Configuração do Google Drive

Esta integração usa OAuth 2.0 somente no backend e solicita acesso de leitura.
A chave da API do Gemini não dá acesso ao Drive: são credenciais separadas.

## Preparação no Google Cloud

1. Crie ou selecione um projeto no Google Cloud.
2. Ative a **Google Drive API**.
3. Configure a tela de consentimento OAuth e inclua a conta de teste.
4. Crie um cliente OAuth 2.0 e obtenha `client_id` e `client_secret`.
5. Autorize o escopo `https://www.googleapis.com/auth/drive.readonly` com
   acesso offline e obtenha um refresh token.

## Variáveis locais

Copie `.env.example` para `.env.local` e preencha:

```env
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=
GOOGLE_DRIVE_FOLDER_ID=
```

`GOOGLE_DRIVE_FOLDER_ID` é opcional. Quando preenchido, somente os contratos
que estejam diretamente nessa pasta são listados.

Nunca envie `.env.local` por ZIP, e-mail, GitHub ou chat.

## Uso pela aplicação

1. `GET /api/drive/status` confirma se as credenciais estão presentes.
2. `GET /api/drive/arquivos` lista os documentos aceitos.
3. O frontend seleciona um `id` e envia
   `POST /api/contratos/extrair` com `{ "driveFileId": "..." }`.
4. O backend troca o refresh token por um access token temporário.
5. O contrato é baixado; Google Docs são exportados como DOCX.
6. O conteúdo segue para extração, validação de evidências e adaptação ao
   backend.

O refresh token é duradouro. O access token fica apenas em memória e é
renovado automaticamente antes de expirar.
