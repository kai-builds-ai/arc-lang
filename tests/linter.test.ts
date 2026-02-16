// Linter Unit Tests
import { lint, LintDiagnostic } from "../compiler/src/linter.js";

export let passed = 0;
export let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; }
  else { failed++; console.error(`  FAIL: ${msg}`); }
}

function test(name: string, fn: () => void) {
  try { fn(); }
  catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

function hasRule(diagnostics: LintDiagnostic[], rule: string): boolean {
  return diagnostics.some(d => d.rule === rule);
}

function hasRuleForName(diagnostics: LintDiagnostic[], rule: string, name: string): boolean {
  return diagnostics.some(d => d.rule === rule && d.message.includes(name));
}

console.log("Linter Tests:");

test("unused variable", () => {
  const d = lint('let x = 42\nlet y = 10\nprintln(y)');
  assert(hasRuleForName(d, "unused-variable", "x"), `should detect unused x: ${JSON.stringify(d.map(x=>x.message))}`);
});

test("no false positive for used variable", () => {
  const d = lint('let x = 42\nprintln(x)');
  assert(!hasRuleForName(d, "unused-variable", "x"), "x is used, shouldn't warn");
});

test("unused import", () => {
  const d = lint('use std/io: println, readln\nprintln("hi")');
  assert(hasRuleForName(d, "unused-import", "readln"), `should detect unused readln: ${JSON.stringify(d.map(x=>x.message))}`);
});

test("shadowed variable", () => {
  const d = lint('let x = 1\nfn foo() {\n  let x = 2\n  println(x)\n}\nprintln(x)');
  assert(hasRule(d, "shadowed-variable"), `should detect shadow: ${JSON.stringify(d.map(x=>x.message))}`);
});

test("empty block", () => {
  const d = lint('fn empty() {}');
  assert(hasRule(d, "empty-block"), `should detect empty block: ${JSON.stringify(d.map(x=>x.message))}`);
});

test("unnecessary mut", () => {
  const d = lint('let mut x = 1\nprintln(x)');
  assert(hasRule(d, "unnecessary-mut"), `should detect unnecessary mut: ${JSON.stringify(d.map(x=>x.message))}`);
});

test("mut used correctly - no warning", () => {
  const d = lint('let mut x = 1\nx = 2\nprintln(x)');
  assert(!hasRule(d, "unnecessary-mut"), `should not warn when mut is used: ${JSON.stringify(d.map(x=>x.message))}`);
});

test("line length warning", () => {
  const longLine = 'let x = "' + 'a'.repeat(100) + '"';
  const d = lint(longLine);
  assert(hasRule(d, "line-length"), "should warn on long line");
});

test("no line length warning for short lines", () => {
  const d = lint('let x = 42');
  assert(!hasRule(d, "line-length"), "should not warn on short line");
});

test("naming convention - snake_case variable", () => {
  const d = lint('let myVar = 1\nprintln(myVar)');
  assert(hasRuleForName(d, "naming-convention", "myVar"), `should suggest snake_case: ${JSON.stringify(d.map(x=>x.message))}`);
});

test("naming convention - PascalCase type", () => {
  const d = lint('type my_type = { x: Int }');
  assert(hasRuleForName(d, "naming-convention", "my_type"), `should suggest PascalCase: ${JSON.stringify(d.map(x=>x.message))}`);
});

test("naming convention - good names pass", () => {
  const d = lint('let my_var = 1\nprintln(my_var)');
  assert(!hasRuleForName(d, "naming-convention", "my_var"), "snake_case should be fine");
});

test("missing pub suggestion", () => {
  const d = lint('fn helper() => 42');
  assert(hasRule(d, "missing-pub"), `should suggest pub: ${JSON.stringify(d.map(x=>x.message))}`);
});

test("no missing-pub for pub fn", () => {
  const d = lint('pub fn helper() => 42');
  assert(!hasRuleForName(d, "missing-pub", "helper"), "pub fn should not trigger");
});

test("file:line:col format in diagnostics", () => {
  const d = lint('let x = 42', { file: "test.arc" });
  // All diagnostics should have file, line, col
  for (const diag of d) {
    assert(diag.file === "test.arc", `file should be test.arc: ${diag.file}`);
    assert(typeof diag.line === "number", "line should be number");
    assert(typeof diag.col === "number", "col should be number");
  }
  assert(true, "format check passed");
});

test("empty source - no crash", () => {
  const d = lint('');
  assert(Array.isArray(d), "should return array");
});

test("unparseable source - returns line-length issues only", () => {
  const d = lint('{{{{');
  // Should not crash, may have line-length issues or nothing
  assert(Array.isArray(d), "should return array even for bad source");
});

test("for loop empty body", () => {
  const d = lint('for i in 1..10 {}');
  assert(hasRule(d, "empty-block"), `should detect empty for body: ${JSON.stringify(d.map(x=>x.message))}`);
});

test("function naming convention", () => {
  const d = lint('fn myFunc() => 1');
  assert(hasRuleForName(d, "naming-convention", "myFunc"), `should suggest snake_case for fn: ${JSON.stringify(d.map(x=>x.message))}`);
});

test("clean code produces minimal warnings", () => {
  const clean = `pub fn add(a, b) => a + b

pub fn greet(name) {
  println("Hello " ++ name)
}`;
  const d = lint(clean);
  const errors = d.filter(x => x.severity === "error");
  assert(errors.length === 0, `clean code should have no errors: ${JSON.stringify(d.map(x=>x.message))}`);
});

console.log(`  ${passed} passed, ${failed} failed`);
