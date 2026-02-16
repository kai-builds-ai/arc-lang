// Interpreter Unit Tests
import { lex } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";
import { createEnv, interpretWithEnv, toStr } from "../compiler/src/interpreter.js";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

function run(src: string): any {
  const env = createEnv();
  return interpretWithEnv(parse(lex(src)), env);
}

function test(name: string, fn: () => void) {
  try { fn(); }
  catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

console.log("Interpreter Tests:");

// Literals
test("integer", () => assert(run("42") === 42, "int 42"));
test("float", () => assert(run("3.14") === 3.14, "float 3.14"));
test("string", () => assert(run('"hello"') === "hello", "string"));
test("bool true", () => assert(run("true") === true, "true"));
test("bool false", () => assert(run("false") === false, "false"));
test("nil", () => assert(run("nil") === null, "nil"));

// Arithmetic
test("add", () => assert(run("3 + 4") === 7, "3+4"));
test("sub", () => assert(run("10 - 3") === 7, "10-3"));
test("mul", () => assert(run("4 * 5") === 20, "4*5"));
test("div", () => assert(run("10 / 4") === 2.5, "10/4"));
test("mod", () => assert(run("10 % 3") === 1, "10%3"));
test("power", () => assert(run("2 ** 3") === 8, "2**3"));
test("unary minus", () => assert(run("-5") === -5, "-5"));

// Comparison
test("eq true", () => assert(run("1 == 1") === true, "1==1"));
test("eq false", () => assert(run("1 == 2") === false, "1==2"));
test("neq", () => assert(run("1 != 2") === true, "1!=2"));
test("lt", () => assert(run("1 < 2") === true, "1<2"));
test("gt", () => assert(run("2 > 1") === true, "2>1"));
test("lte", () => assert(run("1 <= 1") === true, "1<=1"));
test("gte", () => assert(run("2 >= 1") === true, "2>=1"));

// Logical
test("and", () => assert(run("true and false") === false, "and"));
test("or", () => assert(run("false or true") === true, "or"));
test("not", () => assert(run("not true") === false, "not"));

// Variables
test("let", () => assert(run("let x = 42; x") === 42, "let"));
test("let mut", () => assert(run("let mut x = 0; x") === 0, "let mut"));

// Functions
test("fn def and call", () => assert(run("fn add(a, b) => a + b; add(3, 4)") === 7, "fn call"));
test("fn with block", () => assert(run("fn f() { 42 }; f()") === 42, "fn block"));
test("recursion", () => assert(run("fn fib(n) => if n <= 1 { n } el { fib(n - 1) + fib(n - 2) }; fib(10)") === 55, "fib(10)"));
test("closure", () => assert(run("fn make() { let x = 10; fn inner() => x; inner }; make()()") === 10, "closure"));

// Lambda
test("lambda", () => assert(run("let f = x => x * 2; f(5)") === 10, "lambda"));

// Lists
test("list literal", () => {
  const r = run("[1, 2, 3]");
  assert(Array.isArray(r) && r.length === 3 && r[0] === 1, "list");
});
test("empty list", () => {
  const r = run("[]");
  assert(Array.isArray(r) && r.length === 0, "empty list");
});
test("index", () => assert(run("let a = [10, 20, 30]; a[1]") === 20, "index"));

// Maps
test("map literal", () => {
  const r = run("{x: 1, y: 2}");
  assert(r && r.__map && r.entries.get("x") === 1, "map");
});
test("member access", () => assert(run("let m = {a: 42}; m.a") === 42, "member"));

// If expression
test("if true", () => assert(run("if true { 1 } el { 2 }") === 1, "if true"));
test("if false", () => assert(run("if false { 1 } el { 2 }") === 2, "if false"));
test("if no else", () => assert(run("if false { 1 }") === null, "if no else"));

// Match
test("match literal", () => assert(run("match 2 { 1 => 10, 2 => 20, _ => 0 }") === 20, "match"));
test("match wildcard", () => assert(run('match 99 { 1 => "a", _ => "b" }') === "b", "wildcard"));
test("match binding", () => assert(run("match 42 { x => x + 1 }") === 43, "binding"));

// Pipeline
test("pipeline ident", () => assert(run("let f = x => x * 2; 5 |> f") === 10, "pipe ident"));
test("pipeline call", () => {
  const r = run("[1, 2, 3] |> map(x => x * 2)");
  assert(Array.isArray(r) && r[0] === 2 && r[1] === 4, "pipe call");
});

// Range
test("range", () => {
  const r = run("1..4");
  assert(Array.isArray(r) && r.length === 3 && r[0] === 1 && r[2] === 3, "range");
});

// List comprehension
test("comprehension", () => {
  const r = run("[x * x for x in [1, 2, 3]]");
  assert(Array.isArray(r) && r[0] === 1 && r[1] === 4 && r[2] === 9, "comprehension");
});
test("comprehension filter", () => {
  const r = run("[x for x in [1, 2, 3, 4] if x > 2]");
  assert(Array.isArray(r) && r.length === 2, "filtered");
});

// String interpolation
test("string interp", () => {
  assert(run('let name = "Arc"; "Hello {name}"') === "Hello Arc", "interp");
});

// Concat
test("list concat", () => {
  const r = run("[1, 2] ++ [3, 4]");
  assert(Array.isArray(r) && r.length === 4, "list concat");
});
test("string concat", () => {
  assert(run('"a" ++ "b"') === "ab", "string concat");
});

// For loop
test("for loop", () => {
  // Last iteration result
  const r = run("for x in [1, 2, 3] { x }");
  assert(r === 3, "for loop returns last");
});

// Destructuring
test("array destructure", () => {
  assert(run("let [a, b] = [10, 20]; a") === 10, "array destruct a");
});

// Prelude functions
test("len string", () => assert(run('len("abc")') === 3, "len string"));
test("len list", () => assert(run("len([1, 2])") === 2, "len list"));
test("head", () => assert(run("head([1, 2, 3])") === 1, "head"));
test("tail", () => {
  const r = run("tail([1, 2, 3])");
  assert(Array.isArray(r) && r.length === 2 && r[0] === 2, "tail");
});
test("last", () => assert(run("last([1, 2, 3])") === 3, "last"));
test("reverse", () => {
  const r = run("reverse([1, 2, 3])");
  assert(Array.isArray(r) && r[0] === 3, "reverse");
});
test("sum", () => assert(run("sum([1, 2, 3])") === 6, "sum"));
test("sort", () => {
  const r = run("sort([3, 1, 2])");
  assert(Array.isArray(r) && r[0] === 1, "sort");
});
test("filter", () => {
  const r = run("filter([1, 2, 3, 4], x => x > 2)");
  assert(Array.isArray(r) && r.length === 2, "filter");
});
test("map fn", () => {
  const r = run("map([1, 2, 3], x => x * 10)");
  assert(Array.isArray(r) && r[0] === 10, "map fn");
});
test("reduce", () => assert(run("reduce([1, 2, 3], (a, b) => a + b, 0)") === 6, "reduce"));
test("find", () => assert(run("find([1, 2, 3], x => x > 1)") === 2, "find"));
test("any", () => assert(run("any([1, 2, 3], x => x > 2)") === true, "any"));
test("all", () => assert(run("all([1, 2, 3], x => x > 0)") === true, "all"));
test("take", () => {
  const r = run("take([1, 2, 3], 2)");
  assert(Array.isArray(r) && r.length === 2, "take");
});
test("drop", () => {
  const r = run("drop([1, 2, 3], 1)");
  assert(Array.isArray(r) && r.length === 2, "drop");
});
test("flat", () => {
  const r = run("flat([[1], [2, 3]])");
  assert(Array.isArray(r) && r.length === 3, "flat");
});
test("zip", () => {
  const r = run('zip([1, 2], ["a", "b"])');
  assert(Array.isArray(r) && r.length === 2, "zip");
});
test("enumerate", () => {
  const r = run('enumerate(["a", "b"])');
  assert(Array.isArray(r) && Array.isArray(r[0]) && r[0][0] === 0, "enumerate");
});
test("upper", () => assert(run('upper("hello")') === "HELLO", "upper"));
test("lower", () => assert(run('lower("HELLO")') === "hello", "lower"));
test("trim", () => assert(run('trim("  hi  ")') === "hi", "trim"));
test("split", () => {
  const r = run('split("a,b,c", ",")');
  assert(Array.isArray(r) && r.length === 3, "split");
});
test("join", () => assert(run('join(["a", "b"], "-")') === "a-b", "join"));
test("contains string", () => assert(run('contains("hello", "ell")') === true, "contains"));
test("starts", () => assert(run('starts("hello", "hel")') === true, "starts"));
test("ends", () => assert(run('ends("hello", "llo")') === true, "ends"));
test("replace", () => assert(run('replace("hello", "l", "r")') === "herro", "replace"));
test("int convert", () => assert(run('int("42")') === 42, "int"));
test("float convert", () => assert(run('float("3.14")') === 3.14, "float"));
test("str convert", () => assert(run("str(42)") === "42", "str"));
test("bool convert", () => assert(run("bool(1)") === true, "bool"));
test("abs", () => assert(run("abs(-5)") === 5, "abs"));
test("min", () => assert(run("min(3, 1, 2)") === 1, "min"));
test("max", () => assert(run("max(3, 1, 2)") === 3, "max"));
test("round", () => assert(run("round(3.7)") === 4, "round"));
test("assert pass", () => { run('assert(true, "ok")'); passed++; });
test("assert fail", () => {
  try { run('assert(false, "should fail")'); failed++; }
  catch { passed++; }
});
test("type_of", () => assert(run("type_of(42)") === "int", "type_of int"));
test("keys", () => {
  const r = run("keys({a: 1, b: 2})");
  assert(Array.isArray(r) && r.length === 2, "keys");
});
test("values", () => {
  const r = run("values({a: 1, b: 2})");
  assert(Array.isArray(r) && r.length === 2, "values");
});
test("push", () => {
  const r = run("push([1, 2], 3)");
  assert(Array.isArray(r) && r.length === 3 && r[2] === 3, "push");
});

// Tool calls
test("tool call GET", () => {
  const r = run('@GET "https://example.com"');
  assert(r && r.__map && r.entries.get("status") === 200, "GET mock");
});

console.log(`  ${passed} passed, ${failed} failed`);
export { passed, failed };
