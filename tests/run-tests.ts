// Master Test Runner
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  let totalPassed = 0;
  let totalFailed = 0;

  console.log("=== Arc Language Test Suite ===\n");

  // Unit tests
  console.log("--- Lexer Unit Tests ---");
  const lexerTests = await import("./lexer.test.js");
  totalPassed += lexerTests.passed;
  totalFailed += lexerTests.failed;

  console.log("\n--- Parser Unit Tests ---");
  const parserTests = await import("./parser.test.js");
  totalPassed += parserTests.passed;
  totalFailed += parserTests.failed;

  console.log("\n--- Interpreter Unit Tests ---");
  const interpTests = await import("./interpreter.test.js");
  totalPassed += interpTests.passed;
  totalFailed += interpTests.failed;

  console.log("\n--- Codegen Tests ---");
  const codegenTests = await import("./codegen.test.js");
  totalPassed += codegenTests.passed;
  totalFailed += codegenTests.failed;

  console.log("\n--- Formatter Tests ---");
  const formatterTests = await import("./formatter.test.js");
  totalPassed += formatterTests.passed;
  totalFailed += formatterTests.failed;

  console.log("\n--- Linter Tests ---");
  const linterTests = await import("./linter.test.js");
  totalPassed += linterTests.passed;
  totalFailed += linterTests.failed;

  console.log("\n--- Migration Tests ---");
  const migrateTests = await import("./migrate.test.js");
  totalPassed += migrateTests.passed;
  totalFailed += migrateTests.failed;

  console.log("\n--- Security Tests ---");
  const securityTests = await import("./security.test.js");
  totalPassed += securityTests.passed;
  totalFailed += securityTests.failed;

  console.log("\n--- Error Reporting Tests ---");
  const errorsTests = await import("./errors.test.js");
  totalPassed += errorsTests.passed;
  totalFailed += errorsTests.failed;

  // Extended unit tests
  console.log("\n--- Lexer Extended Tests ---");
  const lexerExt = await import("./lexer-extended.test.js");
  totalPassed += lexerExt.passed;
  totalFailed += lexerExt.failed;

  console.log("\n--- Parser Extended Tests ---");
  const parserExt = await import("./parser-extended.test.js");
  totalPassed += parserExt.passed;
  totalFailed += parserExt.failed;

  console.log("\n--- Interpreter Extended Tests ---");
  const interpExt = await import("./interpreter-extended.test.js");
  totalPassed += interpExt.passed;
  totalFailed += interpExt.failed;

  console.log("\n--- Semantic Extended Tests ---");
  const semanticExt = await import("./semantic-extended.test.js");
  totalPassed += semanticExt.passed;
  totalFailed += semanticExt.failed;

  console.log("\n--- Optimizer Extended Tests ---");
  const optimizerExt = await import("./optimizer-extended.test.js");
  totalPassed += optimizerExt.passed;
  totalFailed += optimizerExt.failed;

  console.log("\n--- Codegen Extended Tests ---");
  const codegenExt = await import("./codegen-extended.test.js");
  totalPassed += codegenExt.passed;
  totalFailed += codegenExt.failed;

  console.log("\n--- Security Extended Tests ---");
  const securityExt = await import("./security-extended.test.js");
  totalPassed += securityExt.passed;
  totalFailed += securityExt.failed;

  console.log("\n--- Errors Extended Tests ---");
  const errorsExt = await import("./errors-extended.test.js");
  totalPassed += errorsExt.passed;
  totalFailed += errorsExt.failed;

  console.log("\n--- Formatter Extended Tests ---");
  const formatterExt = await import("./formatter-extended.test.js");
  totalPassed += formatterExt.passed;
  totalFailed += formatterExt.failed;

  console.log("\n--- Linter Extended Tests ---");
  const linterExt = await import("./linter-extended.test.js");
  totalPassed += linterExt.passed;
  totalFailed += linterExt.failed;

  // Integration tests
  console.log("\n--- Integration Tests ---");
  const { runIntegrationTests } = await import("./runner.js");
  const integDir = resolve(__dirname, "integration");
  const integResults = runIntegrationTests(integDir);
  totalPassed += integResults.passed;
  totalFailed += integResults.failed;

  // Edge case tests
  console.log("\n--- Edge Case Tests ---");
  const edgeTests = await import("./edge-cases.test.js");
  totalPassed += edgeTests.passed;
  totalFailed += edgeTests.failed;

  console.log("\n--- Edge Cases Extended Tests ---");
  const edgeExt = await import("./edge-cases-extended.test.js");
  totalPassed += edgeExt.passed;
  totalFailed += edgeExt.failed;

  // Property tests
  console.log("\n--- Property Tests ---");
  const propTests = await import("./property/properties.js");
  totalPassed += propTests.passed;
  totalFailed += propTests.failed;

  // Feature tests
  console.log("\n--- Map & Spread Feature Tests ---");
  const mapSpreadTests = await import("./features/map-spread.test.js");
  totalPassed += mapSpreadTests.passed;
  totalFailed += mapSpreadTests.failed;

  // Fuzz tests
  console.log("\n--- Fuzz Tests ---");
  const { runFuzzTests } = await import("./fuzz/fuzzer.js");
  const fuzzResults = runFuzzTests();
  totalPassed += fuzzResults.passed;
  totalFailed += fuzzResults.failed;

  // Feature tests
  console.log("\n--- Feature: Params & Destructuring ---");
  const paramsDestrTests = await import("./features/params-destructuring.test.js");
  totalPassed += paramsDestrTests.passed;
  totalFailed += paramsDestrTests.failed;

  // Feature tests: stdlib crypto/net/error
  console.log("\n--- Stdlib Crypto/Net/Error Tests ---");
  const stdlibTests = await import("./features/stdlib-crypto-net-error.test.js");
  totalPassed += stdlibTests.passed;
  totalFailed += stdlibTests.failed;

  // Feature tests
  console.log("\n--- Result Types Feature Tests ---");
  const resultTypesTests = await import("./features/result-types.test.js");
  totalPassed += resultTypesTests.passed;
  totalFailed += resultTypesTests.failed;

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Total: ${totalPassed + totalFailed} | Passed: ${totalPassed} | Failed: ${totalFailed}`);

  if (totalFailed > 0) {
    console.log("\n❌ SOME TESTS FAILED");
    process.exit(1);
  } else {
    console.log("\n✅ ALL TESTS PASSED");
    process.exit(0);
  }
}

main();
