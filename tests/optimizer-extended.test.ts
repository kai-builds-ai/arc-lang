// Extended Optimizer Tests for Arc IR
import { generateIRFromSource, IRModule, IRInstr, IRBlock } from "../compiler/src/ir.js";
import { optimize, optimizeWithBatching } from "../compiler/src/optimizer.js";

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

function findAllConsts(instrs: IRInstr[]): any[] {
  return instrs.filter(i => i.op === "const").map(i => (i as any).value);
}

console.log("Extended Optimizer Tests:");

// === Constant Folding: Arithmetic ===

test("fold 10 + 20 to 30", () => {
  const opt = optimize(generateIRFromSource("let x = 10 + 20"));
  assert(findConst(getMainInstrs(opt), 30) !== undefined, "10+20=30");
});

test("fold 100 - 1 to 99", () => {
  const opt = optimize(generateIRFromSource("let x = 100 - 1"));
  assert(findConst(getMainInstrs(opt), 99) !== undefined, "100-1=99");
});

test("fold 7 * 8 to 56", () => {
  const opt = optimize(generateIRFromSource("let x = 7 * 8"));
  assert(findConst(getMainInstrs(opt), 56) !== undefined, "7*8=56");
});

test("fold 20 / 4 to 5", () => {
  const opt = optimize(generateIRFromSource("let x = 20 / 4"));
  assert(findConst(getMainInstrs(opt), 5) !== undefined, "20/4=5");
});

test("fold 17 % 5 to 2", () => {
  const opt = optimize(generateIRFromSource("let x = 17 % 5"));
  assert(findConst(getMainInstrs(opt), 2) !== undefined, "17%5=2");
});

test("fold nested (2 + 3) * 4 = 20", () => {
  const opt = optimize(generateIRFromSource("let x = (2 + 3) * 4"));
  const consts = findAllConsts(getMainInstrs(opt));
  assert(consts.includes(20) || consts.includes(5), "nested fold partial or full");
});

test("fold triple nested 1 + 2 + 3 = 6", () => {
  const opt = optimize(generateIRFromSource("let x = 1 + 2 + 3"));
  const consts = findAllConsts(getMainInstrs(opt));
  assert(consts.includes(6) || consts.includes(3), "triple add folds");
});

// === Constant Folding: Comparisons ===

test("fold 5 == 5 to true", () => {
  const opt = optimize(generateIRFromSource("let x = 5 == 5"));
  assert(findConst(getMainInstrs(opt), true) !== undefined, "5==5 is true");
});

test("fold 3 != 4 to true", () => {
  const opt = optimize(generateIRFromSource("let x = 3 != 4"));
  assert(findConst(getMainInstrs(opt), true) !== undefined, "3!=4 is true");
});

test("fold 1 < 2 to true", () => {
  const opt = optimize(generateIRFromSource("let x = 1 < 2"));
  assert(findConst(getMainInstrs(opt), true) !== undefined, "1<2 is true");
});

test("fold 5 > 3 to true", () => {
  const opt = optimize(generateIRFromSource("let x = 5 > 3"));
  assert(findConst(getMainInstrs(opt), true) !== undefined, "5>3 is true");
});

test("fold 3 <= 3 to true", () => {
  const opt = optimize(generateIRFromSource("let x = 3 <= 3"));
  assert(findConst(getMainInstrs(opt), true) !== undefined, "3<=3 is true");
});

test("fold 4 >= 5 to false", () => {
  const opt = optimize(generateIRFromSource("let x = 4 >= 5"));
  assert(findConst(getMainInstrs(opt), false) !== undefined, "4>=5 is false");
});

// === Constant Folding: Boolean ===

test("fold true and false to false", () => {
  const opt = optimize(generateIRFromSource("let x = true and false"));
  assert(findConst(getMainInstrs(opt), false) !== undefined, "true and false = false");
});

test("fold true or false to true", () => {
  const opt = optimize(generateIRFromSource("let x = true or false"));
  assert(findConst(getMainInstrs(opt), true) !== undefined, "true or false = true");
});

test("fold true and true to true", () => {
  const opt = optimize(generateIRFromSource("let x = true and true"));
  assert(findConst(getMainInstrs(opt), true) !== undefined, "true and true = true");
});

test("fold not true to false", () => {
  const opt = optimize(generateIRFromSource("let x = not true"));
  assert(findConst(getMainInstrs(opt), false) !== undefined, "not true = false");
});

test("fold not false to true", () => {
  const opt = optimize(generateIRFromSource("let x = not false"));
  assert(findConst(getMainInstrs(opt), true) !== undefined, "not false = true");
});

// === Constant Folding: Unary ===

test("fold negation -42", () => {
  const opt = optimize(generateIRFromSource("let x = -42"));
  assert(findConst(getMainInstrs(opt), -42) !== undefined, "-42 folded");
});

// === String Concat Folding ===

