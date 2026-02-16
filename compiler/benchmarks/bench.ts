// Arc Benchmarking Framework
// Micro-benchmarks, macro-benchmarks, and comparison benchmarks

import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { createEnv, interpretWithEnv } from "../src/interpreter.js";
import { generateIR } from "../src/ir.js";
import { generateJS } from "../src/codegen-js.js";
import { execSync } from "child_process";
import { writeFileSync, unlinkSync, mkdirSync } from "fs";
import { join } from "path";

// ─── Benchmark Infrastructure ───

interface BenchResult {
  name: string;
  category: string;
  iterations: number;
  warmup: number;
  meanMs: number;
  minMs: number;
  maxMs: number;
  stddevMs: number;
  opsPerSec: number;
  extra?: Record<string, any>;
}

interface ComparisonResult {
  name: string;
  arcMs: number;
  jsMs: number;
  ratio: number;
}

function runBench(
  name: string,
  category: string,
  fn: () => any,
  opts: { iterations?: number; warmup?: number } = {}
): BenchResult {
  const iterations = opts.iterations ?? 100;
  const warmup = opts.warmup ?? 5;

  // Warmup
  for (let i = 0; i < warmup; i++) fn();

  // Measure
  const times: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  const variance = times.reduce((a, t) => a + (t - mean) ** 2, 0) / times.length;
  const stddev = Math.sqrt(variance);

  return {
    name,
    category,
    iterations,
    warmup,
    meanMs: mean,
    minMs: min,
    maxMs: max,
    stddevMs: stddev,
    opsPerSec: 1000 / mean,
  };
}

function arcRun(source: string): any {
  const tokens = lex(source);
  const ast = parse(tokens);
  const env = createEnv();
  return interpretWithEnv(ast, env);
}

// ─── Micro-Benchmarks ───

function microBenchmarks(): BenchResult[] {
  const results: BenchResult[] = [];

  // Lexer throughput
  const bigSource = Array(100).fill('let x = 42\nlet y = x + 8\nlet z = y * 2\nfn foo(a, b) => a + b\nlet r = foo(x, z)').join("\n");
  const r1 = runBench("Lexer throughput", "micro", () => lex(bigSource), { iterations: 200 });
  const tokenCount = lex(bigSource).length;
  r1.extra = { tokensPerRun: tokenCount, tokensPerSec: Math.round(tokenCount * r1.opsPerSec) };
  results.push(r1);

  // Parser throughput
  const tokens = lex(bigSource);
  const r2 = runBench("Parser throughput", "micro", () => parse(tokens), { iterations: 200 });
  const ast = parse(tokens);
  const nodeCount = countASTNodes(ast);
  r2.extra = { nodesPerRun: nodeCount, nodesPerSec: Math.round(nodeCount * r2.opsPerSec) };
  results.push(r2);

  // Fibonacci(20) - recursive
  results.push(runBench("Fibonacci(20)", "micro", () => {
    arcRun(`fn fib(n) => if n <= 1 { n } el { fib(n - 1) + fib(n - 2) }\nfib(20)`);
  }, { iterations: 20 }));

  // Fibonacci(25) - recursive
  results.push(runBench("Fibonacci(25)", "micro", () => {
    arcRun(`fn fib(n) => if n <= 1 { n } el { fib(n - 1) + fib(n - 2) }\nfib(25)`);
  }, { iterations: 5 }));

  // Sorting 1000 elements (using builtin sort)
  results.push(runBench("Sort 1000 elements", "micro", () => {
    arcRun(`let xs = range(0, 1000)\nlet reversed = reverse(xs)\nsort(reversed)`);
  }, { iterations: 50 }));

  // String operations
  results.push(runBench("String operations", "micro", () => {
    arcRun(`
let s = "hello world from arc language benchmark"
let u = upper(s)
let parts = split(s, " ")
let joined = join(parts, "-")
let t = trim("  hello  ")
let r = replace(s, "arc", "ARC")
`);
  }, { iterations: 200 }));

  // Pipeline execution
  results.push(runBench("Pipeline execution", "micro", () => {
    arcRun(`
let result = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  |> filter((x) => x % 2 == 0)
  |> map((x) => x * x)
  |> sort()
`);
  }, { iterations: 200 }));

  // Function call overhead
  results.push(runBench("Function call overhead", "micro", () => {
    arcRun(`
fn identity(x) => x
fn add(a, b) => a + b
fn apply(f, x) => f(x)
let r1 = identity(42)
let r2 = add(1, 2)
let r3 = apply((x) => x + 1, 10)
let r4 = identity(identity(identity(42)))
`);
  }, { iterations: 300 }));

  // Pattern matching
  results.push(runBench("Pattern matching", "micro", () => {
    arcRun(`
fn classify(x) => match x {
  0 => "zero"
  1 => "one"
  _ => "other"
}
let a = classify(0)
let b = classify(1)
let c = classify(42)
let d = classify(100)
`);
  }, { iterations: 300 }));

  // List comprehension
  results.push(runBench("List comprehension", "micro", () => {
    arcRun(`
let squares = [x * x for x in range(0, 100)]
let evens = [x for x in range(0, 100) if x % 2 == 0]
`);
  }, { iterations: 100 }));

  // Map operations
  results.push(runBench("Map operations", "micro", () => {
    arcRun(`
let m = { name: "test", value: 42, active: true }
let n = m.name
let v = m.value
`);
  }, { iterations: 300 }));

  return results;
}

