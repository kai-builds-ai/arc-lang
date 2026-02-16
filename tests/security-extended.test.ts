// Security Extended Tests
import {
  SecurityConfig, SecurityError, validateSource, validateNestingDepth,
  validateToolCall, validateImport, ExecutionContext, SafeInterpreter, createSandbox,
} from "../compiler/src/security.js";
import { lex } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; } else { failed++; console.error(`  FAIL: ${msg}`); }
}

function test(name: string, fn: () => void) {
  try { fn(); } catch (e: any) { failed++; console.error(`  FAIL: ${name} — ${e.message}`); }
}

function expectThrow(fn: () => void, pattern: string): boolean {
  try { fn(); return false; } catch (e: any) { return e.message.includes(pattern) || e.code === pattern; }
}

console.log("Security Extended Tests:");

// --- validateSource edge cases ---

test("validateSource: empty string is valid", () => {
  validateSource("");
  assert(true, "empty source ok");
});

test("validateSource: source with only whitespace", () => {
  validateSource("   \n\n\t\t  ");
  assert(true, "whitespace-only ok");
});

test("validateSource: string at exact max length is ok", () => {
  const s = '"' + "a".repeat(102_400) + '"';
  validateSource(s);
  assert(true, "exact max string length ok");
});

test("validateSource: multiple short strings ok", () => {
  validateSource('"hello" ++ "world" ++ "foo"');
  assert(true, "multiple short strings ok");
});

test("validateSource: escaped quotes in string", () => {
  validateSource('"hello \\"world\\""');
  assert(true, "escaped quotes ok");
});

test("validateSource: custom maxStringLength", () => {
  assert(expectThrow(() => validateSource('"abcdef"', { maxStringLength: 3 }), "exceeds maximum length"), "custom string limit");
});

// --- validateNestingDepth ---

test("validateNestingDepth: flat program ok", () => {
  const ast = parse(lex("let a = 1\nlet b = 2\nlet c = 3"));
  validateNestingDepth(ast);
  assert(true, "flat program ok");
});

test("validateNestingDepth: custom limit of 1 rejects simple expr", () => {
  const ast = parse(lex("let x = 1 + 2"));
  assert(expectThrow(() => validateNestingDepth(ast, { maxNestingDepth: 1 }), "nesting depth"), "depth 1 rejects");
});

test("validateNestingDepth: null node is safe", () => {
  validateNestingDepth(null);
  assert(true, "null node ok");
});

test("validateNestingDepth: primitive values safe", () => {
  validateNestingDepth(42);
  validateNestingDepth("hello");
  assert(true, "primitives ok");
});

// --- validateToolCall combinations ---

test("validateToolCall: case insensitive method matching", () => {
  assert(expectThrow(() => validateToolCall("delete", "https://x.com", { blockedToolMethods: ["DELETE"] }), "blocked"), "case insensitive block");
});

test("validateToolCall: multiple blocked methods", () => {
  const cfg: SecurityConfig = { blockedToolMethods: ["DELETE", "PUT", "PATCH"] };
  assert(expectThrow(() => validateToolCall("PUT", "https://x.com", cfg), "blocked"), "PUT blocked");
  assert(expectThrow(() => validateToolCall("PATCH", "https://x.com", cfg), "blocked"), "PATCH blocked");
  validateToolCall("GET", "https://x.com", cfg);
  assert(true, "GET allowed");
});

test("validateToolCall: allowed method passes", () => {
  validateToolCall("GET", "https://x.com", { allowedToolMethods: ["GET", "POST"] });
  assert(true, "allowed method ok");
});

test("validateToolCall: multiple URL patterns - one blocks", () => {
  const cfg: SecurityConfig = { blockedUrlPatterns: [/evil\.com/, /malware\.org/] };
  assert(expectThrow(() => validateToolCall("GET", "https://malware.org/payload", cfg), "blocked pattern"), "second pattern blocks");
});

test("validateToolCall: allowed URL pattern passes", () => {
  validateToolCall("GET", "https://api.safe.com/data", { allowedUrlPatterns: [/api\.safe\.com/] });
  assert(true, "allowed url ok");
});

test("validateToolCall: empty config allows everything", () => {
  validateToolCall("DELETE", "https://anything.com", {});
  assert(true, "empty config allows all");
});