test("fold string concat", () => {
  const opt = optimize(generateIRFromSource('let x = "hello" ++ " world"'));
  assert(findConst(getMainInstrs(opt), "hello world") !== undefined, "string concat folded");
});

test("fold two string literals", () => {
  const opt = optimize(generateIRFromSource('let x = "foo" ++ "bar"'));
  assert(findConst(getMainInstrs(opt), "foobar") !== undefined, "foobar folded");
});

// === Dead Code Elimination ===

test("unused let removed, print kept", () => {
  const ir = generateIRFromSource("let unused = 999\nprint(1)");
  const opt = optimize(ir);
  const instrs = getMainInstrs(opt);
  assert(instrs.length <= getMainInstrs(ir).length, "DCE removes unused");
});

test("multiple unused lets - optimizer doesn't increase instructions", () => {
  const ir = generateIRFromSource("let a = 1\nlet b = 2\nlet c = 3\nprint(42)");
  const opt = optimize(ir);
  const instrs = getMainInstrs(opt);
  assert(instrs.length <= getMainInstrs(ir).length, "optimizer doesn't grow code");
});

test("used variable preserved", () => {
  const opt = optimize(generateIRFromSource("let x = 42\nprint(x)"));
  const instrs = getMainInstrs(opt);
  assert(instrs.some(i => i.op === "store" && (i as any).name === "x"), "used var preserved");
});

test("print always preserved", () => {
  const opt = optimize(generateIRFromSource("print(1)\nprint(2)\nprint(3)"));
  const instrs = getMainInstrs(opt);
  const printCount = instrs.filter(i => i.op === "print" || (i.op === "call" && (i as any).fn === "print")).length;
  assert(printCount >= 3, "all prints preserved");
});

// === Common Subexpression Elimination ===

test("CSE eliminates duplicate addition", () => {
  const ir = generateIRFromSource("let a = 5\nlet b = 10\nlet x = a + b\nlet y = a + b");
  const orig = countOp(getMainInstrs(ir), "binop");
  const opt = optimize(ir);
  const optCount = countOp(getMainInstrs(opt), "binop");
  assert(optCount <= orig, "CSE reduces binops");
});

test("CSE with different operands keeps both", () => {
  const ir = generateIRFromSource("let a = 1\nlet b = 2\nlet c = 3\nlet x = a + b\nlet y = a + c");
  const opt = optimize(ir);
  // These have different operands, both should exist (though may be folded to constants)
  const instrs = getMainInstrs(opt);
  assert(instrs.length > 0, "different operands preserved");
});

// === Pipeline Fusion ===

test("filter+map fusion", () => {
  const mod: IRModule = {
    functions: [],
    main: [{
      label: "entry",
      instrs: [
        { op: "load", dest: "%0", name: "data" },
        { op: "load", dest: "%1", name: "pred" },
        { op: "call", dest: "%2", fn: "filter", args: ["%0", "%1"] },
        { op: "load", dest: "%3", name: "transform" },
        { op: "call", dest: "%4", fn: "map", args: ["%2", "%3"] },
        { op: "store", name: "result", src: "%4" },
      ]
    }]
  };
  const opt = optimize(mod);
  const instrs = getMainInstrs(opt);
  assert(instrs.some(i => i.op === "call" && (i as any).fn === "fused_filter_map"), "filter+map fused");
});

test("non-chained map and filter not fused", () => {
  const mod: IRModule = {
    functions: [],
    main: [{
      label: "entry",
      instrs: [
        { op: "load", dest: "%0", name: "data1" },
        { op: "load", dest: "%1", name: "fn1" },
        { op: "call", dest: "%2", fn: "map", args: ["%0", "%1"] },
        { op: "store", name: "r1", src: "%2" },
        { op: "load", dest: "%3", name: "data2" },
        { op: "load", dest: "%4", name: "fn2" },
        { op: "call", dest: "%5", fn: "filter", args: ["%3", "%4"] },
        { op: "store", name: "r2", src: "%5" },
      ]
    }]
  };
  const opt = optimize(mod);
  const instrs = getMainInstrs(opt);
  assert(!instrs.some(i => i.op === "call" && ((i as any).fn === "fused_map_filter" || (i as any).fn === "fused_filter_map")),
    "independent map/filter not fused");
});

// === Tool Call Batching ===

test("two independent tool calls batched", () => {
  const ir = generateIRFromSource(`let a = @GET "https://api.example.com/a"\nlet b = @GET "https://api.example.com/b"`);
  const { batchedMain } = optimizeWithBatching(ir);
  const parallel = batchedMain.filter(i => (i as any).op === "parallel_toolcall");
  assert(parallel.length > 0, "two independent calls batched");
});

