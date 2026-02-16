// Extended Parser Unit Tests
import { lex, TokenType } from "../compiler/src/lexer.js";
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

console.log("Extended Parser Tests:");

// --- Precedence tests ---
test("multiplication before addition (right)", () => {
  const e = expr("2 * 3 + 4") as AST.BinaryExpr;
  assert(e.op === "+", "top is +");
  assert((e.left as AST.BinaryExpr).op === "*", "left is *");
});

test("division before subtraction", () => {
  const e = expr("10 - 6 / 2") as AST.BinaryExpr;
  assert(e.op === "-", "top is -");
  assert((e.right as AST.BinaryExpr).op === "/", "right is /");
});

test("power right-associative", () => {
  const e = expr("2 ** 3 ** 4") as AST.BinaryExpr;
  assert(e.op === "**", "top is **");
  assert((e.right as AST.BinaryExpr).op === "**", "right is ** (right-assoc)");
});

test("comparison lower than arithmetic", () => {
  const e = expr("a + 1 < b * 2") as AST.BinaryExpr;
  assert(e.op === "<", "top is <");
  assert((e.left as AST.BinaryExpr).op === "+", "left is +");
  assert((e.right as AST.BinaryExpr).op === "*", "right is *");
});

test("and lower than comparison", () => {
  const e = expr("x > 0 and y < 10") as AST.BinaryExpr;
  assert(e.op === "and", "top is and");
  assert((e.left as AST.BinaryExpr).op === ">", "left is >");
  assert((e.right as AST.BinaryExpr).op === "<", "right is <");
});

test("or lower than and", () => {
  const e = expr("a and b or c") as AST.BinaryExpr;
  assert(e.op === "or", "top is or");
  assert((e.left as AST.BinaryExpr).op === "and", "left is and");
});

test("concat precedence between comparison and arithmetic", () => {
  const e = expr("[1] ++ [2] == [1, 2]") as AST.BinaryExpr;
  assert(e.op === "==", "top is ==");
  assert((e.left as AST.BinaryExpr).op === "++", "left is ++");
});

// --- Unary ---
test("unary minus on expression", () => {
  const e = expr("-(a + b)") as AST.UnaryExpr;
  assert(e.op === "-", "unary -");
  assert(e.operand.kind === "BinaryExpr", "operand is binary");
});

test("not with comparison", () => {
  // not binds very tight, so `not x == 5` parses as `(not x) == 5`
  const e = expr("not x == 5") as AST.BinaryExpr;
  assert(e.op === "==", "top is == because not binds tight");
  assert(e.left.kind === "UnaryExpr", "left is not x");
});

test("double unary minus", () => {
  const e = expr("- -5") as AST.UnaryExpr;
  assert(e.op === "-", "outer -");
  assert(e.operand.kind === "UnaryExpr", "inner is also unary");
});

// --- Call expressions ---
test("call with no args", () => {
  const e = expr("foo()") as AST.CallExpr;
  assert(e.kind === "CallExpr" && e.args.length === 0, "no args call");
});

test("call with single arg", () => {
  const e = expr("foo(42)") as AST.CallExpr;
  assert(e.args.length === 1, "1 arg");
});

test("chained calls", () => {
  const e = expr("f(1)(2)") as AST.CallExpr;
  assert(e.kind === "CallExpr", "outer call");
  assert(e.callee.kind === "CallExpr", "inner call");
});

test("method call chain", () => {
  const e = expr("a.b.c") as AST.MemberExpr;
  assert(e.property === "c", "outermost is c");
  assert((e.object as AST.MemberExpr).property === "b", "middle is b");
});

test("method call with args", () => {
  const e = expr("a.b(1, 2)") as AST.CallExpr;
  assert(e.callee.kind === "MemberExpr", "callee is member");
  assert(e.args.length === 2, "2 args");
});

// --- Index expressions ---
test("chained index", () => {
  const e = expr("a[0][1]") as AST.IndexExpr;
  assert(e.kind === "IndexExpr", "outer index");
  assert(e.object.kind === "IndexExpr", "inner index");
});

test("index with expression", () => {
  const e = expr("a[i + 1]") as AST.IndexExpr;
  assert(e.index.kind === "BinaryExpr", "index is binary expr");
});

// --- Pipeline ---
test("pipeline with call", () => {
  const e = expr("x |> f |> g") as AST.PipelineExpr;
  assert(e.right.kind === "Identifier", "right is g");
  assert(e.left.kind === "PipelineExpr", "left is pipeline");
});

