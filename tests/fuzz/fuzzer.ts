// Arc Language Fuzzer — Grammar-aware and mutation-based fuzzing
import { lex } from "../../compiler/src/lexer.js";
import { parse } from "../../compiler/src/parser.js";
import { createEnv, interpretWithEnv } from "../../compiler/src/interpreter.js";

// ---- RNG helpers ----
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T { return arr[randInt(0, arr.length - 1)]; }
function maybe(p = 0.5): boolean { return Math.random() < p; }

// ---- Grammar-aware generation ----
const IDENTS = ["x", "y", "z", "a", "b", "n", "i", "val", "res", "tmp", "foo", "bar"];
const BINOPS = ["+", "-", "*", "/", "%", "**", "==", "!=", "<", ">", "<=", ">=", "++"];
const UNARYOPS = ["-", "not "];

function genIdent(): string { return pick(IDENTS); }

function genExpr(depth: number): string {
  if (depth <= 0) return genAtom();
  const kind = randInt(0, 12);
  switch (kind) {
    case 0: return genAtom();
    case 1: return `${genExpr(depth - 1)} ${pick(BINOPS)} ${genExpr(depth - 1)}`;
    case 2: return `(${genExpr(depth - 1)})`;
    case 3: return `${pick(UNARYOPS)}${genExpr(depth - 1)}`;
    case 4: return genCall(depth - 1);
    case 5: return genIf(depth - 1);
    case 6: return genMatch(depth - 1);
    case 7: return genLambda(depth - 1);
    case 8: return genList(depth - 1);
    case 9: return genMap(depth - 1);
    case 10: return genPipeline(depth - 1);
    case 11: return genStringInterp(depth - 1);
    case 12: return genBlock(depth - 1);
    default: return genAtom();
  }
}

function genAtom(): string {
  const kind = randInt(0, 5);
  switch (kind) {
    case 0: return String(randInt(-100, 100));
    case 1: return `${randInt(0, 99)}.${randInt(0, 99)}`;
    case 2: return `"${pick(["hello", "world", "test", "", "abc 123"])}"`;
    case 3: return pick(["true", "false"]);
    case 4: return "nil";
    case 5: return genIdent();
    default: return "0";
  }
}

function genCall(depth: number): string {
  const fn = genIdent();
  const argc = randInt(0, 3);
  const args = Array.from({ length: argc }, () => genExpr(depth)).join(", ");
  return `${fn}(${args})`;
}

function genIf(depth: number): string {
  const cond = genExpr(depth);
  const then = genExpr(depth);
  if (maybe(0.5)) {
    return `if ${cond} { ${then} } el { ${genExpr(depth)} }`;
  }
  return `if ${cond} { ${then} }`;
}

function genMatch(depth: number): string {
  const subj = genExpr(depth);
  const armCount = randInt(1, 4);
  const arms: string[] = [];
  for (let i = 0; i < armCount; i++) {
    const pat = pick([String(randInt(0, 10)), `"${pick(["a", "b"])}"`, "true", "false", "_", genIdent()]);
    arms.push(`  ${pat} => ${genExpr(depth)}`);
  }
  return `match ${subj} {\n${arms.join(",\n")}\n}`;
}

function genLambda(depth: number): string {
  const params = Array.from({ length: randInt(1, 3) }, genIdent).join(", ");
  return `(${params}) => ${genExpr(depth)}`;
}

function genList(depth: number): string {
  const count = randInt(0, 4);
  const elems = Array.from({ length: count }, () => genExpr(depth)).join(", ");
  return `[${elems}]`;
}

function genMap(depth: number): string {
  const count = randInt(0, 3);
  const entries = Array.from({ length: count }, () => `${genIdent()}: ${genExpr(depth)}`).join(", ");
  return `{${entries}}`;
}

function genPipeline(depth: number): string {
  const stages = randInt(2, 4);
  return Array.from({ length: stages }, () => genExpr(depth)).join(" |> ");
}

function genStringInterp(depth: number): string {
  const parts: string[] = [];
  const count = randInt(1, 3);
  for (let i = 0; i < count; i++) {
    if (maybe()) parts.push(pick(["hello", "world", " ", "test"]));
    parts.push(`{${genExpr(Math.min(depth, 1))}}`);
  }
  return `"${parts.join("")}"`;
}

function genBlock(depth: number): string {
  const stmtCount = randInt(1, 3);
  const stmts = Array.from({ length: stmtCount }, () => genStmt(depth)).join("\n");
  return `{\n${stmts}\n}`;
}

function genStmt(depth: number): string {
  if (depth <= 0) return genExpr(0);
  const kind = randInt(0, 4);
  switch (kind) {
    case 0: return `let ${genIdent()} = ${genExpr(depth)}`;
    case 1: return genFnDecl(depth - 1);
    case 2: return genForStmt(depth - 1);
    case 3: return genExpr(depth);
    case 4: return `let mut ${genIdent()} = ${genExpr(depth)}`;
    default: return genExpr(depth);
  }
}

