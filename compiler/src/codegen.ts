// Arc IR → WAT (WebAssembly Text Format) Code Generator

import { IRModule, IRBlock, IRInstr, IRFunction } from "./ir.js";

export function generateWAT(module: IRModule): string {
  const gen = new WATGenerator();
  return gen.generate(module);
}

class WATGenerator {
  private locals: Set<string> = new Set();
  private stringTable: Map<string, number> = new Map();
  private stringOffset = 0;
  private dataSegments: string[] = [];

  generate(module: IRModule): string {
    const lines: string[] = [];

    // First pass: collect all strings and locals
    this.collectStrings(module);

    lines.push("(module");

    // Import runtime functions
    lines.push('  ;; Runtime imports');
    lines.push('  (import "arc" "print_i32" (func $print_i32 (param i32)))');
    lines.push('  (import "arc" "print_f64" (func $print_f64 (param f64)))');
    lines.push('  (import "arc" "print_str" (func $print_str (param i32 i32)))');
    lines.push('  (import "arc" "tool_call" (func $tool_call (param i32 i32 i32 i32) (result i32)))');
    lines.push('  (import "arc" "alloc" (func $alloc (param i32) (result i32)))');
    lines.push('  (import "arc" "list_new" (func $list_new (result i32)))');
    lines.push('  (import "arc" "list_push" (func $list_push (param i32 i32) (result i32)))');
    lines.push('  (import "arc" "list_get" (func $list_get (param i32 i32) (result i32)))');
    lines.push('  (import "arc" "list_len" (func $list_len (param i32) (result i32)))');
    lines.push('  (import "arc" "map_new" (func $map_new (result i32)))');
    lines.push('  (import "arc" "map_set" (func $map_set (param i32 i32 i32) (result i32)))');
    lines.push('  (import "arc" "map_get" (func $map_get (param i32 i32) (result i32)))');
    lines.push("");

    // Memory
    lines.push("  (memory (export \"memory\") 1)");
    lines.push("");

    // Data segments for strings
    if (this.dataSegments.length > 0) {
      lines.push("  ;; String data");
      for (const seg of this.dataSegments) {
        lines.push(`  ${seg}`);
      }
      lines.push("");
    }

    // Global variables for locals (simple approach: use globals for main scope)
    lines.push("  ;; Globals");
    lines.push(`  (global $__sp (mut i32) (i32.const ${this.stringOffset}))`);
    lines.push("");

    // Emit functions
    for (const fn of module.functions) {
      lines.push(this.emitFunction(fn));
      lines.push("");
    }

    // Emit main as _start
    lines.push('  (func (export "_start")');
    this.locals.clear();
    // Collect locals from main blocks
    for (const block of module.main) {
      this.collectLocals(block);
    }
    for (const local of this.locals) {
      lines.push(`    (local $${sanitize(local)} i32)`);
    }
    for (const block of module.main) {
      lines.push(...this.emitBlockInstrs(block, "    "));
    }
    lines.push("  )");

    lines.push(")");
    return lines.join("\n");
  }

  private collectStrings(module: IRModule): void {
    const visit = (instrs: IRInstr[]) => {
      for (const instr of instrs) {
        if (instr.op === "const" && typeof instr.value === "string") {
          this.addString(instr.value);
        }
      }
    };

    for (const fn of module.functions) {
      for (const block of fn.blocks) visit(block.instrs);
    }
    for (const block of module.main) visit(block.instrs);
  }

  private addString(s: string): number {
    if (this.stringTable.has(s)) return this.stringTable.get(s)!;
    const offset = this.stringOffset;
    const encoded = new TextEncoder().encode(s);
    this.stringTable.set(s, offset);
    // Escape for WAT data segment
    let escaped = "";
    for (const b of encoded) {
      escaped += "\\" + b.toString(16).padStart(2, "0");
    }
    this.dataSegments.push(`(data (i32.const ${offset}) "${escaped}")`);
    this.stringOffset += encoded.length;
    return offset;
  }

  private collectLocals(block: IRBlock): void {
    for (const instr of block.instrs) {
      if ("dest" in instr && instr.dest) this.locals.add(instr.dest);
      if (instr.op === "store") this.locals.add(instr.name);
    }
  }

