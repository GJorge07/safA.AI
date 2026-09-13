import assert from "node:assert/strict";
import test from "node:test";
import { enviarContrato, obterDocumentos } from "../../components/dashboard/contract-upload";

test("envia os bytes e mantém a extração real disponível para o agente", async (t) => {
  const values = new Map<string, string>();
  t.mock.method(globalThis, "fetch", async (url: string | URL | Request, options?: RequestInit) => {
    assert.equal(url, "/api/contratos/importar");
    const file = (options?.body as FormData).get("file") as File;
    assert.equal(await file.text(), "Honorários de Ana: R$ 1.000,00.");
    return Response.json({ motivosRevisao: ["Vencimento ausente"], extracao: {
      cliente: "Ana", tipoPagamento: "fixo", valorTotal: 1000,
      honorariosExito: null, parcelas: [], clausulaOriginal: "Honorários de Ana: R$ 1.000,00.",
      evidencias: [], confianca: 0.8, avisos: [],
    } }, { status: 202 });
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { dispatchEvent() {} } });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  try {
    const doc = await enviarContrato(new File(["Honorários de Ana: R$ 1.000,00."], "ana.txt"));
    assert.equal(doc.extracao.cliente, "Ana");
    assert.deepEqual(obterDocumentos(), [doc]);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("expõe erro da API e rejeita arquivo vazio antes do envio", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({
    erro: "GEMINI_API_KEY não foi configurada.",
  }, { status: 502 }));
  await assert.rejects(enviarContrato(new File([], "vazio.pdf")), /vazio/);
  assert.equal(fetch.mock.callCount(), 0);
  await assert.rejects(enviarContrato(new File(["contrato"], "ana.txt")), /GEMINI_API_KEY/);
});
