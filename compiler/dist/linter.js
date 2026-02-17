// Arc Language Linter
// Checks for common code quality issues
import { lex } from "./lexer.js";
import { parse } from "./parser.js";
const DEFAULT_OPTIONS = {
    maxLineLength: 100,
    file: "<stdin>",
};
export function lint(source, options) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const diagnostics = [];
    function warn(rule, message, loc) {
        diagnostics.push({ severity: "warning", rule, message, file: opts.file, line: loc.line, col: loc.col });
    }
    function info(rule, message, loc) {
        diagnostics.push({ severity: "info", rule, message, file: opts.file, line: loc.line, col: loc.col });
    }
    // Check line lengths
    const lines = source.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].length > opts.maxLineLength) {
            warn("line-length", `Line exceeds ${opts.maxLineLength} characters (${lines[i].length})`, { line: i + 1, col: opts.maxLineLength + 1 });
        }
    }
    // Parse
    let ast;
    try {
        const tokens = lex(source);
        ast = parse(tokens);
    }
    catch {
        return diagnostics; // can't lint if we can't parse
    }
    class LintScope {
        parent;
        vars = new Map();
        children = [];
        constructor(parent) {
            this.parent = parent;
        }
        define(name, info) {
            // Check shadowing
            if (this.parent) {
                const existing = this.parent.lookupAll(name);
                if (existing) {
                    warn("shadowed-variable", `Variable '${name}' shadows a variable from an outer scope`, info.loc);
                }
            }
            this.vars.set(name, info);
        }
        lookup(name) {
            return this.vars.get(name) ?? this.parent?.lookup(name);
        }
        lookupAll(name) {
            return this.vars.get(name) ?? this.parent?.lookupAll(name);
        }
        markUsed(name) {
            const v = this.vars.get(name);
            if (v) {
                v.used = true;
                return;
            }
            this.parent?.markUsed(name);
        }
        markMutated(name) {
            const v = this.vars.get(name);
            if (v) {
                v.mutated = true;
                return;
            }
            this.parent?.markMutated(name);
        }
    }
    // Naming conventions
    function isSnakeCase(name) {
        return /^[a-z_][a-z0-9_]*$/.test(name);
    }
    function isPascalCase(name) {
        return /^[A-Z][a-zA-Z0-9]*$/.test(name);
    }
    function checkVarNaming(name, loc) {
        if (name === "_")
            return;
        if (!isSnakeCase(name)) {
            info("naming-convention", `Variable '${name}' should use snake_case`, loc);
        }
    }
    function checkFnNaming(name, loc) {
        if (!isSnakeCase(name)) {
            info("naming-convention", `Function '${name}' should use snake_case`, loc);
        }
    }
    function checkTypeNaming(name, loc) {
        if (!isPascalCase(name)) {
            info("naming-convention", `Type '${name}' should use PascalCase`, loc);
        }
    }
    function analyzeExpr(expr, scope) {
        switch (expr.kind) {
            case "IntLiteral":
            case "FloatLiteral":
            case "BoolLiteral":
            case "NilLiteral":
            case "StringLiteral":
                break;
            case "StringInterp":
                for (const part of expr.parts) {
                    if (typeof part !== "string")
                        analyzeExpr(part, scope);
                }
                break;
            case "Identifier":
                scope.markUsed(expr.name);
                break;
            case "BinaryExpr":
                analyzeExpr(expr.left, scope);
                analyzeExpr(expr.right, scope);
                break;
            case "UnaryExpr":
                analyzeExpr(expr.operand, scope);
                break;
            case "CallExpr":
                analyzeExpr(expr.callee, scope);
                for (const arg of expr.args)
                    analyzeExpr(arg, scope);
                break;
            case "MemberExpr":
                analyzeExpr(expr.object, scope);
                break;
            case "IndexExpr":
                analyzeExpr(expr.object, scope);
                analyzeExpr(expr.index, scope);
                break;
            case "PipelineExpr":
                analyzeExpr(expr.left, scope);
                analyzeExpr(expr.right, scope);
                break;
            case "IfExpr":
                analyzeExpr(expr.condition, scope);
                analyzeExpr(expr.then, scope);
                if (expr.else_)
                    analyzeExpr(expr.else_, scope);
                break;
            case "MatchExpr":
                analyzeExpr(expr.subject, scope);
                for (const arm of expr.arms) {
                    const armScope = new LintScope(scope);
                    scope.children.push(armScope);
                    analyzePattern(arm.pattern, armScope);
                    if (arm.guard)
                        analyzeExpr(arm.guard, armScope);
                    analyzeExpr(arm.body, armScope);
                }
                break;
            case "LambdaExpr": {
                const lambdaScope = new LintScope(scope);
                scope.children.push(lambdaScope);
                for (const p of expr.params) {
                    lambdaScope.define(p, { name: p, loc: expr.loc, mutable: false, used: false, mutated: false, kind: "parameter" });
                }
                analyzeExpr(expr.body, lambdaScope);
                break;
            }
            case "ListLiteral":
                for (const el of expr.elements)
                    analyzeExpr(el, scope);
                break;
            case "MapLiteral":
                for (const entry of expr.entries) {
                    if (entry.spread) {
                        analyzeExpr(entry.spread, scope);
                        continue;
                    }
                    if (entry.key && typeof entry.key !== "string")
                        analyzeExpr(entry.key, scope);
                    if (entry.value)
                        analyzeExpr(entry.value, scope);
                }
                break;
            case "ListComprehension": {
                analyzeExpr(expr.iterable, scope);
                const compScope = new LintScope(scope);
                scope.children.push(compScope);
                compScope.define(expr.variable, { name: expr.variable, loc: expr.loc, mutable: false, used: false, mutated: false, kind: "loop-var" });
                analyzeExpr(expr.expr, compScope);
                if (expr.filter)
                    analyzeExpr(expr.filter, compScope);
                break;
            }
            case "ToolCallExpr":
                analyzeExpr(expr.arg, scope);
                if (expr.body)
                    analyzeExpr(expr.body, scope);
                break;
            case "RangeExpr":
                analyzeExpr(expr.start, scope);
                analyzeExpr(expr.end, scope);
                break;
            case "BlockExpr": {
                const blockScope = new LintScope(scope);
                scope.children.push(blockScope);
                analyzeStmts(expr.stmts, blockScope);
                break;
            }
            case "AsyncExpr":
                analyzeExpr(expr.body, scope);
                break;
            case "AwaitExpr":
                analyzeExpr(expr.expr, scope);
                break;
            case "FetchExpr":
                for (const t of expr.targets)
                    analyzeExpr(t, scope);
                break;
        }
    }
    function analyzePattern(pat, scope) {
        if (pat.kind === "BindingPattern") {
            scope.define(pat.name, { name: pat.name, loc: pat.loc, mutable: false, used: false, mutated: false, kind: "variable" });
        }
        else if (pat.kind === "ArrayPattern") {
            for (const el of pat.elements)
                analyzePattern(el, scope);
        }
        else if (pat.kind === "OrPattern") {
            for (const p of pat.patterns)
                analyzePattern(p, scope);
        }
    }
    function hasReturnInBlock(stmts) {
        // Returns index of first ret statement, or -1
        for (let i = 0; i < stmts.length; i++) {
            const s = stmts[i];
            if (s.kind === "ExprStmt" && s.expr.kind === "CallExpr" &&
                s.expr.callee.kind === "Identifier" && s.expr.callee.name === "ret") {
                return i;
            }
            // Check for `ret` keyword used as identifier in expression position
            if (s.kind === "ExprStmt" && s.expr.kind === "Identifier" && s.expr.name === "ret") {
                return i;
            }
        }
        return -1;
    }
    function analyzeStmts(stmts, scope, isTopLevel = false) {
        // First pass: register functions
        for (const stmt of stmts) {
            if (stmt.kind === "FnStmt") {
                scope.define(stmt.name, {
                    name: stmt.name, loc: stmt.loc, mutable: false,
                    used: isTopLevel, // top-level fns are considered "used"
                    mutated: false, kind: "function"
                });
            }
        }
        // Check for unreachable code after ret
        const retIdx = hasReturnInBlock(stmts);
        if (retIdx >= 0 && retIdx < stmts.length - 1) {
            warn("unreachable-code", "Unreachable code after ret", stmts[retIdx + 1].loc);
        }
        for (const stmt of stmts) {
            analyzeStmt(stmt, scope, isTopLevel);
        }
        // Check unused variables in this scope
        for (const [name, info] of scope.vars) {
            if (name === "_")
                continue;
            if (!info.used) {
                if (info.kind === "import") {
                    warn("unused-import", `Unused import: '${name}'`, info.loc);
                }
                else if (info.kind === "variable" || info.kind === "destructured") {
                    warn("unused-variable", `Unused variable: '${name}'`, info.loc);
                }
            }
            if (info.mutable && !info.mutated && info.used) {
                warn("unnecessary-mut", `Variable '${name}' is never mutated; use 'let' instead of 'let mut'`, info.loc);
            }
        }
    }
    function analyzeStmt(stmt, scope, isTopLevel = false) {
        switch (stmt.kind) {
            case "LetStmt": {
                analyzeExpr(stmt.value, scope);
                if (typeof stmt.name === "string") {
                    checkVarNaming(stmt.name, stmt.loc);
                    scope.define(stmt.name, {
                        name: stmt.name, loc: stmt.loc, mutable: stmt.mutable,
                        used: false, mutated: false, kind: "variable"
                    });
                }
                else {
                    for (const n of stmt.name.names) {
                        checkVarNaming(n, stmt.loc);
                        scope.define(n, {
                            name: n, loc: stmt.loc, mutable: stmt.mutable,
                            used: false, mutated: false, kind: "destructured"
                        });
                    }
                }
                break;
            }
            case "FnStmt": {
                checkFnNaming(stmt.name, stmt.loc);
                // Check for missing pub on top-level functions
                if (isTopLevel && !stmt.pub) {
                    info("missing-pub", `Function '${stmt.name}' could be exported with 'pub'`, stmt.loc);
                }
                const fnScope = new LintScope(scope);
                scope.children.push(fnScope);
                for (const p of stmt.params) {
                    fnScope.define(p, { name: p, loc: stmt.loc, mutable: false, used: false, mutated: false, kind: "parameter" });
                }
                analyzeExpr(stmt.body, fnScope);
                // Check empty body
                if (stmt.body.kind === "BlockExpr" && stmt.body.stmts.length === 0) {
                    warn("empty-block", `Function '${stmt.name}' has an empty body`, stmt.loc);
                }
                break;
            }
            case "ForStmt": {
                analyzeExpr(stmt.iterable, scope);
                const forScope = new LintScope(scope);
                scope.children.push(forScope);
                if (typeof stmt.variable === "string") {
                    forScope.define(stmt.variable, {
                        name: stmt.variable, loc: stmt.loc, mutable: false,
                        used: false, mutated: false, kind: "loop-var"
                    });
                }
                else {
                    for (const n of stmt.variable.names) {
                        forScope.define(n, {
                            name: n, loc: stmt.loc, mutable: false,
                            used: false, mutated: false, kind: "loop-var"
                        });
                    }
                }
                analyzeExpr(stmt.body, forScope);
                // Check empty body
                if (stmt.body.kind === "BlockExpr" && stmt.body.stmts.length === 0) {
                    warn("empty-block", "For loop has an empty body", stmt.loc);
                }
                break;
            }
            case "WhileStmt":
                analyzeExpr(stmt.condition, scope);
                analyzeExpr(stmt.body, scope);
                if (stmt.body.kind === "BlockExpr" && stmt.body.stmts.length === 0) {
                    warn("empty-block", "While loop has an empty body", stmt.loc);
                }
                break;
            case "BreakStmt":
            case "ContinueStmt":
                break;
            case "TryCatchStmt":
                analyzeExpr(stmt.body, scope);
                analyzeExpr(stmt.catchBody, scope);
                break;
            case "RetStmt":
                if (stmt.value)
                    analyzeExpr(stmt.value, scope);
                break;
            case "DoStmt":
                analyzeExpr(stmt.body, scope);
                analyzeExpr(stmt.condition, scope);
                if (stmt.body.kind === "BlockExpr" && stmt.body.stmts.length === 0) {
                    warn("empty-block", "Do loop has an empty body", stmt.loc);
                }
                break;
            case "ExprStmt":
                analyzeExpr(stmt.expr, scope);
                break;
            case "UseStmt": {
                if (stmt.imports) {
                    for (const imp of stmt.imports) {
                        scope.define(imp, { name: imp, loc: stmt.loc, mutable: false, used: false, mutated: false, kind: "import" });
                    }
                }
                else if (!stmt.wildcard) {
                    const moduleName = stmt.path[stmt.path.length - 1];
                    scope.define(moduleName, { name: moduleName, loc: stmt.loc, mutable: false, used: false, mutated: false, kind: "import" });
                }
                break;
            }
            case "TypeStmt":
                checkTypeNaming(stmt.name, stmt.loc);
                scope.define(stmt.name, { name: stmt.name, loc: stmt.loc, mutable: false, used: false, mutated: false, kind: "type" });
                break;
            case "AssignStmt":
                scope.markMutated(stmt.target);
                scope.markUsed(stmt.target);
                analyzeExpr(stmt.value, scope);
                break;
            case "MemberAssignStmt":
                analyzeExpr(stmt.object, scope);
                analyzeExpr(stmt.value, scope);
                break;
            case "IndexAssignStmt":
                analyzeExpr(stmt.object, scope);
                analyzeExpr(stmt.index, scope);
                analyzeExpr(stmt.value, scope);
                break;
        }
    }
    const globalScope = new LintScope();
    analyzeStmts(ast.stmts, globalScope, true);
    // Sort by line/col
    diagnostics.sort((a, b) => a.line - b.line || a.col - b.col);
    return diagnostics;
}
export function formatDiagnostic(d) {
    const sev = d.severity === "error" ? "ERROR" : d.severity === "warning" ? "WARN" : "INFO";
    return `${d.file}:${d.line}:${d.col} [${sev}] ${d.message} (${d.rule})`;
}
