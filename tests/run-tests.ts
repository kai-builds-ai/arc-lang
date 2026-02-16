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

  // Property tests
  console.log("\n--- Property Tests ---");
  const propTests = await import("./property/properties.js");
  totalPassed += propTests.passed;
  totalFailed += propTests.failed;

  // Fuzz tests
  console.log("\n--- Fuzz Tests ---");
  const { runFuzzTests } = await import("./fuzz/fuzzer.js");
  const fuzzResults = runFuzzTests();
  totalPassed += fuzzResults.passed;
  totalFailed += fuzzResults.failed;

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
