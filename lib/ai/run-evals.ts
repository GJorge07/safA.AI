import { extractContract } from "./extract-contract";
import { extractionEvalCases } from "./eval-cases";

function comparable(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === "object" && item !== null && "evidencia" in item) {
        const { evidencia: _evidence, ...rest } = item as Record<string, unknown>;
        return rest;
      }
      return comparable(item);
    });
  }
  return value;
}

async function main() {
  let passed = 0;

  for (const testCase of extractionEvalCases) {
    const actual = await extractContract({ kind: "text", text: testCase.contractText });
    const selected = {
      cliente: actual.cliente,
      tipoPagamento: actual.tipoPagamento,
      valorTotal: actual.valorTotal,
      honorariosExito: actual.honorariosExito,
      parcelas: actual.parcelas,
    };
    const ok = JSON.stringify(comparable(selected)) === JSON.stringify(comparable(testCase.expected));
    console.log(`${ok ? "PASS" : "FAIL"} ${testCase.id}`);
    if (!ok) console.dir({ expected: testCase.expected, actual: selected }, { depth: null });
    if (ok) passed += 1;
  }

  console.log(`Resultado: ${passed}/${extractionEvalCases.length} casos aprovados.`);
  if (passed !== extractionEvalCases.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
