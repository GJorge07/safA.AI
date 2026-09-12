import { z } from "zod";

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

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google Drive não configurado: defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REFRESH_TOKEN.",
    );
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
