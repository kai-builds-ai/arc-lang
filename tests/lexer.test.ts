// Lexer Unit Tests
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

console.log("Lexer Tests:");

test("integers", () => {
  const t = lex("42 0 100");
  assert(t[0].type === TokenType.Int && t[0].value === "42", "42");
  assert(t[1].type === TokenType.Int && t[1].value === "0", "0");
  assert(t[2].type === TokenType.Int && t[2].value === "100", "100");
});

test("floats", () => {
  const t = lex("3.14 0.5");
  assert(t[0].type === TokenType.Float && t[0].value === "3.14", "3.14");
  assert(t[1].type === TokenType.Float && t[1].value === "0.5", "0.5");
});

test("strings", () => {
  const t = lex('"hello" "world"');
  assert(t[0].type === TokenType.String && t[0].value === "hello", "hello");
  assert(t[1].type === TokenType.String && t[1].value === "world", "world");
});

test("escape sequences", () => {
  const t = lex('"a\\nb"');
  assert(t[0].type === TokenType.String && t[0].value === "a\nb", "newline escape");
});

test("string interpolation", () => {
  const t = lex('"Hello {name}"');
  assert(t[0].type === TokenType.StringInterpStart, "interp start");
  assert(t.some(tk => tk.type === TokenType.StringInterpEnd), "interp end");
});

test("booleans", () => {
  const t = lex("true false");
  assert(t[0].type === TokenType.True, "true");
  assert(t[1].type === TokenType.False, "false");
});

test("nil", () => {
  const t = lex("nil");
  assert(t[0].type === TokenType.NilKw, "nil");
});

test("keywords", () => {
  const t = lex("fn let mut if el for in match do while until");
  assert(t[0].type === TokenType.Fn, "fn");
  assert(t[1].type === TokenType.Let, "let");
  assert(t[2].type === TokenType.Mut, "mut");
  assert(t[3].type === TokenType.If, "if");
  assert(t[4].type === TokenType.El, "el");
  assert(t[5].type === TokenType.For, "for");
  assert(t[6].type === TokenType.In, "in");
  assert(t[7].type === TokenType.Match, "match");
  assert(t[8].type === TokenType.Do, "do");
  assert(t[9].type === TokenType.While, "while");
  assert(t[10].type === TokenType.Until, "until");
});

test("identifiers", () => {
  const t = lex("foo bar_baz x1");
  assert(t[0].type === TokenType.Ident && t[0].value === "foo", "foo");
  assert(t[1].type === TokenType.Ident && t[1].value === "bar_baz", "bar_baz");
  assert(t[2].type === TokenType.Ident && t[2].value === "x1", "x1");
});

test("arithmetic operators", () => {
  const t = lex("+ - * / % **");
  assert(t[0].type === TokenType.Plus, "+");
  assert(t[1].type === TokenType.Minus, "-");
  assert(t[2].type === TokenType.Star, "*");
  assert(t[3].type === TokenType.Slash, "/");
  assert(t[4].type === TokenType.Percent, "%");
  assert(t[5].type === TokenType.Power, "**");
});

test("comparison operators", () => {
  const t = lex("== != < > <= >=");
  assert(t[0].type === TokenType.Eq, "==");
  assert(t[1].type === TokenType.Neq, "!=");
  assert(t[2].type === TokenType.Lt, "<");
  assert(t[3].type === TokenType.Gt, ">");
  assert(t[4].type === TokenType.Lte, "<=");
  assert(t[5].type === TokenType.Gte, ">=");
});

test("special operators", () => {
  const t = lex("|> => -> .. ++ @ ?");
  assert(t[0].type === TokenType.Pipe, "|>");
  assert(t[1].type === TokenType.FatArrow, "=>");
  assert(t[2].type === TokenType.Arrow, "->");
  assert(t[3].type === TokenType.Range, "..");
  assert(t[4].type === TokenType.Concat, "++");
  assert(t[5].type === TokenType.At, "@");
  assert(t[6].type === TokenType.Question, "?");
});

test("delimiters", () => {
  const t = lex("( ) { } [ ] , : .");
  assert(t[0].type === TokenType.LParen, "(");
  assert(t[1].type === TokenType.RParen, ")");
  assert(t[2].type === TokenType.LBrace, "{");
  assert(t[3].type === TokenType.RBrace, "}");
  assert(t[4].type === TokenType.LBracket, "[");
  assert(t[5].type === TokenType.RBracket, "]");
  assert(t[6].type === TokenType.Comma, ",");
  assert(t[7].type === TokenType.Colon, ":");
  assert(t[8].type === TokenType.Dot, ".");
});

test("comments are skipped", () => {
  const t = lex("42 # this is a comment\n7");
  assert(t[0].type === TokenType.Int && t[0].value === "42", "before comment");
  // newline token then 7
  const ints = t.filter(tk => tk.type === TokenType.Int);
  assert(ints.length === 2, "two ints");
  assert(ints[1].value === "7", "after comment");
});

test("EOF token", () => {
  const t = lex("");
  assert(t[t.length - 1].type === TokenType.EOF, "EOF");
});

test("line tracking", () => {
  const t = lex("a\nb");
  const idents = t.filter(tk => tk.type === TokenType.Ident);
  assert(idents[0].line === 1, "line 1");
  assert(idents[1].line === 2, "line 2");
});

test("logical operators", () => {
  const t = lex("and or not");
  assert(t[0].type === TokenType.And, "and");
  assert(t[1].type === TokenType.Or, "or");
  assert(t[2].type === TokenType.Not, "not");
});

test("range doesn't eat float", () => {
  const t = lex("1..5");
  assert(t[0].type === TokenType.Int && t[0].value === "1", "1");
  assert(t[1].type === TokenType.Range, "..");
  assert(t[2].type === TokenType.Int && t[2].value === "5", "5");
});

console.log(`  ${passed} passed, ${failed} failed`);
export { passed, failed };