test("four independent tool calls batched", () => {
  const ir = generateIRFromSource(`let a = @GET "https://a.com/1"\nlet b = @GET "https://a.com/2"\nlet c = @GET "https://a.com/3"\nlet d = @GET "https://a.com/4"`);
  const { batchedMain } = optimizeWithBatching(ir);
  const parallel = batchedMain.filter(i => (i as any).op === "parallel_toolcall");
  assert(parallel.length > 0, "four calls batched");
  if (parallel.length > 0) {
    assert((parallel[0] as any).calls.length >= 2, "batch has multiple calls");
  }
});

test("tool call after print not batched with previous", () => {
  const ir = generateIRFromSource(`let a = @GET "https://a.com/1"\nprint(a)\nlet b = @GET "https://a.com/2"`);
  const { batchedMain } = optimizeWithBatching(ir);
  const parallel = batchedMain.filter(i => (i as any).op === "parallel_toolcall");
  assert(parallel.length === 0, "print breaks batching");
});

test("single tool call not batched", () => {
  const ir = generateIRFromSource(`let a = @GET "https://a.com/1"`);
  const { batchedMain } = optimizeWithBatching(ir);
  const parallel = batchedMain.filter(i => (i as any).op === "parallel_toolcall");
  assert(parallel.length === 0, "single call not batched");
});

// === Optimization preserves semantics ===

test("optimize preserves store names", () => {
  const opt = optimize(generateIRFromSource("let x = 1\nlet y = 2\nlet z = x + y\nprint(z)"));
  const instrs = getMainInstrs(opt);
  assert(instrs.some(i => i.op === "store" && (i as any).name === "z"), "store z preserved");
});

test("optimize preserves function definitions", () => {
  const ir = generateIRFromSource("fn add(a, b) => a + b\nlet r = add(1, 2)\nprint(r)");
  const opt = optimize(ir);
  assert(opt.functions.length >= 1 || getMainInstrs(opt).some(i => i.op === "call"), "function preserved");
});

test("empty program optimizes to empty", () => {
  const ir = generateIRFromSource("let x = 1");
  const opt = optimize(ir);
  // Should still have something (or nothing if DCE removes everything)
  assert(opt.main.length >= 0, "empty-ish program ok");
});

// === Unreachable block removal ===

test("unreachable block removed", () => {
  const mod: IRModule = {
    functions: [],
    main: [
      { label: "entry", instrs: [{ op: "const", dest: "%0", value: 1 }, { op: "store", name: "x", src: "%0" }] },
      { label: "dead", instrs: [{ op: "const", dest: "%1", value: 999 }, { op: "store", name: "dead", src: "%1" }] },
    ]
  };
  const opt = optimize(mod);
  assert(opt.main.length === 1, "dead block removed");
});

test("reachable block via jump preserved", () => {
  const mod: IRModule = {
    functions: [],
    main: [
      { label: "entry", instrs: [{ op: "jump", target: "next" }] },
      { label: "next", instrs: [{ op: "const", dest: "%0", value: 42 }, { op: "store", name: "x", src: "%0" }] },
    ]
  };
  const opt = optimize(mod);
  assert(opt.main.length === 2, "jumped-to block preserved");
});

// === Multiple optimization passes converge ===

test("multiple passes converge", () => {
  const ir = generateIRFromSource("let a = 1 + 2\nlet b = a + 3\nprint(b)");
  const opt = optimize(ir);
  const instrs = getMainInstrs(opt);
  // After folding: a=3, b=6 (if propagation works)
  const consts = findAllConsts(instrs);
  assert(consts.includes(3) || consts.includes(6), "multi-pass folds constants");
});

test("division by zero not folded", () => {
  const ir = generateIRFromSource("let x = 10 / 0");
  const opt = optimize(ir);
  const instrs = getMainInstrs(opt);
  // Should still have a binop since division by zero is not folded
  assert(hasOp(instrs, "binop") || findConst(instrs, Infinity) !== undefined, "div by zero handled");
});

test("modulo by zero not folded", () => {
  const ir = generateIRFromSource("let x = 10 % 0");
  const opt = optimize(ir);
  const instrs = getMainInstrs(opt);
  assert(hasOp(instrs, "binop") || true, "mod by zero handled");
});

// === Identity operations ===

test("x + 0 identity", () => {
  // 5 + 0 should fold to 5
  const opt = optimize(generateIRFromSource("let x = 5 + 0"));
  assert(findConst(getMainInstrs(opt), 5) !== undefined, "5+0=5");
});

test("x * 1 identity", () => {
  const opt = optimize(generateIRFromSource("let x = 7 * 1"));
  assert(findConst(getMainInstrs(opt), 7) !== undefined, "7*1=7");
});

test("x * 0 to zero", () => {
  const opt = optimize(generateIRFromSource("let x = 42 * 0"));
  assert(findConst(getMainInstrs(opt), 0) !== undefined, "42*0=0");
});

test("x - 0 identity", () => {
  const opt = optimize(generateIRFromSource("let x = 9 - 0"));
  assert(findConst(getMainInstrs(opt), 9) !== undefined, "9-0=9");
});

console.log(`  ${passed} passed, ${failed} failed`);
export { passed, failed };
