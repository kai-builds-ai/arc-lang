// Extended Codegen Tests — verify generated JS structure and correctness
import { lex } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";
import { generateIR } from "../compiler/src/ir.js";
import { generateJS } from "../compiler/src/codegen-js.js";

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

function compileToJS(source: string): string {
  const tokens = lex(source);
  const ast = parse(tokens);
  const ir = generateIR(ast);
  return generateJS(ir);
}

function evalJS(js: string): any {
  const fn = new Function(js);
  return fn();
}

console.log("Extended Codegen Tests:");

// === Literals ===

test("integer literal", () => {
  const js = compileToJS("let x = 42");
  assert(js.includes("42"), "contains 42");
  evalJS(js);
});

test("float literal", () => {
  const js = compileToJS("let x = 3.14");
  assert(js.includes("3.14"), "contains 3.14");
  evalJS(js);
});

test("boolean true", () => {
  const js = compileToJS("let x = true");
  assert(js.includes("true"), "contains true");
  evalJS(js);
});

test("boolean false", () => {
  const js = compileToJS("let x = false");
  assert(js.includes("false"), "contains false");
  evalJS(js);
});

test("nil literal", () => {
  const js = compileToJS("let x = nil");
  assert(js.includes("null"), "nil maps to null");
  evalJS(js);
});

test("string literal", () => {
  const js = compileToJS('let x = "hello"');
  assert(js.includes("hello"), "contains hello");
  evalJS(js);
});

// === Arithmetic ===

test("subtraction", () => {
  const js = compileToJS("let x = 10 - 3");
  assert(js.includes("-"), "contains minus");
  evalJS(js);
});

test("multiplication", () => {
  const js = compileToJS("let x = 6 * 7");
  assert(js.includes("*"), "contains star");
  evalJS(js);
});

test("division", () => {
  const js = compileToJS("let x = 20 / 4");
  assert(js.includes("/") || js.includes("5"), "contains div or folded");
  evalJS(js);
});

test("modulo", () => {
  const js = compileToJS("let x = 10 % 3");
  assert(js.includes("%") || js.includes("1"), "contains modulo or folded");
  evalJS(js);
});

test("exponentiation", () => {
  const js = compileToJS("let x = 2 ** 8");
  assert(js.includes("**") || js.includes("256"), "contains ** or folded");
  evalJS(js);
});

// === Comparison Operators ===

test("equality ==", () => {
  const js = compileToJS("let x = 1 == 1");
  assert(js.includes("==="), "== maps to ===");
  evalJS(js);
});

test("inequality !=", () => {
  const js = compileToJS("let x = 1 != 2");
  assert(js.includes("!=="), "!= maps to !==");
  evalJS(js);
});

test("less than", () => {
  const js = compileToJS("let x = 1 < 2");
  assert(js.includes("<") || js.includes("true"), "less than");
  evalJS(js);
});

test("greater than", () => {
  const js = compileToJS("let x = 2 > 1");
  assert(js.includes(">") || js.includes("true"), "greater than");
  evalJS(js);
});

test("less than or equal", () => {
  const js = compileToJS("let x = 1 <= 1");
  assert(js.includes("<=") || js.includes("true"), "lte");
  evalJS(js);
});

test("greater than or equal", () => {
  const js = compileToJS("let x = 2 >= 1");
  assert(js.includes(">=") || js.includes("true"), "gte");
  evalJS(js);
});

// === Boolean Operators ===

test("and operator", () => {
  const js = compileToJS("let x = true and true");
  assert(js.includes("&&"), "and maps to &&");
  evalJS(js);
});

test("or operator", () => {
  const js = compileToJS("let x = false or true");
  assert(js.includes("||"), "or maps to ||");
  evalJS(js);
});

test("not operator", () => {
  const js = compileToJS("let x = not false");
  assert(js.includes("!"), "not maps to !");
  evalJS(js);
});

// === String Concat ===

test("string concat with ++", () => {
  const js = compileToJS('let x = "a" ++ "b"');
  assert(js.includes("String"), "++ uses String()");
  evalJS(js);
});

// === Lists ===

test("empty list", () => {
  const js = compileToJS("let x = []");
  assert(js.includes("["), "contains array syntax");
  evalJS(js);
});

test("list with elements", () => {
  const js = compileToJS("let x = [1, 2, 3, 4, 5]");
  assert(js.includes("1") && js.includes("5"), "contains list elements");
  evalJS(js);
});

