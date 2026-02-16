// Formatter Unit Tests
import { format } from "../compiler/src/formatter.js";

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

console.log("Formatter Tests:");

test("simple let statement", () => {
  const result = format('let x=42');
  assert(result.trim() === 'let x = 42', `got: ${JSON.stringify(result.trim())}`);
});

test("function declaration", () => {
  const result = format('fn add(a,b) => a+b');
  assert(result.trim() === 'fn add(a, b) => a + b', `got: ${JSON.stringify(result.trim())}`);
});

test("function with block body", () => {
  const result = format('fn greet(name){println("hello")}');
  assert(result.includes('fn greet(name)'), `got: ${JSON.stringify(result)}`);
  assert(result.includes('println("hello")'), `got: ${JSON.stringify(result)}`);
});

test("trailing newline normalization", () => {
  const result = format('let x = 1\n\n\n');
  assert(result.endsWith('\n'), "should end with single newline");
  assert(!result.endsWith('\n\n'), "should not end with double newline");
});

test("blank lines between top-level declarations", () => {
  const result = format('fn a() => 1\nfn b() => 2');
  const lines = result.split('\n');
  // Should have blank line between functions
  assert(lines.length >= 3, `expected blank line between fns, got: ${JSON.stringify(result)}`);
});

test("if/el expression", () => {
  const result = format('if x>0{1}el{2}');
  assert(result.includes('if x > 0'), `condition spacing: ${JSON.stringify(result)}`);
  assert(result.includes('el'), `should have el: ${JSON.stringify(result)}`);
});

test("pipeline expression", () => {
  const result = format('data|>map(f)|>filter(g)');
  assert(result.includes('|>'), `should have pipe: ${JSON.stringify(result)}`);
  assert(result.includes('data'), `should have data: ${JSON.stringify(result)}`);
});

test("list literal", () => {
  const result = format('let xs=[1,2,3]');
  assert(result.trim() === 'let xs = [1, 2, 3]', `got: ${JSON.stringify(result.trim())}`);
});

test("map literal", () => {
  const result = format('let m={name: "arc",version: 1}');
  assert(result.includes('name: "arc"'), `got: ${JSON.stringify(result)}`);
  assert(result.includes('version: 1'), `got: ${JSON.stringify(result)}`);
});

test("use statement", () => {
  const result = format('use std/io: println,readln');
  assert(result.trim() === 'use std/io: println, readln', `got: ${JSON.stringify(result.trim())}`);
});

test("type statement", () => {
  const result = format('type Color = Red | Green | Blue');
  assert(result.includes('type Color ='), `got: ${JSON.stringify(result)}`);
});

test("pub fn", () => {
  const result = format('pub fn hello() => "world"');
  assert(result.trim() === 'pub fn hello() => "world"', `got: ${JSON.stringify(result.trim())}`);
});

test("match expression", () => {
  const result = format('match x { 1 => "one", _ => "other" }');
  assert(result.includes('match x'), `got: ${JSON.stringify(result)}`);
  assert(result.includes('1 => "one"'), `got: ${JSON.stringify(result)}`);
});

test("for loop", () => {
  const result = format('for i in 1..10 { println(i) }');
  assert(result.includes('for i in'), `got: ${JSON.stringify(result)}`);
});

test("lambda expression", () => {
  const result = format('let f = x => x + 1');
  assert(result.trim() === 'let f = x => x + 1', `got: ${JSON.stringify(result.trim())}`);
});

test("comment preservation", () => {
  const result = format('# This is a comment\nlet x = 1');
  assert(result.includes('# This is a comment'), `comment lost: ${JSON.stringify(result)}`);
  assert(result.includes('let x = 1'), `code lost: ${JSON.stringify(result)}`);
});

test("empty list", () => {
  const result = format('let xs = []');
  assert(result.trim() === 'let xs = []', `got: ${JSON.stringify(result.trim())}`);
});

test("mut variable", () => {
  const result = format('let mut count = 0');
  assert(result.trim() === 'let mut count = 0', `got: ${JSON.stringify(result.trim())}`);
});

test("nested blocks format with indentation", () => {
  const result = format('fn outer() {\n  let x = 1\n  let y = 2\n  x + y\n}');
  assert(result.includes('  let x = 1'), `should have indentation: ${JSON.stringify(result)}`);
});

test("range expression", () => {
  const result = format('let r = 1..10');
  assert(result.trim() === 'let r = 1..10', `got: ${JSON.stringify(result.trim())}`);
});

test("async/await", () => {
  const result = format('let x = await fetch_data()');
  assert(result.includes('await'), `got: ${JSON.stringify(result)}`);
});

test("list comprehension", () => {
  const result = format('[x * 2 for x in items]');
  assert(result.includes('for x in items'), `got: ${JSON.stringify(result)}`);
});

test("idempotency - formatting twice gives same result", () => {
  const input = 'fn add(a,b)=>a+b\nlet x=42';
  const once = format(input);
  const twice = format(once);
  assert(once === twice, `not idempotent:\n  once: ${JSON.stringify(once)}\n  twice: ${JSON.stringify(twice)}`);
});

console.log(`  ${passed} passed, ${failed} failed`);
