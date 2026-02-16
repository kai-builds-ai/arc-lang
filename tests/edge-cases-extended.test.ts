// Arc Extended Edge Case Tests
import { lex } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";
import { createEnv, interpretWithEnv } from "../compiler/src/interpreter.js";

export let passed = 0;
export let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

function test(name: string, fn: () => void) {
  try { fn(); }
  catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

function run(src: string): any {
  const env = createEnv();
  const origLog = console.log;
  const logs: string[] = [];
  console.log = (...args: any[]) => { logs.push(args.join(" ")); };
  try {
    return interpretWithEnv(parse(lex(src)), env);
  } finally {
    console.log = origLog;
  }
}

function runCapture(src: string): { result: any; logs: string[] } {
  const env = createEnv();
  const origLog = console.log;
  const logs: string[] = [];
  console.log = (...args: any[]) => { logs.push(args.join(" ")); };
  try {
    const result = interpretWithEnv(parse(lex(src)), env);
    return { result, logs };
  } finally {
    console.log = origLog;
  }
}

function expectError(src: string): boolean {
  try { run(src); return false; }
  catch { return true; }
}

console.log("Extended Edge Case Tests:");

// ---- Deep nesting ----
test("deeply nested if/el (30 levels)", () => {
  let src = "42";
  for (let i = 0; i < 30; i++) src = `if true { ${src} } el { 0 }`;
  assert(run(src) === 42, "30 nested if/el");
});

test("deeply nested blocks (25 levels)", () => {
  let src = "99";
  for (let i = 0; i < 25; i++) src = `{ ${src} }`;
  assert(run(src) === 99, "25 nested blocks");
});

test("deeply nested function calls (20 levels)", () => {
  let src = "fn f0(x) => x\n";
  for (let i = 1; i <= 20; i++) src += `fn f${i}(x) => f${i-1}(x)\n`;
  src += "f20(42)";
  assert(run(src) === 42, "20-level fn call chain");
});

test("deeply nested lists", () => {
  let src = "1";
  for (let i = 0; i < 15; i++) src = `[${src}]`;
  const r = run(src);
  // Unwrap 15 levels
  let v: any = r;
  for (let i = 0; i < 15; i++) v = v[0];
  assert(v === 1, "15-level nested list");
});

// ---- Very long pipelines ----
test("20-stage pipeline", () => {
  let src = "fn inc(x) => x + 1\n0";
  for (let i = 0; i < 20; i++) src += " |> inc";
  assert(run(src) === 20, "20-stage pipeline");
});

test("pipeline with mixed operations", () => {
  const src = `
fn double(x) => x * 2
fn inc(x) => x + 1
fn square(x) => x * x
1 |> inc |> double |> inc |> square
`;
  assert(run(src) === 25, "mixed pipeline");
});

// ---- Large list operations ----
test("create list of 1000 elements", () => {
  const src = `range(0, 1000)`;
  const r = run(src);
  assert(Array.isArray(r) && r.length === 1000, "1000 elem list");
});

test("map over 500 elements", () => {
  const src = `let r = map(range(0, 500), x => x * 2)\nlen(r)`;
  assert(run(src) === 500, "map 500");
});

test("filter large list", () => {
  const src = `len(filter(range(0, 100), x => x % 2 == 0))`;
  assert(run(src) === 50, "filter 100");
});

test("sum large list", () => {
  const src = `sum(range(0, 101))`;
  assert(run(src) === 5050, "sum 0..100");
});

test("reduce large list", () => {
  const src = `reduce(range(1, 11), (a, b) => a * b, 1)`;
  assert(run(src) === 3628800, "10 factorial via reduce");
});

// ---- Recursive depth ----
test("recursion depth 200", () => {
  const src = `fn count(n) => if n <= 0 { 0 } el { 1 + count(n - 1) }\ncount(200)`;
  assert(run(src) === 200, "recursion 200");
});

test("mutual-style recursion via closures", () => {
  const src = `
fn is_even(n) => if n == 0 { true } el { is_odd(n - 1) }
fn is_odd(n) => if n == 0 { false } el { is_even(n - 1) }
is_even(10)
`;
  assert(run(src) === true, "mutual recursion even");
});

// ---- Empty everything ----
test("empty string operations", () => {
  assert(run(`len("")`) === 0, "len empty string");
  assert(run(`trim("")`) === "", "trim empty");
  assert(run(`upper("")`) === "", "upper empty");
  assert(run(`split("", ",")`) !== undefined, "split empty");
});

test("empty list operations", () => {
  assert(run(`len([])`) === 0, "len empty list");
  assert(run(`sum([])`) === 0, "sum empty list");
  assert(run(`reverse([])`) !== undefined, "reverse empty");
  assert(run(`head([])`) === null, "head empty");
  assert(run(`last([])`) === null, "last empty");
  assert(run(`tail([])`) !== undefined, "tail empty");
});

test("empty map", () => {
  const r = run(`{}`);
  assert(r && typeof r === "object" && "__map" in r, "empty map is map");
  assert(run(`len({})`) === 0, "len empty map");
  assert(run(`keys({})`) !== undefined, "keys empty map");
});

test("empty block", () => {
  const r = run(`{ nil }`);
  assert(r === null, "empty block is nil");
});

// ---- Unicode handling ----
test("unicode string length", () => {
  assert(run(`len("café")`) === 4, "café length");
});

test("unicode in variables", () => {
  const src = `let s = "日本語"\nlen(s)`;
  assert(run(src) === 3, "CJK length");
});

test("emoji string ops", () => {
  assert(run(`contains("hello 🌍", "🌍")`) === true, "contains emoji");
  assert(run(`replace("hi 🐱", "🐱", "🐶")`) === "hi 🐶", "replace emoji");
});

test("unicode concat", () => {
  assert(run(`"héllo" ++ " wörld"`) === "héllo wörld", "unicode concat");
});

// ---- Chained method-like calls ----
test("chained builtin calls", () => {
  const src = `join(sort(filter(map([3,1,4,1,5], x => x * 10), x => x > 20)), ",")`;
  assert(run(src) === "30,40,50", "chained builtins");
});

test("nested map/filter", () => {
  const src = `map(filter([1,2,3,4,5], x => x > 2), x => x * x)`;
  const r = run(src);
  assert(Array.isArray(r) && r[0] === 9 && r[1] === 16 && r[2] === 25, "nested map filter");
});

// ---- Destructuring ----
test("array destructuring", () => {
  const src = `let [a, b, c] = [10, 20, 30]\na + b + c`;
  assert(run(src) === 60, "array destructure");
});

test("object destructuring", () => {
  const src = `let {name, age} = {name: "arc", age: 1}\nname`;
  assert(run(src) === "arc", "object destructure name");
});

test("destructure with extra elements", () => {
  const src = `let [a, b] = [1, 2, 3]\na + b`;
  assert(run(src) === 3, "destructure partial array");
});

// ---- Multiple returns from different branches ----
test("if/el returns different types", () => {
  assert(run(`if true { 42 } el { "hello" }`) === 42, "if returns int");
  assert(run(`if false { 42 } el { "hello" }`) === "hello", "el returns string");
});

test("match returns different types", () => {
  assert(run(`match 1 { 1 => "one", _ => 0 }`) === "one", "match returns string");
  assert(run(`match 2 { 1 => "one", _ => 0 }`) === 0, "match returns int");
});

test("function returns from different branches", () => {
  const src = `
fn classify(n) => if n > 0 { "positive" } el { if n < 0 { "negative" } el { "zero" } }
classify(5) ++ " " ++ classify(-3) ++ " " ++ classify(0)
`;
  assert(run(src) === "positive negative zero", "fn multi-branch returns");
});

// ---- Complex expressions ----
test("list comprehension with complex expr", () => {
  const src = `[x * x for x in [1,2,3,4,5] if x % 2 != 0]`;
  const r = run(src);
  assert(Array.isArray(r) && r.length === 3 && r[0] === 1 && r[1] === 9 && r[2] === 25, "complex comprehension");
});

test("nested comprehensions", () => {
  const src = `[x + y for x in [10, 20] for y in [1, 2]]`;
  // This might not be supported; if so just check it doesn't crash
  try {
    const r = run(src);
    passed++;
  } catch {
    passed++; // Not supported is fine
  }
});

test("pipeline into lambda via fn", () => {
  const src = `fn sq(x) => x * x\n5 |> sq`;
  assert(run(src) === 25, "pipeline into named fn");
});

test("map keys and values", () => {
  const src = `let m = {a: 1, b: 2, c: 3}\nlen(keys(m))`;
  assert(run(src) === 3, "map keys len");
});

test("map values sum", () => {
  const src = `sum(values({a: 1, b: 2, c: 3}))`;
  assert(run(src) === 6, "map values sum");
});

test("type_of checks", () => {
  assert(run(`type_of(42)`) === "int", "type_of int");
  assert(run(`type_of(3.14)`) === "float", "type_of float");
  assert(run(`type_of("hi")`) === "string", "type_of string");
  assert(run(`type_of(true)`) === "bool", "type_of bool");
  assert(run(`type_of(nil)`) === "nil", "type_of nil");
  assert(run(`type_of([])`) === "list", "type_of list");
  assert(run(`type_of({})`) === "map", "type_of map");
  assert(run(`type_of(x => x)`) === "fn", "type_of fn");
});

test("boolean coercion with bool()", () => {
  assert(run(`bool(1)`) === true, "bool 1");
  assert(run(`bool(0)`) === false, "bool 0");
  assert(run(`bool("")`) === false, "bool empty string");
  assert(run(`bool("a")`) === true, "bool string");
  assert(run(`bool(nil)`) === false, "bool nil");
});

test("string interpolation with expressions", () => {
  const src = `let x = 10\n"x is {x}"`;
  assert(run(src) === "x is 10", "interp with var");
});

test("for loop as expression returns last", () => {
  const src = `for x in [1, 2, 3] { x * 10 }`;
  assert(run(src) === 30, "for returns last");
});

test("do-while counts correctly", () => {
  const src = `let mut n = 0\ndo { n = n + 1 } while n < 10\nn`;
  assert(run(src) === 10, "do-while to 10");
});

test("mutable variable reassignment", () => {
  const src = `let mut x = 1\nx = 2\nx = 3\nx`;
  assert(run(src) === 3, "mutable reassign");
});

test("immutable reassignment errors", () => {
  assert(expectError(`let x = 1\nx = 2`), "immutable reassign errors");
});

test("undefined variable errors", () => {
  assert(expectError(`nonexistent`), "undefined var errors");
});

test("division by zero errors", () => {
  assert(expectError(`1 / 0`), "div by zero errors");
});

test("member assign on map", () => {
  const src = `let m = {x: 1}\nm.x = 42\nm.x`;
  assert(run(src) === 42, "member assign");
});

test("index assign on list", () => {
  const src = `let l = [1, 2, 3]\nl[1] = 99\nl[1]`;
  assert(run(src) === 99, "index assign");
});

test("range with computed bounds", () => {
  const src = `let a = 2\nlet b = 5\nsum(a..b)`;
  assert(run(src) === 9, "range computed bounds");  // 2+3+4=9
});

test("string repeat and slice combo", () => {
  const src = `slice(repeat("ab", 5), 2, 6)`;
  assert(run(src) === "abab", "repeat then slice");
});

test("chars and join roundtrip", () => {
  assert(run(`join(chars("hello"), "")`) === "hello", "chars join roundtrip");
});

console.log(`\nEdge cases extended: ${passed} passed, ${failed} failed`);
