import assert from "node:assert/strict";
import test from "node:test";
import { POST as postChat } from "../../app/api/chat/route";
import { POST as postExtraction } from "../../app/api/contratos/extrair/route";

test("chat devolve 400 para JSON malformado", async () => {
  const request = new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{",
  });
  const response = await postChat(request);
  assert.equal(response.status, 400);
});

test("extração devolve 415 para Content-Type não suportado", async () => {
  const request = new Request("http://localhost/api/contratos/extrair", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "contrato",
  });
  const response = await postExtraction(request);
  assert.equal(response.status, 415);
});

test("extração devolve 400 quando multipart não contém file", async () => {
  const form = new FormData();
  form.set("outroCampo", "valor");
  const response = await postExtraction(new Request("http://localhost/api/contratos/extrair", {
    method: "POST",
    body: form,
  }));
  assert.equal(response.status, 400);
});
