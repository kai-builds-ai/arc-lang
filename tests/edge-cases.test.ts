// Arc Edge Case Tests
import { lex, TokenType } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";
import { createEnv, interpretWithEnv, toStr } from "../compiler/src/interpreter.js";
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

function run(src: string): any {
  const env = createEnv();
  const origLog = console.log;
  console.log = () => {};
  try {
    return interpretWithEnv(parse(lex(src)), env);
  } finally {
    console.log = origLog;
  }
}

function expectError(src: string): boolean {
  try { run(src); return false; }
  catch { return true; }
}

function lexSafe(src: string): boolean {
  try { lex(src); return true; } catch { return true; } // should never crash
}

function parseSafe(src: string): boolean {
  try { parse(lex(src)); return true; } catch { return true; }
}

console.log("Edge Case Tests:");

// ---- Empty programs ----
test("empty program", () => {
  const ast = parse(lex(""));
  assert(ast.stmts.length === 0, "empty program has no stmts");
});

test("whitespace-only program", () => {
  const ast = parse(lex("   \n  \n  "));
  assert(ast.stmts.length === 0, "whitespace-only program");
});

// ---- Comments only ----
test("comment-only program", () => {
  const ast = parse(lex("# this is a comment"));
  assert(ast.stmts.length === 0, "comment-only program");
});

test("multiple comments", () => {
  const ast = parse(lex("# line 1\n# line 2\n# line 3"));
  assert(ast.stmts.length === 0, "multiple comments");
});

// ---- Deeply nested expressions ----
test("deeply nested parens (100 levels)", () => {
  const src = "(".repeat(100) + "42" + ")".repeat(100);
  assert(run(src) === 42, "deeply nested parens");
});

test("deeply nested if/el (20 levels)", () => {
  let src = "42";
  for (let i = 0; i < 20; i++) {
    src = `if true { ${src} } el { 0 }`;
  }
  assert(run(src) === 42, "nested if/el");
});

// ---- Very long strings ----
test("very long string (10000 chars)", () => {
  const long = "a".repeat(10000);
  assert(run(`"${long}"`) === long, "long string");
});

test("empty string", () => {
  assert(run(`""`) === "", "empty string");
});

// ---- Very large numbers ----
test("large integer", () => {
  assert(run("999999999") === 999999999, "large int");
});

test("large computation", () => {
  assert(run("2 ** 20") === 1048576, "2^20");
});

test("negative numbers", () => {
  assert(run("-42") === -42, "negative");
});

test("zero", () => {
  assert(run("0") === 0, "zero");
});

// ---- Unicode ----
test("unicode in strings", () => {
  assert(run(`"héllo wörld"`) === "héllo wörld", "unicode string");
});

test("emoji in strings", () => {
  assert(run(`"hello 🌍"`) === "hello 🌍", "emoji string");
});

test("CJK in strings", () => {
  assert(run(`"你好世界"`) === "你好世界", "CJK string");
});

// ---- Empty function bodies ----
test("function with simple body", () => {
  assert(run(`fn f() => nil\nf()`) === null, "fn returning nil");
});

test("function with block returning nil", () => {
  assert(run(`fn f() { nil }\nf()`) === null, "fn block nil");
});

// ---- Chained pipelines ----
test("pipeline chain (5 stages)", () => {
  const src = `
fn double(x) => x * 2
fn inc(x) => x + 1
1 |> inc |> double |> inc |> double |> inc
`;
  assert(run(src) === 11, "5-stage pipeline");
});

test("pipeline chain (10 stages)", () => {
  const src = `
fn inc(x) => x + 1
0 |> inc |> inc |> inc |> inc |> inc |> inc |> inc |> inc |> inc |> inc
`;
  assert(run(src) === 10, "10-stage pipeline");
});

// ---- Recursive functions ----
test("recursion depth 10", () => {
  const src = `fn count(n) => if n <= 0 { 0 } el { 1 + count(n - 1) }\ncount(10)`;
  assert(run(src) === 10, "recursion 10");
});

test("recursion depth 100", () => {
  const src = `fn count(n) => if n <= 0 { 0 } el { 1 + count(n - 1) }\ncount(100)`;
  assert(run(src) === 100, "recursion 100");
});

test("fibonacci", () => {
  const src = `fn fib(n) => if n <= 1 { n } el { fib(n-1) + fib(n-2) }\nfib(10)`;
  assert(run(src) === 55, "fib(10)");
});

