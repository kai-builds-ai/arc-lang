// Regex Module Tests
import { lex } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";
import { createEnv, interpretWithEnv, toStr } from "../compiler/src/interpreter.js";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

function run(src: string): any {
  const env = createEnv();
  return interpretWithEnv(parse(lex(src)), env);
}

function test(name: string, fn: () => void) {
  try { fn(); }
  catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v: any, i: number) => deepEqual(v, b[i]));
  }
  return false;
}

const importRegex = 'import regex from "stdlib/regex"\n';

console.log("Regex Tests:");

// match
test("match: basic", () =>
  assert(run(importRegex + 'regex.match("\\\\d+", "abc 123 def")') === "123", "match basic"));

test("match: no match returns nil", () =>
  assert(run(importRegex + 'regex.match("\\\\d+", "abc")') === null, "match nil"));

test("match: first only", () =>
  assert(run(importRegex + 'regex.match("[a-z]+", "hello world")') === "hello", "match first"));

// match_all
test("match_all: multiple", () =>
  assert(deepEqual(run(importRegex + 'regex.match_all("\\\\d+", "a1 b22 c333")'), ["1", "22", "333"]), "match_all multi"));

test("match_all: none", () =>
  assert(deepEqual(run(importRegex + 'regex.match_all("\\\\d+", "abc")'), []), "match_all none"));

// test
test("test: true", () =>
  assert(run(importRegex + 'regex.test("^hello", "hello world")') === true, "test true"));

test("test: false", () =>
  assert(run(importRegex + 'regex.test("^world", "hello world")') === false, "test false"));

test("test: partial match", () =>
  assert(run(importRegex + 'regex.test("\\\\d", "abc1")') === true, "test partial"));

// replace
test("replace: first only", () =>
  assert(run(importRegex + 'regex.replace("\\\\d+", "X", "a1 b2 c3")') === "aX b2 c3", "replace first"));

test("replace: no match", () =>
  assert(run(importRegex + 'regex.replace("\\\\d+", "X", "abc")') === "abc", "replace no match"));

// replace_all
test("replace_all: all occurrences", () =>
  assert(run(importRegex + 'regex.replace_all("\\\\d+", "X", "a1 b2 c3")') === "aX bX cX", "replace_all"));

test("replace_all: no match", () =>
  assert(run(importRegex + 'regex.replace_all("\\\\d+", "X", "abc")') === "abc", "replace_all no match"));

// split
test("split: by comma", () =>
  assert(deepEqual(run(importRegex + 'regex.split(",\\\\s*", "a, b, c")'), ["a", "b", "c"]), "split comma"));

test("split: by whitespace", () =>
  assert(deepEqual(run(importRegex + 'regex.split("\\\\s+", "hello   world")'), ["hello", "world"]), "split ws"));

test("split: no match", () =>
  assert(deepEqual(run(importRegex + 'regex.split(",", "abc")'), ["abc"]), "split no match"));

// capture
test("capture: groups", () =>
  assert(deepEqual(run(importRegex + 'regex.capture("(\\\\d+)-(\\\\d+)", "date: 2024-01")'), ["2024", "01"]), "capture groups"));

test("capture: no match", () =>
  assert(run(importRegex + 'regex.capture("(\\\\d+)-(\\\\d+)", "abc")') === null, "capture nil"));

// capture_all
test("capture_all: multiple", () =>
  assert(deepEqual(run(importRegex + 'regex.capture_all("(\\\\w+)=(\\\\w+)", "a=1 b=2")'), [["a", "1"], ["b", "2"]]), "capture_all"));

test("capture_all: none", () =>
  assert(deepEqual(run(importRegex + 'regex.capture_all("(\\\\d+)", "abc")'), []), "capture_all none"));

// escape
test("escape: special chars", () =>
  assert(run(importRegex + 'regex.escape("a.b*c")') === "a\\.b\\*c", "escape specials"));

test("escape: no specials", () =>
  assert(run(importRegex + 'regex.escape("abc")') === "abc", "escape plain"));

// is_valid
test("is_valid: valid pattern", () =>
  assert(run(importRegex + 'regex.is_valid("^\\\\d+$")') === true, "is_valid true"));

test("is_valid: invalid pattern", () =>
  assert(run(importRegex + 'regex.is_valid("[invalid")') === false, "is_valid false"));

test("is_valid: empty pattern", () =>
  assert(run(importRegex + 'regex.is_valid("")') === true, "is_valid empty"));

console.log(`\n  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
