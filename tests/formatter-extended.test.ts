// Formatter Extended Tests
import { format } from "../compiler/src/formatter.js";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; } else { failed++; console.error(`  FAIL: ${msg}`); }
}

function test(name: string, fn: () => void) {
  try { fn(); } catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

console.log("Formatter Extended Tests:");

test("integer literal", () => {
  assert(format("let x = 42").trim() === "let x = 42", "int literal");
});

test("float literal", () => {
  assert(format("let x = 3.14").trim() === "let x = 3.14", "float literal");
});

test("boolean true", () => {
  assert(format("let x = true").trim() === "let x = true", "bool true");
});

test("boolean false", () => {
  assert(format("let x = false").trim() === "let x = false", "bool false");
});

test("nil literal", () => {
  assert(format("let x = nil").trim() === "let x = nil", "nil");
});

test("string literal", () => {
  assert(format('let x = "hello"').trim() === 'let x = "hello"', "string");
});

test("binary expr spacing: addition", () => {
  const r = format("let x = 1+2").trim();
  assert(r === "let x = 1 + 2", `got: ${r}`);
});

test("binary expr spacing: multiplication", () => {
  const r = format("let x = 3*4").trim();
  assert(r === "let x = 3 * 4", `got: ${r}`);
});

test("binary expr spacing: comparison", () => {
  const r = format("let x = a>b").trim();
  assert(r.includes(" > "), `got: ${r}`);
});

test("binary expr spacing: equality", () => {
  const r = format("let x = a==b").trim();
  assert(r.includes(" == "), `got: ${r}`);
});

test("binary expr spacing: string concat", () => {
  const r = format('let x = "a"++"b"').trim();
  assert(r.includes(' ++ '), `got: ${r}`);
});

test("unary not", () => {
  const r = format("let x = not true").trim();
  assert(r === "let x = not true", `got: ${r}`);
});

test("call with no args", () => {
  const r = format("foo()").trim();
  assert(r === "foo()", `got: ${r}`);
});

test("call with multiple args has comma spacing", () => {
  const r = format("foo(1,2,3)").trim();
  assert(r === "foo(1, 2, 3)", `got: ${r}`);
});

test("member access", () => {
  const r = format("let x = obj.field").trim();
  assert(r.includes("obj.field"), `got: ${r}`);
});

test("index access", () => {
  const r = format("let x = arr[0]").trim();
  assert(r.includes("arr[0]"), `got: ${r}`);
});

test("nested if/el", () => {
  const r = format("if a { if b { 1 } el { 2 } } el { 3 }");
  assert(r.includes("if a"), "outer if");
  assert(r.includes("if b"), "inner if");
});

test("match with wildcard", () => {
  const r = format('match x { _ => "default" }');
  assert(r.includes("_ =>"), `got: ${r}`);
});

test("match with multiple arms", () => {
  const r = format('match x { 1 => "one", 2 => "two", _ => "other" }');
  assert(r.includes('1 => "one"'), "arm 1");
  assert(r.includes('2 => "two"'), "arm 2");
  assert(r.includes('_ => "other"'), "wildcard arm");
});

test("lambda with multiple params", () => {
  const r = format("let f = (a, b) => a + b").trim();
  assert(r === "let f = (a, b) => a + b", `got: ${r}`);
});

test("empty map", () => {
  const r = format("let m = {}").trim();
  assert(r === "let m = {}", `got: ${r}`);
});

test("map with multiple entries", () => {
  const r = format('let m = {a: 1, b: 2}');
  assert(r.includes("a: 1"), "entry a");
  assert(r.includes("b: 2"), "entry b");
});

test("list comprehension with filter", () => {
  const r = format("[x for x in items if x > 0]");
  assert(r.includes("for x in items"), "iteration");
  assert(r.includes("if x > 0"), "filter");
});

test("range expression", () => {
  assert(format("let r = 1..100").trim() === "let r = 1..100", "range");
});

test("for loop formatting", () => {
  const r = format("for i in 1..10 { println(i) }");
  assert(r.includes("for i in 1..10"), "for header");
  assert(r.includes("println(i)"), "for body");
});

test("use with wildcard", () => {
  const r = format("use std/io: *").trim();
  assert(r === "use std/io: *", `got: ${r}`);
});

test("use bare module", () => {
  const r = format("use math").trim();
  assert(r === "use math", `got: ${r}`);
});

test("pub let", () => {
  const r = format("pub let x = 1").trim();
  assert(r === "pub let x = 1", `got: ${r}`);
});

test("async fn", () => {
  const r = format('async fn fetch_data() => nil');
  assert(r.includes("async fn fetch_data"), `got: ${r}`);
});

test("await expression", () => {
  const r = format("let x = await get_data()");
  assert(r.includes("await get_data()"), `got: ${r}`);
});

test("deeply nested blocks", () => {
  const r = format("fn outer() {\n  fn inner() {\n    let x = 1\n    x\n  }\n  inner()\n}");
  assert(r.includes("fn outer"), "outer fn");
  assert(r.includes("inner"), "inner fn present");
});

test("type with record", () => {
  const r = format("type Point = { x: Int, y: Int }");
  assert(r.includes("type Point"), "type name");
  assert(r.includes("x: Int"), "field x");
});

test("type with enum variants", () => {
  const r = format("type Color = Red | Green | Blue");
  assert(r.includes("Red"), "Red variant");
  assert(r.includes("Blue"), "Blue variant");
});

test("assignment statement", () => {
  const r = format("x = 42").trim();
  assert(r === "x = 42", `got: ${r}`);
});

test("idempotency: if/el", () => {
  const input = "if x>0{1}el{2}";
  const once = format(input);
  const twice = format(once);
  assert(once === twice, "if/el idempotent");
});

test("idempotency: match", () => {
  const input = 'match x { 1 => "one", _ => "other" }';
  const once = format(input);
  const twice = format(once);
  assert(once === twice, "match idempotent");
});

test("idempotency: function with block", () => {
  const input = 'fn greet(name){println("hi")}';
  const once = format(input);
  const twice = format(once);
  assert(once === twice, "fn block idempotent");
});

test("idempotency: list", () => {
  const input = "let xs=[1,2,3,4,5]";
  const once = format(input);
  const twice = format(once);
  assert(once === twice, "list idempotent");
});

test("trailing newline: always ends with one", () => {
  const r = format("let x = 1");
  assert(r.endsWith("\n"), "ends with newline");
  assert(!r.endsWith("\n\n"), "not double newline");
});

test("blank line between fn and let", () => {
  const r = format("fn a() => 1\nlet x = 2");
  const lines = r.split("\n");
  assert(lines.length >= 3, "blank line between fn and let");
});

test("comment before code", () => {
  const r = format("# comment\nlet x = 1");
  assert(r.includes("# comment"), "comment preserved");
  assert(r.includes("let x = 1"), "code preserved");
});

test("multiple comments", () => {
  const r = format("# first\n# second\nlet x = 1");
  assert(r.includes("# first"), "first comment");
  assert(r.includes("# second"), "second comment");
});

test("do-while loop", () => {
  const r = format("do { x = x + 1 } while x < 10");
  assert(r.includes("do"), "has do");
  assert(r.includes("while"), "has while");
});

console.log(`  ${passed} passed, ${failed} failed`);
export { passed, failed };
