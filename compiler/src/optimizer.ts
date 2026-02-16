// Arc IR Optimizer — Multi-pass optimization for Arc's SSA IR

import { IRInstr, IRBlock, IRFunction, IRModule } from "./ir.js";

// Extended IR instruction type for parallel tool calls
export type OptIRInstr = IRInstr | {
  op: "parallel_toolcall";
  dest: string;
  calls: { dest: string; method: string; url: string; body?: string }[];
};

// ---- Pass 1: Constant Folding ----

function constantFolding(instrs: IRInstr[]): IRInstr[] {
  const constants = new Map<string, number | string | boolean | null>();
  const result: IRInstr[] = [];

  for (const instr of instrs) {
    if (instr.op === "const") {
      constants.set(instr.dest, instr.value);
      result.push(instr);
      continue;
    }

    if (instr.op === "binop") {
      const lv = constants.get(instr.left);
      const rv = constants.get(instr.right);
      if (lv !== undefined && rv !== undefined && typeof lv === "number" && typeof rv === "number") {
        let folded: number | boolean | null = null;
        let isBoolean = false;
        switch (instr.operator) {
          case "+": folded = lv + rv; break;
          case "-": folded = lv - rv; break;
          case "*": folded = lv * rv; break;
          case "/": folded = rv !== 0 ? lv / rv : null; break;
          case "%": folded = rv !== 0 ? lv % rv : null; break;
          case "==": folded = lv === rv; isBoolean = true; break;
          case "!=": folded = lv !== rv; isBoolean = true; break;
          case "<": folded = lv < rv; isBoolean = true; break;
          case ">": folded = lv > rv; isBoolean = true; break;
          case "<=": folded = lv <= rv; isBoolean = true; break;
          case ">=": folded = lv >= rv; isBoolean = true; break;
        }
        if (folded !== null) {
          constants.set(instr.dest, folded);
          result.push({ op: "const", dest: instr.dest, value: folded });
          continue;
        }
      }
      // String concat folding
      if (instr.operator === "++" && typeof lv === "string" && typeof rv === "string") {
        const folded = lv + rv;
        constants.set(instr.dest, folded);
        result.push({ op: "const", dest: instr.dest, value: folded });
        continue;
      }
      // Boolean operator folding
      if ((instr.operator === "and" || instr.operator === "or") && typeof lv === "boolean" && typeof rv === "boolean") {
        const folded = instr.operator === "and" ? lv && rv : lv || rv;
        constants.set(instr.dest, folded);
        result.push({ op: "const", dest: instr.dest, value: folded });
        continue;
      }
    }

    if (instr.op === "unop") {
      const v = constants.get(instr.operand);
      if (v !== undefined) {
        let folded: number | boolean | null = null;
        if (instr.operator === "-" && typeof v === "number") folded = -v;
        if (instr.operator === "not" && typeof v === "boolean") folded = !v;
        if (folded !== null) {
          constants.set(instr.dest, folded);
          result.push({ op: "const", dest: instr.dest, value: folded });
          continue;
        }
      }
    }

    result.push(instr);
  }

  return result;
}

// ---- Pass 2: Constant Propagation ----

function constantPropagation(instrs: IRInstr[]): IRInstr[] {
  // Build map of SSA temps that are assigned exactly once to a const
  const constants = new Map<string, number | string | boolean | null>();
  for (const instr of instrs) {
    if (instr.op === "const") {
      constants.set(instr.dest, instr.value);
    }
  }

  // Replace uses of constant temps
  return instrs.map(instr => {
    if (instr.op === "binop") {
      return { ...instr };
    }
    return instr;
  });
  // Note: constant propagation mostly helps after folding converts binops to consts.
  // The main benefit is enabling dead code elimination.
}

// ---- Pass 3: Dead Code Elimination ----