// ─── Macro-Benchmarks ───

function macroBenchmarks(): BenchResult[] {
  const results: BenchResult[] = [];

  // CSV processing simulation
  results.push(runBench("CSV processing", "macro", () => {
    arcRun(`
fn parse_csv_line(line) => split(line, ",")
fn process_rows(rows) => map(rows, (row) => parse_csv_line(row))

let csv_data = [
  "name,age,city",
  "Alice,30,NYC",
  "Bob,25,SF",
  "Charlie,35,LA",
  "Diana,28,Chicago",
  "Eve,32,Boston",
  "Frank,40,Seattle",
  "Grace,22,Denver",
  "Hank,45,Miami",
  "Ivy,33,Portland"
]
let parsed = process_rows(csv_data)
let header = head(parsed)
let rows = tail(parsed)
let names = map(rows, (row) => head(row))
let result = join(names, ", ")
`);
  }, { iterations: 100 }));

  // Data transformation pipeline
  results.push(runBench("Data transform pipeline", "macro", () => {
    arcRun(`
let data = range(1, 51)
let result = data
  |> filter((x) => x % 2 == 0)
  |> map((x) => x * x)
  |> filter((x) => x > 100)
  |> map((x) => x + 1)
  |> sort()
let total = sum(result)
let count = len(result)
let avg = total / count
`);
  }, { iterations: 100 }));

  // HTTP request handling simulation
  results.push(runBench("HTTP handler simulation", "macro", () => {
    arcRun(`
fn handle_request(method, path) => match method {
  "GET" => match path {
    "/users" => { status: 200, body: "users list" }
    "/health" => { status: 200, body: "ok" }
    _ => { status: 404, body: "not found" }
  }
  "POST" => { status: 201, body: "created" }
  _ => { status: 405, body: "method not allowed" }
}

let r1 = handle_request("GET", "/users")
let r2 = handle_request("GET", "/health")
let r3 = handle_request("GET", "/unknown")
let r4 = handle_request("POST", "/users")
let r5 = handle_request("DELETE", "/users")
`);
  }, { iterations: 200 }));

  // String-heavy processing
  results.push(runBench("String processing", "macro", () => {
    arcRun(`
let words = ["hello", "world", "from", "arc", "language", "benchmark", "test", "suite"]
let upper_words = map(words, (w) => upper(w))
let joined = join(upper_words, " ")
let has_arc = contains(joined, "ARC")
let replaced = replace(joined, "ARC", "Arc")
let parts = split(replaced, " ")
let sorted_parts = sort(parts)
let final = join(sorted_parts, ", ")
`);
  }, { iterations: 200 }));

  // Recursive algorithms
  results.push(runBench("Recursive algorithms", "macro", () => {
    arcRun(`
fn quicksort(arr) => if len(arr) <= 1 { arr } el {
  let pivot = head(arr)
  let rest = tail(arr)
  let lo = filter(rest, (x) => x < pivot)
  let hi = filter(rest, (x) => x >= pivot)
  concat(concat(quicksort(lo), [pivot]), quicksort(hi))
}
let data = [38, 27, 43, 3, 9, 82, 10, 55, 1, 99, 42, 7]
let sorted = quicksort(data)
`);
  }, { iterations: 100 }));

  return results;
}

