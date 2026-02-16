// Tests for default params, rest params, destructuring in for loops, let destructuring with rest
import { lex } from "../../compiler/src/lexer.js";
import { parse } from "../../compiler/src/parser.js";
import { createEnv, interpretWithEnv, toStr } from "../../compiler/src/interpreter.js";

export let passed = 0;
export let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

function run(src: string): any {
  const env = createEnv();
  return interpretWithEnv(parse(lex(src)), env);
}

function runStr(src: string): string {
  const env = createEnv();
  return toStr(interpretWithEnv(parse(lex(src)), env));
}

function test(name: string, fn: () => void) {
  try { fn(); }
  catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

console.log("Default/Rest Params & Destructuring Tests:");

// === Default Parameters ===
test("default param - used", () => {
  assert(run(`fn greet(name, greeting = "Hello") => greeting; greet("World")`) === "Hello", "default param used");
});

test("default param - overridden", () => {
  assert(run(`fn greet(name, greeting = "Hello") => greeting; greet("World", "Hi")`) === "Hi", "default param overridden");
});

test("default param - numeric", () => {
  assert(run(`fn add(a, b = 10) => a + b; add(5)`) === 15, "default numeric");
});

test("default param - numeric overridden", () => {
  assert(run(`fn add(a, b = 10) => a + b; add(5, 20)`) === 25, "default numeric overridden");
});

test("default param - bool", () => {
  assert(run(`fn f(x, verbose = false) => verbose; f(1)`) === false, "default bool");
});

test("default param - nil", () => {
  assert(run(`fn f(x, y = nil) => y; f(1)`) === null, "default nil");
});

test("default param - expression", () => {
  assert(run(`fn f(x, y = 2 + 3) => y; f(1)`) === 5, "default expression");
});

test("multiple defaults", () => {
  assert(run(`fn f(a = 1, b = 2, c = 3) => a + b + c; f()`) === 6, "multiple defaults all used");
});

test("multiple defaults - partial override", () => {
  assert(run(`fn f(a = 1, b = 2, c = 3) => a + b + c; f(10)`) === 15, "multiple defaults partial");
});

test("multiple defaults - all overridden", () => {
  assert(run(`fn f(a = 1, b = 2, c = 3) => a + b + c; f(10, 20, 30)`) === 60, "multiple defaults all overridden");
});

test("default param with block body", () => {
  assert(run(`
    fn greet(name, greeting = "Hello") {
      greeting ++ ", " ++ name
    }
    greet("Arc")
  `) === "Hello, Arc", "default param block body");
});

// === Rest Parameters ===
test("rest param - basic", () => {
  assert(runStr(`fn f(...args) => args; f(1, 2, 3)`) === "[1, 2, 3]", "rest basic");
});

test("rest param - empty", () => {
  assert(runStr(`fn f(...args) => args; f()`) === "[]", "rest empty");
});

test("rest param - with leading params", () => {
  assert(run(`fn f(first, ...rest) => first; f(1, 2, 3)`) === 1, "rest leading first");
});

test("rest param - rest values with leading", () => {
  assert(runStr(`fn f(first, ...rest) => rest; f(1, 2, 3)`) === "[2, 3]", "rest leading rest values");
});

test("rest param - single extra", () => {
  assert(runStr(`fn f(a, ...rest) => rest; f(1, 2)`) === "[2]", "rest single extra");
});

test("rest param - no extras", () => {
  assert(runStr(`fn f(a, ...rest) => rest; f(1)`) === "[]", "rest no extras");
});

test("rest param with reduce", () => {
  assert(run(`
    fn sum(...nums) {
      reduce(nums, (a, b) => a + b, 0)
    }
    sum(1, 2, 3, 4)
  `) === 10, "rest with reduce");
});

test("rest param with len", () => {
  assert(run(`fn count(...args) => len(args); count(1, 2, 3)`) === 3, "rest with len");
});

// === Default + Rest Combined ===
test("default before rest", () => {
  assert(run(`
    fn f(a, b = 10, ...rest) => a + b + len(rest)
    f(1)
  `) === 11, "default before rest");
});

// === Destructuring in For Loops ===
test("for loop array destructuring", () => {
  assert(run(`
    let mut total = 0
    for [i, v] in enumerate([10, 20, 30]) {
      total = total + v
    }
    total
  `) === 60, "for array destructure");
});

test("for loop array destructuring - index", () => {
  assert(run(`
    let mut sum = 0
    for [i, v] in enumerate([10, 20, 30]) {
      sum = sum + i
    }
    sum
  `) === 3, "for array destructure index");
});

test("for loop array destructuring - pairs", () => {
  assert(run(`
    let pairs = [[1, 2], [3, 4], [5, 6]]
    let mut total = 0
    for [a, b] in pairs {
      total = total + a + b
    }
    total
  `) === 21, "for array destructure pairs");
});

test("for loop object destructuring", () => {
  assert(run(`
    let items = entries({x: 10, y: 20})
    let mut total = 0
    for {key, value} in items {
      total = total + value
    }
    total
  `) === 30, "for object destructure");
});

test("for loop array destructuring zip", () => {
  assert(run(`
    let mut result = 0
    for [a, b] in zip([1, 2, 3], [10, 20, 30]) {
      result = result + a * b
    }
    result
  `) === 140, "for zip destructure");
});

// === Let Destructuring with Rest ===
test("let array destructure with rest", () => {
  assert(runStr(`
    let [first, ...rest] = [1, 2, 3, 4]
    rest
  `) === "[2, 3, 4]", "let rest basic");
});

test("let array destructure with rest - first value", () => {
  assert(run(`
    let [first, ...rest] = [1, 2, 3, 4]
    first
  `) === 1, "let rest first value");
});

test("let array destructure with rest - empty rest", () => {
  assert(runStr(`
    let [only, ...rest] = [42]
    rest
  `) === "[]", "let rest empty");
});

test("let array destructure with rest - multiple named", () => {
  assert(run(`
    let [a, b, ...rest] = [1, 2, 3, 4, 5]
    a + b + len(rest)
  `) === 6, "let rest multiple named");
});

test("let array destructure with rest - rest length", () => {
  assert(run(`
    let [a, b, ...rest] = [1, 2, 3, 4, 5]
    len(rest)
  `) === 3, "let rest length");
});

test("let destructure rest with mutable", () => {
  assert(run(`
    let mut [h, ...t] = [10, 20, 30]
    h = h + 1
    h
  `) === 11, "let mut rest");
});

// More edge cases
test("default param string interp", () => {
  assert(run(`
    fn greet(name, greeting = "Hello") => greeting ++ ", " ++ name ++ "!"
    greet("World")
  `) === "Hello, World!", "default string interp");
});

test("rest param - many args", () => {
  assert(run(`fn f(...a) => len(a); f(1,2,3,4,5,6,7,8,9,10)`) === 10, "rest many args");
});

console.log(`  ${passed} passed, ${failed} failed`);
