// Error Module Tests
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

// Helper: prefix all tests with error module import
const imp = `import "stdlib/error" as err; `;

console.log("Error Module Tests:");

// error() creates structured error
test("error creates struct", () => {
  const r = run(imp + `err.error("NOT_FOUND", "item missing")`);
  assert(r.type === "error", "error type field");
  assert(r.code === "NOT_FOUND", "error code");
  assert(r.message === "item missing", "error message");
});

// error_with() includes details
test("error_with details", () => {
  const r = run(imp + `err.error_with("VALIDATION", "bad input", {field: "email"})`);
  assert(r.code === "VALIDATION", "error_with code");
  assert(r.details.field === "email", "error_with details");
});

// is_error detects errors
test("is_error true", () => {
  assert(run(imp + `err.is_error(err.error("E", "m"))`) === true, "is_error on error");
});

test("is_error false on number", () => {
  assert(run(imp + `err.is_error(42)`) === false, "is_error on number");
});

test("is_error false on string", () => {
  assert(run(imp + `err.is_error("hello")`) === false, "is_error on string");
});

// error_code extraction
test("error_code", () => {
  assert(run(imp + `err.error_code(err.error("CODE1", "msg"))`) === "CODE1", "error_code");
});

// error_message extraction
test("error_message", () => {
  assert(run(imp + `err.error_message(err.error("C", "the message"))`) === "the message", "error_message");
});

// throw creates error with THROW code
test("throw", () => {
  const r = run(imp + `err.throw("something broke")`);
  assert(r.type === "error", "throw type");
  assert(r.code === "THROW", "throw code");
  assert(r.message === "something broke", "throw message");
});

// panic creates error with PANIC prefix
test("panic", () => {
  const r = run(imp + `err.panic("fatal")`);
  assert(r.code === "PANIC", "panic code");
  assert(r.message === "PANIC: fatal", "panic message");
});

// wrap_error adds context
test("wrap_error", () => {
  const r = run(imp + `err.wrap_error(err.error("E", "orig"), "while loading")`);
  assert(r.context === "while loading", "wrap context");
  assert(r.code === "E", "wrap preserves code");
  assert(r.message === "orig", "wrap preserves message");
});

// assert passes on true
test("assert true", () => {
  assert(run(imp + `err.assert(true, "should pass")`) === true, "assert true");
});

// assert returns error on false
test("assert false", () => {
  const r = run(imp + `err.assert(false, "bad")`);
  assert(r.type === "error", "assert false returns error");
  assert(r.message === "bad", "assert false message");
});

// assert_eq passes on equal
test("assert_eq equal", () => {
  assert(run(imp + `err.assert_eq(5, 5, "five")`) === true, "assert_eq equal");
});

// assert_eq error on not equal
test("assert_eq not equal", () => {
  const r = run(imp + `err.assert_eq(3, 5, "mismatch")`);
  assert(r.type === "error", "assert_eq returns error");
});

// try_catch with no error
test("try_catch no error", () => {
  assert(run(imp + `err.try_catch(fn() => 42, fn(e) => 0)`) === 42, "try_catch success");
});

// try_catch with error
test("try_catch with error", () => {
  const r = run(imp + `err.try_catch(fn() => err.throw("oops"), fn(e) => "caught: " ++ err.error_message(e))`);
  assert(r === "caught: oops", "try_catch handles error");
});

// try_finally runs cleanup
test("try_finally success", () => {
  // Just check the result is returned (cleanup side effects hard to test purely)
  assert(run(imp + `err.try_finally(fn() => 99, fn() => nil)`) === 99, "try_finally returns result");
});

// try_catch_finally no error
test("try_catch_finally no error", () => {
  assert(run(imp + `err.try_catch_finally(fn() => 10, fn(e) => 0, fn() => nil)`) === 10, "tcf no error");
});

// try_catch_finally with error
test("try_catch_finally with error", () => {
  const r = run(imp + `err.try_catch_finally(fn() => err.throw("fail"), fn(e) => "handled", fn() => nil)`);
  assert(r === "handled", "tcf with error");
});

// error details default to empty map
test("error default details", () => {
  const r = run(imp + `err.error("X", "y")`);
  assert(typeof r.details === "object", "default details is object");
});

// error context default to nil
test("error default context", () => {
  const r = run(imp + `err.error("X", "y")`);
  assert(r.context === null || r.context === undefined || r.context === nil, "default context nil");
});

// Chained: create, check, extract
test("chain create-check-extract", () => {
  const code = imp + `
    let e = err.error("IO", "disk full")
    if err.is_error(e) { err.error_code(e) } el { "not error" }
  `;
  assert(run(code) === "IO", "chain works");
});

// wrap_error preserves details
test("wrap preserves details", () => {
  const r = run(imp + `err.wrap_error(err.error_with("V", "bad", {x: 1}), "ctx")`);
  assert(r.details.x === 1, "wrap keeps details");
  assert(r.context === "ctx", "wrap sets context");
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
