import assert from "node:assert/strict";
import test from "node:test";
import { clearDriveTokenCache, downloadDriveContract, listDriveContracts } from "./drive";

const originalFetch = globalThis.fetch;
const originalEnv = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
};

function configureDrive(): void {
  process.env.GOOGLE_CLIENT_ID = "client-test";
  process.env.GOOGLE_CLIENT_SECRET = "secret-test";
  process.env.GOOGLE_REFRESH_TOKEN = "refresh-test";
  process.env.GOOGLE_DRIVE_FOLDER_ID = "folder-123";
  clearDriveTokenCache();
}

function restore(): void {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries({
    GOOGLE_CLIENT_ID: originalEnv.clientId,
    GOOGLE_CLIENT_SECRET: originalEnv.clientSecret,
    GOOGLE_REFRESH_TOKEN: originalEnv.refreshToken,
    GOOGLE_DRIVE_FOLDER_ID: originalEnv.folderId,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  clearDriveTokenCache();
}

test("lista apenas formatos de contrato usando OAuth e pasta configurada", async () => {
  configureDrive();
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("oauth2.googleapis.com/token")) {
      return Response.json({ access_token: "access-test", expires_in: 3600 });
    }
    return Response.json({ files: [{ id: "file-1", name: "Contrato.pdf", mimeType: "application/pdf" }] });
  };
  try {
    const result = await listDriveContracts();
    assert.equal(result.files[0]?.id, "file-1");
    const query = new URL(calls[1] ?? "http://invalid").searchParams.get("q") ?? "";
    assert.match(query, /'folder-123' in parents/);
    assert.match(query, /application\/pdf/);
  } finally {
    restore();
  }
});

test("exporta Google Docs como DOCX antes da ingestão", async () => {
  configureDrive();
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("oauth2.googleapis.com/token")) {
      return Response.json({ access_token: "access-test", expires_in: 3600 });
    }
    if (url.includes("fields=")) {
      return Response.json({ id: "doc-1", name: "Contrato", mimeType: "application/vnd.google-apps.document" });
    }
    return new Response(new Uint8Array([80, 75, 3, 4]));
  };
  try {
    const result = await downloadDriveContract("doc-1");
    assert.equal(result.mimeType, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    assert.ok(calls.some((url) => url.includes("/export?mimeType=")));
  } finally {
    restore();
  }
});

test("recusa operação quando o OAuth do Drive não está configurado", async () => {
  delete process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_SECRET;
  delete process.env.GOOGLE_REFRESH_TOKEN;
  clearDriveTokenCache();
  try {
    await assert.rejects(() => listDriveContracts(), /Google Drive não configurado/);
  } finally {
    restore();
  }
});