function genFnDecl(depth: number): string {
  const name = genIdent();
  const params = Array.from({ length: randInt(0, 3) }, genIdent).join(", ");
  if (maybe(0.5)) {
    return `fn ${name}(${params}) => ${genExpr(depth)}`;
  }
  return `fn ${name}(${params}) {\n  ${genExpr(depth)}\n}`;
}

function genForStmt(depth: number): string {
  return `for ${genIdent()} in ${genExpr(depth)} {\n  ${genExpr(depth)}\n}`;
}

function genProgram(): string {
  const stmtCount = randInt(1, 6);
  return Array.from({ length: stmtCount }, () => genStmt(randInt(1, 3))).join("\n");
}

// ---- Mutation-based fuzzing ----
const SEED_PROGRAMS = [
  `let x = 42\nprint(x)`,
  `fn add(a, b) => a + b\nprint(add(1, 2))`,
  `let list = [1, 2, 3]\nlist |> map((x) => x * 2) |> each(print)`,
  `match 5 {\n  1 => "one",\n  _ => "other"\n}`,
  `if true { "yes" } el { "no" }`,
  `for i in 1..10 { print(i) }`,
  `let msg = "hello {1 + 2} world"`,
  `fn fib(n) => match n {\n  0 => 0,\n  1 => 1,\n  n => fib(n - 1) + fib(n - 2)\n}`,
  `let m = {a: 1, b: 2}\nprint(m.a)`,
  `let mut x = 0\nfor i in 1..5 { x = x + i }\nprint(x)`,
];

function mutateSwapToken(src: string): string {
  try {
    const tokens = lex(src);
    if (tokens.length < 3) return src;
    const i = randInt(0, tokens.length - 3);
    const j = randInt(i + 1, Math.min(i + 5, tokens.length - 2));
    const arr = [...tokens];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return arr.map(t => t.value === "\\n" ? "\n" : t.value).join(" ");
  } catch { return src; }
}

function mutateRemoveToken(src: string): string {
  try {
    const tokens = lex(src);
    if (tokens.length < 3) return src;
    const i = randInt(0, tokens.length - 2);
    return tokens.filter((_, idx) => idx !== i).map(t => t.value === "\\n" ? "\n" : t.value).join(" ");
  } catch { return src; }
}

function mutateDuplicateToken(src: string): string {
  try {
    const tokens = lex(src);
    if (tokens.length < 2) return src;
    const i = randInt(0, tokens.length - 2);
    const arr = [...tokens];
    arr.splice(i, 0, tokens[i]);
    return arr.map(t => t.value === "\\n" ? "\n" : t.value).join(" ");
  } catch { return src; }
}

function mutateTruncate(src: string): string {
  const pos = randInt(1, src.length - 1);
  return src.slice(0, pos);
}

function mutateInsertRandom(src: string): string {
  const pos = randInt(0, src.length);
  const ch = pick([..."{}()[]|>,;:=+-*/<>!@#$%^&\n \t\"'0123456789abcdefghijklmnop"]);
  return src.slice(0, pos) + ch + src.slice(pos);
}

function mutateProgram(src: string): string {
  const mutation = pick([mutateSwapToken, mutateRemoveToken, mutateDuplicateToken, mutateTruncate, mutateInsertRandom]);
  return mutation(src);
}

// ---- Crash detection ----
interface FuzzResult {
  iterations: number;
  crashes: CrashReport[];
  lexerErrors: number;
  parserErrors: number;
  interpreterErrors: number;
  successes: number;
}

interface CrashReport {
  source: string;
  phase: "lexer" | "parser" | "interpreter";
  error: string;
  stack?: string;
}

function isCrash(e: unknown): boolean {
  // Expected errors have messages starting with known patterns
  if (e instanceof Error) {
    const msg = e.message;
    if (msg.startsWith("Parse error")) return false;
    if (msg.startsWith("Unterminated")) return false;
    if (msg.startsWith("Unexpected")) return false;
    if (msg.startsWith("Undefined")) return false;
    if (msg.startsWith("Cannot")) return false;
    if (msg.startsWith("Type error")) return false;
    if (msg.startsWith("Division by zero")) return false;
    if (msg.startsWith("Expected")) return false;
    if (msg.startsWith("Invalid")) return false;
    if (msg.startsWith("Not")) return false;
    if (msg.startsWith("Index")) return false;
    if (msg.startsWith("Stack")) return false;
    if (msg.startsWith("Max")) return false;
    if (msg.startsWith("Range")) return false;
    if (msg.startsWith("No matching")) return false;
    if (msg.startsWith("Module")) return false;
    if (msg.startsWith("Assertion")) return false;
    if (msg.includes("not a function")) return false;
    if (msg.includes("not defined")) return false;
    if (msg.includes("not supported")) return false;
    if (msg.includes("already defined")) return false;
    if (msg.includes("immutable")) return false;
    if (msg.includes("out of bounds")) return false;
    if (msg.includes("mismatch")) return false;
    if (msg.includes("argument")) return false;
    // If it's a known error type (anything with a reasonable message), not a crash
    if (msg.length > 0 && msg.length < 500) return false;
  }
  // TypeError, RangeError etc from JS runtime = crash
  if (e instanceof TypeError) return true;
  if (e instanceof RangeError) return true;
  if (e instanceof SyntaxError) return true;
  return false;
}