// --- Lambda ---
test("lambda with parens no params", () => {
  const e = expr("() => 42") as AST.LambdaExpr;
  assert(e.params.length === 0, "0 params");
  assert(e.body.kind === "IntLiteral", "body is int");
});

test("lambda multi params", () => {
  const e = expr("(a, b) => a + b") as AST.LambdaExpr;
  assert(e.params.length === 2, "2 params");
  assert(e.body.kind === "BinaryExpr", "body is binary");
});

test("lambda with block body not arrow", () => {
  // single param lambda with complex body
  const e = expr("x => x") as AST.LambdaExpr;
  assert(e.params[0] === "x", "param is x");
});

// --- Async/Await ---
test("async block expression", () => {
  const e = expr("async { 42 }");
  assert(e.kind === "AsyncExpr", "async expr");
});

test("await expression", () => {
  const e = expr("await foo()");
  assert(e.kind === "AwaitExpr", "await expr");
  assert((e as AST.AwaitExpr).expr.kind === "CallExpr", "awaiting a call");
});

test("async fn statement", () => {
  const s = stmt("async fn load() { 1 }") as AST.FnStmt;
  assert(s.kind === "FnStmt" && s.isAsync, "async fn");
});

// --- Fetch ---
test("fetch expression", () => {
  const e = expr("fetch [a, b, c]") as AST.FetchExpr;
  assert(e.kind === "FetchExpr", "fetch");
  assert(e.targets.length === 3, "3 targets");
});

// --- Range ---
test("range with variables", () => {
  const e = expr("a..b") as AST.RangeExpr;
  assert(e.start.kind === "Identifier", "start is ident");
  assert(e.end.kind === "Identifier", "end is ident");
});

// --- Tool call ---
test("tool call @POST with body", () => {
  const e = expr('@POST "https://api.com" {data: 1}') as AST.ToolCallExpr;
  assert(e.method === "POST", "POST method");
  assert(e.body !== undefined, "has body");
});

test("tool call @custom with multiple args", () => {
  const e = expr("@myTool(1, 2, 3)") as AST.ToolCallExpr;
  assert(e.method === "myTool", "custom tool name");
});

// --- Let variations ---
test("let with pub", () => {
  const s = stmt("pub let x = 1") as AST.LetStmt;
  assert(s.pub, "pub let");
});

test("let mut with value", () => {
  const s = stmt("let mut count = 0") as AST.LetStmt;
  assert(s.mutable && s.name === "count", "let mut count");
});

// --- Fn variations ---
test("pub fn", () => {
  const s = stmt("pub fn greet() => nil") as AST.FnStmt;
  assert(s.pub && s.name === "greet", "pub fn greet");
});

test("pub async fn", () => {
  const s = stmt("pub async fn load() { 1 }") as AST.FnStmt;
  assert(s.pub && s.isAsync, "pub async fn");
});

test("fn with many params", () => {
  const s = stmt("fn f(a, b, c, d) => a") as AST.FnStmt;
  assert(s.params.length === 4, "4 params");
});

test("fn with no params block body", () => {
  const s = stmt("fn noop() { nil }") as AST.FnStmt;
  assert(s.params.length === 0 && s.body.kind === "BlockExpr", "no params block");
});

// --- If/El ---
test("if-el if-el chain", () => {
  const e = expr("if a { 1 } el if b { 2 } el { 3 }") as AST.IfExpr;
  assert(e.else_ !== undefined && e.else_.kind === "IfExpr", "el if chain");
  const elIf = e.else_ as AST.IfExpr;
  assert(elIf.else_ !== undefined && elIf.else_.kind === "BlockExpr", "final el block");
});

test("if with complex condition", () => {
  const e = expr("if x > 0 and y < 10 { 1 }") as AST.IfExpr;
  assert(e.condition.kind === "BinaryExpr", "complex condition");
});

// --- Match ---
test("match with wildcard", () => {
  const e = expr("match x { _ => 0 }") as AST.MatchExpr;
  assert(e.arms[0].pattern.kind === "WildcardPattern", "wildcard");
});

test("match with literal patterns", () => {
  const e = expr('match x { 1 => "one", 2 => "two", _ => "other" }') as AST.MatchExpr;
  assert(e.arms.length === 3, "3 arms");
  assert(e.arms[0].pattern.kind === "LiteralPattern", "literal pattern");
});