  private emitFunction(fn: IRFunction): string {
    const lines: string[] = [];
    this.locals.clear();

    // Collect locals
    for (const block of fn.blocks) this.collectLocals(block);

    const params = fn.params.map(p => `(param $${sanitize(p)} i32)`).join(" ");
    lines.push(`  (func $${sanitize(fn.name)} ${params} (result i32)`);

    // Declare locals (excluding params)
    const paramSet = new Set(fn.params);
    for (const local of this.locals) {
      if (!paramSet.has(local)) {
        lines.push(`    (local $${sanitize(local)} i32)`);
      }
    }

    for (const block of fn.blocks) {
      lines.push(...this.emitBlockInstrs(block, "    "));
    }

    // Default return
    lines.push("    i32.const 0");
    lines.push("  )");
    return lines.join("\n");
  }

  private emitBlockInstrs(block: IRBlock, indent: string): string[] {
    const lines: string[] = [];
    lines.push(`${indent};; ${block.label}:`);

    for (const instr of block.instrs) {
      lines.push(...this.emitInstr(instr, indent));
    }
    return lines;
  }

  private emitInstr(instr: IRInstr, indent: string): string[] {
    const lines: string[] = [];
    const I = indent;

    switch (instr.op) {
      case "const": {
        if (typeof instr.value === "number") {
          if (Number.isInteger(instr.value)) {
            lines.push(`${I}i32.const ${instr.value}`);
          } else {
            // Store float as i32 bits (simplified — real impl would use f64)
            lines.push(`${I}i32.const ${Math.round(instr.value)}`);
          }
        } else if (typeof instr.value === "boolean") {
          lines.push(`${I}i32.const ${instr.value ? 1 : 0}`);
        } else if (instr.value === null) {
          lines.push(`${I}i32.const 0`);
        } else if (typeof instr.value === "string") {
          const offset = this.stringTable.get(instr.value) ?? 0;
          const len = new TextEncoder().encode(instr.value).length;
          // Pack offset and length — simplified: just store offset
          lines.push(`${I}i32.const ${offset} ;; str "${instr.value.slice(0, 20)}"`);
        }
        lines.push(`${I}local.set $${sanitize(instr.dest)}`);
        break;
      }

      case "load": {
        if (instr.name.startsWith("@fn:")) {
          lines.push(`${I}i32.const 0 ;; fn ref ${instr.name}`);
        } else {
          lines.push(`${I}local.get $${sanitize(instr.name)}`);
        }
        lines.push(`${I}local.set $${sanitize(instr.dest)}`);
        break;
      }

      case "store": {
        if (instr.src.startsWith("@fn:")) {
          lines.push(`${I}i32.const 0 ;; fn ref ${instr.src}`);
        } else {
          lines.push(`${I}local.get $${sanitize(instr.src)}`);
        }
        lines.push(`${I}local.set $${sanitize(instr.name)}`);
        break;
      }

      case "binop": {
        lines.push(`${I}local.get $${sanitize(instr.left)}`);
        lines.push(`${I}local.get $${sanitize(instr.right)}`);
        lines.push(`${I}${watBinop(instr.operator)}`);
        lines.push(`${I}local.set $${sanitize(instr.dest)}`);
        break;
      }

      case "unop": {
        if (instr.operator === "not" || instr.operator === "!") {
          lines.push(`${I}local.get $${sanitize(instr.operand)}`);
          lines.push(`${I}i32.eqz`);
        } else if (instr.operator === "-") {
          lines.push(`${I}i32.const 0`);
          lines.push(`${I}local.get $${sanitize(instr.operand)}`);
          lines.push(`${I}i32.sub`);
        } else {
          lines.push(`${I}local.get $${sanitize(instr.operand)}`);
        }
        lines.push(`${I}local.set $${sanitize(instr.dest)}`);
        break;
      }

      case "call": {
        // Push args
        for (const arg of instr.args) {
          lines.push(`${I}local.get $${sanitize(arg)}`);
        }
        // Call
        if (isRuntimeBuiltin(instr.fn)) {
          lines.push(`${I}call $__rt_${sanitize(instr.fn)}`);
        } else {
          lines.push(`${I}call $${sanitize(instr.fn)}`);
        }
        lines.push(`${I}local.set $${sanitize(instr.dest)}`);
        break;
      }

      case "toolcall": {
        lines.push(`${I}local.get $${sanitize(instr.url)}`);
        lines.push(`${I}i32.const ${this.stringTable.get(instr.method) ?? this.addString(instr.method)}`);
        lines.push(`${I}i32.const ${instr.method.length}`);
        if (instr.body) {
          lines.push(`${I}local.get $${sanitize(instr.body)}`);
        } else {
          lines.push(`${I}i32.const 0`);
        }
        lines.push(`${I}call $tool_call`);
        lines.push(`${I}local.set $${sanitize(instr.dest)}`);
        break;
      }

      case "field": {
        lines.push(`${I}local.get $${sanitize(instr.obj)}`);
        const propOffset = this.stringTable.get(instr.prop) ?? this.addString(instr.prop);
        lines.push(`${I}i32.const ${propOffset}`);
        lines.push(`${I}call $map_get`);
        lines.push(`${I}local.set $${sanitize(instr.dest)}`);
        break;
      }

      case "index": {
        lines.push(`${I}local.get $${sanitize(instr.obj)}`);
        lines.push(`${I}local.get $${sanitize(instr.idx)}`);
        lines.push(`${I}call $list_get`);
        lines.push(`${I}local.set $${sanitize(instr.dest)}`);
        break;
      }

      case "setfield": {
        lines.push(`${I}local.get $${sanitize(instr.obj)}`);
        const pOff = this.stringTable.get(instr.prop) ?? this.addString(instr.prop);
        lines.push(`${I}i32.const ${pOff}`);
        lines.push(`${I}local.get $${sanitize(instr.src)}`);
        lines.push(`${I}call $map_set`);
        lines.push(`${I}drop`);
        break;
      }

      case "setindex": {
        lines.push(`${I};; setindex ${instr.obj}[${instr.idx}] = ${instr.src}`);
        break;
      }

      case "list": {
        lines.push(`${I}call $list_new`);
        lines.push(`${I}local.set $${sanitize(instr.dest)}`);
        for (const elem of instr.elements) {
          lines.push(`${I}local.get $${sanitize(instr.dest)}`);
          lines.push(`${I}local.get $${sanitize(elem)}`);
          lines.push(`${I}call $list_push`);
          lines.push(`${I}local.set $${sanitize(instr.dest)}`);
        }
        break;
      }

      case "map": {
        lines.push(`${I}call $map_new`);
        lines.push(`${I}local.set $${sanitize(instr.dest)}`);
        for (let i = 0; i < instr.keys.length; i++) {
          lines.push(`${I}local.get $${sanitize(instr.dest)}`);
          lines.push(`${I}local.get $${sanitize(instr.keys[i])}`);
          lines.push(`${I}local.get $${sanitize(instr.values[i])}`);
          lines.push(`${I}call $map_set`);
          lines.push(`${I}local.set $${sanitize(instr.dest)}`);
        }
        break;
      }

      case "jump": {
        lines.push(`${I};; jump ${instr.target}`);
        break;
      }

      case "branch": {
        lines.push(`${I}local.get $${sanitize(instr.cond)}`);
        lines.push(`${I};; branch -> ${instr.ifTrue} / ${instr.ifFalse}`);
        break;
      }

      case "label": {
        lines.push(`${I};; label ${instr.name}:`);
        break;
      }

      case "print": {
        lines.push(`${I}local.get $${sanitize(instr.value)}`);
        lines.push(`${I}call $print_i32`);
        break;
      }

      case "range": {
        lines.push(`${I};; range(${instr.start}, ${instr.end})`);
        lines.push(`${I}call $list_new`);
        lines.push(`${I}local.set $${sanitize(instr.dest)}`);
        break;
      }

      case "ret": {
        if (instr.value) {
          lines.push(`${I}local.get $${sanitize(instr.value)}`);
          lines.push(`${I}return`);
        } else {
          lines.push(`${I}i32.const 0`);
          lines.push(`${I}return`);
        }
        break;
      }

      case "phi": {
        lines.push(`${I};; phi ${instr.dest}`);
        lines.push(`${I}i32.const 0`);
        lines.push(`${I}local.set $${sanitize(instr.dest)}`);
        break;
      }

      case "nop": {
        lines.push(`${I}nop`);
        break;
      }
    }

    return lines;
  }
}

function watBinop(op: string): string {
  switch (op) {
    case "+": return "i32.add";
    case "-": return "i32.sub";
    case "*": return "i32.mul";
    case "/": return "i32.div_s";
    case "%": return "i32.rem_s";
    case "==": return "i32.eq";
    case "!=": return "i32.ne";
    case "<": return "i32.lt_s";
    case ">": return "i32.gt_s";
    case "<=": return "i32.le_s";
    case ">=": return "i32.ge_s";
    case "and": return "i32.and";
    case "or": return "i32.or";
    case "**": return "i32.mul ;; TODO: power";
    case "++": return "i32.add ;; TODO: string concat";
    default: return `i32.add ;; TODO: ${op}`;
  }
}

function isRuntimeBuiltin(fn: string): boolean {
  return ["len", "str", "push", "print", "head", "tail", "map", "filter", "fold",
    "range", "keys", "values", "type", "__await", "__fetch_parallel"].includes(fn);
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}