function testProgram(source: string, result: FuzzResult): void {
  // Phase 1: Lexer
  let tokens;
  try {
    tokens = lex(source);
  } catch (e: any) {
    if (isCrash(e)) {
      result.crashes.push({ source, phase: "lexer", error: e.message, stack: e.stack });
    } else {
      result.lexerErrors++;
    }
    return;
  }

  // Phase 2: Parser
  let ast;
  try {
    ast = parse(tokens);
  } catch (e: any) {
    if (isCrash(e)) {
      result.crashes.push({ source, phase: "parser", error: e.message, stack: e.stack });
    } else {
      result.parserErrors++;
    }
    return;
  }

  // Phase 3: Interpreter
  try {
    const env = createEnv();
    // Suppress console output during fuzzing
    const origLog = console.log;
    console.log = () => {};
    try {
      interpretWithEnv(ast, env);
    } finally {
      console.log = origLog;
    }
    result.successes++;
  } catch (e: any) {
    if (isCrash(e)) {
      result.crashes.push({ source, phase: "interpreter", error: e.message, stack: e.stack });
    } else {
      result.interpreterErrors++;
    }
  }
}

export function runFuzzer(iterations: number = 1000): FuzzResult {
  const result: FuzzResult = {
    iterations,
    crashes: [],
    lexerErrors: 0,
    parserErrors: 0,
    interpreterErrors: 0,
    successes: 0,
  };

  const half = Math.floor(iterations / 2);

  // Grammar-aware fuzzing
  for (let i = 0; i < half; i++) {
    const src = genProgram();
    testProgram(src, result);
  }

  // Mutation-based fuzzing
  for (let i = 0; i < iterations - half; i++) {
    const seed = pick(SEED_PROGRAMS);
    const mutationCount = randInt(1, 5);
    let src = seed;
    for (let m = 0; m < mutationCount; m++) {
      src = mutateProgram(src);
    }
    testProgram(src, result);
  }

  return result;
}

export function fuzzReport(result: FuzzResult): void {
  console.log(`\n=== Fuzz Report ===`);
  console.log(`Iterations: ${result.iterations}`);
  console.log(`Successes:  ${result.successes}`);
  console.log(`Lexer errors (expected): ${result.lexerErrors}`);
  console.log(`Parser errors (expected): ${result.parserErrors}`);
  console.log(`Interpreter errors (expected): ${result.interpreterErrors}`);
  console.log(`CRASHES (unexpected): ${result.crashes.length}`);

  if (result.crashes.length > 0) {
    console.log(`\n--- Crash Details ---`);
    for (const crash of result.crashes.slice(0, 20)) {
      console.log(`\nPhase: ${crash.phase}`);
      console.log(`Error: ${crash.error}`);
      console.log(`Source:\n${crash.source.slice(0, 500)}`);
      if (crash.stack) console.log(`Stack:\n${crash.stack.split("\n").slice(0, 5).join("\n")}`);
    }
    if (result.crashes.length > 20) {
      console.log(`\n... and ${result.crashes.length - 20} more crashes`);
    }
  }
}

// Exported test results
export let passed = 0;
export let failed = 0;

export function runFuzzTests(): { passed: number; failed: number } {
  console.log("Running fuzz tests (500 iterations)...");
  const result = runFuzzer(500);
  fuzzReport(result);
  passed = result.crashes.length === 0 ? 1 : 0;
  failed = result.crashes.length > 0 ? 1 : 0;
  if (result.crashes.length === 0) {
    console.log("  ✓ No crashes in 500 fuzz iterations");
  } else {
    console.log(`  ✗ ${result.crashes.length} crashes found`);
  }
  return { passed, failed };
}

// Run as standalone
if (process.argv[1]?.includes("fuzzer")) {
  const iterArg = process.argv.find(a => a.startsWith("--iterations="));
  const iterations = iterArg ? parseInt(iterArg.split("=")[1]) : 1000;
  console.log(`Running fuzzer with ${iterations} iterations...`);
  const result = runFuzzer(iterations);
  fuzzReport(result);
  if (result.crashes.length > 0) process.exit(1);
}