test("match with guard", () => {
  const e = expr("match x { n if n > 0 => n, _ => 0 }") as AST.MatchExpr;
  assert(e.arms[0].guard !== undefined, "has guard");
});

test("match with string patterns", () => {
  const e = expr('match s { "a" => 1, "b" => 2, _ => 0 }') as AST.MatchExpr;
  assert(e.arms[0].pattern.kind === "LiteralPattern", "string literal pattern");
});

test("match with boolean patterns", () => {
  const e = expr("match b { true => 1, false => 0 }") as AST.MatchExpr;
  assert(e.arms.length === 2, "bool patterns");
});

test("match with nil pattern", () => {
  const e = expr("match x { nil => 0, _ => 1 }") as AST.MatchExpr;
  assert(e.arms[0].pattern.kind === "LiteralPattern", "nil pattern");
});

test("match with array pattern", () => {
  const e = expr("match xs { [a, b] => a, _ => 0 }") as AST.MatchExpr;
  assert(e.arms[0].pattern.kind === "ArrayPattern", "array pattern");
});

test("match with or pattern", () => {
  const e = expr("match x { 1 | 2 | 3 => true, _ => false }") as AST.MatchExpr;
  assert(e.arms[0].pattern.kind === "OrPattern", "or pattern");
  assert((e.arms[0].pattern as AST.OrPattern).patterns.length === 3, "3 or variants");
});

test("match with negative number pattern", () => {
  const e = expr("match x { -1 => true, _ => false }") as AST.MatchExpr;
  assert(e.arms[0].pattern.kind === "LiteralPattern", "negative literal");
  assert((e.arms[0].pattern as AST.LiteralPattern).value === -1, "value is -1");
});

// --- For ---
test("for with range iterable", () => {
  const s = stmt("for i in 0..10 { i }") as AST.ForStmt;
  assert(s.iterable.kind === "RangeExpr", "range iterable");
});

// --- Do/While/Until ---
test("do while with block", () => {
  const s = stmt("do { x } while x > 0") as AST.DoStmt;
  assert(s.isWhile, "do while");
  assert(s.condition.kind === "BinaryExpr", "condition is binary");
});

test("do until", () => {
  const s = stmt("do { x } until done") as AST.DoStmt;
  assert(!s.isWhile, "do until");
});

// --- Use ---
test("use with slash separator", () => {
  const s = stmt("use std/io") as AST.UseStmt;
  assert(s.path.join("/") === "std/io", "slash path");
});

test("use with imports", () => {
  const s = stmt("use std.io: read, write") as AST.UseStmt;
  assert(s.imports !== undefined && s.imports.length === 2, "named imports");
});

test("use with wildcard", () => {
  const s = stmt("use std.io: *") as AST.UseStmt;
  assert(s.wildcard === true, "wildcard import");
});

// --- Type ---
test("type alias simple", () => {
  const s = stmt("type Name = String") as AST.TypeStmt;
  assert(s.name === "Name" && s.def.kind === "NamedType", "simple type alias");
});

test("pub type", () => {
  const s = stmt("pub type Id = Int") as AST.TypeStmt;
  assert(s.pub, "pub type");
});

test("type union", () => {
  const s = stmt("type Color = Red | Green | Blue") as AST.TypeStmt;
  assert(s.def.kind === "UnionType", "union type");
  assert((s.def as AST.UnionType).variants.length === 3, "3 variants");
});

test("type record", () => {
  const s = stmt("type Point = {x: Int, y: Int}") as AST.TypeStmt;
  assert(s.def.kind === "RecordType", "record type");
  assert((s.def as AST.RecordType).fields.length === 2, "2 fields");
});

test("type function", () => {
  const s = stmt("type Mapper = (Int) -> String") as AST.TypeStmt;
  assert(s.def.kind === "FunctionType", "function type");
});

test("type generic", () => {
  const s = stmt("type Ids = List<Int>") as AST.TypeStmt;
  assert(s.def.kind === "GenericType", "generic type");
});

// --- Return ---
test("ret with value", () => {
  const s = stmt("ret 42") as AST.RetStmt;
  assert(s.kind === "RetStmt" && s.value !== undefined, "ret with value");
});

