// Parser Unit Tests
import { lex } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";
import * as AST from "../compiler/src/ast.js";

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

function p(src: string): AST.Program {
  return parse(lex(src));
}

function expr(src: string): AST.Expr {
  const prog = p(src);
  return (prog.stmts[0] as AST.ExprStmt).expr;
}

function stmt(src: string): AST.Stmt {
  return p(src).stmts[0];
}

console.log("Parser Tests:");

test("integer literal", () => {
  const e = expr("42");
  assert(e.kind === "IntLiteral" && (e as AST.IntLiteral).value === 42, "int 42");
});

test("float literal", () => {
  const e = expr("3.14");
  assert(e.kind === "FloatLiteral", "float");
});

test("string literal", () => {
  const e = expr('"hello"');
  assert(e.kind === "StringLiteral" && (e as AST.StringLiteral).value === "hello", "string hello");
});

test("bool literals", () => {
  assert(expr("true").kind === "BoolLiteral", "true");
  assert(expr("false").kind === "BoolLiteral", "false");
});

test("nil literal", () => {
  assert(expr("nil").kind === "NilLiteral", "nil");
});

test("identifier", () => {
  const e = expr("foo");
  assert(e.kind === "Identifier" && (e as AST.Identifier).name === "foo", "ident foo");
});

test("binary expression", () => {
  const e = expr("1 + 2");
  assert(e.kind === "BinaryExpr", "binary");
  const b = e as AST.BinaryExpr;
  assert(b.op === "+", "op +");
  assert(b.left.kind === "IntLiteral", "left int");
  assert(b.right.kind === "IntLiteral", "right int");
});

test("operator precedence", () => {
  const e = expr("1 + 2 * 3") as AST.BinaryExpr;
  assert(e.op === "+", "top is +");
  assert((e.right as AST.BinaryExpr).op === "*", "right is *");
});

test("unary minus", () => {
  const e = expr("-5");
  assert(e.kind === "UnaryExpr" && (e as AST.UnaryExpr).op === "-", "unary -");
});

test("unary not", () => {
  const e = expr("not true");
  assert(e.kind === "UnaryExpr" && (e as AST.UnaryExpr).op === "not", "unary not");
});

test("call expression", () => {
  const e = expr("foo(1, 2)");
  assert(e.kind === "CallExpr", "call");
  const c = e as AST.CallExpr;
  assert(c.args.length === 2, "2 args");
});

test("member expression", () => {
  const e = expr("a.b");
  assert(e.kind === "MemberExpr", "member");
});

test("index expression", () => {
  const e = expr("a[0]");
  assert(e.kind === "IndexExpr", "index");
});

test("pipeline expression", () => {
  const e = expr("x |> f");
  assert(e.kind === "PipelineExpr", "pipeline");
});

test("range expression", () => {
  const e = expr("1..5");
  assert(e.kind === "RangeExpr", "range");
});

test("list literal", () => {
  const e = expr("[1, 2, 3]");
  assert(e.kind === "ListLiteral", "list");
  assert((e as AST.ListLiteral).elements.length === 3, "3 elements");
});

test("empty list", () => {
  const e = expr("[]");
  assert(e.kind === "ListLiteral" && (e as AST.ListLiteral).elements.length === 0, "empty list");
});

test("map literal", () => {
  const e = expr("{x: 1, y: 2}");
  assert(e.kind === "MapLiteral", "map");
  assert((e as AST.MapLiteral).entries.length === 2, "2 entries");
});

test("list comprehension", () => {
  const e = expr("[x * 2 for x in list]");
  assert(e.kind === "ListComprehension", "comprehension");
});

test("list comprehension with filter", () => {
  const e = expr("[x for x in list if x > 0]");
  assert(e.kind === "ListComprehension", "filtered comprehension");
  assert((e as AST.ListComprehension).filter !== undefined, "has filter");
});

test("if expression", () => {
  const e = expr("if true { 1 } el { 2 }");
  assert(e.kind === "IfExpr", "if");
  const i = e as AST.IfExpr;
  assert(i.else_ !== undefined, "has else");
});

test("if without else", () => {
  const e = expr("if true { 1 }");
  assert(e.kind === "IfExpr", "if no else");
  assert((e as AST.IfExpr).else_ === undefined, "no else");
});

test("match expression", () => {
  const e = expr("match x { 1 => 2, _ => 3 }");
  assert(e.kind === "MatchExpr", "match");
  assert((e as AST.MatchExpr).arms.length === 2, "2 arms");
});

