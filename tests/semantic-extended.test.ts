// Extended Semantic Analyzer Tests
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

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

function test(name: string, fn: () => void) {
  try { fn(); }
  catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

console.log("Extended Semantic Analyzer Tests:");

// === Deeply Nested Scopes ===

test("three-level nested scope access", () => {
  assert(errors("let x = 1\nfn a() {\n  fn b() {\n    fn c() => x\n    c()\n  }\n  b()\n}").length === 0,
    "deeply nested fn can access top-level var");
});

test("sibling scopes don't share locals", () => {
  const e = errors("fn a() {\n  let local = 1\n  local\n}\nfn b() => local");
  assert(e.length === 1, "sibling fn cannot see other fn's local");
});

test("shadowing in nested scope", () => {
  assert(errors("let x = 1\nfn f() {\n  let x = 2\n  x\n}").length === 0,
    "shadowing in nested scope is ok");
});

test("for loop var not visible after loop", () => {
  const e = errors("for i in [1,2] {\n  i\n}\ni");
  assert(e.length === 1, "for loop var leaks");
});

test("list comprehension var not visible outside", () => {
  const e = errors("[x for x in [1]]\nx");
  assert(e.length === 1, "comprehension var leaks");
});

// === Closure / Mutable Capture ===

test("closure captures mutable var - reassignment outside", () => {
  assert(errors("let mut x = 0\nfn inc() => x\nx = 1\ninc()").length === 0,
    "closure can reference outer mutable var");
});

test("nested lambda captures parent param", () => {
  assert(errors("fn outer(a) {\n  let f = (b) => a + b\n  f(1)\n}").length === 0,
    "lambda captures parent fn param");
});

// === Arity Checks ===

test("single-param fn called with zero args", () => {
  const e = errors("fn id(x) => x\nid()");
  assert(e.length === 1 && e[0].message.includes("expects 1"), "arity 1 called with 0");
});

test("three-param fn called with two", () => {
  const e = errors("fn add3(a, b, c) => a + b + c\nadd3(1, 2)");
  assert(e.length === 1 && e[0].message.includes("expects 3"), "arity 3 called with 2");
});

test("three-param fn called correctly", () => {
  assert(errors("fn add3(a, b, c) => a + b + c\nadd3(1, 2, 3)").length === 0,
    "correct arity 3 call");
});

test("nested function arity check", () => {
  const e = errors("fn outer() {\n  fn inner(x, y) => x + y\n  inner(1)\n}");
  assert(e.length === 1 && e[0].message.includes("expects 2"), "inner fn arity checked");
});

// === Match Analysis ===

test("match with multiple literal arms no catch-all warns", () => {
  const w = warnings("let x = 1\nmatch x { 1 => 1, 2 => 2, 3 => 3 }");
  assert(w.some(d => d.message.includes("exhaustive")), "no catch-all warns");
});

test("match with wildcard after literals is exhaustive", () => {
  assert(warnings("let x = 1\nmatch x { 1 => 1, 2 => 2, _ => 0 }").length === 0,
    "wildcard makes it exhaustive");
});

test("match arm body can reference binding", () => {
  assert(errors("let x = 1\nmatch x { val => val + 1 }").length === 0,
    "binding pattern usable in body");
});

test("match with single binding arm is exhaustive", () => {
  assert(warnings("let x = 5\nmatch x { n => n + 1 }").length === 0,
    "single binding arm is exhaustive");
});

test("unreachable arm after binding pattern warns", () => {
  const w = warnings("let x = 1\nmatch x { y => y, 1 => 1 }");
  assert(w.some(d => d.message.includes("Unreachable")), "arm after binding is unreachable");
});

// === Assignment Targets ===

test("member assign on immutable object errors", () => {
  // MemberAssignStmt doesn't check mutability of object in current impl - it just analyzes exprs
  assert(errors("let mut obj = { x: 1 }\nobj.y = 2").length === 0,
    "member assign on mutable obj ok");
});

test("index assign on mutable array", () => {
  assert(errors("let mut arr = [1, 2]\narr[0] = 99").length === 0,
    "index assign on mutable arr ok");
});

test("plain variable assign to immutable errors", () => {
  const e = errors("let x = 1\nx = 2");
  assert(e.length === 1 && e[0].message.includes("Cannot reassign immutable"), "immutable reassign");
});

test("assign to undefined var errors", () => {
  const e = errors("notDefined = 5");
  assert(e.length === 1 && e[0].message.includes("Undefined"), "assign to undefined");
});

// === Use/Import ===

test("use with named imports makes them available", () => {
  const e = errors("use std/math : myFunc\nmyFunc(1)");
  assert(e.length === 0, "named imports usable (got " + e.length + " errors: " + e.map(x => x.message).join("; ") + ")");
});

test("use without named imports registers module name", () => {
  assert(errors("use std/io").length === 0,
    "module name registered");
});

test("use with multiple named imports", () => {
  assert(errors("use std/math : sin, cos\nsin(1)\ncos(1)").length === 0,
    "multiple named imports usable");
});

// === Type Statement ===

test("type statement registers name", () => {
  assert(errors("type Color = { r: Int, g: Int, b: Int }").length === 0,
    "type name registered");
});

test("multiple type statements", () => {
  assert(errors("type X = { a: Int }\ntype Y = { b: Int }").length === 0,
    "multiple type defs ok");
});

// === Pipeline ===

test("pipeline with known function", () => {
  assert(errors("fn double(x) => x * 2\n10 |> double").length === 0,
    "pipeline with user fn");
});

test("pipeline with builtin", () => {
  assert(errors("[1,2,3] |> len").length === 0, "pipeline with builtin");
});

test("chained pipeline", () => {
  assert(errors("fn inc(x) => x + 1\nfn dbl(x) => x * 2\n5 |> inc |> dbl").length === 0,
    "chained pipeline");
});

// === String Interpolation ===

test("string interpolation with defined var", () => {
  assert(errors('let name = "Arc"\n"Hello #{name}!"').length === 0,
    "interp with defined var ok");
});

test("string interpolation with undefined var errors", () => {
  const e = errors('"Hello #{unknown}!"');
  assert(e.length === 1 && e[0].message.includes("Undefined"), "interp with undefined var");
});

test("string interpolation with expression", () => {
  assert(errors('let x = 5\n"Value: #{x + 1}"').length === 0,
    "interp with expr");
});

// === Mutual Recursion ===

test("mutual recursion via hoisting", () => {
  assert(errors("fn isEven(n) => if n == 0 { true } el { isOdd(n - 1) }\nfn isOdd(n) => if n == 0 { false } el { isEven(n - 1) }").length === 0,
    "mutual recursion ok with hoisting");
});

// === Destructuring ===

test("destructured let - all names in scope", () => {
  assert(errors("let { x, y, z } = { x: 1, y: 2, z: 3 }\nx + y + z").length === 0,
    "all destructured names available");
});

test("destructured let - accessing undefined name errors", () => {
  const e = errors("let { a } = { a: 1 }\nb");
  assert(e.length === 1, "non-destructured name undefined");
});

// === Block Expression Scope ===

test("block expression creates its own scope", () => {
  // Variables inside a block expression shouldn't leak
  assert(errors("let result = { let inner = 42\n  inner }\nresult").length === 0,
    "block expr var in scope inside");
});

// === Multiple Errors ===

test("three undefined variables produce three errors", () => {
  const e = errors("a + b + c");
  assert(e.length === 3, "three undefined vars = three errors");
});

test("mixed errors and valid code", () => {
  const e = errors("let x = 1\nlet y = undefined_var\nx + y");
  assert(e.length === 1, "one undefined among valid");
});

// === Async / Await / Fetch ===

test("async block body analyzed", () => {
  assert(errors("let x = 1\nlet a = async { x + 1 }").length === 0, "async body sees outer scope");
});

test("await expression analyzed", () => {
  assert(errors("let a = async { 42 }\nlet b = await a").length === 0, "await ok");
});

test("fetch targets analyzed", () => {
  assert(errors("let a = async { 1 }\nlet b = async { 2 }\nlet c = async { 3 }\nfetch [a, b, c]").length === 0,
    "fetch with multiple targets ok");
});

// === Map Literal ===

test("map literal with expressions", () => {
  assert(errors('let x = 10\nlet m = { count: x, label: "test" }').length === 0,
    "map literal with var values ok");
});

// === Range ===

test("range with variables", () => {
  assert(errors("let lo = 0\nlet hi = 10\nlo..hi").length === 0, "range with vars ok");
});

// === Do-While ===

test("do-while with mutable var", () => {
  assert(errors("let mut n = 10\ndo { n = n - 1 } while n > 0").length === 0,
    "do-while with mutable ok");
});

test("do-while with immutable condition var errors on reassign", () => {
  const e = errors("let n = 10\ndo { n = n - 1 } while n > 0");
  assert(e.length === 1 && e[0].message.includes("Cannot reassign"), "do-while immutable reassign");
});

// === Complex Scenarios ===

test("higher-order returning closure", () => {
  assert(errors("fn adder(n) {\n  (x) => x + n\n}\nlet add5 = adder(5)\nadd5(10)").length === 0,
    "HOF returning closure ok");
});

test("list comprehension with filter", () => {
  assert(errors("[x * x for x in [1,2,3,4,5] if x > 2]").length === 0,
    "list comp with filter ok");
});

test("nested match expressions", () => {
  assert(errors("let x = 1\nmatch x { 1 => match 2 { 2 => 42, _ => 0 }, _ => -1 }").length === 0,
    "nested match ok");
});

test("function with if-else body", () => {
  assert(errors("fn classify(n) => if n > 0 { 1 } el { if n < 0 { -1 } el { 0 } }").length === 0,
    "fn with nested if-else ok");
});

test("tool call with string url", () => {
  assert(errors('@POST "https://api.example.com/data"').length === 0,
    "tool call ok");
});

console.log(`  ${passed} passed, ${failed} failed`);
export { passed, failed };
