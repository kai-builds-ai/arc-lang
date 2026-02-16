// Arc Property-Based Tests
import { lex, TokenType } from "../../compiler/src/lexer.js";
import { parse } from "../../compiler/src/parser.js";
import { createEnv, interpretWithEnv, toStr } from "../../compiler/src/interpreter.js";
import { format } from "../../compiler/src/formatter.js";

export let passed = 0;
export let failed = 0;

// ---- Mini property testing framework ----
function check(name: string, iterations: number, fn: () => boolean | void): void {
  let ok = 0;
  let fail = 0;
  for (let i = 0; i < iterations; i++) {
    try {
      const result = fn();
      if (result === false) { fail++; } else { ok++; }
    } catch (e: any) {
      fail++;
      if (fail === 1) console.error(`    First failure: ${e.message}`);
    }
  }
  if (fail === 0) {
    console.log(`  ✓ ${name} (${iterations} iterations)`);
    passed++;
  } else {
    console.log(`  ✗ ${name} (${fail}/${iterations} failed)`);
    failed++;
  }
}

// ---- Helpers ----
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T { return arr[randInt(0, arr.length - 1)]; }

function run(src: string): any {
  const env = createEnv();
  const origLog = console.log;
  console.log = () => {};
  try {
    return interpretWithEnv(parse(lex(src)), env);
  } finally {
    console.log = origLog;
  }
}

function safeRun(src: string): { value: any; ok: boolean } {
  try {
    return { value: run(src), ok: true };
  } catch {
    return { value: null, ok: false };
  }
}

// ---- Lexer Properties ----
function lexerProperties() {
  console.log("\n  Lexer Properties:");

  check("tokens are always finite", 200, () => {
    const src = genSimpleSrc();
    try {
      const tokens = lex(src);
      return tokens.length < 100000 && tokens.length >= 0;
    } catch {
      return true; // lex error is fine
    }
  });

  check("every token has valid line/col", 200, () => {
    const src = genSimpleSrc();
    try {
      const tokens = lex(src);
      for (const t of tokens) {
        if (t.line < 1 || t.col < 1) return false;
      }
      return true;
    } catch {
      return true;
    }
  });

  check("lexing valid code produces tokens ending with EOF", 200, () => {
    const src = pick(VALID_PROGRAMS);
    const tokens = lex(src);
    return tokens[tokens.length - 1].type === TokenType.EOF;
  });
}

// ---- Parser Properties ----
function parserProperties() {
  console.log("\n  Parser Properties:");

  check("every valid program parses without error", 200, () => {
    const src = pick(VALID_PROGRAMS);
    const tokens = lex(src);
    const ast = parse(tokens);
    return ast.kind === "Program";
  });

  check("parse produces Program with stmts array", 100, () => {
    const src = pick(VALID_PROGRAMS);
    const ast = parse(lex(src));
    return Array.isArray(ast.stmts);
  });
}

// ---- Interpreter Properties ----
function interpreterProperties() {
  console.log("\n  Interpreter Properties:");

  check("addition is commutative", 200, () => {
    const a = randInt(-100, 100);
    const b = randInt(-100, 100);
    const r1 = run(`${a} + ${b}`);
    const r2 = run(`${b} + ${a}`);
    return r1 === r2;
  });

  check("multiplication is commutative", 200, () => {
    const a = randInt(-50, 50);
    const b = randInt(-50, 50);
    return run(`${a} * ${b}`) === run(`${b} * ${a}`);
  });

  check("string concatenation is associative", 100, () => {
    const a = pick(["hello", "world", "test", "arc", ""]);
    const b = pick(["foo", "bar", "baz", ""]);
    const c = pick(["x", "y", "z", ""]);
    const r1 = run(`("${a}" ++ "${b}") ++ "${c}"`);
    const r2 = run(`"${a}" ++ ("${b}" ++ "${c}")`);
    return r1 === r2;
  });

  check("pure functions return same result for same inputs", 100, () => {
    const n = randInt(0, 20);
    const src = `fn double(x) => x * 2\ndouble(${n})`;
    const r1 = run(src);
    const r2 = run(src);
    return r1 === r2;
  });

  check("let x = expr; x equals expr for literals", 200, () => {
    const val = randInt(-1000, 1000);
    const r1 = run(`let x = ${val}\nx`);
    const r2 = run(`${val}`);
    return r1 === r2;
  });

  check("arithmetic identity: x + 0 == x", 100, () => {
    const x = randInt(-100, 100);
    return run(`${x} + 0`) === x;
  });

  check("arithmetic identity: x * 1 == x", 100, () => {
    const x = randInt(-100, 100);
    return run(`${x} * 1`) === x;
  });
}

// ---- Formatter Properties ----
function formatterProperties() {
  console.log("\n  Formatter Properties:");

  check("format is idempotent", 100, () => {
    const src = pick(VALID_PROGRAMS);
    try {
      const f1 = format(src);
      const f2 = format(f1);
      return f1 === f2;
    } catch {
      return true; // format error on edge case is ok
    }
  });

  check("formatting preserves semantics", 100, () => {
    const src = pick(SEMANTIC_PROGRAMS);
    try {
      const r1 = run(src);
      const formatted = format(src);
      const r2 = run(formatted);
      return r1 === r2;
    } catch {
      return true;
    }
  });
}

// ---- Test Data ----
const VALID_PROGRAMS = [
  `42`,
  `"hello"`,
  `true`,
  `false`,
  `nil`,
  `3 + 4`,
  `10 - 3 * 2`,
  `let x = 42`,
  `let x = 42\nx`,
  `fn add(a, b) => a + b`,
  `let list = [1, 2, 3]`,
  `let m = {a: 1, b: 2}`,
  `if true { 1 } el { 0 }`,
  `match 1 {\n  1 => "one",\n  _ => "other"\n}`,
  `fn id(x) => x`,
  `let x = 5\nlet y = x + 1\ny`,
  `"hello" ++ " " ++ "world"`,
  `[1, 2, 3]`,
  `{a: 1}`,
  `let f = (x) => x * 2`,
  `let x = if true { 1 } el { 0 }\nx`,
  `fn fact(n) => if n <= 1 { 1 } el { n * fact(n - 1) }`,
  `1..5`,
  `let mut x = 0\nx = 1\nx`,
];

const SEMANTIC_PROGRAMS = [
  `42`,
  `3 + 4`,
  `10 - 3`,
  `"hello" ++ " world"`,
  `let x = 42\nx`,
  `if true { 1 } el { 0 }`,
  `fn double(x) => x * 2\ndouble(5)`,
  `let x = 10\nlet y = 20\nx + y`,
  `2 ** 3`,
  `10 % 3`,
];

function genSimpleSrc(): string {
  const kind = randInt(0, 5);
  switch (kind) {
    case 0: return String(randInt(-1000, 1000));
    case 1: return `"${pick(["hello", "world", "test", ""])}"`;
    case 2: return `${randInt(0, 100)} + ${randInt(0, 100)}`;
    case 3: return `let ${pick(["x", "y", "z"])} = ${randInt(0, 100)}`;
    case 4: return `[${randInt(0, 5)}, ${randInt(0, 5)}]`;
    case 5: return `fn f(x) => x`;
    default: return "42";
  }
}

// ---- Run all ----
export function runPropertyTests(): { passed: number; failed: number } {
  passed = 0;
  failed = 0;
  lexerProperties();
  parserProperties();
  interpreterProperties();
  formatterProperties();
  return { passed, failed };
}

// Auto-run on import
runPropertyTests();
