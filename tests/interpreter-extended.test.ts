// Extended Interpreter Tests — 120+ NEW tests
import { lex } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";
import { createEnv, interpretWithEnv } from "../compiler/src/interpreter.js";

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

function run(src: string): any {
  const env = createEnv();
  const origLog = console.log;
  const logs: any[] = [];
  console.log = (...args: any[]) => logs.push(args.join(" "));
  try {
    return interpretWithEnv(parse(lex(src)), env);
  } finally {
    console.log = origLog;
  }
}

function runWithLogs(src: string): { result: any; logs: string[] } {
  const env = createEnv();
  const origLog = console.log;
  const logs: string[] = [];
  console.log = (...args: any[]) => logs.push(args.join(" "));
  try {
    const result = interpretWithEnv(parse(lex(src)), env);
    return { result, logs };
  } finally {
    console.log = origLog;
  }
}

console.log("Extended Interpreter Tests:");

// === ARITHMETIC ===
test("float addition", () => assert(run("1.5 + 2.5") === 4, "1.5+2.5"));
test("float subtraction", () => assert(run("5.5 - 2.3") === 5.5 - 2.3, "5.5-2.3"));
test("float multiplication", () => assert(run("2.5 * 4.0") === 10, "2.5*4.0"));
test("float division", () => assert(run("7.0 / 2.0") === 3.5, "7.0/2.0"));
test("mixed int/float add", () => assert(run("1 + 0.5") === 1.5, "1+0.5"));
test("negative * negative", () => assert(run("-3 * -4") === 12, "-3*-4"));
test("modulo float", () => assert(run("5.5 % 2") === 5.5 % 2, "5.5%2"));
test("power float", () => assert(run("4 ** 0.5") === 2, "4**0.5"));
test("chained arithmetic", () => assert(run("2 + 3 * 4") === 14, "2+3*4"));
test("division by zero throws", () => {
  try { run("1 / 0"); assert(false, "should throw"); }
  catch { passed++; }
});
test("modulo by zero throws", () => {
  try { run("1 % 0"); assert(false, "should throw"); }
  catch { passed++; }
});
test("double unary minus", () => assert(run("-(-5)") === 5, "-(-5)"));
test("large exponent", () => assert(run("2 ** 10") === 1024, "2**10"));

// === STRING OPERATIONS ===
test("string concat ++", () => assert(run('"foo" ++ "bar"') === "foobar", "str++"));
test("string interp expr", () => assert(run('let x = 3; "val={x + 1}"') === "val=4", "interp expr"));
test("string interp multiple", () => assert(run('let a = 1; let b = 2; "{a}+{b}"') === "1+2", "interp multi"));
test("empty string", () => assert(run('""') === "", "empty str"));
test("string + number coercion", () => assert(run('"n=" ++ str(42)') === "n=42", "str coerce"));
test("len empty string", () => assert(run('len("")') === 0, "len empty"));
test("upper/lower roundtrip", () => assert(run('lower(upper("Hello"))') === "hello", "upper-lower"));
test("replace multiple", () => assert(run('replace("aaa", "a", "b")') === "bbb", "replace all"));
test("split empty", () => {
  const r = run('split("", ",")');
  assert(Array.isArray(r) && r.length === 1, "split empty");
});
test("contains false", () => assert(run('contains("hello", "xyz")') === false, "contains false"));
test("starts false", () => assert(run('starts("hello", "world")') === false, "starts false"));
test("ends false", () => assert(run('ends("hello", "abc")') === false, "ends false"));
test("trim no-op", () => assert(run('trim("hello")') === "hello", "trim noop"));
test("chars fn", () => {
  const r = run('chars("abc")');
  assert(Array.isArray(r) && r.length === 3 && r[0] === "a", "chars");
});
test("repeat fn", () => assert(run('repeat("ab", 3)') === "ababab", "repeat"));

