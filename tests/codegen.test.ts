// Codegen Tests — verify generated JS runs correctly via eval()

import { lex } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";
import { generateIR } from "../compiler/src/ir.js";
import { generateJS } from "../compiler/src/codegen-js.js";
import { generateWAT } from "../compiler/src/codegen.js";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

function assert(cond: boolean, msg = "assertion failed") {
  if (!cond) throw new Error(msg);
}

function compileToJS(source: string): string {
  const tokens = lex(source);
  const ast = parse(tokens);
  const ir = generateIR(ast);
  return generateJS(ir);
}

function evalJS(js: string): void {
  const fn = new Function(js);
  fn();
}

function compileToWAT(source: string): string {
  const tokens = lex(source);
  const ast = parse(tokens);
  const ir = generateIR(ast);
  return generateWAT(ir);
}

// ---- JS Codegen Tests ----

test("codegen-js: arithmetic", () => {
  const js = compileToJS(`let x = 2 + 3`);
  assert(js.includes("__arc_runtime"), "should reference runtime");
  evalJS(js);
});

test("codegen-js: variable and print via runtime", () => {
  const js = compileToJS(`let x = 42`);
  assert(js.includes("42"), "should contain literal 42");
  assert(js.includes("__arc_runtime"), "should reference runtime");
  evalJS(js);
});

test("codegen-js: function definition and call (arrow)", () => {
  const js = compileToJS(`fn add(a, b) => a + b\nlet r = add(3, 4)`);
  assert(js.includes("function"), "should have function keyword");
  evalJS(js);
});

test("codegen-js: function definition and call (block)", () => {
  const js = compileToJS(`fn double(x) { x * 2 }\nlet r = double(5)`);
  assert(js.includes("function"), "should have function keyword");
  evalJS(js);
});

test("codegen-js: list literal", () => {
  const js = compileToJS(`let xs = [1, 2, 3]`);
  assert(js.includes("["), "should contain list syntax");
  evalJS(js);
});

test("codegen-js: string concatenation", () => {
  const js = compileToJS(`let s = "hello" ++ " world"`);
  assert(js.includes("String"), "should use String() for concat");
  evalJS(js);
});

test("codegen-js: conditional expression", () => {
  const js = compileToJS(`let x = if true { 1 } el { 2 }`);
  evalJS(js);
});

test("codegen-js: tool call generates fetch", () => {
  const js = compileToJS(`let r = GET "https://api.example.com/data"`);
  assert(js.includes("fetch"), "should generate fetch call");
  assert(js.includes("GET"), "should include GET method");
});

test("codegen-js: lambda", () => {
  const js = compileToJS(`let f = (x) => x + 1`);
  assert(js.includes("function"), "should have function for lambda");
  evalJS(js);
});

test("codegen-js: pipeline", () => {
  const js = compileToJS(`fn double(x) => x * 2\nlet r = 5 |> double`);
  evalJS(js);
});

test("codegen-js: boolean ops", () => {
  const js = compileToJS(`let a = true and false\nlet b = true or false\nlet c = not true`);
  assert(js.includes("&&"), "should use && for and");
  assert(js.includes("||"), "should use || for or");
  assert(js.includes("!"), "should use ! for not");
  evalJS(js);
});

// ---- WAT Codegen Tests ----

test("codegen-wat: generates valid module structure", () => {
  const wat = compileToWAT(`let x = 42`);
  assert(wat.startsWith("(module"), "should start with (module");
  assert(wat.includes("_start"), "should export _start");
  assert(wat.includes("i32.const 42"), "should contain the literal");
});

test("codegen-wat: function generates func", () => {
  const wat = compileToWAT(`fn add(a, b) => a + b`);
  assert(wat.includes("(func $add"), "should have named function");
  assert(wat.includes("i32.add"), "should have add instruction");
});

test("codegen-wat: imports runtime", () => {
  const wat = compileToWAT(`let x = 1`);
  assert(wat.includes('(import "arc"'), "should import arc runtime");
  assert(wat.includes("print_i32"), "should import print");
});

test("codegen-wat: string data segment", () => {
  const wat = compileToWAT(`let s = "hello"`);
  assert(wat.includes("(data"), "should have data segment for string");
  assert(wat.includes("hello"), "should reference the string");
});

test("codegen-wat: list operations", () => {
  const wat = compileToWAT(`let xs = [1, 2, 3]`);
  assert(wat.includes("list_new"), "should call list_new");
  assert(wat.includes("list_push"), "should call list_push");
});

export { passed, failed };
