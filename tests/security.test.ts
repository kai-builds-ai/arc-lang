// Security Module Tests
import {
  SecurityConfig,
  SecurityError,
  validateSource,
  validateNestingDepth,
  validateToolCall,
  validateImport,
  ExecutionContext,
  SafeInterpreter,
  createSandbox,
} from "../compiler/src/security.js";
import { lex } from "../compiler/src/lexer.js";
import { parse } from "../compiler/src/parser.js";

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

function expectThrow(fn: () => void, pattern: string): boolean {
  try { fn(); return false; }
  catch (e: any) { return e.message.includes(pattern) || e.code === pattern; }
}

console.log("Security Tests:");

// --- Input Sanitization ---

test("validateSource: accepts small source", () => {
  validateSource("let x = 1");
  assert(true, "small source ok");
});

test("validateSource: rejects oversized source", () => {
  assert(expectThrow(() => validateSource("x".repeat(2_000_000)), "exceeds maximum size"), "oversized source rejected");
});

test("validateSource: rejects oversized source with custom limit", () => {
  assert(expectThrow(() => validateSource("let x = 1", { maxSourceSize: 5 }), "exceeds maximum size"), "custom size limit");
});

test("validateSource: rejects long string literals", () => {
  const longStr = '"' + "a".repeat(200_000) + '"';
  assert(expectThrow(() => validateSource(longStr), "exceeds maximum length"), "long string rejected");
});

// --- Nesting Depth ---

test("validateNestingDepth: accepts shallow AST", () => {
  const ast = parse(lex("let x = 1 + 2"));
  validateNestingDepth(ast);
  assert(true, "shallow ast ok");
});

test("validateNestingDepth: rejects with very low limit", () => {
  const ast = parse(lex("let x = if true { if true { if true { 1 } el { 2 } } el { 3 } } el { 4 }"));
  assert(expectThrow(() => validateNestingDepth(ast, { maxNestingDepth: 2 }), "nesting depth"), "deep nesting rejected");
});

// --- Tool Call Validation ---

test("validateToolCall: allows when no restrictions", () => {
  validateToolCall("GET", "https://api.example.com", {});
  assert(true, "no restrictions ok");
});

test("validateToolCall: blocks disabled tool calls", () => {
  assert(expectThrow(() => validateToolCall("GET", "https://x.com", { disableToolCalls: true }), "disabled"), "disabled tool calls");
});

test("validateToolCall: blocks blocked methods", () => {
  assert(expectThrow(() => validateToolCall("DELETE", "https://x.com", { blockedToolMethods: ["DELETE"] }), "blocked"), "blocked method");
});

test("validateToolCall: allows only allowlisted methods", () => {
  assert(expectThrow(() => validateToolCall("POST", "https://x.com", { allowedToolMethods: ["GET"] }), "not in the allowlist"), "method not allowed");
});

test("validateToolCall: blocks matching URL patterns", () => {
  assert(expectThrow(() => validateToolCall("GET", "https://evil.com/data", { blockedUrlPatterns: [/evil\.com/] }), "blocked pattern"), "blocked url");
});

test("validateToolCall: requires URL allowlist match", () => {
  assert(expectThrow(() => validateToolCall("GET", "https://other.com", { allowedUrlPatterns: [/api\.safe\.com/] }), "does not match"), "url not allowed");
});

// --- Import Validation ---

test("validateImport: allows when no restrictions", () => {
  validateImport("math", {});
  assert(true, "no restrictions ok");
});

test("validateImport: blocks disabled imports", () => {
  assert(expectThrow(() => validateImport("fs", { disableImports: true }), "disabled"), "disabled imports");
});

test("validateImport: blocks blocked imports", () => {
  assert(expectThrow(() => validateImport("fs", { blockedImports: ["fs"] }), "blocked"), "blocked import");
});

test("validateImport: allows only allowlisted imports", () => {
  assert(expectThrow(() => validateImport("fs", { allowedImports: ["math", "string"] }), "not in the allowlist"), "import not allowed");
});

// --- ExecutionContext ---

test("ExecutionContext: tick works normally", () => {
  const ctx = new ExecutionContext({ maxExecutionSteps: 100 });
  for (let i = 0; i < 100; i++) ctx.tick();
  assert(ctx.steps === 100, "100 steps ok");
});

test("ExecutionContext: tick throws on limit", () => {
  const ctx = new ExecutionContext({ maxExecutionSteps: 5 });
  assert(expectThrow(() => { for (let i = 0; i < 10; i++) ctx.tick(); }, "Execution exceeded"), "step limit");
});

test("ExecutionContext: recursion depth tracking", () => {
  const ctx = new ExecutionContext({ maxRecursionDepth: 3 });
  ctx.pushCall(); ctx.pushCall(); ctx.pushCall();
  assert(expectThrow(() => ctx.pushCall(), "Recursion depth"), "recursion limit");
});

test("ExecutionContext: pop call works", () => {
  const ctx = new ExecutionContext({ maxRecursionDepth: 2 });
  ctx.pushCall(); ctx.pushCall();
  ctx.popCall();
  // Should succeed now
  ctx.pushCall();
  assert(ctx.recursionDepth === 2, "pop and push ok");
});

test("ExecutionContext: array size check", () => {
  const ctx = new ExecutionContext({ maxArraySize: 10 });
  ctx.checkArraySize(10);
  assert(true, "array size ok");
  assert(expectThrow(() => ctx.checkArraySize(11), "Array size"), "array too large");
});

test("ExecutionContext: map size check", () => {
  const ctx = new ExecutionContext({ maxMapSize: 5 });
  assert(expectThrow(() => ctx.checkMapSize(6), "Map size"), "map too large");
});

// --- SafeInterpreter / createSandbox ---

test("SafeInterpreter: runs simple code", () => {
  const sandbox = createSandbox();
  const result = sandbox.run("1 + 2");
  assert(result === 3, "1+2=3");
});

test("SafeInterpreter: runs with variables", () => {
  const sandbox = createSandbox();
  const result = sandbox.run("let x = 10; x * 2");
  assert(result === 20, "x*2=20");
});

test("SafeInterpreter: rejects oversized source", () => {
  const sandbox = createSandbox({ maxSourceSize: 10 });
  assert(expectThrow(() => sandbox.run("let x = 1 + 2 + 3 + 4"), "exceeds maximum size"), "sandbox size limit");
});

test("SafeInterpreter: blocks tool calls when disabled", () => {
  const sandbox = createSandbox({ disableToolCalls: true });
  assert(expectThrow(() => sandbox.run('@GET "https://example.com"'), "disabled"), "sandbox blocks tools");
});

test("SafeInterpreter: blocks imports when disabled", () => {
  const sandbox = createSandbox({ disableImports: true });
  assert(expectThrow(() => sandbox.run('use math'), "disabled"), "sandbox blocks imports");
});

test("SafeInterpreter: handles string operations", () => {
  const sandbox = createSandbox();
  const result = sandbox.run('"hello" ++ " world"');
  assert(result === "hello world", "string concat");
});

test("SafeInterpreter: handles lists", () => {
  const sandbox = createSandbox();
  const result = sandbox.run("[1, 2, 3]");
  assert(Array.isArray(result) && (result as any[]).length === 3, "list");
});

test("SecurityError has correct name", () => {
  const err = new SecurityError("SEC001", "test");
  assert(err.name === "SecurityError", "error name");
  assert(err.code === "SEC001", "error code");
});

export { passed, failed };
