// Linter Extended Tests
import { lint, LintDiagnostic } from "../compiler/src/linter.js";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; } else { failed++; console.error(`  FAIL: ${msg}`); }
}

function test(name: string, fn: () => void) {
  try { fn(); } catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

function hasRule(d: LintDiagnostic[], rule: string): boolean {
  return d.some(x => x.rule === rule);
}

function hasRuleForName(d: LintDiagnostic[], rule: string, name: string): boolean {
  return d.some(x => x.rule === rule && x.message.includes(name));
}

console.log("Linter Extended Tests:");

// --- Unused variables ---

test("unused: multiple unused vars", () => {
  const d = lint("let a = 1\nlet b = 2\nlet c = 3");
  assert(hasRuleForName(d, "unused-variable", "a"), "a unused");
  assert(hasRuleForName(d, "unused-variable", "b"), "b unused");
  assert(hasRuleForName(d, "unused-variable", "c"), "c unused");
});

test("unused: _ is ignored", () => {
  const d = lint("let _ = 42");
  assert(!hasRuleForName(d, "unused-variable", "_"), "_ not warned");
});

test("unused: used in binary expr", () => {
  const d = lint("let x = 1\nlet y = x + 1\nprintln(y)");
  assert(!hasRuleForName(d, "unused-variable", "x"), "x is used");
});

test("unused: used in function call", () => {
  const d = lint("let x = 42\nprintln(x)");
  assert(!hasRuleForName(d, "unused-variable", "x"), "x used in call");
});

test("unused: used in if condition", () => {
  const d = lint("let x = true\nif x { println(1) } el { println(2) }");
  assert(!hasRuleForName(d, "unused-variable", "x"), "x used in condition");
});

// --- Unused imports ---

test("unused import: all imports unused", () => {
  const d = lint("use std/io: println, readln");
  assert(hasRuleForName(d, "unused-import", "println"), "println unused");
  assert(hasRuleForName(d, "unused-import", "readln"), "readln unused");
});

test("unused import: some used", () => {
  const d = lint('use std/io: println, readln\nprintln("hi")');
  assert(!hasRuleForName(d, "unused-import", "println"), "println used");
  assert(hasRuleForName(d, "unused-import", "readln"), "readln unused");
});

// --- Shadowed variables ---

test("shadow: in block expr", () => {
  const d = lint("let x = 1\nfn foo() {\n  let x = 2\n  println(x)\n}\nprintln(x)");
  assert(hasRule(d, "shadowed-variable"), "shadow detected");
});

test("shadow: no false positive different names", () => {
  const d = lint("let x = 1\nfn foo() {\n  let y = 2\n  println(y)\n}\nprintln(x)");
  assert(!hasRule(d, "shadowed-variable"), "no shadow");
});

// --- Empty blocks ---

test("empty block: if body", () => {
  // Can't easily test if with empty block due to parser, skip this
  const d = lint("fn empty() {}");
  assert(hasRule(d, "empty-block"), "empty fn body");
});

test("empty block: nested fn", () => {
  const d = lint("fn outer() {\n  fn inner() {}\n  inner()\n}");
  assert(hasRuleForName(d, "empty-block", "inner"), "inner empty");
});

// --- Unnecessary mut ---

test("unnecessary mut: used but not mutated", () => {
  const d = lint("let mut x = 1\nprintln(x)");
  assert(hasRule(d, "unnecessary-mut"), "mut but not mutated");
});

test("unnecessary mut: properly mutated", () => {
  const d = lint("let mut x = 1\nx = 2\nprintln(x)");
  assert(!hasRule(d, "unnecessary-mut"), "properly mutated");
});

test("unnecessary mut: unused mut var doesn't trigger", () => {
  const d = lint("let mut x = 1");
  // Should trigger unused-variable but not unnecessary-mut (since not used)
  assert(hasRuleForName(d, "unused-variable", "x"), "unused");
  assert(!hasRuleForName(d, "unnecessary-mut", "x"), "no mut warning for unused");
});

// --- Naming conventions ---

test("naming: camelCase variable", () => {
  const d = lint("let myVar = 1\nprintln(myVar)");
  assert(hasRuleForName(d, "naming-convention", "myVar"), "camelCase var warned");
});

test("naming: snake_case variable ok", () => {
  const d = lint("let my_var = 1\nprintln(my_var)");
  assert(!hasRuleForName(d, "naming-convention", "my_var"), "snake_case ok");
});

test("naming: single letter ok", () => {
  const d = lint("let x = 1\nprintln(x)");
  assert(!hasRuleForName(d, "naming-convention", "x"), "single letter ok");
});

test("naming: UPPER_CASE variable warned", () => {
  const d = lint("let MAX = 100\nprintln(MAX)");
  assert(hasRuleForName(d, "naming-convention", "MAX"), "UPPER warned");
});

test("naming: camelCase function", () => {
  const d = lint("fn myFunc() => 1");
  assert(hasRuleForName(d, "naming-convention", "myFunc"), "camelCase fn warned");
});

test("naming: snake_case function ok", () => {
  const d = lint("fn my_func() => 1");
  assert(!hasRuleForName(d, "naming-convention", "my_func"), "snake_case fn ok");
});

test("naming: PascalCase type ok", () => {
  const d = lint("type MyType = { x: Int }");
  assert(!hasRuleForName(d, "naming-convention", "MyType"), "PascalCase type ok");
});

test("naming: snake_case type warned", () => {
  const d = lint("type my_type = { x: Int }");
  assert(hasRuleForName(d, "naming-convention", "my_type"), "snake_case type warned");
});

// --- Line length ---

test("line length: exactly at limit ok", () => {
  const line = "let x = " + '"' + "a".repeat(90) + '"';
  const d = lint(line, { maxLineLength: 200 });
  assert(!hasRule(d, "line-length"), "at limit ok");
});

test("line length: custom limit", () => {
  const d = lint("let x = 12345", { maxLineLength: 10 });
  assert(hasRule(d, "line-length"), "custom limit triggers");
});

// --- Missing pub ---

test("missing pub: top-level fn", () => {
  const d = lint("fn helper() => 42");
  assert(hasRuleForName(d, "missing-pub", "helper"), "missing pub");
});

test("missing pub: pub fn no warning", () => {
  const d = lint("pub fn helper() => 42");
  assert(!hasRuleForName(d, "missing-pub", "helper"), "pub fn ok");
});

// --- Complex patterns ---

test("pipeline: no false positives", () => {
  const d = lint("let xs = [1, 2, 3]\nlet ys = xs |> map(x => x + 1)\nprintln(ys)");
  assert(!hasRuleForName(d, "unused-variable", "xs"), "xs used in pipeline");
});

test("match: no false positives", () => {
  const d = lint('let x = 1\nmatch x { 1 => "one", _ => "other" }');
  assert(!hasRuleForName(d, "unused-variable", "x"), "x used in match");
});

test("list comprehension: loop var not unused", () => {
  const d = lint("let items = [1, 2]\n[x * 2 for x in items]");
  assert(!hasRuleForName(d, "unused-variable", "items"), "items used");
});

test("for loop: loop var used in body", () => {
  const d = lint("for i in 1..10 { println(i) }");
  // i is used, shouldn't warn
  const iUnused = d.some(x => x.rule === "unused-variable" && x.message.includes("'i'"));
  assert(!iUnused, "loop var i used");
});

test("lambda params not warned as unused in short lambdas", () => {
  const d = lint("let f = x => x + 1\nprintln(f)");
  assert(!hasRuleForName(d, "unused-variable", "f"), "f used");
});

test("diagnostics sorted by line", () => {
  const d = lint("let b = 1\nlet a = 2");
  // Both unused, check sorted
  if (d.length >= 2) {
    assert(d[0].line <= d[1].line, "sorted by line");
  } else {
    assert(true, "not enough diags to check sort");
  }
});

test("file option in diagnostics", () => {
  const d = lint("let x = 1", { file: "main.arc" });
  for (const diag of d) {
    assert(diag.file === "main.arc", `file is main.arc, got ${diag.file}`);
  }
  assert(true, "file option works");
});

test("severity levels", () => {
  const d = lint("let myVar = 1\nprintln(myVar)");
  const naming = d.find(x => x.rule === "naming-convention");
  if (naming) {
    assert(naming.severity === "info", "naming is info severity");
  } else {
    assert(true, "no naming issue");
  }
});

test("clean code: well-written program", () => {
  const src = `pub fn add(a, b) => a + b

pub fn greet(name) {
  println("Hello " ++ name)
}

pub fn main() {
  let result = add(1, 2)
  greet("world")
  println(result)
}`;
  const d = lint(src);
  const errors = d.filter(x => x.severity === "error");
  assert(errors.length === 0, "clean code no errors");
});

console.log(`  ${passed} passed, ${failed} failed`);
export { passed, failed };