test("nested list", () => {
  const js = compileToJS("let x = [[1, 2], [3, 4]]");
  assert(js.length > 0, "generates code for nested list");
  evalJS(js);
});

// === Maps ===

test("map literal", () => {
  const js = compileToJS('let m = { name: "arc", version: 1 }');
  assert(js.includes("__make_map"), "uses __make_map");
  evalJS(js);
});

// === Functions ===

test("arrow function", () => {
  const js = compileToJS("fn double(x) => x * 2");
  assert(js.includes("function"), "has function keyword");
  evalJS(js);
});

test("block function", () => {
  const js = compileToJS("fn greet(name) {\n  name\n}");
  assert(js.includes("function"), "has function keyword");
  evalJS(js);
});

test("function call", () => {
  const js = compileToJS("fn add(a, b) => a + b\nlet r = add(3, 4)");
  evalJS(js);
});

test("zero-arg function", () => {
  const js = compileToJS("fn hello() => 42\nlet x = hello()");
  assert(js.includes("hello"), "contains function name");
  evalJS(js);
});

test("function calling function", () => {
  const js = compileToJS("fn inc(x) => x + 1\nfn addTwo(x) => inc(inc(x))\nlet r = addTwo(5)");
  assert(js.includes("inc") && js.includes("addTwo"), "contains both fns");
  evalJS(js);
});

test("recursive function", () => {
  const js = compileToJS("fn fact(n) => if n <= 1 { 1 } el { n * fact(n - 1) }\nlet r = fact(5)");
  assert(js.includes("fact"), "contains recursive fn name");
  evalJS(js);
});

// === Lambda ===

test("lambda expression", () => {
  const js = compileToJS("let f = (x) => x + 1");
  assert(js.includes("function"), "lambda generates function");
  evalJS(js);
});

test("lambda with multiple params", () => {
  const js = compileToJS("let f = (a, b) => a + b");
  assert(js.includes("function"), "multi-param lambda");
  evalJS(js);
});

// === Pipeline ===

test("pipeline generates function call", () => {
  const js = compileToJS("fn double(x) => x * 2\nlet r = 5 |> double");
  assert(js.includes("double"), "pipeline references fn");
  evalJS(js);
});

test("chained pipeline", () => {
  const js = compileToJS("fn inc(x) => x + 1\nfn dbl(x) => x * 2\nlet r = 3 |> inc |> dbl");
  assert(js.includes("inc") && js.includes("dbl"), "chained pipeline has both fns");
  evalJS(js);
});

// === Conditional ===

test("if-else expression", () => {
  const js = compileToJS("let x = if true { 1 } el { 2 }");
  assert(js.includes("if") || js.includes("branch") || js.includes("__pc"), "has conditional");
  evalJS(js);
});

test("nested if-else", () => {
  const js = compileToJS("let x = 5\nlet r = if x > 10 { 1 } el { if x > 0 { 0 } el { -1 } }");
  assert(js.length > 100, "nested if-else generates code");
  evalJS(js);
});

// === Tool Calls ===

test("GET tool call generates fetch", () => {
  const js = compileToJS('@GET "https://api.example.com/data"');
  assert(js.includes("fetch"), "generates fetch");
  assert(js.includes("GET"), "includes method GET");
});

test("POST tool call generates fetch with POST", () => {
  const js = compileToJS('@POST "https://api.example.com/data"');
  assert(js.includes("fetch"), "generates fetch");
  assert(js.includes("POST"), "includes method POST");
});

// === Built-in Function Calls ===

test("len maps to runtime", () => {
  const js = compileToJS("let x = len([1, 2, 3])");
  assert(js.includes("__arc_runtime.len"), "len uses runtime");
  evalJS(js);
});

test("push maps to runtime", () => {
  const js = compileToJS("let mut x = [1]\nlet y = push(x, 2)");
  assert(js.includes("__arc_runtime.push"), "push uses runtime");
  evalJS(js);
});

test("map maps to runtime", () => {
  const js = compileToJS("let f = (x) => x + 1\nlet r = map([1, 2], f)");
  assert(js.includes("__arc_runtime.map"), "map uses runtime");
  evalJS(js);
});

test("filter maps to runtime", () => {
  const js = compileToJS("let f = (x) => x > 1\nlet r = filter([1, 2, 3], f)");
  assert(js.includes("__arc_runtime.filter"), "filter uses runtime");
  evalJS(js);
});

