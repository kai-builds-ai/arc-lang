// Execution Benchmark: Compare Arc interpreter vs generated JS execution time

import { lex } from "../src/lexer.js";
import { parse } from "../src/parser.js";
import { createEnv, interpretWithEnv } from "../src/interpreter.js";
import { generateIR } from "../src/ir.js";
import { generateJS } from "../src/codegen-js.js";

interface Benchmark {
  name: string;
  arc: string;
  iterations: number;
}

const benchmarks: Benchmark[] = [
  {
    name: "Fibonacci (recursive)",
    arc: `fn fib(n) = if n <= 1 then n else fib(n - 1) + fib(n - 2)
let r = fib(15)`,
    iterations: 50,
  },
  {
    name: "List operations",
    arc: `let xs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
let doubled = map(xs, (x) => x * 2)
let evens = filter(doubled, (x) => x % 4 == 0)
let total = fold(evens, 0, (a, b) => a + b)`,
    iterations: 200,
  },
  {
    name: "String concatenation",
    arc: `let s = "hello" ++ " " ++ "world" ++ "!" ++ " " ++ "from" ++ " " ++ "arc"`,
    iterations: 500,
  },
  {
    name: "Conditionals chain",
    arc: `fn classify(n) = if n > 100 then "big" else if n > 10 then "medium" else "small"
let a = classify(5)
let b = classify(50)
let c = classify(500)`,
    iterations: 300,
  },
];

function timeMs(fn: () => void, iterations: number): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  return performance.now() - start;
}

console.log("=== Arc Execution Benchmark ===\n");
console.log("Comparing: Arc interpreter vs Generated JS (eval)\n");

for (const bench of benchmarks) {
  const tokens = lex(bench.arc);
  const ast = parse(tokens);
  const ir = generateIR(ast);
  const js = generateJS(ir);
  const jsFn = new Function(js);

  // Warm up
  try { interpretWithEnv(ast, createEnv()); } catch {}
  try { jsFn(); } catch {}

  // Time interpreter
  const interpTime = timeMs(() => {
    try { interpretWithEnv(ast, createEnv()); } catch {}
  }, bench.iterations);

  // Time generated JS
  const jsTime = timeMs(() => {
    try { jsFn(); } catch {}
  }, bench.iterations);

  const speedup = (interpTime / jsTime).toFixed(2);

  console.log(`🏃 ${bench.name} (${bench.iterations} iterations)`);
  console.log(`   Interpreter: ${interpTime.toFixed(2)}ms`);
  console.log(`   Generated JS: ${jsTime.toFixed(2)}ms`);
  console.log(`   Speedup: ${speedup}x`);
  console.log();
}