// === BOOLEAN LOGIC ===
test("and short-circuit", () => assert(run("false and 1/0") === false, "and short"));
test("or short-circuit", () => assert(run("true or 1/0") === true, "or short"));
test("not false", () => assert(run("not false") === true, "not false"));
test("not nil", () => assert(run("not nil") === true, "not nil"));
test("not 0", () => assert(run("not 0") === true, "not 0"));
test("not empty string", () => assert(run('not ""') === true, 'not ""'));
test("truthiness 1", () => assert(run("bool(1)") === true, "bool 1"));
test("truthiness string", () => assert(run('bool("x")') === true, "bool str"));
test("falsiness nil", () => assert(run("bool(nil)") === false, "bool nil"));
test("falsiness 0", () => assert(run("bool(0)") === false, "bool 0"));
test("and returns right", () => assert(run("true and 42") === 42, "and right"));
test("or returns left", () => assert(run("42 or 99") === 42, "or left"));

// === COMPARISON ===
test("eq strings", () => assert(run('"a" == "a"') === true, "eq str"));
test("neq strings", () => assert(run('"a" != "b"') === true, "neq str"));
test("lt float", () => assert(run("1.1 < 1.2") === true, "lt float"));
test("gte equal", () => assert(run("5 >= 5") === true, "gte eq"));
test("lte less", () => assert(run("3 <= 4") === true, "lte less"));
test("gt false", () => assert(run("1 > 2") === false, "gt false"));
test("eq nil", () => assert(run("nil == nil") === true, "eq nil"));
test("neq nil", () => assert(run("nil != 0") === true, "neq nil"));
test("eq bool", () => assert(run("true == true") === true, "eq bool"));

// === VARIABLES ===
test("let immutable reassign fails", () => {
  try { run("let x = 1; x = 2"); assert(false, "should throw"); }
  catch { passed++; }
});
test("let mut reassign", () => assert(run("let mut x = 1; x = 2; x") === 2, "mut reassign"));
test("variable scope", () => assert(run("let x = 1; if true { let x = 2; x }") === 2, "scope shadow"));
test("outer scope preserved", () => assert(run("let x = 1; if true { let x = 2 }; x") === 1, "outer scope"));
test("undefined var throws", () => {
  try { run("xyz"); assert(false, "should throw"); }
  catch { passed++; }
});
test("multiple lets", () => assert(run("let a = 1; let b = 2; let c = 3; a + b + c") === 6, "multi let"));
test("let with expression", () => assert(run("let x = 2 + 3; x * 2") === 10, "let expr"));

// === FUNCTIONS ===
test("fn multiple params", () => assert(run("fn f(a, b, c) => a + b + c; f(1, 2, 3)") === 6, "fn 3 params"));
test("fn no params", () => assert(run("fn f() => 42; f()") === 42, "fn no params"));
test("fn returning fn", () => assert(run("fn f() => x => x + 1; f()(10)") === 11, "fn ret fn"));
test("higher-order fn", () => assert(run("fn apply(f, x) => f(x); apply(x => x * 3, 7)") === 21, "higher order"));
test("closure captures mut", () => assert(run("let mut x = 10; fn f() => x; x = 20; f()") === 20, "closure mut"));
test("recursive factorial", () => assert(run("fn fact(n) => if n <= 1 { 1 } el { n * fact(n - 1) }; fact(5)") === 120, "fact 5"));
test("lambda multi param", () => assert(run("let f = (a, b) => a * b; f(3, 4)") === 12, "lambda multi"));
test("fn with block multiple stmts", () => assert(run("fn f() { let x = 1; let y = 2; x + y }; f()") === 3, "fn block stmts"));
test("return statement", () => assert(run("fn f() { ret 42; 99 }; f()") === 42, "ret stmt"));

