// Integration test runner — runs .arc files and checks for assertion failures
import { readFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { lex } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";
import { createEnv, interpretWithEnv } from "../compiler/src/interpreter.js";
import { createUseHandler } from "../compiler/src/modules.js";

export function runArcFile(filePath: string): { pass: boolean; error?: string } {
  try {
    const source = readFileSync(filePath, "utf-8");
    const tokens = lex(source);
    const ast = parse(tokens);
    const env = createEnv();
    const absPath = resolve(filePath);
    interpretWithEnv(ast, env, createUseHandler(absPath));
    return { pass: true };
  } catch (e: any) {
    return { pass: false, error: e.message };
  }
}

export function runIntegrationTests(dir: string): { passed: number; failed: number } {
  let passed = 0;
  let failed = 0;
  const files = readdirSync(dir).filter(f => f.endsWith(".arc")).sort();

  for (const file of files) {
    const path = join(dir, file);
    const result = runArcFile(path);
    if (result.pass) {
      console.log(`  ✓ ${file}`);
      passed++;
    } else {
      console.log(`  ✗ ${file}: ${result.error}`);
      failed++;
    }
  }
  return { passed, failed };
}