function deadCodeElimination(instrs: IRInstr[]): IRInstr[] {
  // Find all used temporaries
  const used = new Set<string>();

  function addUses(instr: IRInstr) {
    switch (instr.op) {
      case "binop": used.add(instr.left); used.add(instr.right); break;
      case "unop": used.add(instr.operand); break;
      case "call": instr.args.forEach(a => used.add(a)); break;
      case "toolcall": used.add(instr.url); if (instr.body) used.add(instr.body); break;
      case "store": used.add(instr.src); break;
      case "load": break;
      case "field": used.add(instr.obj); break;
      case "index": used.add(instr.obj); used.add(instr.idx); break;
      case "setfield": used.add(instr.obj); used.add(instr.src); break;
      case "setindex": used.add(instr.obj); used.add(instr.idx); used.add(instr.src); break;
      case "branch": used.add(instr.cond); break;
      case "ret": if (instr.value) used.add(instr.value); break;
      case "print": used.add(instr.value); break;
      case "list": instr.elements.forEach(e => used.add(e)); break;
      case "map": instr.keys.forEach(k => used.add(k)); instr.values.forEach(v => used.add(v)); break;
      case "range": used.add(instr.start); used.add(instr.end); break;
      case "phi": instr.sources.forEach(s => used.add(s.value)); break;
    }
  }

  // Collect all uses
  for (const instr of instrs) {
    addUses(instr);
  }

  // Instructions with side effects are never dead
  const hasSideEffect = (instr: IRInstr): boolean => {
    switch (instr.op) {
      case "store": case "setfield": case "setindex":
      case "call": case "toolcall":
      case "print": case "ret":
      case "jump": case "branch": case "label": case "nop":
        return true;
      default:
        return false;
    }
  };

  // Remove instructions whose dest is never used (and have no side effects)
  return instrs.filter(instr => {
    if (hasSideEffect(instr)) return true;
    // Check if this instr defines a dest that's used
    const dest = (instr as any).dest;
    if (dest && !used.has(dest)) return false;
    return true;
  });
}

// ---- Pass 4: Common Subexpression Elimination ----

function commonSubexprElimination(instrs: IRInstr[]): IRInstr[] {
  const seen = new Map<string, string>(); // key -> dest
  const remap = new Map<string, string>(); // old dest -> replacement dest

  function resolve(name: string): string {
    return remap.get(name) ?? name;
  }

  const result: IRInstr[] = [];

  for (const instr of instrs) {
    if (instr.op === "binop") {
      const left = resolve(instr.left);
      const right = resolve(instr.right);
      const key = `binop:${instr.operator}:${left}:${right}`;
      const existing = seen.get(key);
      if (existing) {
        remap.set(instr.dest, existing);
        continue; // eliminate duplicate
      }
      const newInstr = { ...instr, left, right };
      seen.set(key, instr.dest);
      result.push(newInstr);
    } else {
      // Apply remapping to all operands
      result.push(remapInstr(instr, remap));
    }
  }

  return result;
}

function remapInstr(instr: IRInstr, remap: Map<string, string>): IRInstr {
  function r(name: string): string { return remap.get(name) ?? name; }

  switch (instr.op) {
    case "binop": return { ...instr, left: r(instr.left), right: r(instr.right) };
    case "unop": return { ...instr, operand: r(instr.operand) };
    case "call": return { ...instr, args: instr.args.map(r) };
    case "toolcall": return { ...instr, url: r(instr.url), body: instr.body ? r(instr.body) : undefined };
    case "store": return { ...instr, src: r(instr.src) };
    case "field": return { ...instr, obj: r(instr.obj) };
    case "index": return { ...instr, obj: r(instr.obj), idx: r(instr.idx) };
    case "setfield": return { ...instr, obj: r(instr.obj), src: r(instr.src) };
    case "setindex": return { ...instr, obj: r(instr.obj), idx: r(instr.idx), src: r(instr.src) };
    case "branch": return { ...instr, cond: r(instr.cond) };
    case "ret": return { ...instr, value: instr.value ? r(instr.value) : undefined };
    case "print": return { ...instr, value: r(instr.value) };
    case "list": return { ...instr, elements: instr.elements.map(r) };
    case "map": return { ...instr, keys: instr.keys.map(r), values: instr.values.map(r) };
    case "range": return { ...instr, start: r(instr.start), end: r(instr.end) };
    case "phi": return { ...instr, sources: instr.sources.map(s => ({ ...s, value: r(s.value) })) };
    default: return instr;
  }
}