// === CONTROL FLOW ===
test("nested if", () => assert(run("if true { if false { 1 } el { 2 } }") === 2, "nested if"));
test("if as expression in let", () => assert(run("let x = if true { 10 } el { 20 }; x") === 10, "if expr let"));
test("if with comparison", () => assert(run("let x = 5; if x > 3 { 1 } el { 0 }") === 1, "if cmp"));
test("while loop (do while)", () => assert(run("let mut i = 0; do { i = i + 1 } while i < 5; i") === 5, "do while"));
test("for loop sum", () => assert(run("let mut s = 0; for x in [1,2,3,4,5] { s = s + x }; s") === 15, "for sum"));
test("for with range", () => assert(run("let mut s = 0; for x in 1..4 { s = s + x }; s") === 6, "for range"));
test("nested for", () => assert(run("let mut s = 0; for x in [1,2] { for y in [10,20] { s = s + x * y } }; s") === 90, "nested for"));

// === PATTERN MATCHING ===
test("match first arm", () => assert(run("match 1 { 1 => 10, 2 => 20 }") === 10, "match first"));
test("match no match returns nil", () => assert(run("match 5 { 1 => 10, 2 => 20 }") === null, "match none"));
test("match string", () => assert(run('match "a" { "a" => 1, "b" => 2 }') === 1, "match str"));
test("match bool", () => assert(run("match true { true => 1, false => 0 }") === 1, "match bool"));
test("match nil", () => assert(run("match nil { nil => 1, _ => 0 }") === 1, "match nil"));
test("match binding transform", () => assert(run("match 10 { x => x * x }") === 100, "match bind"));
test("match array pattern", () => assert(run("match [1, 2] { [a, b] => a + b, _ => 0 }") === 3, "match arr"));
test("match as expression", () => assert(run("let r = match 3 { 1 => 10, 3 => 30, _ => 0 }; r") === 30, "match expr"));
test("match or pattern", () => assert(run("match 2 { 1 | 2 => 10, _ => 0 }") === 10, "match or"));

// === LISTS ===
test("list nested", () => {
  const r = run("[[1, 2], [3, 4]]");
  assert(Array.isArray(r) && Array.isArray(r[0]) && r[0][0] === 1, "nested list");
});
test("list index 0", () => assert(run("[10, 20, 30][0]") === 10, "idx 0"));
test("list index last", () => assert(run("[10, 20, 30][2]") === 30, "idx last"));
test("list out of bounds", () => assert(run("[1, 2][5]") === null, "idx oob"));
test("list comprehension transform", () => {
  const r = run("[x + 1 for x in [10, 20, 30]]");
  assert(Array.isArray(r) && r[0] === 11 && r[1] === 21, "comp transform");
});
test("list concat preserves", () => {
  const r = run("[1] ++ [2] ++ [3]");
  assert(Array.isArray(r) && r.length === 3, "list concat chain");
});
test("push returns new list", () => {
  const r = run("let a = [1]; let b = push(a, 2); len(a)");
  assert(r === 1, "push immutable");
});

// === MAPS ===
test("map multiple keys", () => {
  const r = run("{a: 1, b: 2, c: 3}");
  assert(r.__map && r.entries.get("c") === 3, "map multi");
});
test("map bracket access", () => assert(run('let m = {x: 42}; m["x"]') === 42, "map bracket"));
test("map nested", () => assert(run("let m = {a: {b: 10}}; m.a.b") === 10, "map nested"));
test("map missing key", () => assert(run("let m = {a: 1}; m.b") === null, "map missing"));
test("map member assign", () => assert(run("let m = {a: 1}; m.a = 99; m.a") === 99, "map assign"));
test("empty map", () => {
  const r = run("{}");
  assert(r.__map && r.entries.size === 0, "empty map");
});
test("keys/values", () => {
  const r = run("keys({x: 1, y: 2})");
  assert(Array.isArray(r) && r.length === 2, "keys len");
});

