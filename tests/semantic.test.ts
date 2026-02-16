// Semantic Analyzer Tests
import { lex } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";
import { analyze, Diagnostic } from "../compiler/src/semantic.js";

let passed = 0;
let failed = 0;

function check(source: string): Diagnostic[] {
  const tokens = lex(source);
  const ast = parse(tokens);
  return analyze(ast);
}

function errors(source: string): Diagnostic[] {
  return check(source).filter(d => d.level === "error");
}

function warnings(source: string): Diagnostic[] {
  return check(source).filter(d => d.level === "warning");
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(condition: boolean, msg = "assertion failed") {
  if (!condition) throw new Error(msg);
}

function assertEq(a: any, b: any, msg = "") {
  if (a !== b) throw new Error(`${msg} expected ${b}, got ${a}`);
}

console.log("Semantic Analyzer Tests:");

// === Name Resolution ===

test("no errors on valid let + usage", () => {
  assertEq(errors("let x = 10\nx").length, 0);
});

test("undefined variable error", () => {
  const e = errors("x + 1");
  assertEq(e.length, 1);
  assert(e[0].message.includes("Undefined variable"));
});

test("builtins are always available", () => {
  assertEq(errors("print(1)\nlen([1,2])").length, 0);
});

test("function hoisting - use before declaration", () => {
  assertEq(errors("foo()\nfn foo() => 1").length, 0);
});

test("nested scope access to parent", () => {
  assertEq(errors("let x = 1\nfn foo() => x").length, 0);
});

test("block scope isolation", () => {
  assertEq(errors("let x = 1\nlet y = x + 1").length, 0);
});

test("lambda parameters are in scope", () => {
  assertEq(errors("let f = (x, y) => x + y").length, 0);
});

test("for loop variable in scope", () => {
  assertEq(errors("for i in [1,2,3] {\n  i\n}").length, 0);
});

test("list comprehension variable in scope", () => {
  assertEq(errors("[x * 2 for x in [1,2,3]]").length, 0);
});

test("match binding pattern introduces variable", () => {
  assertEq(errors("match 1 { x => x }").length, 0);
});

// === Mutability Checking ===

test("immutable variable reassignment error", () => {
  const e = errors("let x = 1\nx = 2");
  assertEq(e.length, 1);
  assert(e[0].message.includes("Cannot reassign immutable"));
});

test("mutable variable reassignment ok", () => {
  assertEq(errors("let mut x = 1\nx = 2").length, 0);
});

test("reassign undefined variable", () => {
  const e = errors("z = 5");
  assertEq(e.length, 1);
  assert(e[0].message.includes("Undefined variable"));
});

// === Arity Checking ===

test("correct arity call", () => {
  assertEq(errors("fn add(a, b) => a + b\nadd(1, 2)").length, 0);
});

test("wrong arity call - too few args", () => {
  const e = errors("fn add(a, b) => a + b\nadd(1)");
  assertEq(e.length, 1);
  assert(e[0].message.includes("expects 2"));
});

test("wrong arity call - too many args", () => {
  const e = errors("fn add(a, b) => a + b\nadd(1, 2, 3)");
  assertEq(e.length, 1);
  assert(e[0].message.includes("expects 2"));
});

test("zero-arg function called with args", () => {
  const e = errors("fn greet() => 42\ngreet(1)");
  assertEq(e.length, 1);
  assert(e[0].message.includes("expects 0"));
});

// === Match Exhaustiveness ===

test("match with wildcard is exhaustive", () => {
  assertEq(warnings("match 1 { 1 => 1, _ => 0 }").length, 0);
});

test("match without catch-all warns", () => {
  const w = warnings("let x = 1\nmatch x { 1 => 1, 2 => 2 }");
  assert(w.some(d => d.message.includes("exhaustive")));
});

test("match with binding catch-all is exhaustive", () => {
  assertEq(warnings("let x = 1\nmatch x { 1 => 1, other => other }").length, 0);
});

test("empty match warns", () => {
  const w = warnings("let x = 1\nmatch x {}");
  assert(w.some(d => d.message.includes("no arms")));
});

test("unreachable arm after wildcard warns", () => {
  const w = warnings("let x = 1\nmatch x { _ => 0, 1 => 1 }");
  assert(w.some(d => d.message.includes("Unreachable")));
});

// === Scope Validation ===

test("use statement registers imports", () => {
  assertEq(errors("use std/math { sqrt }\nsqrt(4)").length, 0);
});

test("type statement registers type name", () => {
  assertEq(errors("type Point = { x: Int, y: Int }").length, 0);
});

test("destructured let variables are in scope", () => {
  assertEq(errors("let { a, b } = { a: 1, b: 2 }\na + b").length, 0);
});

test("function params don't leak to outer scope", () => {
  const e = errors("fn foo(secret) => secret\nsecret");
  assertEq(e.length, 1);
  assert(e[0].message.includes("Undefined variable: 'secret'"));
});

test("member assignment doesn't require mutability check on property", () => {
  assertEq(errors("let mut obj = { x: 1 }\nobj.x = 2").length, 0);
});

test("index assignment analyzes all sub-expressions", () => {
  assertEq(errors("let mut arr = [1,2,3]\narr[0] = 99").length, 0);
});

// === Complex scenarios ===

test("multiple errors reported", () => {
  const e = errors("a + b");
  assertEq(e.length, 2); // both a and b undefined
});

test("no false positives on string interpolation", () => {
  assertEq(errors('let name = "world"\n"hello #{name}"').length, 0);
});

test("pipeline expression checks both sides", () => {
  assertEq(errors("let x = [1,2]\nx |> len").length, 0);
});

test("do-while loop analyzes condition and body", () => {
  assertEq(errors("let mut i = 0\ndo { i = i + 1 } while i < 10").length, 0);
});

test("async/await analyzed", () => {
  assertEq(errors("let x = async { 42 }\nawait x").length, 0);
});

test("map literal keys and values analyzed", () => {
  assertEq(errors('let m = { name: "arc", version: 1 }').length, 0);
});

test("range expression analyzed", () => {
  assertEq(errors("1..10").length, 0);
});

test("tool call expression analyzed", () => {
  assertEq(errors('@GET "https://example.com"').length, 0);
});

test("if-else expression analyzed", () => {
  assertEq(errors("let x = 1\nif x > 0 { x } el { 0 }").length, 0);
});

test("nested function definitions", () => {
  assertEq(errors("fn outer() {\n  fn inner(x) => x\n  inner(1)\n}").length, 0);
});

test("for loop with range", () => {
  assertEq(errors("for i in 1..10 {\n  print(i)\n}").length, 0);
});

test("recursive function", () => {
  assertEq(errors("fn fib(n) => if n <= 1 { n } el { fib(n - 1) + fib(n - 2) }").length, 0);
});

test("higher-order function", () => {
  assertEq(errors("fn apply(f, x) => f(x)\napply(x => x + 1, 10)").length, 0);
});

test("closure captures outer variable", () => {
  assertEq(errors("fn make(n) {\n  fn inner(x) => x + n\n  inner\n}\nlet f = make(5)\nf(10)").length, 0);
});

test("fetch expression analyzed", () => {
  assertEq(errors("let a = async { 1 }\nlet b = async { 2 }\nfetch [a, b]").length, 0);
});

console.log(`  ${passed} passed, ${failed} failed`);

export { passed, failed };