// ---- Pass 5: Tool Call Batching (Arc-specific) ----

function toolCallBatching(instrs: IRInstr[]): (IRInstr | OptIRInstr)[] {
  // Find all toolcall instructions and check if they can be batched
  // Two toolcalls are independent if neither uses the other's dest
  const toolcallIndices: number[] = [];
  for (let i = 0; i < instrs.length; i++) {
    if (instrs[i].op === "toolcall") toolcallIndices.push(i);
  }

  if (toolcallIndices.length < 2) return [...instrs];

  // Group consecutive-ish toolcalls (only separated by const/store that don't create dependencies)
  const groups: number[][] = [];
  let currentGroup: number[] = [toolcallIndices[0]];

  for (let g = 1; g < toolcallIndices.length; g++) {
    const prevIdx = toolcallIndices[g - 1];
    const currIdx = toolcallIndices[g];
    const tc = instrs[currIdx] as Extract<IRInstr, { op: "toolcall" }>;

    // Check if any instruction between prev toolcall and this one uses a toolcall dest
    const prevDests = new Set(currentGroup.map(i => (instrs[i] as any).dest));
    const deps = [tc.url];
    if (tc.body) deps.push(tc.body);

    // Check instructions between for side effects that would prevent reordering
    let canBatch = true;
    for (let j = prevIdx + 1; j < currIdx; j++) {
      const between = instrs[j];
      // If any instruction between uses a toolcall dest from current batch, can't batch
      // Stores of toolcall results are fine - they just save the value
      // Only block if a store's value is used by subsequent instructions before the next toolcall
      if (between.op === "print") { canBatch = false; break; }
      if (between.op === "call") { canBatch = false; break; }
      if (between.op === "branch") { canBatch = false; break; }
    }
    // Check if this toolcall depends on a previous one's result
    if (deps.some(d => prevDests.has(d))) canBatch = false;

    if (canBatch) {
      currentGroup.push(currIdx);
    } else {
      groups.push(currentGroup);
      currentGroup = [currIdx];
    }
  }
  groups.push(currentGroup);

  // Now emit: replace groups with parallel_toolcall
  const batchedIndices = new Set<number>();
  const batchAtIndex = new Map<number, OptIRInstr>(); // first toolcall index -> parallel

  for (const group of groups) {
    if (group.length < 2) continue;
    const calls = group.map(i => {
      const tc = instrs[i] as Extract<IRInstr, { op: "toolcall" }>;
      batchedIndices.add(i);
      return { dest: tc.dest, method: tc.method, url: tc.url, body: tc.body };
    });
    batchAtIndex.set(group[0], {
      op: "parallel_toolcall",
      dest: calls[0].dest,
      calls,
    } as OptIRInstr);
  }

  const result: (IRInstr | OptIRInstr)[] = [];
  for (let i = 0; i < instrs.length; i++) {
    if (batchAtIndex.has(i)) {
      result.push(batchAtIndex.get(i)!);
    } else if (!batchedIndices.has(i)) {
      result.push(instrs[i]);
    }
  }

  return result;
}

// ---- Pass 6: Pipeline Fusion (Arc-specific) ----
// Detect chains: call dest1 = map(x, f) ; call dest2 = filter(dest1, g) -> fused_map_filter

