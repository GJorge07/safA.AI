import assert from "node:assert/strict";
import test from "node:test";
import { resumirPagamentos } from "./payment-history";

const hoje = new Date("2026-09-12T18:00:00Z");
test("separa saldo vencido, pagamento tardio, vencimento de hoje e futuro", () => {
  const resumo = resumirPagamentos([
    { valor: 100, vencimento: new Date("2026-09-01"), pagamento: { valorPago: 40, dataPago: new Date("2026-09-02") } },
    { valor: 200, vencimento: new Date("2026-09-01"), pagamento: { valorPago: 200, dataPago: new Date("2026-09-03") } },
    { valor: 300, vencimento: new Date("2026-09-12"), pagamento: null },
    { valor: 400, vencimento: new Date("2026-10-01"), pagamento: null },
    { valor: 50, vencimento: new Date("2026-09-01"), pagamento: { valorPago: 60, dataPago: new Date("2026-09-01") } },
  ], hoje);
  assert.equal(resumo.saldoVencido, 60);
  assert.equal(resumo.parcelasVencidas, 1);
  assert.equal(resumo.pagamentosEmAtraso, 2);
  assert.equal(resumo.recebido, 300);
});
test("histórico vazio não gera dívida e soma monetária arredonda centavos", () => {
  assert.equal(resumirPagamentos([], hoje).totalParcelas, 0);
  assert.equal(resumirPagamentos([0.1, 0.2].map(valor => ({ valor, vencimento: new Date("2026-09-01"), pagamento: null })), hoje).saldoVencido, 0.3);
});