test("ret without value", () => {
  // ret at end of block
  const prog = p("fn foo() { ret }");
  const fn = prog.stmts[0] as AST.FnStmt;
  const block = fn.body as AST.BlockExpr;
  const retStmt = block.stmts[0] as AST.RetStmt;
  assert(retStmt.kind === "RetStmt" && retStmt.value === undefined, "ret no value");
});

// --- Assignment ---
test("variable assignment", () => {
  const s = stmt("x = 10") as AST.AssignStmt;
  assert(s.kind === "AssignStmt" && s.target === "x", "assign x");
});

test("member assignment", () => {
  const s = stmt("a.b = 5") as AST.MemberAssignStmt;
  assert(s.kind === "MemberAssignStmt" && s.property === "b", "member assign");
});

test("index assignment", () => {
  const s = stmt("a[0] = 1") as AST.IndexAssignStmt;
  assert(s.kind === "IndexAssignStmt", "index assign");
});

// --- Destructuring ---
test("array destructuring with 3 elements", () => {
  const s = stmt("let [a, b, c] = list") as AST.LetStmt;
  const n = s.name as AST.DestructureTarget;
  assert(n.type === "array" && n.names.length === 3, "3-element array destructure");
});

test("object destructuring with 3 keys", () => {
  const s = stmt("let {a, b, c} = obj") as AST.LetStmt;
  const n = s.name as AST.DestructureTarget;
  assert(n.type === "object" && n.names.length === 3, "3-key object destructure");
});

// --- Map literal ---
test("empty map", () => {
  const e = expr("{}") as AST.MapLiteral;
  assert(e.kind === "MapLiteral" && e.entries.length === 0, "empty map");
});

test("map with complex values", () => {
  const e = expr("{a: 1 + 2, b: f(3)}") as AST.MapLiteral;
  assert(e.entries.length === 2, "2 map entries");
});

// --- List comprehension ---
test("list comprehension with range", () => {
  const e = expr("[i * i for i in 1..10]") as AST.ListComprehension;
  assert(e.kind === "ListComprehension", "comprehension");
  assert(e.iterable.kind === "RangeExpr", "range iterable");
});

// --- Complex nesting ---
test("nested if in if", () => {
  const e = expr("if a { if b { 1 } el { 2 } } el { 3 }") as AST.IfExpr;
  const inner = (e.then as AST.BlockExpr).stmts[0] as AST.ExprStmt;
  assert(inner.expr.kind === "IfExpr", "nested if");
});

test("nested match", () => {
  const e = expr("match x { 1 => match y { 2 => 3, _ => 4 }, _ => 5 }") as AST.MatchExpr;
  assert(e.arms[0].body.kind === "MatchExpr", "nested match");
});

test("fn containing fn", () => {
  const prog = p("fn outer() { fn inner() => 1; inner() }");
  const outer = prog.stmts[0] as AST.FnStmt;
  const block = outer.body as AST.BlockExpr;
  assert(block.stmts[0].kind === "FnStmt", "inner fn");
});

// --- Multiple statements ---
test("semicolon-separated statements", () => {
  const prog = p("let x = 1; let y = 2; x + y");
  assert(prog.stmts.length === 3, "3 statements");
});

test("newline-separated statements", () => {
  const prog = p("let x = 1\nlet y = 2\nx + y");
  assert(prog.stmts.length === 3, "3 statements via newlines");
});

// --- Edge cases ---
test("deeply nested parentheses", () => {
  const e = expr("(((42)))");
  assert(e.kind === "IntLiteral" && (e as AST.IntLiteral).value === 42, "deeply nested parens");
});

test("string interpolation parsed", () => {
  const e = expr('"count: {n}"') as AST.StringInterp;
  assert(e.kind === "StringInterp", "interp parsed");
});

test("list with trailing comma", () => {
  const e = expr("[1, 2, 3,]") as AST.ListLiteral;
  assert(e.elements.length === 3, "trailing comma ok");
});

test("empty program", () => {
  const prog = p("");
  assert(prog.stmts.length === 0, "empty program");
});

test("comparison operators all parse", () => {
  for (const op of ["==", "!=", "<", ">", "<=", ">="]) {
    const e = expr(`1 ${op} 2`) as AST.BinaryExpr;
    assert(e.op === op, `op ${op}`);
  }
});

test("modulo operator", () => {
  const e = expr("10 % 3") as AST.BinaryExpr;
  assert(e.op === "%", "modulo");
});

console.log(`  ${passed} passed, ${failed} failed`);
export { passed, failed };