function pipelineFusion(instrs: IRInstr[]): IRInstr[] {
  // Build map of dest -> call instruction index for map/filter calls
  const callByDest = new Map<string, number>();
  for (let i = 0; i < instrs.length; i++) {
    const instr = instrs[i];
    if (instr.op === "call" && (instr.fn === "map" || instr.fn === "filter")) {
      callByDest.set(instr.dest, i);
    }
  }

  const fused = new Set<number>(); // indices to skip
  const fusionMap = new Map<number, IRInstr>(); // index -> replacement

  for (let i = 0; i < instrs.length; i++) {
    const instr = instrs[i];
    if (instr.op === "call" && (instr.fn === "map" || instr.fn === "filter")) {
      // Check if first arg is the dest of a map/filter call
      const srcIdx = callByDest.get(instr.args[0]);
      if (srcIdx !== undefined && !fused.has(srcIdx)) {
        const src = instrs[srcIdx] as Extract<IRInstr, { op: "call" }>;
        if (
          (src.fn === "map" && instr.fn === "filter") ||
          (src.fn === "filter" && instr.fn === "map")
        ) {
          const fusedFn = src.fn === "map" ? "fused_map_filter" : "fused_filter_map";
          fusionMap.set(i, {
            op: "call",
            dest: instr.dest,
            fn: fusedFn,
            args: [src.args[0], src.args[1], instr.args[1]],
          });
          fused.add(srcIdx);
        }
      }
    }
  }

  const result: IRInstr[] = [];
  for (let i = 0; i < instrs.length; i++) {
    if (fused.has(i)) continue;
    if (fusionMap.has(i)) {
      result.push(fusionMap.get(i)!);
    } else {
      result.push(instrs[i]);
    }
  }
  return result;
}

// ---- Block-level: Remove unreachable blocks ----

function removeUnreachableBlocks(blocks: IRBlock[]): IRBlock[] {
  if (blocks.length === 0) return blocks;

  // Build set of reachable block labels
  const reachable = new Set<string>();
  const queue = [blocks[0].label];
  reachable.add(blocks[0].label);

  // Build label -> block map
  const blockMap = new Map<string, IRBlock>();
  for (const b of blocks) blockMap.set(b.label, b);

  // Also find jump/branch targets in instructions (including labels embedded in single-block IR)
  function findTargets(instrs: IRInstr[]): string[] {
    const targets: string[] = [];
    for (const instr of instrs) {
      if (instr.op === "jump") targets.push(instr.target);
      if (instr.op === "branch") { targets.push(instr.ifTrue); targets.push(instr.ifFalse); }
    }
    return targets;
  }

  while (queue.length > 0) {
    const label = queue.pop()!;
    const block = blockMap.get(label);
    if (!block) continue;
    for (const target of findTargets(block.instrs)) {
      if (!reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }

  return blocks.filter(b => reachable.has(b.label));
}

// ---- Optimize a single block's instructions ----

function optimizeInstrs(instrs: IRInstr[]): IRInstr[] {
  let result = instrs;
  // Run passes in order, iterating for convergence
  for (let iter = 0; iter < 3; iter++) {
    const prev = result.length;
    result = constantFolding(result);
    result = commonSubexprElimination(result);
    result = pipelineFusion(result);
    result = deadCodeElimination(result);
    if (result.length === prev) break;
  }
  return result;
}

// ---- Main optimize function ----

export function optimize(module: IRModule): IRModule {
  const optimizedFunctions = module.functions.map(fn => ({
    ...fn,
    blocks: removeUnreachableBlocks(
      fn.blocks.map(b => ({ ...b, instrs: optimizeInstrs(b.instrs) }))
    ),
  }));

  const optimizedMain = removeUnreachableBlocks(
    module.main.map(b => ({ ...b, instrs: optimizeInstrs(b.instrs) }))
  );

  return {
    functions: optimizedFunctions,
    main: optimizedMain,
  };
}

// Tool call batching runs separately since it produces extended IR
export function optimizeWithBatching(module: IRModule): { module: IRModule; batchedMain: (IRInstr | OptIRInstr)[] } {
  const optimized = optimize(module);
  const mainInstrs = optimized.main.flatMap(b => b.instrs);
  const batched = toolCallBatching(mainInstrs);
  return { module: optimized, batchedMain: batched as (IRInstr | OptIRInstr)[] };
}

// Format optimized IR (including parallel_toolcall)
export function formatOptInstr(instr: IRInstr | OptIRInstr): string {
  if ((instr as any).op === "parallel_toolcall") {
    const pt = instr as Extract<OptIRInstr, { op: "parallel_toolcall" }>;
    const calls = pt.calls.map(c => `${c.dest} = @${c.method} ${c.url}${c.body ? ` ${c.body}` : ""}`).join(", ");
    return `parallel_toolcall [${calls}]`;
  }
  return ""; // Use printIR's formatInstr for regular instructions
}
