// Result Types, Constructor Patterns, Optional Chaining, and Error Propagation Tests
import { lex } from "../../compiler/src/lexer.js";
import { parse } from "../../compiler/src/parser.js";
import { createEnv, interpretWithEnv, toStr } from "../../compiler/src/interpreter.js";

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

function runEnv(src: string): { result: any; env: any } {
  const env = createEnv();
  const result = interpretWithEnv(parse(lex(src)), env);
  return { result, env };
}

function test(name: string, fn: () => void) {
  try { fn(); }
  catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

console.log("Result Types & Related Features Tests:");

// === Feature 1: Ok/Err Result Types ===

test("Ok creates a result with ok: true", () => {
  const r = run("Ok(42)");
  assert(r && r.__map && r.entries.get("ok") === true, "Ok(42).ok should be true");
  assert(r.entries.get("value") === 42, "Ok(42).value should be 42");
});

test("Err creates a result with ok: false", () => {
  const r = run('Err("not found")');
  assert(r && r.__map && r.entries.get("ok") === false, 'Err("not found").ok should be false');
  assert(r.entries.get("error") === "not found", 'Err("not found").error should be "not found"');
});

test("Ok with string value", () => {
  const r = run('Ok("hello")');
  assert(r.entries.get("value") === "hello", "Ok string value");
});

test("Ok with nil value", () => {
  const r = run("Ok(nil)");
  assert(r.entries.get("value") === null, "Ok(nil).value should be null");
});

test("Err with number", () => {
  const r = run("Err(404)");
  assert(r.entries.get("error") === 404, "Err(404).error should be 404");
});

test("Ok with list value", () => {
  const r = run("Ok([1, 2, 3])");
  const val = r.entries.get("value");
  assert(Array.isArray(val) && val.length === 3, "Ok with list");
});

test("is_ok on Ok", () => {
  assert(run("is_ok(Ok(1))") === true, "is_ok(Ok(1)) should be true");
});

test("is_ok on Err", () => {
  assert(run('is_ok(Err("x"))') === false, "is_ok(Err) should be false");
});

test("is_err on Err", () => {
  assert(run('is_err(Err("x"))') === true, "is_err(Err) should be true");
});

test("is_err on Ok", () => {
  assert(run("is_err(Ok(1))") === false, "is_err(Ok) should be false");
});

test("unwrap Ok value", () => {
  assert(run("unwrap(Ok(42))") === 42, "unwrap(Ok(42)) should be 42");
});

test("unwrap Err throws", () => {
  try {
    run('unwrap(Err("bad"))');
    assert(false, "unwrap(Err) should throw");
  } catch (e: any) {
    assert(e.message.includes("unwrap on Err"), "unwrap Err error message");
  }
});

test("unwrap_err on Err", () => {
  assert(run('unwrap_err(Err("bad"))') === "bad", "unwrap_err(Err)");
});

test("unwrap_err on Ok throws", () => {
  try {
    run("unwrap_err(Ok(1))");
    assert(false, "unwrap_err(Ok) should throw");
  } catch (e: any) {
    assert(e.message.includes("unwrap_err on Ok"), "unwrap_err Ok error message");
  }
});

test("Ok result stored in variable", () => {
  const r = run('let r = Ok(10); r');
  assert(r.entries.get("ok") === true && r.entries.get("value") === 10, "stored Ok");
});

test("Err result stored in variable", () => {
  const r = run('let r = Err("fail"); r');
  assert(r.entries.get("ok") === false && r.entries.get("error") === "fail", "stored Err");
});

// === Feature 2: Constructor Patterns in Match ===

test("match Ok(x) pattern", () => {
  const r = run(`
    let result = Ok(42)
    match result {
      Ok(x) => x,
      Err(e) => e,
    }
  `);
  assert(r === 42, "match Ok(x) should bind 42");
});

test("match Err(msg) pattern", () => {
  const r = run(`
    let result = Err("not found")
    match result {
      Ok(x) => x,
      Err(msg) => msg,
    }
  `);
  assert(r === "not found", "match Err(msg) should bind 'not found'");
});

test("match Ok with wildcard", () => {
  const r = run(`
    match Ok(99) {
      Ok(_) => "got ok",
      Err(_) => "got err",
    }
  `);
  assert(r === "got ok", "Ok wildcard match");
});

test("match Err with wildcard", () => {
  const r = run(`
    match Err("x") {
      Ok(_) => "got ok",
      Err(_) => "got err",
    }
  `);
  assert(r === "got err", "Err wildcard match");
});

test("match constructor pattern with literal", () => {
  const r = run(`
    match Ok(1) {
      Ok(1) => "one",
      Ok(x) => "other",
      Err(e) => "err",
    }
  `);
  assert(r === "one", "constructor pattern with literal");
});

test("match constructor no match falls through", () => {
  const r = run(`
    match 42 {
      Ok(x) => "ok",
      Err(e) => "err",
      n => n,
    }
  `);
  assert(r === 42, "non-result falls through constructor patterns");
});

test("match constructor in function", () => {
  const r = run(`
    fn process(result) {
      match result {
        Ok(val) => val * 2,
        Err(msg) => 0,
      }
    }
    process(Ok(21))
  `);
  assert(r === 42, "constructor pattern in function");
});

test("nested Ok value extraction", () => {
  const r = run(`
    let result = Ok(Ok(5))
    match result {
      Ok(inner) => match inner {
        Ok(v) => v,
        Err(_) => -1,
      },
      Err(_) => -2,
    }
  `);
  assert(r === 5, "nested Ok matching");
});

// === Feature 3: Optional Chaining (?.) ===

test("optional chaining on nil returns nil", () => {
  assert(run("let x = nil; x?.name") === null, "nil?.name should be nil");
});

test("optional chaining on map returns value", () => {
  const r = run('let x = {name: "Alice"}; x?.name');
  assert(r === "Alice", "map?.name should return value");
});

test("optional chaining on nested nil", () => {
  assert(run("let x = nil; x?.a?.b") === null, "nil?.a?.b should be nil");
});

test("optional chaining mixed with regular access", () => {
  const r = run('let x = {inner: {val: 42}}; x?.inner.val');
  assert(r === 42, "optional then regular access");
});

test("optional chaining on non-map non-nil throws", () => {
  try {
    run("let x = 5; x?.name");
    assert(false, "should throw on number?.name");
  } catch (e: any) {
    assert(true, "throws on non-map");
  }
});

// === Feature 4: Error Propagation (? operator) ===

test("? operator unwraps Ok", () => {
  const r = run(`
    fn process() {
      let x = Ok(42)?
      x + 1
    }
    process()
  `);
  assert(r === 43, "? unwraps Ok value");
});

test("? operator propagates Err", () => {
  const r = run(`
    fn process() {
      let x = Err("bad")?
      x + 1
    }
    let result = process()
    match result {
      Err(msg) => msg,
      _ => "unexpected",
    }
  `);
  assert(r === "bad", "? propagates Err");
});

test("? operator in chain", () => {
  const r = run(`
    fn get_val() { Ok(10) }
    fn process() {
      let x = get_val()?
      Ok(x * 2)
    }
    unwrap(process())
  `);
  assert(r === 20, "? in chain unwraps and continues");
});

test("? operator early return", () => {
  const r = run(`
    fn step1() { Err("step1 failed") }
    fn step2() { Ok(42) }
    fn pipeline() {
      let a = step1()?
      let b = step2()?
      Ok(a + b)
    }
    is_err(pipeline())
  `);
  assert(r === true, "? causes early return on Err");
});

test("? on non-Result passes through", () => {
  const r = run(`
    fn process() {
      let x = 42?
      x + 1
    }
    process()
  `);
  assert(r === 43, "? on non-Result passes value through");
});

// === Combined features ===

test("Ok/Err with pipeline", () => {
  const r = run(`
    let result = Ok(5)
    match result {
      Ok(v) => v |> str,
      Err(_) => "error",
    }
  `);
  assert(r === "5", "Ok in pipeline");
});

test("Optional chaining on Ok result fields", () => {
  const r = run(`
    let result = Ok(42)
    result?.value
  `);
  assert(r === 42, "optional chaining on result.value");
});

test("Result in list", () => {
  const r = run(`
    let results = [Ok(1), Err("x"), Ok(3)]
    let vals = [match r { Ok(v) => v, Err(_) => 0 } for r in results]
    sum(vals)
  `);
  assert(r === 4, "results in list comprehension");
});

test("match with guard on constructor pattern", () => {
  const r = run(`
    match Ok(10) {
      Ok(x) if x > 5 => "big",
      Ok(x) => "small",
      Err(_) => "err",
    }
  `);
  assert(r === "big", "constructor pattern with guard");
});

test("match with guard on constructor pattern (small)", () => {
  const r = run(`
    match Ok(3) {
      Ok(x) if x > 5 => "big",
      Ok(x) => "small",
      Err(_) => "err",
    }
  `);
  assert(r === "small", "constructor pattern with guard - small case");
});

export { passed, failed };
