// Tests for string map keys, integer map keys, spread syntax, and computed map keys

import { lex } from "../../compiler/src/lexer.js";
import { parse } from "../../compiler/src/parser.js";
import { createEnv, interpretWithEnv, toStr } from "../../compiler/src/interpreter.js";

export let passed = 0;
export let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

function run(src: string): any {
  const env = createEnv();
  return interpretWithEnv(parse(lex(src)), env);
}

function runStr(src: string): string {
  return toStr(run(src));
}

function test(name: string, fn: () => void) {
  try { fn(); }
  catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

console.log("Map & Spread Feature Tests:");

// ===== Feature 1: String Map Keys =====

test("string key in map literal", () => {
  assert(runStr(`let m = {"name": "foo"}; m["name"]`) === "foo", "string key basic");
});

test("string key with special chars", () => {
  assert(runStr(`let m = {"Content-Type": "json"}; m["Content-Type"]`) === "json", "string key special chars");
});

test("mixed string and ident keys", () => {
  assert(runStr(`let m = {name: "foo", "Content-Type": "json"}; m["Content-Type"]`) === "json", "mixed string/ident keys");
});

test("ident key still works with mixed", () => {
  assert(runStr(`let m = {name: "foo", "Content-Type": "json"}; m.name`) === "foo", "ident key in mixed map");
});

test("string key access via index", () => {
  assert(runStr(`let m = {"X-Api-Key": "secret"}; m["X-Api-Key"]`) === "secret", "string key index access");
});

test("string key with spaces", () => {
  assert(runStr(`let m = {"hello world": 42}; m["hello world"]`) === "42", "string key with spaces");
});

test("multiple string keys", () => {
  assert(run(`let m = {"a": 1, "b": 2, "c": 3}; m["a"] + m["b"] + m["c"]`) === 6, "multiple string keys sum");
});

test("string key assignment", () => {
  assert(runStr(`let mut m = {"key": "old"}; m["key"] = "new"; m["key"]`) === "new", "string key assignment");
});

test("string key with new index assignment", () => {
  assert(run(`let mut m = {"a": 1}; m["b"] = 2; m["b"]`) === 2, "string key new index assign");
});

// ===== Feature 2: Integer Map Keys =====

test("integer key in map literal", () => {
  assert(runStr(`let m = {0: "zero", 1: "one"}; m["0"]`) === "zero", "int key basic");
});

test("integer key access", () => {
  assert(runStr(`let m = {0: "zero", 1: "one", 2: "two"}; m["1"]`) === "one", "int key access");
});

test("mixed integer and string keys", () => {
  assert(runStr(`let m = {0: "zero", "name": "foo"}; m["name"]`) === "foo", "mixed int/string keys");
});

test("integer key with ident keys", () => {
  assert(runStr(`let m = {0: "a", name: "b"}; m["0"]`) === "a", "int key with ident");
});

test("integer key values", () => {
  assert(run(`let m = {0: 10, 1: 20, 2: 30}; m["0"] + m["1"] + m["2"]`) === 60, "int key values sum");
});

// ===== Feature 3: Spread Syntax in Maps =====

test("spread map into new map", () => {
  assert(runStr(`let base = {name: "foo", age: 30}; let m = {...base, city: "NYC"}; m.name`) === "foo", "spread map basic");
});

test("spread map preserves all keys", () => {
  assert(run(`let base = {a: 1, b: 2}; let m = {...base, c: 3}; m.a + m.b + m.c`) === 6, "spread preserves keys");
});

test("spread map override", () => {
  assert(runStr(`let base = {name: "old", age: 30}; let m = {...base, name: "new"}; m.name`) === "new", "spread override");
});

test("multiple spreads in map", () => {
  assert(run(`let a = {x: 1}; let b = {y: 2}; let m = {...a, ...b, z: 3}; m.x + m.y + m.z`) === 6, "multiple spreads");
});

test("spread override order matters", () => {
  assert(run(`let a = {x: 1}; let b = {x: 2}; let m = {...a, ...b}; m.x`) === 2, "spread order");
});

test("spread with string keys", () => {
  assert(runStr(`let base = {"Content-Type": "text"}; let m = {...base, "Accept": "json"}; m["Content-Type"]`) === "text", "spread with string keys");
});

test("spread only map", () => {
  assert(run(`let base = {a: 1, b: 2}; let m = {...base}; m.a + m.b`) === 3, "spread only");
});

// ===== Feature 3: Spread Syntax in Lists =====

test("spread list into new list", () => {
  assert(run(`let a = [1, 2, 3]; let b = [...a, 4, 5]; len(b)`) === 5, "spread list len");
});

test("spread list values", () => {
  assert(run(`let a = [1, 2]; let b = [...a, 3]; b[0] + b[1] + b[2]`) === 6, "spread list values");
});

test("spread multiple lists", () => {
  assert(run(`let a = [1, 2]; let b = [3, 4]; let c = [...a, ...b]; len(c)`) === 4, "spread multiple lists");
});

test("spread list at different positions", () => {
  assert(run(`let mid = [2, 3]; let full = [1, ...mid, 4]; full[0] + full[1] + full[2] + full[3]`) === 10, "spread mid position");
});

test("spread empty list", () => {
  assert(run(`let a = []; let b = [...a, 1]; len(b)`) === 1, "spread empty list");
});

test("nested spread lists", () => {
  assert(run(`let a = [1]; let b = [...a, 2]; let c = [...b, 3]; c[0] + c[1] + c[2]`) === 6, "nested spread");
});

test("spread list preserves order", () => {
  assert(run(`let a = [10, 20]; let b = [30, 40]; let c = [...a, ...b]; c[2]`) === 30, "spread order preserved");
});

// ===== Feature 4: Computed Map Keys =====

test("computed key from variable", () => {
  assert(runStr(`let key = "name"; let m = {[key]: "foo"}; m["name"]`) === "foo", "computed key variable");
});

test("computed key from expression", () => {
  assert(run(`let m = {["a" ++ "b"]: 42}; m["ab"]`) === 42, "computed key expression");
});

test("computed key with function call", () => {
  assert(runStr(`fn getKey() => "dynamic"; let m = {[getKey()]: "value"}; m["dynamic"]`) === "value", "computed key fn call");
});

test("mixed computed and regular keys", () => {
  assert(runStr(`let key = "computed"; let m = {name: "static", [key]: "dynamic"}; m.name ++ " " ++ m["computed"]`) === "static dynamic", "mixed computed/regular");
});

test("computed key with spread", () => {
  assert(run(`let base = {a: 1}; let key = "b"; let m = {...base, [key]: 2}; m.a + m["b"]`) === 3, "computed key with spread");
});

test("computed key from int expression", () => {
  assert(run(`let i = 0; let m = {[str(i)]: "zero"}; m["0"]`) === "zero", "computed key int expr");
});

// ===== Edge Cases =====

test("empty map literal", () => {
  assert(run(`let m = {}; len(m)`) === 0, "empty map");
});

test("keys function with string keys", () => {
  assert(run(`let m = {"a": 1, "b": 2}; len(keys(m))`) === 2, "keys with string keys");
});

test("values function with spread map", () => {
  assert(run(`let base = {x: 10}; let m = {...base, y: 20}; sum(values(m))`) === 30, "values with spread");
});

test("spread preserves map type", () => {
  assert(runStr(`let base = {a: 1}; let m = {...base}; type_of(m)`) === "map", "spread map type");
});

test("list spread preserves list type", () => {
  assert(runStr(`let a = [1, 2]; let b = [...a]; type_of(b)`) === "list", "spread list type");
});

test("string key map with len", () => {
  assert(run(`let m = {"a": 1, "b": 2, "c": 3}; len(m)`) === 3, "string key map len");
});

console.log(`  ${passed} passed, ${failed} failed`);
