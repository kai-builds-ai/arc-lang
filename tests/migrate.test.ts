// Migration Tools Tests

import { migrateJS } from "../tools/migrate-js.js";
import { migratePython } from "../tools/migrate-py.js";

export let passed = 0;
export let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(actual: string, expected: string, msg?: string) {
  const a = actual.trim();
  const e = expected.trim();
  if (a !== e) {
    throw new Error(`${msg || "Assertion failed"}\n  Expected: ${JSON.stringify(e)}\n  Actual:   ${JSON.stringify(a)}`);
  }
}

function assertContains(actual: string, expected: string, msg?: string) {
  if (!actual.includes(expected)) {
    throw new Error(`${msg || "Expected to contain"}: ${JSON.stringify(expected)}\n  In: ${JSON.stringify(actual)}`);
  }
}

// ============ JS → Arc Tests ============

console.log("  JS → Arc:");

test("function declaration", () => {
  const result = migrateJS("function foo(x) {\n  return x + 1\n}");
  assertContains(result, "fn foo(x) {");
  assertContains(result, "ret x + 1");
});

test("const to let", () => {
  assert(migrateJS("const x = 5;"), "let x = 5");
});

test("JS let to let mut", () => {
  const result = migrateJS("let x = 5;");
  assertContains(result, "let mut x = 5");
});

test("export function to pub fn", () => {
  assertContains(migrateJS("export function foo(x) {"), "pub fn foo(x) {");
});

test("export const to pub let", () => {
  assertContains(migrateJS("export const x = 5;"), "pub let x = 5");
});

test("async function", () => {
  assertContains(migrateJS("async function fetch(url) {"), "async fn fetch(url) {");
});

test("if/else to if/el", () => {
  const result = migrateJS("if (x > 0) {\n  foo()\n} else {\n  bar()\n}");
  assertContains(result, "if x > 0 {");
  assertContains(result, "} el {");
});

test("else if", () => {
  const result = migrateJS("} else if (x > 0) {");
  assertContains(result, "} el if x > 0 {");
});

test("null to nil", () => {
  assertContains(migrateJS("const x = null;"), "nil");
});

test("=== to ==", () => {
  assertContains(migrateJS("x === 5"), "x == 5");
});

test("!== to !=", () => {
  assertContains(migrateJS("x !== 5"), "x != 5");
});

test("&& to and", () => {
  assertContains(migrateJS("x && y"), "and");
});

test("|| to or", () => {
  assertContains(migrateJS("x || y"), "or");
});

test("// comments to #", () => {
  assertContains(migrateJS("// hello world"), "# hello world");
});

test("import to use", () => {
  assertContains(migrateJS("import { foo } from './bar';"), 'use "./bar"');
});

test("console.log to print", () => {
  assertContains(migrateJS('console.log("hello")'), 'print("hello")');
});

test("switch to match", () => {
  assertContains(migrateJS("switch (x) {"), "match x {");
});

test("method chain to pipeline", () => {
  const result = migrateJS("arr.map(x => x + 1).filter(x => x > 2)");
  assertContains(result, "|>");
});

test("semicolons removed", () => {
  const result = migrateJS("const x = 5;");
  assert(result, "let x = 5");
});

// ============ Python → Arc Tests ============

console.log("\n  Python → Arc:");

test("def to fn", () => {
  assertContains(migratePython("def foo(x):"), "fn foo(x) {");
});

test("None to nil", () => {
  assertContains(migratePython("x = None"), "x = nil");
});

test("True/False to true/false", () => {
  assertContains(migratePython("x = True"), "x = true");
  assertContains(migratePython("y = False"), "y = false");
});

test("elif to el if", () => {
  assertContains(migratePython("elif x > 0:"), "} el if x > 0 {");
});

test("else to el", () => {
  assertContains(migratePython("else:"), "} el {");
});

test("for range", () => {
  assertContains(migratePython("for i in range(10):"), "for i in 0..10 {");
});

test("for range with start", () => {
  assertContains(migratePython("for i in range(1, 10):"), "for i in 1..10 {");
});

test("import to use", () => {
  assertContains(migratePython("import os"), 'use "os"');
});

test("from import to use", () => {
  assertContains(migratePython("from os import path"), 'use "os"');
});

test("return to ret", () => {
  assertContains(migratePython("return x + 1"), "ret x + 1");
});

test("list comprehension to pipeline", () => {
  const result = migratePython("[x + 1 for x in items]");
  assertContains(result, "|>");
  assertContains(result, "map");
});

test("lambda to arrow", () => {
  assertContains(migratePython("lambda x: x + 1"), "(x) => x + 1");
});

test("f-string", () => {
  assertContains(migratePython('f"hello {name}"'), '"hello {name}"');
});

test("if to if with braces", () => {
  assertContains(migratePython("if x > 0:"), "if x > 0 {");
});
