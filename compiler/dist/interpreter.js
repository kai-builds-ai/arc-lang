// Arc Language Tree-Walking Interpreter
class Env {
    parent;
    vars = new Map();
    _depth;
    constructor(parent) {
        this.parent = parent;
        this._depth = parent ? parent._depth + 1 : 0;
    }
    get(name) {
        const v = this.vars.get(name);
        if (v !== undefined)
            return v.value;
        if (this.parent)
            return this.parent.get(name);
        throw new Error(`Undefined variable: ${name}`);
    }
    // Fast lookup that returns the entry directly (avoids repeated Map lookups in hot paths)
    getEntry(name) {
        const v = this.vars.get(name);
        if (v !== undefined)
            return v;
        if (this.parent)
            return this.parent.getEntry(name);
        return undefined;
    }
    set(name, value, mutable = false) {
        this.vars.set(name, { value, mutable });
    }
    assign(name, value) {
        const v = this.vars.get(name);
        if (v) {
            if (!v.mutable)
                throw new Error(`Cannot reassign immutable variable: ${name}`);
            v.value = value;
            return;
        }
        if (this.parent) {
            this.parent.assign(name, value);
            return;
        }
        throw new Error(`Undefined variable: ${name}`);
    }
    has(name) {
        return this.vars.has(name) || (this.parent?.has(name) ?? false);
    }
}
function isTruthy(v) {
    if (v === null || v === false || v === 0 || v === "")
        return false;
    return true;
}
function toStr(v) {
    if (v === null)
        return "nil";
    if (typeof v === "boolean")
        return v ? "true" : "false";
    if (typeof v === "number" || typeof v === "string")
        return String(v);
    if (Array.isArray(v))
        return "[" + v.map(toStr).join(", ") + "]";
    if (v && typeof v === "object" && "__map" in v) {
        const entries = [...v.entries.entries()].map(([k, val]) => `${k}: ${toStr(val)}`);
        return "{" + entries.join(", ") + "}";
    }
    if (v && typeof v === "object" && "__fn" in v)
        return `<fn ${v.name}>`;
    if (v && typeof v === "object" && "__async" in v)
        return `<async>`;
    return String(v);
}
function resolveAsync(v) {
    if (v && typeof v === "object" && "__async" in v) {
        return v.thunk();
    }
    return v;
}
function makePrelude(env) {
    const fns = {
        print: (...args) => { console.log(args.map(toStr).join(" ")); return null; },
        len: (v) => {
            if (typeof v === "string")
                return v.length;
            if (Array.isArray(v))
                return v.length;
            if (v && typeof v === "object" && "__map" in v)
                return v.entries.size;
            return 0;
        },
        map: (list, fn) => {
            if (!Array.isArray(list))
                throw new Error("map expects a list");
            return list.map(item => callFn(fn, [item]));
        },
        filter: (list, fn) => {
            if (!Array.isArray(list))
                throw new Error("filter expects a list");
            return list.filter(item => isTruthy(callFn(fn, [item])));
        },
        reduce: (list, fn, init) => {
            if (!Array.isArray(list))
                throw new Error("reduce expects a list");
            let acc = init ?? list[0];
            const start = init !== undefined ? 0 : 1;
            for (let i = start; i < list.length; i++) {
                acc = callFn(fn, [acc, list[i]]);
            }
            return acc;
        },
        fold: (list, init, fn) => {
            if (!Array.isArray(list))
                throw new Error("fold expects a list");
            let acc = init;
            for (let i = 0; i < list.length; i++) {
                acc = callFn(fn, [acc, list[i]]);
            }
            return acc;
        },
        sort: (list) => {
            if (!Array.isArray(list))
                throw new Error("sort expects a list");
            return [...list].sort((a, b) => {
                if (typeof a === "number" && typeof b === "number")
                    return a - b;
                return String(a).localeCompare(String(b));
            });
        },
        take: (list, n) => Array.isArray(list) ? list.slice(0, n) : null,
        drop: (list, n) => Array.isArray(list) ? list.slice(n) : null,
        find: (list, fn) => {
            if (!Array.isArray(list))
                return null;
            return list.find(item => isTruthy(callFn(fn, [item]))) ?? null;
        },
        any: (list, fn) => {
            if (!Array.isArray(list))
                return false;
            return list.some(item => isTruthy(callFn(fn, [item])));
        },
        all: (list, fn) => {
            if (!Array.isArray(list))
                return false;
            return list.every(item => isTruthy(callFn(fn, [item])));
        },
        sum: (list) => {
            if (!Array.isArray(list))
                return 0;
            return list.reduce((a, b) => a + (typeof b === "number" ? b : 0), 0);
        },
        flat: (list) => Array.isArray(list) ? list.flat() : list,
        zip: (a, b) => {
            if (!Array.isArray(a) || !Array.isArray(b))
                return [];
            const minLen = Math.min(a.length, b.length);
            return a.slice(0, minLen).map((v, i) => [v, b[i]]);
        },
        enumerate: (list) => {
            if (!Array.isArray(list))
                return [];
            return list.map((v, i) => [i, v]);
        },
        trim: (s) => typeof s === "string" ? s.trim() : s,
        split: (s, sep) => typeof s === "string" ? s.split(sep) : [],
        join: (list, sep) => Array.isArray(list) ? list.map(toStr).join(sep) : "",
        upper: (s) => typeof s === "string" ? s.toUpperCase() : s,
        lower: (s) => typeof s === "string" ? s.toLowerCase() : s,
        replace: (s, from, to) => typeof s === "string" ? s.replaceAll(from, to) : s,
        contains: (s, sub) => {
            if (typeof s === "string")
                return s.includes(sub);
            if (Array.isArray(s))
                return s.includes(sub);
            return false;
        },
        starts: (s, pre) => typeof s === "string" ? s.startsWith(pre) : false,
        ends: (s, suf) => typeof s === "string" ? s.endsWith(suf) : false,
        int: (v) => typeof v === "string" ? parseInt(v) : typeof v === "number" ? Math.floor(v) : 0,
        float: (v) => typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : 0,
        str: (v) => toStr(v),
        bool: (v) => isTruthy(v),
        min: (...args) => {
            const vals = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
            return Math.min(...vals.map(v => typeof v === "number" ? v : Infinity));
        },
        max: (...args) => {
            const vals = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
            return Math.max(...vals.map(v => typeof v === "number" ? v : -Infinity));
        },
        abs: (v) => typeof v === "number" ? Math.abs(v) : 0,
        round: (v) => typeof v === "number" ? Math.round(v) : 0,
        assert: (cond, msg) => {
            if (!isTruthy(cond))
                throw new Error(`Assertion failed: ${msg !== null && msg !== undefined ? toStr(msg) : "assertion failed"}`);
            return true;
        },
        sleep: (_ms) => null,
        timeout: (_ms, expr) => expr ?? null,
        type_of: (v) => {
            if (v === null)
                return "nil";
            if (typeof v === "boolean")
                return "bool";
            if (typeof v === "number")
                return Number.isInteger(v) ? "int" : "float";
            if (typeof v === "string")
                return "string";
            if (Array.isArray(v))
                return "list";
            if (v && typeof v === "object" && "__map" in v)
                return "map";
            if (v && typeof v === "object" && "__fn" in v)
                return "fn";
            return "unknown";
        },
        head: (list) => Array.isArray(list) && list.length > 0 ? list[0] : null,
        tail: (list) => Array.isArray(list) ? list.slice(1) : [],
        last: (list) => Array.isArray(list) && list.length > 0 ? list[list.length - 1] : null,
        reverse: (list) => Array.isArray(list) ? [...list].reverse() : list,
        range: (a, b) => { const r = []; for (let i = a; i < b; i++)
            r.push(i); return r; },
        keys: (m) => m && typeof m === "object" && "__map" in m ? [...m.entries.keys()] : [],
        values: (m) => m && typeof m === "object" && "__map" in m ? [...m.entries.values()] : [],
        push: (list, item) => Array.isArray(list) ? [...list, item] : list,
        concat: (a, b) => {
            if (Array.isArray(a) && Array.isArray(b))
                return [...a, ...b];
            return toStr(a) + toStr(b);
        },
        chars: (s) => typeof s === "string" ? s.split("") : [],
        repeat: (s, n) => typeof s === "string" ? s.repeat(n) : s,
        slice: (v, start, end) => {
            if (Array.isArray(v))
                return v.slice(start, end ?? undefined);
            if (typeof v === "string")
                return v.slice(start, end ?? undefined);
            return null;
        },
    };
    function callFn(fn, args) {
        if (fn && typeof fn === "object" && "__fn" in fn) {
            const f = fn;
            const fnEnv = new Env(f.closure);
            f.params.forEach((p, i) => fnEnv.set(p, args[i] ?? null));
            return evalExpr(f.body, fnEnv);
        }
        // It might be a native function stored as a special wrapper
        if (typeof fn === "function")
            return fn(...args);
        throw new Error(`Not a function: ${toStr(fn)}`);
    }
    // Register prelude fns as special callable values
    for (const [name, fn] of Object.entries(fns)) {
        env.set(name, fn);
    }
}
// Return signal — thrown to unwind the stack on `ret`
class ReturnSignal {
    value;
    constructor(value) {
        this.value = value;
    }
}
// Evaluate expression in tail position — returns TCOSignal for self-recursive tail calls
function evalExprTCO(expr, env, fnName) {
    // Only handle tail-position expressions specially
    switch (expr.kind) {
        case "IfExpr": {
            const cond = evalExpr(expr.condition, env);
            if (isTruthy(cond))
                return evalExprTCO(expr.then, env, fnName);
            if (expr.else_)
                return evalExprTCO(expr.else_, env, fnName);
            return null;
        }
        case "CallExpr": {
            // Check if this is a self-recursive tail call
            if (expr.callee.kind === "Identifier" && expr.callee.name === fnName) {
                const args = expr.args.map(a => evalExpr(a, env));
                return { __tco: true, args };
            }
            return evalExpr(expr, env);
        }
        case "BlockExpr": {
            const blockEnv = new Env(env);
            let result = null;
            for (let i = 0; i < expr.stmts.length; i++) {
                if (i === expr.stmts.length - 1 && expr.stmts[i].kind === "ExprStmt") {
                    return evalExprTCO(expr.stmts[i].expr, blockEnv, fnName);
                }
                result = evalStmt(expr.stmts[i], blockEnv);
            }
            return result;
        }
        case "MatchExpr": {
            const subject = evalExpr(expr.subject, env);
            for (const arm of expr.arms) {
                const matchEnv = new Env(env);
                if (matchPattern(arm.pattern, subject, matchEnv)) {
                    if (arm.guard && !isTruthy(evalExpr(arm.guard, matchEnv)))
                        continue;
                    return evalExprTCO(arm.body, matchEnv, fnName);
                }
            }
            return null;
        }
        default:
            return evalExpr(expr, env);
    }
}
function evalExpr(expr, env) {
    switch (expr.kind) {
        case "IntLiteral": return expr.value;
        case "FloatLiteral": return expr.value;
        case "BoolLiteral": return expr.value;
        case "NilLiteral": return null;
        case "StringLiteral": return expr.value;
        case "StringInterp": {
            return expr.parts.map(p => typeof p === "string" ? p : toStr(evalExpr(p, env))).join("");
        }
        case "Identifier": return env.get(expr.name);
        case "BinaryExpr": {
            // Short-circuit for logical operators
            if (expr.op === "and") {
                const left = evalExpr(expr.left, env);
                return isTruthy(left) ? evalExpr(expr.right, env) : left;
            }
            if (expr.op === "or") {
                const left = evalExpr(expr.left, env);
                return isTruthy(left) ? left : evalExpr(expr.right, env);
            }
            const left = evalExpr(expr.left, env);
            const right = evalExpr(expr.right, env);
            switch (expr.op) {
                case "+": {
                    if (typeof left === "string" || typeof right === "string") {
                        return toStr(left) + toStr(right);
                    }
                    return left + right;
                }
                case "-": return left - right;
                case "*": return left * right;
                case "/": {
                    if (right === 0)
                        throw new Error(`Division by zero at line ${expr.loc.line}`);
                    return left / right;
                }
                case "%": {
                    if (right === 0)
                        throw new Error(`Modulo by zero at line ${expr.loc.line}`);
                    return left % right;
                }
                case "**": return Math.pow(left, right);
                case "==": return left === right;
                case "!=": return left !== right;
                case "<": return left < right;
                case ">": return left > right;
                case "<=": return left <= right;
                case ">=": return left >= right;
                case "++": {
                    if (Array.isArray(left) && Array.isArray(right))
                        return [...left, ...right];
                    return toStr(left) + toStr(right);
                }
                default: throw new Error(`Unknown operator: ${expr.op} at line ${expr.loc.line}`);
            }
        }
        case "UnaryExpr": {
            const operand = evalExpr(expr.operand, env);
            if (expr.op === "-")
                return -operand;
            if (expr.op === "not")
                return !isTruthy(operand);
            throw new Error(`Unknown unary op: ${expr.op}`);
        }
        case "CallExpr": {
            const callee = evalExpr(expr.callee, env);
            let args = expr.args.map(a => evalExpr(a, env));
            let result;
            if (typeof callee === "function") {
                result = callee(...args);
            }
            else if (callee && typeof callee === "object" && "__fn" in callee) {
                let fn = callee;
                // Tail call optimization loop: if the function body resolves to
                // a tail call back to itself, reuse the frame instead of recursing
                try {
                    tailLoop: while (true) {
                        const fnEnv = new Env(fn.closure);
                        fn.params.forEach((p, i) => fnEnv.set(p, args[i] ?? null));
                        const bodyResult = evalExprTCO(fn.body, fnEnv, fn.name);
                        if (bodyResult && typeof bodyResult === "object" && "__tco" in bodyResult) {
                            const tco = bodyResult;
                            args = tco.args;
                            // fn stays the same — it's a self-recursive tail call
                            continue tailLoop;
                        }
                        result = bodyResult;
                        break;
                    }
                }
                catch (e) {
                    if (e instanceof ReturnSignal) {
                        result = e.value;
                    }
                    else {
                        throw e;
                    }
                }
            }
            else {
                throw new Error(`Not callable: ${toStr(callee)} at line ${expr.loc.line}`);
            }
            // Auto-await async function results
            return resolveAsync(result);
        }
        case "MemberExpr": {
            const obj = evalExpr(expr.object, env);
            if (obj === null)
                return null;
            if (obj && typeof obj === "object" && "__map" in obj) {
                return obj.entries.get(expr.property) ?? null;
            }
            throw new Error(`Cannot access property '${expr.property}' on ${toStr(obj)}`);
        }
        case "IndexExpr": {
            const obj = evalExpr(expr.object, env);
            const idx = evalExpr(expr.index, env);
            if (Array.isArray(obj) && typeof idx === "number")
                return obj[idx] ?? null;
            if (obj && typeof obj === "object" && "__map" in obj && typeof idx === "string") {
                return obj.entries.get(idx) ?? null;
            }
            return null;
        }
        case "PipelineExpr": {
            const left = evalExpr(expr.left, env);
            // The right side should be a function or call expression
            // If it's an identifier, call it with left as first arg
            // If it's a call, prepend left to args
            if (expr.right.kind === "Identifier") {
                const fn = env.get(expr.right.name);
                if (typeof fn === "function")
                    return fn(left);
                if (fn && typeof fn === "object" && "__fn" in fn) {
                    const f = fn;
                    const fnEnv = new Env(f.closure);
                    f.params.forEach((p, i) => fnEnv.set(p, i === 0 ? left : null));
                    try {
                        return evalExpr(f.body, fnEnv);
                    }
                    catch (e) {
                        if (e instanceof ReturnSignal)
                            return e.value;
                        throw e;
                    }
                }
            }
            if (expr.right.kind === "CallExpr") {
                const callee = evalExpr(expr.right.callee, env);
                const args = [left, ...expr.right.args.map(a => evalExpr(a, env))];
                if (typeof callee === "function")
                    return callee(...args);
                if (callee && typeof callee === "object" && "__fn" in callee) {
                    const fn = callee;
                    const fnEnv = new Env(fn.closure);
                    fn.params.forEach((p, i) => fnEnv.set(p, args[i] ?? null));
                    try {
                        return evalExpr(fn.body, fnEnv);
                    }
                    catch (e) {
                        if (e instanceof ReturnSignal)
                            return e.value;
                        throw e;
                    }
                }
            }
            throw new Error(`Pipeline target must be a function at line ${expr.loc.line}`);
        }
        case "IfExpr": {
            const cond = evalExpr(expr.condition, env);
            if (isTruthy(cond))
                return evalExpr(expr.then, env);
            if (expr.else_)
                return evalExpr(expr.else_, env);
            return null;
        }
        case "MatchExpr": {
            const subject = evalExpr(expr.subject, env);
            for (const arm of expr.arms) {
                const matchEnv = new Env(env);
                if (matchPattern(arm.pattern, subject, matchEnv)) {
                    if (arm.guard && !isTruthy(evalExpr(arm.guard, matchEnv)))
                        continue;
                    return evalExpr(arm.body, matchEnv);
                }
            }
            return null;
        }
        case "LambdaExpr": {
            return { __fn: true, name: "<lambda>", params: expr.params, body: expr.body, closure: env };
        }
        case "ListLiteral": return expr.elements.map(e => evalExpr(e, env));
        case "MapLiteral": {
            const m = new Map();
            for (const entry of expr.entries) {
                const key = typeof entry.key === "string" ? entry.key : toStr(evalExpr(entry.key, env));
                m.set(key, evalExpr(entry.value, env));
            }
            return { __map: true, entries: m };
        }
        case "ListComprehension": {
            const iterable = evalExpr(expr.iterable, env);
            if (!Array.isArray(iterable))
                throw new Error(`Comprehension requires iterable at line ${expr.loc.line}`);
            const result = [];
            for (const item of iterable) {
                const iterEnv = new Env(env);
                iterEnv.set(expr.variable, item);
                if (expr.filter && !isTruthy(evalExpr(expr.filter, iterEnv)))
                    continue;
                result.push(evalExpr(expr.expr, iterEnv));
            }
            return result;
        }
        case "RangeExpr": {
            const start = evalExpr(expr.start, env);
            const end = evalExpr(expr.end, env);
            const result = [];
            for (let i = start; i < end; i++)
                result.push(i);
            return result;
        }
        case "ToolCallExpr": {
            const method = expr.method.toUpperCase();
            const arg = evalExpr(expr.arg, env);
            const url = toStr(arg);
            // Mock HTTP tool calls
            if (["GET", "POST", "PUT", "DELETE", "PATCH"].includes(method)) {
                console.log(`[mock ${method} ${url}]`);
                if (expr.body) {
                    const body = evalExpr(expr.body, env);
                    return { __map: true, entries: new Map([["status", 200], ["method", method], ["url", url], ["body", body]]) };
                }
                return { __map: true, entries: new Map([["status", 200], ["method", method], ["url", url], ["data", `mock-data-from-${url}`]]) };
            }
            // Custom tool call
            console.log(`[mock tool @${expr.method}(${url})]`);
            return `mock-result-from-${expr.method}`;
        }
        case "AsyncExpr": {
            const capturedEnv = env;
            const body = expr.body;
            return { __async: true, thunk: () => evalExpr(body, new Env(capturedEnv)) };
        }
        case "AwaitExpr": {
            const val = evalExpr(expr.expr, env);
            return resolveAsync(val);
        }
        case "FetchExpr": {
            return expr.targets.map(t => {
                const val = evalExpr(t, env);
                return resolveAsync(val);
            });
        }
        case "BlockExpr": {
            const blockEnv = new Env(env);
            let result = null;
            for (const stmt of expr.stmts) {
                result = evalStmt(stmt, blockEnv);
            }
            return result;
        }
        default:
            throw new Error(`Unknown expression kind: ${expr.kind}`);
    }
}
function matchPattern(pattern, value, env) {
    switch (pattern.kind) {
        case "WildcardPattern": return true;
        case "LiteralPattern": return pattern.value === value;
        case "BindingPattern":
            env.set(pattern.name, value);
            return true;
        case "ArrayPattern": {
            if (!Array.isArray(value))
                return false;
            if (pattern.elements.length !== value.length)
                return false;
            return pattern.elements.every((p, i) => matchPattern(p, value[i], env));
        }
        case "OrPattern":
            return pattern.patterns.some(p => matchPattern(p, value, env));
        default: return false;
    }
}
function evalStmt(stmt, env) {
    switch (stmt.kind) {
        case "LetStmt": {
            const value = evalExpr(stmt.value, env);
            if (typeof stmt.name === "string") {
                env.set(stmt.name, value, stmt.mutable);
            }
            else {
                // Destructuring
                const target = stmt.name;
                if (target.type === "object" && value && typeof value === "object" && "__map" in value) {
                    const m = value.entries;
                    for (const n of target.names)
                        env.set(n, m.get(n) ?? null, stmt.mutable);
                }
                else if (target.type === "array" && Array.isArray(value)) {
                    target.names.forEach((n, i) => env.set(n, value[i] ?? null, stmt.mutable));
                }
            }
            return value;
        }
        case "FnStmt": {
            const fn = { __fn: true, name: stmt.name, params: stmt.params, body: stmt.body, closure: env };
            env.set(stmt.name, fn);
            return fn;
        }
        case "ForStmt": {
            const iterable = evalExpr(stmt.iterable, env);
            if (!Array.isArray(iterable))
                throw new Error(`For loop requires iterable at line ${stmt.loc.line}`);
            let result = null;
            for (const item of iterable) {
                const loopEnv = new Env(env);
                loopEnv.set(stmt.variable, item);
                result = evalExpr(stmt.body, loopEnv);
            }
            return result;
        }
        case "DoStmt": {
            let result = null;
            do {
                result = evalExpr(stmt.body, env);
                const cond = evalExpr(stmt.condition, env);
                if (stmt.isWhile && !isTruthy(cond))
                    break;
                if (!stmt.isWhile && isTruthy(cond))
                    break;
            } while (true);
            return result;
        }
        case "AssignStmt": {
            const value = evalExpr(stmt.value, env);
            env.assign(stmt.target, value);
            return value;
        }
        case "MemberAssignStmt": {
            const obj = evalExpr(stmt.object, env);
            const value = evalExpr(stmt.value, env);
            if (obj && typeof obj === "object" && "__map" in obj) {
                obj.entries.set(stmt.property, value);
                return value;
            }
            throw new Error(`Cannot assign property '${stmt.property}' on ${toStr(obj)}`);
        }
        case "IndexAssignStmt": {
            const obj = evalExpr(stmt.object, env);
            const index = evalExpr(stmt.index, env);
            const value = evalExpr(stmt.value, env);
            if (Array.isArray(obj) && typeof index === "number") {
                obj[index] = value;
                return value;
            }
            if (obj && typeof obj === "object" && "__map" in obj && typeof index === "string") {
                obj.entries.set(index, value);
                return value;
            }
            throw new Error(`Cannot assign index on ${toStr(obj)}`);
        }
        case "RetStmt": {
            const value = stmt.value ? evalExpr(stmt.value, env) : null;
            throw new ReturnSignal(value);
        }
        case "ExprStmt": return evalExpr(stmt.expr, env);
        case "UseStmt": {
            // Module imports handled by interpretWithFile; no-op if no file context
            return null;
        }
        case "TypeStmt": {
            // Store type definitions in the environment for runtime validation
            const typeDef = stmt;
            env.set(`__type__${typeDef.name}`, typeDef.def);
            return null;
        }
        default:
            throw new Error(`Unknown statement kind: ${stmt.kind}`);
    }
}
export function createEnv() {
    const env = new Env();
    makePrelude(env);
    return env;
}
export function runStmt(stmt, env) {
    return evalStmt(stmt, env);
}
export function runExpr(expr, env) {
    return evalExpr(expr, env);
}
export function interpret(program, onUse) {
    const env = createEnv();
    for (const stmt of program.stmts) {
        if (stmt.kind === "UseStmt" && onUse) {
            onUse(stmt, env);
        }
        else {
            evalStmt(stmt, env);
        }
    }
}
export function interpretWithEnv(program, env, onUse) {
    let result = null;
    for (const stmt of program.stmts) {
        if (stmt.kind === "UseStmt" && onUse) {
            onUse(stmt, env);
            result = null;
        }
        else {
            result = evalStmt(stmt, env);
        }
    }
    return result;
}
export { Env, toStr };