// === PIPELINES ===
test("pipeline chain", () => {
  const r = run("[3, 1, 2] |> sort |> reverse");
  assert(Array.isArray(r) && r[0] === 3, "pipe chain");
});
test("pipeline with map", () => {
  const r = run("[1, 2, 3] |> map(x => x + 10)");
  assert(r[0] === 11 && r[2] === 13, "pipe map");
});
test("pipeline with filter", () => {
  const r = run("[1, 2, 3, 4] |> filter(x => x > 2)");
  assert(r.length === 2 && r[0] === 3, "pipe filter");
});
test("pipeline to len", () => assert(run("[1, 2, 3] |> len") === 3, "pipe len"));
test("pipeline to sum", () => assert(run("[1, 2, 3] |> sum") === 6, "pipe sum"));

// === DESTRUCTURING ===
test("array destruct b", () => assert(run("let [a, b] = [10, 20]; b") === 20, "destruct b"));
test("object destruct", () => assert(run("let {a, b} = {a: 1, b: 2}; a + b") === 3, "obj destruct"));
test("destruct extra ignored", () => assert(run("let [x, y] = [1, 2, 3]; y") === 2, "destruct extra"));
test("destruct missing is nil", () => assert(run("let [x, y, z] = [1, 2]; z") === null, "destruct missing"));

// === RANGES ===
test("range 0..3", () => {
  const r = run("0..3");
  assert(Array.isArray(r) && r.length === 3 && r[0] === 0 && r[2] === 2, "range 0..3");
});
test("range same start end", () => {
  const r = run("5..5");
  assert(Array.isArray(r) && r.length === 0, "range empty");
});
test("range in comprehension", () => {
  const r = run("[x * x for x in 1..5]");
  assert(r.length === 4 && r[0] === 1 && r[3] === 16, "range comp");
});

// === TOOL CALLS ===
test("tool call POST with body", () => {
  const r = run('@POST "https://api.com" {data: 1}');
  assert(r.__map && r.entries.get("method") === "POST", "POST");
});
test("tool call PUT", () => {
  const r = run('@PUT "https://api.com"');
  assert(r.__map && r.entries.get("method") === "PUT", "PUT");
});
test("tool call DELETE", () => {
  const r = run('@DELETE "https://api.com"');
  assert(r.__map && r.entries.get("method") === "DELETE", "DELETE");
});

// === ASYNC/AWAIT ===
test("async block", () => {
  const r = run("let a = async { 42 }; await a");
  assert(r === 42, "async await");
});
test("async nested", () => {
  const r = run("let a = async { 1 + 2 }; await a");
  assert(r === 3, "async nested");
});

