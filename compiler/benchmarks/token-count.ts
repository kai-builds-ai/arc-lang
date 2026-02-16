// Arc vs JavaScript Token Count Comparison
// Counts whitespace-separated tokens as a rough proxy for code density

import { readFileSync, readdirSync } from "fs";
import { resolve, join } from "path";

const examplesDir = resolve(import.meta.dirname ?? __dirname, "../../examples");

// Simple token counter: split on whitespace and punctuation boundaries
function countTokens(source: string): number {
  // Remove comments
  const noComments = source.replace(/#.*$/gm, "").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  // Tokenize: identifiers, numbers, strings, operators, punctuation
  const tokens = noComments.match(/\b\w+\b|"[^"]*"|'[^']*'|`[^`]*`|[^\s\w]/g);
  return tokens ? tokens.length : 0;
}

// Equivalent JS implementations for comparison
const jsEquivalents: Record<string, string> = {
  "fizzbuzz.arc": `
for (let i = 1; i <= 100; i++) {
  if (i % 15 === 0) console.log("FizzBuzz");
  else if (i % 3 === 0) console.log("Fizz");
  else if (i % 5 === 0) console.log("Buzz");
  else console.log(i);
}
const results = Array.from({length: 100}, (_, i) => {
  const n = i + 1;
  if (n % 15 === 0) return "FizzBuzz";
  if (n % 3 === 0) return "Fizz";
  if (n % 5 === 0) return "Buzz";
  return String(n);
});
console.log(results);
`,
  "fibonacci.arc": `
function fib_rec(n) {
  if (n === 0) return 0;
  if (n === 1) return 1;
  return fib_rec(n - 1) + fib_rec(n - 2);
}
function fib_iter(n) {
  let a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    const temp = b;
    b = a + b;
    a = temp;
  }
  return a;
}
const memo = new Map([[0, 0], [1, 1]]);
function fib_memo(n) {
  if (memo.has(n)) return memo.get(n);
  const result = fib_memo(n - 1) + fib_memo(n - 2);
  memo.set(n, result);
  return result;
}
console.log("Recursive fib(10): " + fib_rec(10));
console.log("Iterative fib(10): " + fib_iter(10));
console.log("Memoized  fib(10): " + fib_memo(10));
const sequence = Array.from({length: 15}, (_, i) => fib_iter(i));
console.log("First 15: " + JSON.stringify(sequence));
`,
  "hello-world.arc": `
const name = "World";
console.log("Hello, " + name + "!");
function add(a, b) { return a + b; }
const result = add(3, 4);
console.log("3 + 4 = " + result);
const numbers = [1, 2, 3, 4, 5];
const doubled = numbers.map(x => x * 2);
console.log("Doubled: " + JSON.stringify(doubled));
const total = numbers.reduce((a, b) => a + b, 0);
console.log("Sum: " + total);
function describe(n) {
  if (n === 0) return "zero";
  if (n === 1) return "one";
  return "many";
}
console.log(describe(0));
console.log(describe(1));
console.log(describe(42));
const x = 10;
const label = x > 5 ? "big" : "small";
console.log("x is " + label);
const greeting = "hello" + " " + "world";
console.log(greeting);
for (const i of [1, 2, 3]) {
  console.log("item: " + i);
}
`,
  "sorting.arc": `
function quicksort(arr) {
  if (arr.length === 0) return [];
  const [pivot, ...rest] = arr;
  const lo = rest.filter(x => x < pivot);
  const hi = rest.filter(x => x >= pivot);
  return [...quicksort(lo), pivot, ...quicksort(hi)];
}
function merge(a, b) {
  if (a.length === 0) return b;
  if (b.length === 0) return a;
  const [x, ...xs] = a;
  const [y, ...ys] = b;
  if (x <= y) return [x, ...merge(xs, [y, ...ys])];
  return [y, ...merge([x, ...xs], ys)];
}
function mergesort(arr) {
  if (arr.length <= 1) return arr;
  const mid = Math.floor(arr.length / 2);
  return merge(mergesort(arr.slice(0, mid)), mergesort(arr.slice(mid)));
}
function insert(x, sorted) {
  if (sorted.length === 0) return [x];
  const [h, ...t] = sorted;
  if (x <= h) return [x, ...sorted];
  return [h, ...insert(x, t)];
}
function insertionSort(arr) {
  return arr.reduce((acc, x) => insert(x, acc), []);
}
const data = [38, 27, 43, 3, 9, 82, 10];
console.log("Original:  " + JSON.stringify(data));
console.log("Quicksort: " + JSON.stringify(quicksort(data)));
console.log("Mergesort: " + JSON.stringify(mergesort(data)));
console.log("Insertion: " + JSON.stringify(insertionSort(data)));
const words = ["banana", "apple", "cherry", "date"];
console.log("Sorted words: " + JSON.stringify(quicksort(words)));
`,
};

console.log("╔════════════════════════════════════════════════════════════╗");
console.log("║          Arc vs JavaScript — Token Count Comparison       ║");
console.log("╚════════════════════════════════════════════════════════════╝");
console.log("");

let totalArc = 0;
let totalJS = 0;
let compared = 0;

const files = readdirSync(examplesDir).filter(f => f.endsWith(".arc")).sort();

for (const file of files) {
  const arcSource = readFileSync(join(examplesDir, file), "utf-8");
  const arcTokens = countTokens(arcSource);

  const jsSource = jsEquivalents[file];
  if (jsSource) {
    const jsTokens = countTokens(jsSource);
    totalArc += arcTokens;
    totalJS += jsTokens;
    compared++;
    const savings = ((1 - arcTokens / jsTokens) * 100).toFixed(0);
    const bar = "█".repeat(Math.max(1, Math.round(arcTokens / 5))) + " ";
    const barJS = "░".repeat(Math.max(1, Math.round(jsTokens / 5)));
    console.log(`  ${file.padEnd(25)} Arc: ${String(arcTokens).padStart(4)} │ JS: ${String(jsTokens).padStart(4)} │ ${savings.padStart(3)}% fewer`);
    console.log(`${"".padEnd(28)} ${bar}`);
    console.log(`${"".padEnd(28)} ${barJS}`);
  } else {
    console.log(`  ${file.padEnd(25)} Arc: ${String(arcTokens).padStart(4)} │ (no JS equivalent)`);
  }
}

console.log("");
if (compared > 0) {
  const totalSavings = ((1 - totalArc / totalJS) * 100).toFixed(0);
  console.log(`  Compared: ${compared} examples`);
  console.log(`  Total Arc tokens: ${totalArc}`);
  console.log(`  Total JS tokens:  ${totalJS}`);
  console.log(`  Average savings:  ${totalSavings}% fewer tokens`);
}
console.log("");