// ─── Comparison Benchmarks (Arc vs JS) ───

function comparisonBenchmarks(): ComparisonResult[] {
  const results: ComparisonResult[] = [];

  const comparisons: { name: string; arc: string; js: string; iterations: number }[] = [
    {
      name: "Fibonacci(20)",
      arc: `fn fib(n) => if n <= 1 { n } el { fib(n - 1) + fib(n - 2) }\nfib(20)`,
      js: `function fib(n) { return n <= 1 ? n : fib(n-1) + fib(n-2); } fib(20);`,
      iterations: 20,
    },
    {
      name: "Array map/filter",
      arc: `let xs = range(0, 100)\nlet r = xs |> filter((x) => x % 2 == 0) |> map((x) => x * x)`,
      js: `const xs = Array.from({length:100},(_,i)=>i); const r = xs.filter(x=>x%2===0).map(x=>x*x);`,
      iterations: 100,
    },
    {
      name: "String operations",
      arc: `let s = "hello world test"\nlet u = upper(s)\nlet p = split(s, " ")\nlet j = join(p, "-")`,
      js: `const s = "hello world test"; const u = s.toUpperCase(); const p = s.split(" "); const j = p.join("-");`,
      iterations: 200,
    },
    {
      name: "Conditionals",
      arc: `fn f(n) => if n > 100 { "big" } el { if n > 10 { "med" } el { "small" } }\nlet a = f(5)\nlet b = f(50)\nlet c = f(500)`,
      js: `function f(n){return n>100?"big":n>10?"med":"small"} const a=f(5);const b=f(50);const c=f(500);`,
      iterations: 300,
    },
  ];

  for (const cmp of comparisons) {
    // Time Arc
    const arcTokens = lex(cmp.arc);
    const arcAst = parse(arcTokens);
    // warmup
    for (let i = 0; i < 3; i++) interpretWithEnv(arcAst, createEnv());
    const arcStart = performance.now();
    for (let i = 0; i < cmp.iterations; i++) interpretWithEnv(arcAst, createEnv());
    const arcMs = (performance.now() - arcStart) / cmp.iterations;

    // Time JS via Function()
    const jsFn = new Function(cmp.js);
    for (let i = 0; i < 3; i++) jsFn();
    const jsStart = performance.now();
    for (let i = 0; i < cmp.iterations; i++) jsFn();
    const jsMs = (performance.now() - jsStart) / cmp.iterations;

    results.push({
      name: cmp.name,
      arcMs,
      jsMs,
      ratio: arcMs / jsMs,
    });
  }

  return results;
}

// ─── Helpers ───

function countASTNodes(node: any): number {
  if (!node || typeof node !== "object") return 0;
  let count = node.kind ? 1 : 0;
  for (const val of Object.values(node)) {
    if (Array.isArray(val)) {
      count += val.reduce((a: number, v: any) => a + countASTNodes(v), 0);
    } else if (val && typeof val === "object") {
      count += countASTNodes(val);
    }
  }
  return count;
}

