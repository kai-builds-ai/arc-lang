// Arc Intermediate Representation (IR) - SSA Three-Address Code
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
// ---- IR Generator ----
export class IRGenerator {
    tempCount = 0;
    labelCount = 0;
    functions = [];
    currentInstrs = [];
    scopeStack = [new Map()];
    scopeCount = 0;
    temp() {
        return `%${this.tempCount++}`;
    }
    label(prefix = "L") {
        return `${prefix}${this.labelCount++}`;
    }
    emit(instr) {
        this.currentInstrs.push(instr);
    }
    pushScope() {
        this.scopeStack.push(new Map());
    }
    popScope() {
        this.scopeStack.pop();
    }
    defineVar(name) {
        const scope = this.scopeStack[this.scopeStack.length - 1];
        // Check if already defined in ANY scope (including this one)
        let existsInAnyScope = false;
        for (let i = this.scopeStack.length - 1; i >= 0; i--) {
            if (this.scopeStack[i].has(name)) {
                existsInAnyScope = true;
                break;
            }
        }
        if (existsInAnyScope) {
            const mangled = `${name}__s${this.scopeCount++}`;
            scope.set(name, mangled);
            return mangled;
        }
        scope.set(name, name);
        return name;
    }
    resolveVar(name) {
        for (let i = this.scopeStack.length - 1; i >= 0; i--) {
            const v = this.scopeStack[i].get(name);
            if (v !== undefined)
                return v;
        }
        return name;
    }
    generateIR(program) {
        this.functions = [];
        this.currentInstrs = [];
        this.tempCount = 0;
        this.labelCount = 0;
        for (const stmt of program.stmts) {
            this.lowerStmt(stmt);
        }
        return {
            functions: this.functions,
            main: [{ label: "entry", instrs: this.currentInstrs }],
        };
    }
    // ---- Statement Lowering ----
    lowerStmt(stmt) {
        switch (stmt.kind) {
            case "LetStmt": {
                const val = this.lowerExpr(stmt.value);
                if (typeof stmt.name === "string") {
                    const mangled = this.defineVar(stmt.name);
                    this.emit({ op: "store", name: mangled, src: val });
                }
                else {
                    // Destructuring — store temp then extract fields
                    const dt = stmt.name;
                    for (let i = 0; i < dt.names.length; i++) {
                        const dest = this.temp();
                        if (dt.type === "object") {
                            this.emit({ op: "field", dest, obj: val, prop: dt.names[i] });
                        }
                        else {
                            const idx = this.temp();
                            this.emit({ op: "const", dest: idx, value: i });
                            this.emit({ op: "index", dest, obj: val, idx });
                        }
                        const mangled = this.defineVar(dt.names[i]);
                        this.emit({ op: "store", name: mangled, src: dest });
                    }
                }
                break;
            }
            case "FnStmt": {
                const savedInstrs = this.currentInstrs;
                const savedScope = this.scopeStack;
                this.currentInstrs = [];
                // Function gets its own scope with params
                this.scopeStack = [new Map()];
                for (const p of stmt.params) {
                    this.defineVar(p);
                }
                // Lower function body
                const result = this.lowerExpr(stmt.body);
                this.emit({ op: "ret", value: result });
                this.functions.push({
                    name: stmt.name,
                    params: stmt.params,
                    blocks: [{ label: "entry", instrs: this.currentInstrs }],
                });
                this.currentInstrs = savedInstrs;
                this.scopeStack = savedScope;
                // Store function reference in main scope
                const fnMangled = this.defineVar(stmt.name);
                this.emit({ op: "store", name: fnMangled, src: `@fn:${stmt.name}` });
                break;
            }
            case "ForStmt": {
                const iter = this.lowerExpr(stmt.iterable);
                const lenTemp = this.temp();
                this.emit({ op: "call", dest: lenTemp, fn: "len", args: [iter] });
                const counterName = `__for_i_${this.labelCount}`;
                const zero = this.temp();
                this.emit({ op: "const", dest: zero, value: 0 });
                this.emit({ op: "store", name: counterName, src: zero });
                const loopLabel = this.label("for_loop");
                const bodyLabel = this.label("for_body");
                const endLabel = this.label("for_end");
                this.emit({ op: "label", name: loopLabel });
                const counter = this.temp();
                this.emit({ op: "load", dest: counter, name: counterName });
                const cond = this.temp();
                this.emit({ op: "binop", dest: cond, operator: "<", left: counter, right: lenTemp });
                this.emit({ op: "branch", cond, ifTrue: bodyLabel, ifFalse: endLabel });
                this.emit({ op: "label", name: bodyLabel });
                this.pushScope();
                const elem = this.temp();
                this.emit({ op: "index", dest: elem, obj: iter, idx: counter });
                const loopVarName = this.defineVar(stmt.variable);
                this.emit({ op: "store", name: loopVarName, src: elem });
                this.lowerExpr(stmt.body);
                this.popScope();
                const next = this.temp();
                const one = this.temp();
                this.emit({ op: "const", dest: one, value: 1 });
                this.emit({ op: "load", dest: next, name: counterName });
                const incremented = this.temp();
                this.emit({ op: "binop", dest: incremented, operator: "+", left: next, right: one });
                this.emit({ op: "store", name: counterName, src: incremented });
                this.emit({ op: "jump", target: loopLabel });
                this.emit({ op: "label", name: endLabel });
                break;
            }
            case "DoStmt": {
                const loopLabel = this.label("do_loop");
                const endLabel = this.label("do_end");
                this.emit({ op: "label", name: loopLabel });
                this.lowerExpr(stmt.body);
                const cond = this.lowerExpr(stmt.condition);
                if (stmt.isWhile) {
                    this.emit({ op: "branch", cond, ifTrue: loopLabel, ifFalse: endLabel });
                }
                else {
                    // until — loop while NOT condition
                    this.emit({ op: "branch", cond, ifTrue: endLabel, ifFalse: loopLabel });
                }
                this.emit({ op: "label", name: endLabel });
                break;
            }
            case "AssignStmt": {
                const val = this.lowerExpr(stmt.value);
                this.emit({ op: "store", name: this.resolveVar(stmt.target), src: val });
                break;
            }
            case "MemberAssignStmt": {
                const obj = this.lowerExpr(stmt.object);
                const val = this.lowerExpr(stmt.value);
                this.emit({ op: "setfield", obj, prop: stmt.property, src: val });
                break;
            }
            case "IndexAssignStmt": {
                const obj = this.lowerExpr(stmt.object);
                const idx = this.lowerExpr(stmt.index);
                const val = this.lowerExpr(stmt.value);
                this.emit({ op: "setindex", obj, idx, src: val });
                break;
            }
            case "ExprStmt": {
                this.lowerExpr(stmt.expr);
                break;
            }
            case "UseStmt": {
                // No-op at IR level — resolved at load time
                break;
            }
            case "TypeStmt": {
                // No-op at IR level — types are compile-time only
                break;
            }
            default:
                // Ignore unknown statement types
                break;
        }
    }
    // ---- Expression Lowering ----
    lowerExpr(expr) {
        switch (expr.kind) {
            case "IntLiteral":
            case "FloatLiteral": {
                const dest = this.temp();
                this.emit({ op: "const", dest, value: expr.value });
                return dest;
            }
            case "BoolLiteral": {
                const dest = this.temp();
                this.emit({ op: "const", dest, value: expr.value });
                return dest;
            }
            case "NilLiteral": {
                const dest = this.temp();
                this.emit({ op: "const", dest, value: null });
                return dest;
            }
            case "StringLiteral": {
                const dest = this.temp();
                this.emit({ op: "const", dest, value: expr.value });
                return dest;
            }
            case "StringInterp": {
                // Lower string interpolation to concat chain
                let result = this.temp();
                this.emit({ op: "const", dest: result, value: "" });
                for (const part of expr.parts) {
                    const partVal = typeof part === "string"
                        ? (() => { const d = this.temp(); this.emit({ op: "const", dest: d, value: part }); return d; })()
                        : (() => {
                            const raw = this.lowerExpr(part);
                            const d = this.temp();
                            this.emit({ op: "call", dest: d, fn: "str", args: [raw] });
                            return d;
                        })();
                    const newResult = this.temp();
                    this.emit({ op: "binop", dest: newResult, operator: "++", left: result, right: partVal });
                    result = newResult;
                }
                return result;
            }
            case "Identifier": {
                const dest = this.temp();
                this.emit({ op: "load", dest, name: this.resolveVar(expr.name) });
                return dest;
            }
            case "BinaryExpr": {
                const left = this.lowerExpr(expr.left);
                const right = this.lowerExpr(expr.right);
                const dest = this.temp();
                this.emit({ op: "binop", dest, operator: expr.op, left, right });
                return dest;
            }
            case "UnaryExpr": {
                const operand = this.lowerExpr(expr.operand);
                const dest = this.temp();
                this.emit({ op: "unop", dest, operator: expr.op, operand });
                return dest;
            }
            case "CallExpr": {
                const args = expr.args.map(a => this.lowerExpr(a));
                const dest = this.temp();
                if (expr.callee.kind === "Identifier") {
                    this.emit({ op: "call", dest, fn: expr.callee.name, args });
                }
                else {
                    const fn = this.lowerExpr(expr.callee);
                    this.emit({ op: "call", dest, fn, args });
                }
                return dest;
            }
            case "MemberExpr": {
                const obj = this.lowerExpr(expr.object);
                const dest = this.temp();
                this.emit({ op: "field", dest, obj, prop: expr.property });
                return dest;
            }
            case "IndexExpr": {
                const obj = this.lowerExpr(expr.object);
                const idx = this.lowerExpr(expr.index);
                const dest = this.temp();
                this.emit({ op: "index", dest, obj, idx });
                return dest;
            }
            case "PipelineExpr": {
                // a |> f  →  f(a)
                const left = this.lowerExpr(expr.left);
                const dest = this.temp();
                if (expr.right.kind === "Identifier") {
                    this.emit({ op: "call", dest, fn: expr.right.name, args: [left] });
                }
                else if (expr.right.kind === "CallExpr") {
                    // a |> f(b) → f(a, b)
                    const args = [left, ...expr.right.args.map(a => this.lowerExpr(a))];
                    if (expr.right.callee.kind === "Identifier") {
                        this.emit({ op: "call", dest, fn: expr.right.callee.name, args });
                    }
                    else {
                        const fn = this.lowerExpr(expr.right.callee);
                        this.emit({ op: "call", dest, fn, args });
                    }
                }
                else {
                    const fn = this.lowerExpr(expr.right);
                    this.emit({ op: "call", dest, fn, args: [left] });
                }
                return dest;
            }
            case "IfExpr": {
                const cond = this.lowerExpr(expr.condition);
                const resultName = `__if_result_${this.labelCount}`;
                const thenLabel = this.label("if_then");
                const elseLabel = this.label("if_else");
                const endLabel = this.label("if_end");
                this.emit({ op: "branch", cond, ifTrue: thenLabel, ifFalse: elseLabel });
                this.emit({ op: "label", name: thenLabel });
                const thenVal = this.lowerExpr(expr.then);
                this.emit({ op: "store", name: resultName, src: thenVal });
                this.emit({ op: "jump", target: endLabel });
                this.emit({ op: "label", name: elseLabel });
                if (expr.else_) {
                    const elseVal = this.lowerExpr(expr.else_);
                    this.emit({ op: "store", name: resultName, src: elseVal });
                }
                else {
                    const nil = this.temp();
                    this.emit({ op: "const", dest: nil, value: null });
                    this.emit({ op: "store", name: resultName, src: nil });
                }
                this.emit({ op: "jump", target: endLabel });
                this.emit({ op: "label", name: endLabel });
                const dest = this.temp();
                this.emit({ op: "load", dest, name: resultName });
                return dest;
            }
            case "MatchExpr": {
                const subject = this.lowerExpr(expr.subject);
                const resultName = `__match_result_${this.labelCount}`;
                const endLabel = this.label("match_end");
                for (let i = 0; i < expr.arms.length; i++) {
                    const arm = expr.arms[i];
                    const armLabel = this.label("match_arm");
                    const nextLabel = i < expr.arms.length - 1 ? this.label("match_next") : endLabel;
                    // Lower pattern to condition
                    const cond = this.lowerPattern(arm.pattern, subject);
                    if (arm.guard) {
                        // For guards, we need to bind pattern variables BEFORE evaluating the guard
                        // because the guard may reference bound variables (e.g., `n if n > 10`)
                        const guardLabel = this.label("match_guard");
                        this.emit({ op: "branch", cond, ifTrue: guardLabel, ifFalse: nextLabel });
                        this.emit({ op: "label", name: guardLabel });
                        this.bindPattern(arm.pattern, subject);
                        const guardCond = this.lowerExpr(arm.guard);
                        this.emit({ op: "branch", cond: guardCond, ifTrue: armLabel, ifFalse: nextLabel });
                    }
                    else {
                        this.emit({ op: "branch", cond, ifTrue: armLabel, ifFalse: nextLabel });
                    }
                    this.emit({ op: "label", name: armLabel });
                    // Bind pattern variables (for non-guard case; guard case already bound above)
                    if (!arm.guard) {
                        this.bindPattern(arm.pattern, subject);
                    }
                    const val = this.lowerExpr(arm.body);
                    this.emit({ op: "store", name: resultName, src: val });
                    this.emit({ op: "jump", target: endLabel });
                    if (i < expr.arms.length - 1) {
                        this.emit({ op: "label", name: nextLabel });
                    }
                }
                this.emit({ op: "label", name: endLabel });
                const dest = this.temp();
                this.emit({ op: "load", dest, name: resultName });
                return dest;
            }
            case "LambdaExpr": {
                // Lower lambda to anonymous function
                const fnName = `__lambda_${this.labelCount++}`;
                const savedInstrs = this.currentInstrs;
                const savedScope = this.scopeStack;
                this.currentInstrs = [];
                this.scopeStack = [new Map()];
                for (const p of expr.params) {
                    this.defineVar(p);
                }
                const result = this.lowerExpr(expr.body);
                this.emit({ op: "ret", value: result });
                this.functions.push({
                    name: fnName,
                    params: expr.params,
                    blocks: [{ label: "entry", instrs: this.currentInstrs }],
                });
                this.currentInstrs = savedInstrs;
                this.scopeStack = savedScope;
                const dest = this.temp();
                this.emit({ op: "load", dest, name: `@fn:${fnName}` });
                return dest;
            }
            case "ListLiteral": {
                const elements = expr.elements.map(e => this.lowerExpr(e));
                const dest = this.temp();
                this.emit({ op: "list", dest, elements });
                return dest;
            }
            case "MapLiteral": {
                const keys = [];
                const values = [];
                for (const entry of expr.entries) {
                    const keyStr = typeof entry.key === "string" ? entry.key : "";
                    const k = this.temp();
                    this.emit({ op: "const", dest: k, value: keyStr });
                    keys.push(k);
                    values.push(this.lowerExpr(entry.value));
                }
                const dest = this.temp();
                this.emit({ op: "map", dest, keys, values });
                return dest;
            }
            case "ListComprehension": {
                // Lower to: result = []; for x in iter { if filter { push(result, expr) } }
                const resultName = `__comp_${this.labelCount}`;
                const emptyList = this.temp();
                this.emit({ op: "list", dest: emptyList, elements: [] });
                this.emit({ op: "store", name: resultName, src: emptyList });
                const iter = this.lowerExpr(expr.iterable);
                const lenT = this.temp();
                this.emit({ op: "call", dest: lenT, fn: "len", args: [iter] });
                const counterName = `__comp_i_${this.labelCount}`;
                const zero = this.temp();
                this.emit({ op: "const", dest: zero, value: 0 });
                this.emit({ op: "store", name: counterName, src: zero });
                const loopLabel = this.label("comp_loop");
                const bodyLabel = this.label("comp_body");
                const endLabel = this.label("comp_end");
                this.emit({ op: "label", name: loopLabel });
                const counter = this.temp();
                this.emit({ op: "load", dest: counter, name: counterName });
                const cond = this.temp();
                this.emit({ op: "binop", dest: cond, operator: "<", left: counter, right: lenT });
                this.emit({ op: "branch", cond, ifTrue: bodyLabel, ifFalse: endLabel });
                this.emit({ op: "label", name: bodyLabel });
                const elem = this.temp();
                this.emit({ op: "index", dest: elem, obj: iter, idx: counter });
                this.emit({ op: "store", name: expr.variable, src: elem });
                if (expr.filter) {
                    const filterLabel = this.label("comp_filter");
                    const skipLabel = this.label("comp_skip");
                    const filterCond = this.lowerExpr(expr.filter);
                    this.emit({ op: "branch", cond: filterCond, ifTrue: filterLabel, ifFalse: skipLabel });
                    this.emit({ op: "label", name: filterLabel });
                    const val = this.lowerExpr(expr.expr);
                    const list = this.temp();
                    this.emit({ op: "load", dest: list, name: resultName });
                    this.emit({ op: "call", dest: this.temp(), fn: "push", args: [list, val] });
                    this.emit({ op: "jump", target: skipLabel });
                    this.emit({ op: "label", name: skipLabel });
                }
                else {
                    const val = this.lowerExpr(expr.expr);
                    const list = this.temp();
                    this.emit({ op: "load", dest: list, name: resultName });
                    this.emit({ op: "call", dest: this.temp(), fn: "push", args: [list, val] });
                }
                const next = this.temp();
                this.emit({ op: "load", dest: next, name: counterName });
                const one = this.temp();
                this.emit({ op: "const", dest: one, value: 1 });
                const inc = this.temp();
                this.emit({ op: "binop", dest: inc, operator: "+", left: next, right: one });
                this.emit({ op: "store", name: counterName, src: inc });
                this.emit({ op: "jump", target: loopLabel });
                this.emit({ op: "label", name: endLabel });
                const dest = this.temp();
                this.emit({ op: "load", dest, name: resultName });
                return dest;
            }
            case "ToolCallExpr": {
                const url = this.lowerExpr(expr.arg);
                const dest = this.temp();
                if (expr.body) {
                    const body = this.lowerExpr(expr.body);
                    this.emit({ op: "toolcall", dest, method: expr.method, url, body });
                }
                else {
                    this.emit({ op: "toolcall", dest, method: expr.method, url });
                }
                return dest;
            }
            case "RangeExpr": {
                const start = this.lowerExpr(expr.start);
                const end = this.lowerExpr(expr.end);
                const dest = this.temp();
                this.emit({ op: "range", dest, start, end });
                return dest;
            }
            case "BlockExpr": {
                this.pushScope();
                let last = this.temp();
                this.emit({ op: "const", dest: last, value: null });
                for (const s of expr.stmts) {
                    if (s.kind === "ExprStmt") {
                        last = this.lowerExpr(s.expr);
                    }
                    else {
                        this.lowerStmt(s);
                    }
                }
                this.popScope();
                return last;
            }
            case "AsyncExpr": {
                // Lower async block as a thunk reference
                const fnName = `__async_${this.labelCount++}`;
                const savedInstrs = this.currentInstrs;
                this.currentInstrs = [];
                const result = this.lowerExpr(expr.body);
                this.emit({ op: "ret", value: result });
                this.functions.push({
                    name: fnName,
                    params: [],
                    blocks: [{ label: "entry", instrs: this.currentInstrs }],
                });
                this.currentInstrs = savedInstrs;
                const dest = this.temp();
                this.emit({ op: "load", dest, name: `@fn:${fnName}` });
                return dest;
            }
            case "AwaitExpr": {
                const val = this.lowerExpr(expr.expr);
                const dest = this.temp();
                this.emit({ op: "call", dest, fn: "__await", args: [val] });
                return dest;
            }
            case "FetchExpr": {
                const targets = expr.targets.map(t => this.lowerExpr(t));
                const dest = this.temp();
                this.emit({ op: "call", dest, fn: "__fetch_parallel", args: targets });
                return dest;
            }
            default:
                const dest = this.temp();
                this.emit({ op: "const", dest, value: null });
                return dest;
        }
    }
    // ---- Pattern Helpers ----
    lowerPattern(pattern, subject) {
        switch (pattern.kind) {
            case "WildcardPattern": {
                const dest = this.temp();
                this.emit({ op: "const", dest, value: true });
                return dest;
            }
            case "LiteralPattern": {
                const val = this.temp();
                this.emit({ op: "const", dest: val, value: pattern.value });
                const dest = this.temp();
                this.emit({ op: "binop", dest, operator: "==", left: subject, right: val });
                return dest;
            }
            case "BindingPattern": {
                // Always matches — bind happens in bindPattern
                const dest = this.temp();
                this.emit({ op: "const", dest, value: true });
                return dest;
            }
            case "ArrayPattern": {
                // Check length matches
                const len = this.temp();
                this.emit({ op: "call", dest: len, fn: "len", args: [subject] });
                const expected = this.temp();
                this.emit({ op: "const", dest: expected, value: pattern.elements.length });
                const dest = this.temp();
                this.emit({ op: "binop", dest, operator: "==", left: len, right: expected });
                return dest;
            }
            case "OrPattern": {
                let result = this.lowerPattern(pattern.patterns[0], subject);
                for (let i = 1; i < pattern.patterns.length; i++) {
                    const right = this.lowerPattern(pattern.patterns[i], subject);
                    const combined = this.temp();
                    this.emit({ op: "binop", dest: combined, operator: "or", left: result, right });
                    result = combined;
                }
                return result;
            }
            default: {
                const dest = this.temp();
                this.emit({ op: "const", dest, value: true });
                return dest;
            }
        }
    }
    bindPattern(pattern, subject) {
        if (pattern.kind === "BindingPattern") {
            this.emit({ op: "store", name: pattern.name, src: subject });
        }
        else if (pattern.kind === "ArrayPattern") {
            for (let i = 0; i < pattern.elements.length; i++) {
                const idx = this.temp();
                this.emit({ op: "const", dest: idx, value: i });
                const elem = this.temp();
                this.emit({ op: "index", dest: elem, obj: subject, idx });
                this.bindPattern(pattern.elements[i], elem);
            }
        }
    }
}
// ---- IR Printer ----
export function printIR(module) {
    const lines = [];
    for (const fn of module.functions) {
        lines.push(`fn ${fn.name}(${fn.params.join(", ")}):`);
        for (const block of fn.blocks) {
            lines.push(`  ${block.label}:`);
            for (const instr of block.instrs) {
                lines.push(`    ${formatInstr(instr)}`);
            }
        }
        lines.push("");
    }
    lines.push("main:");
    for (const block of module.main) {
        lines.push(`  ${block.label}:`);
        for (const instr of block.instrs) {
            lines.push(`    ${formatInstr(instr)}`);
        }
    }
    return lines.join("\n");
}
function formatInstr(instr) {
    switch (instr.op) {
        case "const": return `${instr.dest} = const ${JSON.stringify(instr.value)}`;
        case "load": return `${instr.dest} = load ${instr.name}`;
        case "store": return `store ${instr.name} = ${instr.src}`;
        case "binop": return `${instr.dest} = ${instr.left} ${instr.operator} ${instr.right}`;
        case "unop": return `${instr.dest} = ${instr.operator} ${instr.operand}`;
        case "call": return `${instr.dest} = call ${instr.fn}(${instr.args.join(", ")})`;
        case "toolcall": return `${instr.dest} = @${instr.method} ${instr.url}${instr.body ? ` ${instr.body}` : ""}`;
        case "field": return `${instr.dest} = ${instr.obj}.${instr.prop}`;
        case "index": return `${instr.dest} = ${instr.obj}[${instr.idx}]`;
        case "setfield": return `${instr.obj}.${instr.prop} = ${instr.src}`;
        case "setindex": return `${instr.obj}[${instr.idx}] = ${instr.src}`;
        case "jump": return `jump ${instr.target}`;
        case "branch": return `branch ${instr.cond} ? ${instr.ifTrue} : ${instr.ifFalse}`;
        case "phi": return `${instr.dest} = phi ${instr.sources.map(s => `[${s.block}: ${s.value}]`).join(", ")}`;
        case "ret": return `ret ${instr.value ?? "void"}`;
        case "list": return `${instr.dest} = [${instr.elements.join(", ")}]`;
        case "map": return `${instr.dest} = {${instr.keys.map((k, i) => `${k}: ${instr.values[i]}`).join(", ")}}`;
        case "label": return `${instr.name}:`;
        case "print": return `print ${instr.value}`;
        case "range": return `${instr.dest} = range(${instr.start}, ${instr.end})`;
        case "nop": return "nop";
    }
}
// ---- Public API ----
export function generateIR(program) {
    return new IRGenerator().generateIR(program);
}
export function generateIRFromSource(source) {
    const tokens = lex(source);
    const ast = parse(tokens);
    return generateIR(ast);
}