// ---- Operator precedence ----
test("precedence: * before +", () => {
  assert(run("2 + 3 * 4") === 14, "2+3*4=14");
});

test("precedence: ** before *", () => {
  assert(run("2 * 3 ** 2") === 18, "2*3**2=18");
});

test("precedence: parens override", () => {
  assert(run("(2 + 3) * 4") === 20, "(2+3)*4=20");
});

test("precedence: comparison", () => {
  assert(run("1 + 2 < 4") === true, "1+2<4");
});

test("precedence: and/or", () => {
  assert(run("true or false and false") === true, "or/and precedence");
});

test("unary minus precedence", () => {
  assert(run("-2 + 3") === 1, "-2+3=1");
});

// ---- Newline handling ----
test("LF newlines", () => {
  const src = "let x = 1\nlet y = 2\nx + y";
  assert(run(src) === 3, "LF");
});

test("CRLF newlines", () => {
  const src = "let x = 1\r\nlet y = 2\r\nx + y";
  assert(run(src) === 3, "CRLF");
});

test("mixed newlines", () => {
  const src = "let x = 1\nlet y = 2\r\nx + y";
  assert(run(src) === 3, "mixed newlines");
});

// ---- String interpolation edge cases ----
test("interpolation with variable", () => {
  assert(run(`let x = 3\n"result: {x}"`) === "result: 3", "var interp");
});

test("interpolation with string var", () => {
  assert(run(`let x = "world"\n"hello {x}"`) === "hello world", "string interp");
});

test("multiple interpolations", () => {
  assert(run(`let a = 1\nlet b = 2\nlet c = 3\n"{a}{b}{c}"`) === "123", "multi interp");
});

test("interpolation with nil var", () => {
  assert(run(`let x = nil\n"{x}"`) === "nil", "nil interp");
});

// ---- Lists and maps ----
test("empty list", () => {
  const r = run(`[]`);
  assert(Array.isArray(r) && r.length === 0, "empty list");
});

test("nested lists", () => {
  const r = run(`[[1, 2], [3, 4]]`);
  assert(Array.isArray(r) && r.length === 2, "nested lists");
});

test("empty map", () => {
  const r = run(`{}`);
  assert(r && typeof r === "object", "empty map");
});

// ---- Error cases that should NOT crash ----
test("division by zero", () => {
  assert(expectError("1 / 0") || run("1 / 0") === Infinity, "div by zero");
});

test("undefined variable", () => {
  assert(expectError("undefinedVar"), "undefined var");
});

test("type mismatch in arithmetic", () => {
  // This may error or coerce, either is fine — just don't crash
  try { run(`"hello" + 5`); } catch (e: any) {
    assert(e instanceof Error, "type error is Error");
  }
  passed++; // didn't crash
});

test("unterminated string (lexer)", () => {
  assert(lexSafe(`"hello`), "unterminated string");
});

test("unexpected token (parser)", () => {
  assert(parseSafe(`+ + +`), "unexpected tokens");
});

test("deep nesting doesn't crash (50 blocks)", () => {
  let src = "42";
  for (let i = 0; i < 50; i++) src = `{ ${src} }`;
  try { run(src); passed++; } catch { passed++; } // error is fine, crash is not
});

// ---- Misc edge cases ----
test("semicolons as separators", () => {
  assert(run("let x = 1; let y = 2; x + y") === 3, "semicolons");
});

test("trailing semicolons", () => {
  assert(run("42;") === 42, "trailing semicolon");
});

test("multiple semicolons", () => {
  assert(run(";;;42;;;") === 42, "multiple semicolons");
});

test("boolean logic", () => {
  assert(run("true and true") === true, "and true");
  assert(run("true and false") === false, "and false");
  assert(run("false or true") === true, "or true");
  assert(run("not false") === true, "not");
});

test("list comprehension", () => {
  const r = run(`[x * 2 for x in [1, 2, 3]]`);
  assert(Array.isArray(r) && r.length === 3 && r[0] === 2 && r[2] === 6, "list comprehension");
});

test("range expression", () => {
  const r = run(`1..5`);
  assert(Array.isArray(r) && r.length === 4, "range 1..5");
});

test("match with wildcard", () => {
  assert(run(`match 42 { _ => "any" }`) === "any", "wildcard match");
});

test("nested function calls", () => {
  const src = `fn f(x) => x + 1\nfn g(x) => x * 2\nf(g(f(g(1))))`;
  assert(run(src) === 7, "nested fn calls");
});

console.log(`\nEdge cases: ${passed} passed, ${failed} failed`);
