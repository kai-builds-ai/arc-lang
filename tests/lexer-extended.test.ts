// Extended Lexer Unit Tests
import { lex, TokenType } from "../compiler/src/lexer.js";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

function test(name: string, fn: () => void) {
  try { fn(); }
  catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

console.log("Extended Lexer Tests:");

// --- Empty / whitespace ---
test("empty input produces only EOF", () => {
  const t = lex("");
  assert(t.length === 1 && t[0].type === TokenType.EOF, "empty => EOF only");
});

test("whitespace-only input", () => {
  const t = lex("   \t  \r  ");
  assert(t.length === 1 && t[0].type === TokenType.EOF, "whitespace => EOF");
});

test("newline-only input", () => {
  const t = lex("\n\n\n");
  const nonEof = t.filter(tk => tk.type !== TokenType.EOF);
  assert(nonEof.every(tk => tk.type === TokenType.Newline), "all newlines");
  assert(nonEof.length === 3, "3 newlines");
});

// --- Keywords not in existing tests ---
test("keyword ret", () => {
  const t = lex("ret");
  assert(t[0].type === TokenType.Ret, "ret keyword");
});

test("keyword use", () => {
  const t = lex("use");
  assert(t[0].type === TokenType.Use, "use keyword");
});

test("keyword pub", () => {
  const t = lex("pub");
  assert(t[0].type === TokenType.Pub, "pub keyword");
});

test("keyword async", () => {
  const t = lex("async");
  assert(t[0].type === TokenType.Async, "async keyword");
});

test("keyword await", () => {
  const t = lex("await");
  assert(t[0].type === TokenType.Await, "await keyword");
});

test("keyword type", () => {
  const t = lex("type");
  assert(t[0].type === TokenType.Type, "type keyword");
});

test("keyword fetch", () => {
  const t = lex("fetch");
  assert(t[0].type === TokenType.Fetch, "fetch keyword");
});

test("keyword where", () => {
  const t = lex("where");
  assert(t[0].type === TokenType.Where, "where keyword");
});

test("keyword matching", () => {
  const t = lex("matching");
  assert(t[0].type === TokenType.Matching, "matching keyword");
});

// --- Assign operator ---
test("assign operator =", () => {
  const t = lex("x = 5");
  assert(t[1].type === TokenType.Assign, "= is Assign");
});

// --- Semicolon ---
test("semicolon token", () => {
  const t = lex("a; b");
  assert(t[1].type === TokenType.Semicolon, "semicolon");
});

// --- Bar operator ---
test("bar operator |", () => {
  const t = lex("A | B");
  assert(t[1].type === TokenType.Bar, "| is Bar");
});

// --- Escape sequences ---
test("tab escape in string", () => {
  const t = lex('"a\\tb"');
  assert(t[0].value === "a\tb", "tab escape");
});

test("carriage return escape", () => {
  const t = lex('"a\\rb"');
  assert(t[0].value === "a\rb", "\\r escape");
});

test("backslash escape", () => {
  const t = lex('"a\\\\b"');
  assert(t[0].value === "a\\b", "\\\\ escape");
});

test("quote escape", () => {
  const t = lex('"a\\"b"');
  assert(t[0].value === 'a"b', '\\" escape');
});

test("null escape \\0", () => {
  const t = lex('"a\\0b"');
  assert(t[0].value === "a\0b", "\\0 escape");
});

test("brace escape \\{", () => {
  const t = lex('"a\\{b"');
  assert(t[0].value === "a{b", "\\{ escape");
});

test("unknown escape passes through", () => {
  const t = lex('"a\\qb"');
  assert(t[0].value === "aqb", "unknown escape \\q => q");
});

test("hex escape \\x41", () => {
  const t = lex('"\\x41"');
  assert(t[0].value === "A", "\\x41 => A");
});

test("unicode escape \\u0041", () => {
  const t = lex('"\\u0041"');
  assert(t[0].value === "A", "\\u0041 => A");
});

test("unicode brace escape \\u{1F600}", () => {
  const t = lex('"\\u{1F600}"');
  assert(t[0].value === "\u{1F600}", "\\u{1F600} => emoji");
});

// --- Unterminated string ---
test("unterminated string throws", () => {
  let threw = false;
  try { lex('"hello'); } catch { threw = true; }
  assert(threw, "unterminated string throws");
});

test("unterminated string with newline throws", () => {
  let threw = false;
  try { lex('"hello\nworld"'); } catch { threw = true; }
  assert(threw, "string with newline throws");
});

// --- Number edge cases ---
test("leading zeros", () => {
  const t = lex("007");
  assert(t[0].type === TokenType.Int && t[0].value === "007", "leading zeros");
});

test("very large integer", () => {
  const t = lex("99999999999999999999");
  assert(t[0].type === TokenType.Int && t[0].value === "99999999999999999999", "large int");
});

test("float with many decimals", () => {
  const t = lex("3.14159265358979");
  assert(t[0].type === TokenType.Float && t[0].value === "3.14159265358979", "float precision");
});

test("zero float 0.0", () => {
  const t = lex("0.0");
  assert(t[0].type === TokenType.Float && t[0].value === "0.0", "0.0");
});

test("number followed by dot dot is int + range", () => {
  const t = lex("5..10");
  assert(t[0].type === TokenType.Int && t[0].value === "5", "5 before range");
  assert(t[1].type === TokenType.Range, "range");
  assert(t[2].type === TokenType.Int && t[2].value === "10", "10 after range");
});

// --- Identifier edge cases ---
test("single char identifier", () => {
  const t = lex("x");
  assert(t[0].type === TokenType.Ident && t[0].value === "x", "single char ident");
});

test("underscore-only identifier", () => {
  const t = lex("_");
  assert(t[0].type === TokenType.Ident && t[0].value === "_", "_ ident");
});

test("underscore-prefixed identifier", () => {
  const t = lex("_foo");
  assert(t[0].type === TokenType.Ident && t[0].value === "_foo", "_foo ident");
});

test("identifier with numbers", () => {
  const t = lex("abc123def");
  assert(t[0].type === TokenType.Ident && t[0].value === "abc123def", "alphanumeric ident");
});

test("uppercase identifier", () => {
  const t = lex("MyType");
  assert(t[0].type === TokenType.Ident && t[0].value === "MyType", "uppercase ident");
});

test("keyword-like prefix is identifier", () => {
  const t = lex("letx");
  assert(t[0].type === TokenType.Ident && t[0].value === "letx", "letx is ident not keyword");
});

// --- Comment edge cases ---
test("comment at end of file", () => {
  const t = lex("42 # comment");
  const ints = t.filter(tk => tk.type === TokenType.Int);
  assert(ints.length === 1 && ints[0].value === "42", "int before trailing comment");
});

test("empty comment", () => {
  const t = lex("#\n42");
  const ints = t.filter(tk => tk.type === TokenType.Int);
  assert(ints.length === 1 && ints[0].value === "42", "int after empty comment");
});

test("comment-only input", () => {
  const t = lex("# just a comment");
  assert(t.length === 1 && t[0].type === TokenType.EOF, "comment-only => EOF");
});

// --- Line/column tracking ---
test("column tracking on first line", () => {
  const t = lex("ab cd");
  const idents = t.filter(tk => tk.type === TokenType.Ident);
  assert(idents[0].col === 1, "first ident col 1");
  assert(idents[1].col === 4, "second ident col 4");
});

test("line tracking across multiple lines", () => {
  const t = lex("a\nb\nc");
  const idents = t.filter(tk => tk.type === TokenType.Ident);
  assert(idents[0].line === 1, "line 1");
  assert(idents[1].line === 2, "line 2");
  assert(idents[2].line === 3, "line 3");
});

test("column resets after newline", () => {
  const t = lex("abc\nde");
  const idents = t.filter(tk => tk.type === TokenType.Ident);
  assert(idents[1].col === 1, "col resets to 1 after newline");
});

// --- String interpolation edge cases ---
test("string interp with expression", () => {
  const t = lex('"val: {x + 1}"');
  assert(t[0].type === TokenType.StringInterpStart, "interp start");
  const ident = t.find(tk => tk.type === TokenType.Ident);
  assert(ident !== undefined && ident.value === "x + 1", "interp expr captured");
});

test("string with no interpolation", () => {
  const t = lex('"plain string"');
  assert(t[0].type === TokenType.String, "plain string, no interp");
  assert(t[0].value === "plain string", "value matches");
});

test("empty string", () => {
  const t = lex('""');
  assert(t[0].type === TokenType.String && t[0].value === "", "empty string");
});

test("string with escaped brace is not interpolation", () => {
  const t = lex('"hello \\{world}"');
  assert(t[0].type === TokenType.String, "escaped brace not interp");
  assert(t[0].value === "hello {world}", "escaped brace value");
});

// --- Regex literal ---
test("regex after matching keyword", () => {
  const t = lex("matching /abc/");
  assert(t[0].type === TokenType.Matching, "matching kw");
  assert(t[1].type === TokenType.Regex && t[1].value === "abc", "regex token");
});

// --- Power vs star ---
test("** is Power, not two Stars", () => {
  const t = lex("**");
  assert(t[0].type === TokenType.Power, "** is Power");
  assert(t.filter(tk => tk.type === TokenType.Star).length === 0, "no Star tokens");
});

// --- ++ is Concat, not two Plus ---
test("++ is Concat", () => {
  const t = lex("++");
  assert(t[0].type === TokenType.Concat, "++ is Concat");
});

// --- == vs = ---
test("== is Eq, not two Assigns", () => {
  const t = lex("==");
  assert(t[0].type === TokenType.Eq, "== is Eq");
});

// --- != ---
test("!= is Neq", () => {
  const t = lex("!=");
  assert(t[0].type === TokenType.Neq, "!= is Neq");
});

// --- <= vs < ---
test("<= is Lte", () => {
  const t = lex("<=");
  assert(t[0].type === TokenType.Lte, "<= is Lte");
});

// --- >= vs > ---
test(">= is Gte", () => {
  const t = lex(">=");
  assert(t[0].type === TokenType.Gte, ">= is Gte");
});

// --- => ---
test("=> is FatArrow", () => {
  const t = lex("=>");
  assert(t[0].type === TokenType.FatArrow, "=> is FatArrow");
});

// --- -> ---
test("-> is Arrow", () => {
  const t = lex("->");
  assert(t[0].type === TokenType.Arrow, "-> is Arrow");
});

// --- |> vs | ---
test("|> is Pipe, | alone is Bar", () => {
  const t = lex("|> |");
  assert(t[0].type === TokenType.Pipe, "|> is Pipe");
  assert(t[1].type === TokenType.Bar, "| is Bar");
});

// --- .. vs . ---
test(".. is Range, . is Dot", () => {
  const t = lex(".. .");
  assert(t[0].type === TokenType.Range, ".. is Range");
  assert(t[1].type === TokenType.Dot, ". is Dot");
});

// --- Question mark ---
test("? is Question", () => {
  const t = lex("?");
  assert(t[0].type === TokenType.Question, "? is Question");
});

// --- Hash standalone (consumed as comment) ---
test("# starts comment even without space", () => {
  const t = lex("#comment\n42");
  const ints = t.filter(tk => tk.type === TokenType.Int);
  assert(ints.length === 1 && ints[0].value === "42", "# starts comment");
});

// --- Multiple tokens in sequence ---
test("complex expression tokens", () => {
  const t = lex("fn add(a, b) => a + b");
  assert(t[0].type === TokenType.Fn, "fn");
  assert(t[1].type === TokenType.Ident && t[1].value === "add", "add");
  assert(t[2].type === TokenType.LParen, "(");
  assert(t[3].type === TokenType.Ident && t[3].value === "a", "a");
  assert(t[4].type === TokenType.Comma, ",");
  assert(t[5].type === TokenType.Ident && t[5].value === "b", "b");
  assert(t[6].type === TokenType.RParen, ")");
  assert(t[7].type === TokenType.FatArrow, "=>");
  assert(t[8].type === TokenType.Ident && t[8].value === "a", "a2");
  assert(t[9].type === TokenType.Plus, "+");
  assert(t[10].type === TokenType.Ident && t[10].value === "b", "b2");
});

// --- Newline token ---
test("newline produces Newline token", () => {
  const t = lex("a\nb");
  assert(t[1].type === TokenType.Newline, "newline token between a and b");
});

// --- Multiple operators adjacent ---
test("adjacent operators", () => {
  const t = lex("+-");
  assert(t[0].type === TokenType.Plus, "+ first");
  assert(t[1].type === TokenType.Minus, "- second");
});

// --- String with multiple interpolations ---
test("multiple interpolations in one string", () => {
  const t = lex('"a {x} b {y} c"');
  assert(t[0].type === TokenType.StringInterpStart, "interp start");
  const parts = t.filter(tk => tk.type === TokenType.StringInterpPart);
  assert(parts.length >= 2, "multiple string parts");
});

// --- @ token ---
test("@ is At", () => {
  const t = lex("@");
  assert(t[0].type === TokenType.At, "@ is At");
});

// --- Float ending with digit ---
test("float 1.0", () => {
  const t = lex("1.0");
  assert(t[0].type === TokenType.Float && t[0].value === "1.0", "1.0 is float");
});

console.log(`  ${passed} passed, ${failed} failed`);
export { passed, failed };
