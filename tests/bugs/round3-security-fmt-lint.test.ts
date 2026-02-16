// Round 3 Bug Regression Tests - Security, Formatter, Linter, TypeChecker

import { typecheck } from "../../compiler/src/typechecker.js";
import { lex } from "../../compiler/src/lexer.js";
import { parse } from "../../compiler/src/parser.js";
import { ExecutionContext } from "../../compiler/src/security.js";
import * as AST from "../../compiler/src/ast.js";

export let passed = 0;
export let failed = 0;

function assert(cond: boolean, msg: string) {
  if (cond) { passed++; }
  else { failed++; console.log(`  FAIL: ${msg}`); }
}

function parseProgram(source: string): AST.Program {
  return parse(lex(source));
}

console.log("--- Round 3 Bug Regression Tests ---");

// Bug #1: typechecker walkExpr incomplete - match inside lambda/call/binary not checked
{
  // A match expression nested inside a lambda body should still get exhaustiveness warning
  const src = `let f = x => match x { 1 => "one" }`;
  const ast = parseProgram(src);
  const diags = typecheck(ast);
  const hasExhaustivenessWarning = diags.some(d => d.message.includes("exhaustive"));
  assert(hasExhaustivenessWarning, "Bug #1: match inside lambda should get exhaustiveness warning");
}

// Bug #1b: match inside call args
{
  const src = `fn identity(x) { x }
let r = identity(match 1 { 1 => "a" })`;
  const ast = parseProgram(src);
  const diags = typecheck(ast);
  const hasWarning = diags.some(d => d.message.includes("exhaustive"));
  assert(hasWarning, "Bug #1b: match inside call arg should get exhaustiveness warning");
}

// Bug #1c: match inside binary expression
{
  const src = `let x = 1 + match 2 { 2 => 3 }`;
  const ast = parseProgram(src);
  const diags = typecheck(ast);
  const hasWarning = diags.some(d => d.message.includes("exhaustive"));
  assert(hasWarning, "Bug #1c: match inside binary expr should get exhaustiveness warning");
}

// Bug #2: typechecker walkStmt missing DoStmt
{
  const src = `do { match 1 { 1 => 2 } } until true`;
  const ast = parseProgram(src);
  const diags = typecheck(ast);
  const hasWarning = diags.some(d => d.message.includes("exhaustive"));
  assert(hasWarning, "Bug #2: match inside do-until should get exhaustiveness warning");
}

// Bug #3: checkMatchExhaustiveness only warned for Identifier subjects
{
  // match on a function call result (not an Identifier) should still warn
  const src = `fn get_val() { 1 }
let x = match get_val() { 1 => "one" }`;
  const ast = parseProgram(src);
  const diags = typecheck(ast);
  const hasWarning = diags.some(d => d.message.includes("exhaustive"));
  assert(hasWarning, "Bug #3: match on call expr should get exhaustiveness warning");
}

// Bug #3b: match on a literal
{
  const src = `let x = match 42 { 1 => "one" }`;
  const ast = parseProgram(src);
  const diags = typecheck(ast);
  const hasWarning = diags.some(d => d.message.includes("exhaustive"));
  assert(hasWarning, "Bug #3b: match on literal should get exhaustiveness warning");
}

// Bug #4: Security timeout never checked when < 1000 steps
{
  const ctx = new ExecutionContext({ executionTimeoutMs: 1 });
  // Simulate passage of time
  const origNow = Date.now;
  let fakeTime = origNow.call(Date);
  Date.now = () => fakeTime;
  
  // Reset start time with fake clock
  (ctx as any).startTime = fakeTime;
  
  // Advance time past timeout
  fakeTime += 100; // 100ms > 1ms timeout
  
  let threw = false;
  try {
    ctx.tick(); // step 1 - should check timeout now (was broken: only checked at step 1000)
  } catch (e: any) {
    if (e.code === "SEC031") threw = true;
  }
  Date.now = origNow;
  assert(threw, "Bug #4: ExecutionContext.tick() should check timeout even at low step counts");
}

console.log(`\nRound 3 Results: ${passed} passed, ${failed} failed`);
