// Round 3 Bug Regression Tests — Lexer, Parser, Interpreter

import { lex, TokenType } from "../../compiler/src/lexer.js";
import { parse } from "../../compiler/src/parser.js";
import { interpretWithEnv, createEnv, Value, toStr } from "../../compiler/src/interpreter.js";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e: any) {
    failed++;
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function run(source: string): Value {
  const tokens = lex(source);
  const ast = parse(tokens);
  const env = createEnv();
  return interpretWithEnv(ast, env);
}

console.log("\n=== Round 3: Lexer/Parser/Interpreter Bug Regression Tests ===\n");

// Bug #1: Number literal with dot consumed member access dot
test("Bug #1: 42.x should lex as Int(42) Dot Ident(x), not Float Ident", () => {
  const tokens = lex("42.x");
  assert(tokens[0].type === TokenType.Int, `Expected Int, got ${TokenType[tokens[0].type]}`);
  assert(tokens[0].value === "42", `Expected '42', got '${tokens[0].value}'`);
  assert(tokens[1].type === TokenType.Dot, `Expected Dot, got ${TokenType[tokens[1].type]}`);
  assert(tokens[2].type === TokenType.Ident, `Expected Ident, got ${TokenType[tokens[2].type]}`);
  assert(tokens[2].value === "x", `Expected 'x', got '${tokens[2].value}'`);
});

test("Bug #1: 3.14 should still lex as Float", () => {
  const tokens = lex("3.14");
  assert(tokens[0].type === TokenType.Float, `Expected Float, got ${TokenType[tokens[0].type]}`);
  assert(tokens[0].value === "3.14", `Expected '3.14', got '${tokens[0].value}'`);
});

test("Bug #1: 1..10 should lex as Int Range Int", () => {
  const tokens = lex("1..10");
  assert(tokens[0].type === TokenType.Int, `Expected Int, got ${TokenType[tokens[0].type]}`);
  assert(tokens[1].type === TokenType.Range, `Expected Range, got ${TokenType[tokens[1].type]}`);
  assert(tokens[2].type === TokenType.Int, `Expected Int, got ${TokenType[tokens[2].type]}`);
});

// Bug #2: `not` precedence too high
test("Bug #2: not (1 == 2) should be true via 'not 1 == 2'", () => {
  const result = run("not 1 == 2");
  assert(result === true, `Expected true, got ${result}`);
});

test("Bug #2: not false should be true", () => {
  const result = run("not false");
  assert(result === true, `Expected true, got ${result}`);
});

test("Bug #2: not 1 < 2 should be false (not (1 < 2))", () => {
  const result = run("not 1 < 2");
  assert(result === false, `Expected false, got ${result}`);
});

// Bug #3: Pipeline with ret in user function
test("Bug #3: Pipeline to function using ret should work", () => {
  const result = run(`
fn double(x) {
  ret x * 2
}
5 |> double
  `);
  assert(result === 10, `Expected 10, got ${result}`);
});

test("Bug #3: Pipeline to function with ret and extra logic", () => {
  const result = run(`
fn classify(x) {
  if x > 10 {
    ret "big"
  }
  ret "small"
}
15 |> classify
  `);
  assert(result === "big", `Expected "big", got ${result}`);
});

// Bug #4: zip with mismatched lengths
test("Bug #4: zip with mismatched lengths should not produce undefined", () => {
  const result = run(`
let a = [1, 2, 3]
let b = [4]
zip(a, b)
  `);
  assert(Array.isArray(result), `Expected array, got ${typeof result}`);
  const arr = result as Value[];
  assert(arr.length === 1, `Expected length 1, got ${arr.length}`);
  const pair = arr[0] as Value[];
  assert(Array.isArray(pair), `Expected pair array`);
  assert(pair[0] === 1 && pair[1] === 4, `Expected [1, 4], got [${pair[0]}, ${pair[1]}]`);
});

test("Bug #4: zip with equal lengths still works", () => {
  const result = run(`zip([1, 2], [3, 4])`);
  const arr = result as Value[][];
  assert(arr.length === 2, `Expected length 2, got ${arr.length}`);
  assert((arr[0] as any)[0] === 1 && (arr[0] as any)[1] === 3, `First pair wrong`);
  assert((arr[1] as any)[0] === 2 && (arr[1] as any)[1] === 4, `Second pair wrong`);
});

console.log(`\n--- Results: ${passed} passed, ${failed} failed ---`);
if (failed > 0) process.exit(1);