test("sort maps to runtime", () => {
  const js = compileToJS("let r = sort([3, 1, 2])");
  assert(js.includes("__arc_runtime.sort"), "sort uses runtime");
  evalJS(js);
});

test("reverse maps to runtime", () => {
  const js = compileToJS("let r = reverse([1, 2, 3])");
  assert(js.includes("__arc_runtime.reverse"), "reverse uses runtime");
  evalJS(js);
});

test("join maps to runtime", () => {
  const js = compileToJS('let r = join(["a", "b"], ",")');
  assert(js.includes("__arc_runtime.join"), "join uses runtime");
  evalJS(js);
});

test("sum maps to runtime", () => {
  const js = compileToJS("let r = sum([1, 2, 3])");
  assert(js.includes("__arc_runtime.sum"), "sum uses runtime");
  evalJS(js);
});

// === Runtime Structure ===

test("output starts with generated comment", () => {
  const js = compileToJS("let x = 1");
  assert(js.startsWith("// Generated by Arc Compiler"), "starts with comment");
});

test("output includes runtime definition", () => {
  const js = compileToJS("let x = 1");
  assert(js.includes("const __arc_runtime"), "has runtime");
});

test("output wraps main in IIFE", () => {
  const js = compileToJS("let x = 1");
  assert(js.includes("(function()"), "wrapped in IIFE");
});

// === Range ===

test("range generates runtime call", () => {
  const js = compileToJS("let r = 1..10");
  assert(js.includes("__arc_runtime.range"), "range uses runtime");
  evalJS(js);
});

// === Unary Negation ===

test("unary negation", () => {
  const js = compileToJS("let x = -5");
  assert(js.includes("-5") || js.includes("-"), "has negation");
  evalJS(js);
});

// === Complex Programs ===

test("fibonacci compiles and runs", () => {
  const js = compileToJS("fn fib(n) => if n <= 1 { n } el { fib(n - 1) + fib(n - 2) }\nlet r = fib(10)");
  assert(js.includes("fib"), "fib function present");
  evalJS(js);
});

test("list operations pipeline", () => {
  const js = compileToJS("let xs = [1, 2, 3, 4, 5]\nlet r = len(xs)");
  assert(js.includes("__arc_runtime.len"), "uses runtime len");
  evalJS(js);
});

test("multiple variable declarations", () => {
  const js = compileToJS("let a = 1\nlet b = 2\nlet c = 3\nlet d = a + b + c");
  assert(js.includes("var"), "has var declarations");
  evalJS(js);
});

test("function with multiple statements", () => {
  const js = compileToJS("fn calc(x) {\n  let doubled = x * 2\n  let tripled = x * 3\n  doubled + tripled\n}\nlet r = calc(10)");
  assert(js.includes("calc"), "has calc fn");
  evalJS(js);
});

test("for loop compiles", () => {
  const js = compileToJS("for i in [1, 2, 3] {\n  print(i)\n}");
  assert(js.length > 0, "for loop generates code");
});

test("mutable variable reassignment", () => {
  const js = compileToJS("let mut x = 0\nx = 1");
  assert(js.length > 0, "mutable reassign generates code");
  evalJS(js);
});

test("unique maps to runtime", () => {
  const js = compileToJS("let r = unique([1, 1, 2, 3])");
  assert(js.includes("__arc_runtime.unique"), "unique uses runtime");
  evalJS(js);
});

test("slice maps to runtime", () => {
  const js = compileToJS("let r = slice([1, 2, 3, 4], 1, 3)");
  assert(js.includes("__arc_runtime.slice"), "slice uses runtime");
  evalJS(js);
});

test("abs maps to runtime", () => {
  const js = compileToJS("let r = abs(-5)");
  assert(js.includes("__arc_runtime.abs"), "abs uses runtime");
  evalJS(js);
});

test("enumerate maps to runtime", () => {
  const js = compileToJS("let r = enumerate([10, 20])");
  assert(js.includes("__arc_runtime.enumerate"), "enumerate uses runtime");
  evalJS(js);
});

test("zip maps to runtime", () => {
  const js = compileToJS("let r = zip([1, 2], [3, 4])");
  assert(js.includes("__arc_runtime.zip"), "zip uses runtime");
  evalJS(js);
});

console.log(`  ${passed} passed, ${failed} failed`);
export { passed, failed };