// === BUILT-IN FUNCTIONS (more) ===
test("fold", () => assert(run("fold([1, 2, 3], 0, (a, b) => a + b)") === 6, "fold"));
test("flat nested", () => {
  const r = run("flat([[1, 2], [3], [4, 5]])");
  assert(r.length === 5, "flat nested");
});
test("zip unequal", () => {
  const r = run("zip([1, 2, 3], [10, 20])");
  assert(r.length === 2, "zip unequal truncates to shorter");
});
test("enumerate indices", () => {
  const r = run('enumerate(["a", "b", "c"])');
  assert(r[2][0] === 2 && r[2][1] === "c", "enum idx");
});
test("find none", () => assert(run("find([1, 2, 3], x => x > 10)") === null, "find none"));
test("any false", () => assert(run("any([1, 2, 3], x => x > 10)") === false, "any false"));
test("all false", () => assert(run("all([1, 2, 3], x => x > 2)") === false, "all false"));
test("head empty", () => assert(run("head([])") === null, "head empty"));
test("last empty", () => assert(run("last([])") === null, "last empty"));
test("tail empty", () => {
  const r = run("tail([])");
  assert(Array.isArray(r) && r.length === 0, "tail empty");
});
test("range fn", () => {
  const r = run("range(0, 5)");
  assert(Array.isArray(r) && r.length === 5, "range fn");
});
test("slice list", () => {
  const r = run("slice([1, 2, 3, 4], 1, 3)");
  assert(Array.isArray(r) && r.length === 2 && r[0] === 2, "slice list");
});
test("slice string", () => assert(run('slice("hello", 1, 3)') === "el", "slice str"));
test("concat fn lists", () => {
  const r = run("concat([1], [2, 3])");
  assert(Array.isArray(r) && r.length === 3, "concat fn");
});
test("concat fn strings", () => assert(run('concat("a", "b")') === "ab", "concat fn str"));
test("type_of string", () => assert(run('type_of("x")') === "string", "typeof str"));
test("type_of list", () => assert(run("type_of([])") === "list", "typeof list"));
test("type_of map", () => assert(run("type_of({})") === "map", "typeof map"));
test("type_of bool", () => assert(run("type_of(true)") === "bool", "typeof bool"));
test("type_of nil", () => assert(run("type_of(nil)") === "nil", "typeof nil"));
test("type_of float", () => assert(run("type_of(3.14)") === "float", "typeof float"));
test("type_of fn", () => assert(run("type_of(x => x)") === "fn", "typeof fn"));
test("int from float", () => assert(run("int(3.9)") === 3, "int floor"));
test("float from int", () => assert(run("float(3)") === 3.0, "float from int"));
test("str from nil", () => assert(run("str(nil)") === "nil", "str nil"));
test("str from list", () => assert(run("str([1, 2])") === "[1, 2]", "str list"));
test("abs positive", () => assert(run("abs(5)") === 5, "abs pos"));
test("min list", () => assert(run("min([3, 1, 2])") === 1, "min list"));
test("max list", () => assert(run("max([3, 1, 2])") === 3, "max list"));
test("round down", () => assert(run("round(3.3)") === 3, "round down"));
test("sum empty", () => assert(run("sum([])") === 0, "sum empty"));
test("sort strings", () => {
  const r = run('sort(["c", "a", "b"])');
  assert(r[0] === "a" && r[2] === "c", "sort str");
});

// === PRINT ===
test("print returns nil", () => {
  const { result, logs } = runWithLogs('print("hello")');
  assert(result === null && logs[0] === "hello", "print");
});
test("print multiple args", () => {
  const { logs } = runWithLogs('print("a", "b", "c")');
  assert(logs[0] === "a b c", "print multi");
});

// === INDEX ASSIGNMENT ===
test("list index assign", () => assert(run("let a = [1, 2, 3]; a[0] = 99; a[0]") === 99, "idx assign"));
test("map index assign", () => assert(run('let m = {a: 1}; m["b"] = 2; m["b"]') === 2, "map idx assign"));

// === MEMBER ACCESS ON NIL ===
test("member on nil returns nil", () => assert(run("let m = nil; m.x") === null, "nil member"));

// === USE STMT ===
test("use stmt no-op", () => {
  const r = run("use math");
  assert(r === null, "use noop");
});

// === TYPE STMT ===
test("type stmt no-op", () => {
  const r = run("type Point = {x: Int, y: Int}; 42");
  assert(r === 42, "type stmt");
});

// === COMPLEX PROGRAMS ===
test("fibonacci via match", () => {
  assert(run(`
    fn fib(n) => match n {
      0 => 0,
      1 => 1,
      n => fib(n - 1) + fib(n - 2)
    }
    fib(8)
  `) === 21, "fib match");
});

test("map then reduce", () => {
  assert(run(`
    let nums = [1, 2, 3, 4, 5]
    let doubled = map(nums, x => x * 2)
    reduce(doubled, (a, b) => a + b, 0)
  `) === 30, "map reduce");
});

test("pipeline complex", () => {
  assert(run(`
    [1, 2, 3, 4, 5]
    |> filter(x => x > 2)
    |> map(x => x * 10)
    |> sum
  `) === 120, "pipe complex");
});

console.log(`  ${passed} passed, ${failed} failed`);
export { passed, failed };