// --- validateImport combinations ---

test("validateImport: allowed import passes", () => {
  validateImport("math", { allowedImports: ["math", "string"] });
  assert(true, "allowed import ok");
});

test("validateImport: blocked and allowed list together - blocked wins", () => {
  assert(expectThrow(() => validateImport("fs", { blockedImports: ["fs"], allowedImports: ["fs", "math"] }), "blocked"), "block overrides allow");
});

test("validateImport: empty string module name", () => {
  validateImport("", {});
  assert(true, "empty module name ok with no restrictions");
});

// --- ExecutionContext extended ---

test("ExecutionContext: fresh context has zero steps", () => {
  const ctx = new ExecutionContext();
  assert(ctx.steps === 0, "zero steps initially");
});

test("ExecutionContext: fresh context has zero recursion depth", () => {
  const ctx = new ExecutionContext();
  assert(ctx.recursionDepth === 0, "zero recursion initially");
});

test("ExecutionContext: multiple push/pop cycles", () => {
  const ctx = new ExecutionContext({ maxRecursionDepth: 3 });
  ctx.pushCall(); ctx.pushCall(); ctx.popCall(); ctx.pushCall(); ctx.popCall(); ctx.popCall();
  assert(ctx.recursionDepth === 0, "back to zero after cycles");
});

test("ExecutionContext: maxSteps=1 allows one tick", () => {
  const ctx = new ExecutionContext({ maxExecutionSteps: 1 });
  ctx.tick();
  assert(ctx.steps === 1, "one tick ok");
  assert(expectThrow(() => ctx.tick(), "Execution exceeded"), "second tick fails");
});

test("ExecutionContext: array size exactly at limit", () => {
  const ctx = new ExecutionContext({ maxArraySize: 100 });
  ctx.checkArraySize(100);
  assert(true, "exact limit ok");
});

test("ExecutionContext: map size exactly at limit", () => {
  const ctx = new ExecutionContext({ maxMapSize: 50 });
  ctx.checkMapSize(50);
  assert(true, "exact map limit ok");
});

test("ExecutionContext: default limits are large", () => {
  const ctx = new ExecutionContext();
  // Should not throw with reasonable usage
  for (let i = 0; i < 1000; i++) ctx.tick();
  assert(ctx.steps === 1000, "1000 steps ok with defaults");
});

// --- SafeInterpreter extended ---

test("SafeInterpreter: arithmetic expressions", () => {
  const sb = createSandbox();
  assert(sb.run("10 - 3") === 7, "10-3=7");
});

test("SafeInterpreter: boolean expressions", () => {
  const sb = createSandbox();
  assert(sb.run("true and false") === false, "true and false");
});

test("SafeInterpreter: nested function calls", () => {
  const sb = createSandbox();
  const r = sb.run("fn double(x) => x * 2\nfn quad(x) => double(double(x))\nquad(3)");
  assert(r === 12, "quad(3)=12");
});

test("SafeInterpreter: if/el expression", () => {
  const sb = createSandbox();
  assert(sb.run("if true { 42 } el { 0 }") === 42, "if true => 42");
});

test("SafeInterpreter: map literal", () => {
  const sb = createSandbox();
  const r = sb.run('{name: "arc"}') as any;
  assert(r != null, "map literal not null");
});

test("SafeInterpreter: nil value", () => {
  const sb = createSandbox();
  assert(sb.run("nil") === null, "nil is null");
});

test("SafeInterpreter: comparison operators", () => {
  const sb = createSandbox();
  assert(sb.run("5 > 3") === true, "5>3");
  assert(sb.run("2 == 2") === true, "2==2");
});

test("SafeInterpreter: source validation runs first", () => {
  const sb = createSandbox({ maxSourceSize: 5 });
  assert(expectThrow(() => sb.run("let x = 123456"), "exceeds maximum size"), "validates source before parse");
});

// --- SecurityError ---

test("SecurityError: is instance of Error", () => {
  const err = new SecurityError("SEC999", "test");
  assert(err instanceof Error, "instanceof Error");
});

test("SecurityError: message is correct", () => {
  const err = new SecurityError("SEC001", "my message");
  assert(err.message === "my message", "message matches");
});

console.log(`  ${passed} passed, ${failed} failed`);
export { passed, failed };
