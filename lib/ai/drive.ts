import { z } from "zod";
import { obterRefreshTokenDrive } from "@/lib/db/drive-conexao";

const SCOPE_DRIVE_READONLY = "https://www.googleapis.com/auth/drive.readonly";

function getOAuthClientConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google Drive não configurado: defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REDIRECT_URI.",
    );
  }
  return { clientId, clientSecret, redirectUri };
}

// URL da tela de consentimento do Google. access_type=offline + prompt=consent
// garantem que a resposta traga um refresh_token mesmo em reconexões.
export function buildGoogleAuthUrl(): string {
  const { clientId, redirectUri } = getOAuthClientConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE_DRIVE_READONLY,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface TrocaCodigoResultado {
  refreshToken: string;
  accessToken: string;
}

// Troca o "code" que o Google devolve no redirect de /callback por um
// refresh_token (persistido) e um access_token (usado só para já buscar a
// conta conectada, ver getContaConectada).
export async function trocarCodigoPorTokens(code: string): Promise<TrocaCodigoResultado> {
  const { clientId, clientSecret, redirectUri } = getOAuthClientConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) throw new Error(`Falha ao trocar o código de autorização do Drive (${response.status}).`);

  const token = z
    .object({ access_token: z.string().min(1), refresh_token: z.string().min(1).optional() })
    .parse(await response.json());
  if (!token.refresh_token) {
    throw new Error(
      "O Google não devolveu um refresh_token. Revogue o acesso do app em myaccount.google.com/permissions e conecte de novo.",
    );
  }
  return { refreshToken: token.refresh_token, accessToken: token.access_token };
}

// Nome/e-mail da conta que acabou de conceder acesso — só para exibir na UI.
export async function getContaConectada(accessToken: string): Promise<string | null> {
  const response = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  const data = z.object({ user: z.object({ emailAddress: z.string().optional() }).optional() }).parse(
    await response.json(),
  );
  return data.user?.emailAddress ?? null;
}

const driveFileSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.string().min(1),
  webViewLink: z.string().url().optional(),
});

export type DriveFileReference = z.infer<typeof driveFileSchema>;

export interface DriveContractFile {
  buffer: Buffer;
  mimeType: "application/pdf" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "text/plain";
  reference: DriveFileReference;
}

let cachedToken: { value: string; expiresAt: number } | undefined;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const { clientId, clientSecret } = getOAuthClientConfig();
  const refreshToken = await obterRefreshTokenDrive();
  if (!refreshToken) {
    throw new Error("Google Drive não conectado. Conecte uma conta em /contratos antes de sincronizar.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error(`Falha no OAuth do Drive (${response.status}).`);

  const token = z.object({
    access_token: z.string().min(1),
    expires_in: z.number().positive().default(3600),
  }).parse(await response.json());
  cachedToken = {
    value: token.access_token,
    expiresAt: Date.now() + token.expires_in * 1000,
  };
  return cachedToken.value;
}

export async function getDriveFileReference(fileId: string): Promise<DriveFileReference> {
  const safeId = z.string().trim().min(1).max(200).parse(fileId);
  const token = await getAccessToken();
  const fields = encodeURIComponent("id,name,mimeType,webViewLink");
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(safeId)}?fields=${fields}&supportsAllDrives=true`,
    { headers: { authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!response.ok) throw new Error(`Não foi possível consultar o arquivo no Drive (${response.status}).`);
  return driveFileSchema.parse(await response.json());
}

export async function resolveDriveReferences(
  fileIds: string[],
): Promise<DriveFileReference[]> {
  const unique = [...new Set(fileIds)].slice(0, 20);
  return Promise.all(unique.map(getDriveFileReference));
}

export async function downloadDriveContract(fileId: string): Promise<DriveContractFile> {
  const reference = await getDriveFileReference(fileId);
  const token = await getAccessToken();
  const googleDoc = "application/vnd.google-apps.document";
  const supported = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ] as const;

  let url: string;
  let mimeType: DriveContractFile["mimeType"];
  if (reference.mimeType === googleDoc) {
    mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(reference.id)}/export?mimeType=${encodeURIComponent(mimeType)}`;
  } else if (supported.some((value) => value === reference.mimeType)) {
    mimeType = reference.mimeType as DriveContractFile["mimeType"];
    url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(reference.id)}?alt=media&supportsAllDrives=true`;
  } else {
    throw new Error(`Formato do Drive não suportado: ${reference.mimeType}.`);
  }

  const response = await fetch(url, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Não foi possível baixar o contrato do Drive (${response.status}).`);
  return { buffer: Buffer.from(await response.arrayBuffer()), mimeType, reference };
}

// Aceita tanto um ID de pasta quanto um link completo do Drive
// (https://drive.google.com/drive/folders/<id>) colado pelo usuário.
export function extrairIdDaPastaDrive(entrada: string): string {
  const valor = entrada.trim();
  const match = valor.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : valor;
}

export async function listarArquivosDaPasta(pastaId: string): Promise<DriveFileReference[]> {
  const safeId = z.string().trim().min(1).max(200).parse(pastaId);
  const token = await getAccessToken();
  const fields = encodeURIComponent("files(id,name,mimeType,webViewLink)");
  const q = encodeURIComponent(`'${safeId}' in parents and trashed = false`);
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!response.ok) throw new Error(`Não foi possível listar os arquivos da pasta do Drive (${response.status}).`);
  const data = z.object({ files: z.array(driveFileSchema) }).parse(await response.json());
  return data.files;
}
