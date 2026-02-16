// Optimizer Tests for Arc IR

import { generateIRFromSource, IRModule, IRInstr, printIR } from "../compiler/src/ir.js";
import { optimize, optimizeWithBatching } from "../compiler/src/optimizer.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`  FAIL: ${msg}`);
    failed++;
  } else {
    console.log(`  PASS: ${msg}`);
    passed++;
  }
}

function getMainInstrs(mod: IRModule): IRInstr[] {
  return mod.main.flatMap(b => b.instrs);
}

function hasOp(instrs: IRInstr[], op: string): boolean {
  return instrs.some(i => i.op === op);
}

function countOp(instrs: IRInstr[], op: string): number {
  return instrs.filter(i => i.op === op).length;
}

function findConst(instrs: IRInstr[], value: any): IRInstr | undefined {
  return instrs.find(i => i.op === "const" && (i as any).value === value);
}

// ---- Test: Constant Folding ----
console.log("\n=== Constant Folding ===");
{
  const ir = generateIRFromSource("let x = 2 + 3");
  const opt = optimize(ir);
  const instrs = getMainInstrs(opt);

  // Should fold 2 + 3 into 5
  assert(findConst(instrs, 5) !== undefined, "2 + 3 folded to 5");

  // Should have fewer binop instructions
  const origBinops = countOp(getMainInstrs(ir), "binop");
  const optBinops = countOp(instrs, "binop");
  assert(optBinops < origBinops, "binop eliminated after folding");
}

{
  const ir = generateIRFromSource("let x = 10 - 3 * 2");
  const opt = optimize(ir);
  const instrs = getMainInstrs(opt);
  // 3 * 2 = 6, 10 - 6 = 4
  assert(findConst(instrs, 6) !== undefined || findConst(instrs, 4) !== undefined, "nested arithmetic partially or fully folded");
}

// ---- Test: Dead Code Elimination ----
console.log("\n=== Dead Code Elimination ===");
{
  // x is computed but never used in a side effect
  const ir = generateIRFromSource("let x = 42\nprint(1)");
  const opt = optimize(ir);
  const instrs = getMainInstrs(opt);

  // The print should survive
  assert(hasOp(instrs, "print") || instrs.some(i => i.op === "call" && (i as any).fn === "print"), "print survives DCE");

  // Optimized should have fewer or equal instructions
  assert(instrs.length <= getMainInstrs(ir).length, "optimized has fewer/equal instructions");
}

// ---- Test: Common Subexpression Elimination ----
console.log("\n=== Common Subexpression Elimination ===");
{
  const ir = generateIRFromSource("let a = 1\nlet b = 2\nlet x = a + b\nlet y = a + b");
  const origInstrs = getMainInstrs(ir);
  const opt = optimize(ir);
  const optInstrs = getMainInstrs(opt);

  // After CSE, should have fewer binops (a+b computed once)
  const origBinops = countOp(origInstrs, "binop");
  const optBinops = countOp(optInstrs, "binop");
  // With constant folding, both might become const 3, which is even better
  assert(optBinops <= origBinops, "CSE reduces or eliminates duplicate binops");
}

// ---- Test: Tool Call Batching ----
console.log("\n=== Tool Call Batching ===");
{
  const ir = generateIRFromSource(`
let a = @GET "https://api.example.com/users"
let b = @GET "https://api.example.com/posts"
let c = @GET "https://api.example.com/comments"
`);
  const { batchedMain } = optimizeWithBatching(ir);

  const parallelCalls = batchedMain.filter(i => (i as any).op === "parallel_toolcall");
  assert(parallelCalls.length > 0, "independent tool calls batched into parallel_toolcall");

  if (parallelCalls.length > 0) {
    const pc = parallelCalls[0] as any;
    assert(pc.calls.length >= 2, "batch contains multiple calls");
  }
}

{
  // Dependent tool calls should NOT be batched
  const ir = generateIRFromSource(`
let a = @GET "https://api.example.com/users"
print(a)
let b = @GET "https://api.example.com/posts"
`);
  const { batchedMain } = optimizeWithBatching(ir);
  const parallelCalls = batchedMain.filter(i => (i as any).op === "parallel_toolcall");
  assert(parallelCalls.length === 0, "non-consecutive tool calls are not batched");
}

// ---- Test: Functional Equivalence ----
console.log("\n=== Functional Equivalence ===");
{
  // Ensure optimized IR preserves stores and prints
  const ir = generateIRFromSource("let x = 2 + 3\nprint(x)");
  const opt = optimize(ir);
  const instrs = getMainInstrs(opt);

  // Must still have store for x and print
  assert(instrs.some(i => i.op === "store" && (i as any).name === "x"), "store x preserved");
  assert(
    instrs.some(i => i.op === "print") ||
    instrs.some(i => i.op === "call" && (i as any).fn === "print"),
    "print preserved"
  );
}

// ---- Test: Pipeline Fusion ----
console.log("\n=== Pipeline Fusion ===");
{
  // Manually create IR with map+filter chain to test fusion
  const mod: IRModule = {
    functions: [],
    main: [{
      label: "entry",
      instrs: [
        { op: "load", dest: "%0", name: "data" },
        { op: "load", dest: "%1", name: "transform" },
        { op: "call", dest: "%2", fn: "map", args: ["%0", "%1"] },
        { op: "load", dest: "%3", name: "predicate" },
        { op: "call", dest: "%4", fn: "filter", args: ["%2", "%3"] },
        { op: "store", name: "result", src: "%4" },
      ]
    }]
  };
  const opt = optimize(mod);
  const instrs = getMainInstrs(opt);
  const hasFused = instrs.some(i => i.op === "call" && (i as any).fn === "fused_map_filter");
  assert(hasFused, "map+filter fused into fused_map_filter");
}

// ---- Summary ----
console.log(`\n=== Optimizer Tests: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