function formatTable(results: BenchResult[]): string {
  const lines: string[] = [];
  lines.push("┌─────────────────────────────────┬───────────┬───────────┬───────────┬──────────────┐");
  lines.push("│ Benchmark                       │  Mean(ms) │  Min(ms)  │ Std(ms)   │    ops/sec   │");
  lines.push("├─────────────────────────────────┼───────────┼───────────┼───────────┼──────────────┤");
  for (const r of results) {
    const name = r.name.padEnd(31);
    const mean = r.meanMs.toFixed(3).padStart(9);
    const min = r.minMs.toFixed(3).padStart(9);
    const std = r.stddevMs.toFixed(3).padStart(9);
    const ops = r.opsPerSec.toFixed(1).padStart(12);
    lines.push(`│ ${name} │ ${mean} │ ${min} │ ${std} │ ${ops} │`);
  }
  lines.push("└─────────────────────────────────┴───────────┴───────────┴───────────┴──────────────┘");
  return lines.join("\n");
}

function formatComparisonTable(results: ComparisonResult[]): string {
  const lines: string[] = [];
  lines.push("┌──────────────────────────┬───────────┬───────────┬──────────┐");
  lines.push("│ Benchmark                │ Arc(ms)   │ JS(ms)    │ Ratio    │");
  lines.push("├──────────────────────────┼───────────┼───────────┼──────────┤");
  for (const r of results) {
    const name = r.name.padEnd(24);
    const arc = r.arcMs.toFixed(3).padStart(9);
    const js = r.jsMs.toFixed(3).padStart(9);
    const ratio = `${r.ratio.toFixed(1)}x`.padStart(8);
    lines.push(`│ ${name} │ ${arc} │ ${js} │ ${ratio} │`);
  }
  lines.push("└──────────────────────────┴───────────┴───────────┴──────────┘");
  return lines.join("\n");
}

// ─── Main ───

export async function runBenchmarks(options: { json?: boolean; category?: string } = {}) {
  const allResults: BenchResult[] = [];
  const category = options.category;

  console.log("╔═══════════════════════════════════════════════════════╗");
  console.log("║            Arc Language Benchmark Suite               ║");
  console.log("╚═══════════════════════════════════════════════════════╝\n");

  if (!category || category === "micro") {
    console.log("── Micro-Benchmarks ──\n");
    const micro = microBenchmarks();
    allResults.push(...micro);
    console.log(formatTable(micro));
    // Print extras
    for (const r of micro) {
      if (r.extra) {
        const extras = Object.entries(r.extra).map(([k, v]) => `${k}: ${v}`).join(", ");
        console.log(`  ${r.name}: ${extras}`);
      }
    }
    console.log();
  }

  if (!category || category === "macro") {
    console.log("── Macro-Benchmarks ──\n");
    const macro = macroBenchmarks();
    allResults.push(...macro);
    console.log(formatTable(macro));
    console.log();
  }

  if (!category || category === "comparison") {
    console.log("── Arc vs JavaScript Comparison ──\n");
    const comparison = comparisonBenchmarks();
    console.log(formatComparisonTable(comparison));
    console.log("\n  (Ratio = Arc time / JS time; lower is better for Arc)");
    console.log();
  }

  if (options.json) {
    const jsonOutput = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      results: allResults,
    };
    const outPath = join(import.meta.dirname ?? __dirname, "bench-results.json");
    writeFileSync(outPath, JSON.stringify(jsonOutput, null, 2));
    console.log(`JSON results written to ${outPath}`);
  }
}

// CLI entry point
const args = process.argv.slice(2);
const isJson = args.includes("--json");
const category = args.find(a => !a.startsWith("--"));

// Suppress console.log from Arc's print() during benchmarks
const origLog = console.log;
const silentEnv = { silent: false };

runBenchmarks({ json: isJson, category }).catch(console.error);