test("lambda single param", () => {
  const e = expr("x => x + 1");
  assert(e.kind === "LambdaExpr", "lambda");
  assert((e as AST.LambdaExpr).params.length === 1, "1 param");
});

test("let statement", () => {
  const s = stmt("let x = 42");
  assert(s.kind === "LetStmt", "let");
  const l = s as AST.LetStmt;
  assert(l.name === "x", "name x");
  assert(!l.mutable, "not mutable");
});

test("let mut statement", () => {
  const s = stmt("let mut x = 0");
  assert(s.kind === "LetStmt" && (s as AST.LetStmt).mutable, "let mut");
});

test("fn statement", () => {
  const s = stmt("fn add(a, b) => a + b");
  assert(s.kind === "FnStmt", "fn");
  const f = s as AST.FnStmt;
  assert(f.name === "add", "name add");
  assert(f.params.length === 2, "2 params");
});

test("fn with block body", () => {
  const s = stmt("fn foo() { 42 }");
  assert(s.kind === "FnStmt", "fn block");
});

test("for statement", () => {
  const s = stmt("for x in [1, 2] { x }");
  assert(s.kind === "ForStmt", "for");
});

test("do while statement", () => {
  const s = stmt("do { 1 } while true");
  assert(s.kind === "DoStmt", "do while");
  assert((s as AST.DoStmt).isWhile, "isWhile");
});

test("do until statement", () => {
  const s = stmt("do { 1 } until true");
  assert(s.kind === "DoStmt", "do until");
  assert(!(s as AST.DoStmt).isWhile, "is until");
});

test("use statement", () => {
  const s = stmt("use std.io");
  assert(s.kind === "UseStmt", "use");
  assert((s as AST.UseStmt).path.join(".") === "std.io", "path");
});

test("type statement", () => {
  const s = stmt("type Age = Int");
  assert(s.kind === "TypeStmt", "type");
});

test("tool call @GET", () => {
  const e = expr('@GET "https://example.com"');
  assert(e.kind === "ToolCallExpr", "tool call");
  assert((e as AST.ToolCallExpr).method === "GET", "method GET");
});

test("tool call @custom()", () => {
  const e = expr("@myTool(42)");
  assert(e.kind === "ToolCallExpr", "custom tool");
  assert((e as AST.ToolCallExpr).method === "myTool", "method myTool");
});

test("array destructuring", () => {
  const s = stmt("let [a, b] = [1, 2]");
  assert(s.kind === "LetStmt", "let destructure");
  const l = s as AST.LetStmt;
  assert(typeof l.name !== "string" && l.name.type === "array", "array destructure");
});

test("object destructuring", () => {
  const s = stmt("let {x, y} = m");
  assert(s.kind === "LetStmt", "let obj destructure");
  const l = s as AST.LetStmt;
  assert(typeof l.name !== "string" && l.name.type === "object", "object destructure");
});

test("string interpolation parse", () => {
  const e = expr('"Hello {name}"');
  assert(e.kind === "StringInterp", "string interp");
});

test("nested function calls", () => {
  const e = expr("f(g(1))");
  assert(e.kind === "CallExpr", "outer call");
  assert((e as AST.CallExpr).args[0].kind === "CallExpr", "inner call");
});

test("chained pipeline", () => {
  const e = expr("x |> f |> g");
  assert(e.kind === "PipelineExpr", "outer pipe");
  assert((e as AST.PipelineExpr).left.kind === "PipelineExpr", "inner pipe");
});

test("concat operator", () => {
  const e = expr("[1] ++ [2]");
  assert(e.kind === "BinaryExpr" && (e as AST.BinaryExpr).op === "++", "concat");
});

test("power operator", () => {
  const e = expr("2 ** 3");
  assert(e.kind === "BinaryExpr" && (e as AST.BinaryExpr).op === "**", "power");
});

test("logical operators", () => {
  const e = expr("a and b or c");
  assert(e.kind === "BinaryExpr", "logical");
});

test("parenthesized expression", () => {
  const e = expr("(1 + 2) * 3") as AST.BinaryExpr;
  assert(e.op === "*", "top is *");
  assert(e.left.kind === "BinaryExpr", "left is grouped +");
});

test("multiple statements", () => {
  const prog = p("let x = 1; let y = 2");
  assert(prog.stmts.length === 2, "2 stmts");
});

console.log(`  ${passed} passed, ${failed} failed`);
export { passed, failed };
