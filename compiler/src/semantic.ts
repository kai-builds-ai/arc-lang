// Arc Language Semantic Analyzer
// Performs: name resolution, scope validation, mutability checking, arity checking, match exhaustiveness warnings

import * as AST from "./ast.js";

export interface Diagnostic {
  level: "error" | "warning";
  message: string;
  loc: AST.Loc;
}

interface SymbolInfo {
  mutable: boolean;
  kind: "variable" | "function" | "parameter" | "loop-var" | "import" | "type" | "destructured";
  arity?: number; // for functions
}

class Scope {
  private symbols = new Map<string, SymbolInfo>();
  constructor(public parent?: Scope) {}

  define(name: string, info: SymbolInfo): boolean {
    // Allow redefinition in same scope (shadowing)
    this.symbols.set(name, info);
    return true;
  }

  lookup(name: string): SymbolInfo | undefined {
    const s = this.symbols.get(name);
    if (s) return s;
    if (this.parent) return this.parent.lookup(name);
    return undefined;
  }

  lookupLocal(name: string): SymbolInfo | undefined {
    return this.symbols.get(name);
  }
}

// Built-in names that are always available
const BUILTINS = new Set([
  "print", "println", "len", "push", "pop", "map", "filter", "reduce",
  "range", "keys", "values", "entries", "type", "str", "int", "float",
  "sort", "reverse", "join", "split", "trim", "contains", "starts_with",
  "ends_with", "replace", "to_upper", "to_lower", "slice", "flat",
  "flat_map", "zip", "enumerate", "sum", "min", "max", "abs",
  "head", "tail", "take", "drop", "find", "any", "all", "count",
  "unique", "group_by", "sort_by", "chunk", "window", "scan",
  "assert", "assert_eq", "Some", "None", "Ok", "Err",
  "Math", "String", "List", "Map", "JSON", "Error",
  "true", "false", "nil",
  "is_nil", "is_some", "unwrap", "unwrap_or",
  "typeof", "chars", "char_at", "index_of", "last_index_of",
  "parse_int", "parse_float", "to_string", "format",
  "now", "sleep", "random", "floor", "ceil", "round", "sqrt", "pow", "log",
  "read_file", "write_file", "http_get", "http_post",
  "append", "prepend", "concat", "flatten", "each", "fold",
  "first", "last", "rest", "init", "is_empty", "size",
  "repeat", "pad_left", "pad_right", "upper", "lower",
  "every", "some", "none", "includes",
]);

export function analyze(program: AST.Program): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const globalScope = new Scope();

  function error(loc: AST.Loc, message: string) {
    diagnostics.push({ level: "error", message, loc });
  }

  function warning(loc: AST.Loc, message: string) {
    diagnostics.push({ level: "warning", message, loc });
  }

  function analyzeExpr(expr: AST.Expr, scope: Scope): void {
    switch (expr.kind) {
      case "IntLiteral":
      case "FloatLiteral":
      case "BoolLiteral":
      case "NilLiteral":
      case "StringLiteral":
        break;

      case "StringInterp":
        for (const part of expr.parts) {
          if (typeof part !== "string") {
            analyzeExpr(part, scope);
          }
        }
        break;

      case "Identifier": {
        const sym = scope.lookup(expr.name);
        if (!sym && !BUILTINS.has(expr.name)) {
          error(expr.loc, `Undefined variable: '${expr.name}'`);
        }
        break;
      }

      case "BinaryExpr":
        analyzeExpr(expr.left, scope);
        analyzeExpr(expr.right, scope);
        break;

      case "UnaryExpr":
        analyzeExpr(expr.operand, scope);
        break;

      case "CallExpr": {
        analyzeExpr(expr.callee, scope);
        for (const arg of expr.args) {
          analyzeExpr(arg, scope);
        }
        // Arity check for known functions
        if (expr.callee.kind === "Identifier") {
          const sym = scope.lookup(expr.callee.name);
          if (sym && sym.kind === "function" && sym.arity !== undefined) {
            if (expr.args.length !== sym.arity) {
              error(expr.loc, `Function '${expr.callee.name}' expects ${sym.arity} argument(s), but got ${expr.args.length}`);
            }
          }
        }
        break;
      }

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
        if (expr.else_) analyzeExpr(expr.else_, scope);
        break;

      case "MatchExpr":
        analyzeExpr(expr.subject, scope);
        analyzeMatchExhaustiveness(expr, scope);
        for (const arm of expr.arms) {
          const armScope = new Scope(scope);
          analyzePattern(arm.pattern, armScope);
          if (arm.guard) analyzeExpr(arm.guard, armScope);
          analyzeExpr(arm.body, armScope);
        }
        break;

      case "LambdaExpr": {
        const lambdaScope = new Scope(scope);
        for (const p of expr.params) {
          lambdaScope.define(p, { mutable: false, kind: "parameter" });
        }
        analyzeExpr(expr.body, lambdaScope);
        break;
      }

      case "ListLiteral":
        for (const el of expr.elements) analyzeExpr(el, scope);
        break;

      case "MapLiteral":
        for (const entry of expr.entries) {
          if (typeof entry.key !== "string") analyzeExpr(entry.key, scope);
          analyzeExpr(entry.value, scope);
        }
        break;

      case "ListComprehension": {
        analyzeExpr(expr.iterable, scope);
        const compScope = new Scope(scope);
        compScope.define(expr.variable, { mutable: false, kind: "loop-var" });
        analyzeExpr(expr.expr, compScope);
        if (expr.filter) analyzeExpr(expr.filter, compScope);
        break;
      }

      case "ToolCallExpr":
        analyzeExpr(expr.arg, scope);
        if (expr.body) analyzeExpr(expr.body, scope);
        break;

      case "RangeExpr":
        analyzeExpr(expr.start, scope);
        analyzeExpr(expr.end, scope);
        break;

      case "BlockExpr": {
        const blockScope = new Scope(scope);
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
        for (const t of expr.targets) analyzeExpr(t, scope);
        break;
    }
  }

  function analyzePattern(pattern: AST.Pattern, scope: Scope): void {
    switch (pattern.kind) {
      case "WildcardPattern":
        break;
      case "LiteralPattern":
        break;
      case "BindingPattern":
        scope.define(pattern.name, { mutable: false, kind: "variable" });
        break;
      case "ArrayPattern":
        for (const el of pattern.elements) analyzePattern(el, scope);
        break;
      case "OrPattern":
        for (const p of pattern.patterns) analyzePattern(p, scope);
        break;
    }
  }

  function analyzeMatchExhaustiveness(expr: AST.MatchExpr, _scope: Scope): void {
    const arms = expr.arms;
    if (arms.length === 0) {
      warning(expr.loc, "Match expression has no arms");
      return;
    }

    // Check if there's a wildcard or binding (catch-all) pattern without a guard
    const hasCatchAll = arms.some(arm =>
      !arm.guard && isCatchAllPattern(arm.pattern)
    );

    if (!hasCatchAll) {
      warning(expr.loc, "Match expression may not be exhaustive — consider adding a wildcard '_' arm");
    }

    // Check for unreachable arms (arms after a catch-all without guard)
    for (let i = 0; i < arms.length - 1; i++) {
      if (!arms[i].guard && isCatchAllPattern(arms[i].pattern)) {
        warning(arms[i + 1].body.loc, "Unreachable match arm — previous arm catches all patterns");
        break;
      }
    }
  }

  function isCatchAllPattern(pattern: AST.Pattern): boolean {
    return pattern.kind === "WildcardPattern" || pattern.kind === "BindingPattern";
  }

  function analyzeStmts(stmts: AST.Stmt[], scope: Scope): void {
    // First pass: register all function declarations (hoisting)
    for (const stmt of stmts) {
      if (stmt.kind === "FnStmt") {
        scope.define(stmt.name, {
          mutable: false,
          kind: "function",
          arity: stmt.params.length,
        });
      }
    }

    for (const stmt of stmts) {
      analyzeStmt(stmt, scope);
    }
  }

  function analyzeStmt(stmt: AST.Stmt, scope: Scope): void {
    switch (stmt.kind) {
      case "LetStmt": {
        analyzeExpr(stmt.value, scope);
        if (typeof stmt.name === "string") {
          scope.define(stmt.name, {
            mutable: stmt.mutable,
            kind: "variable",
          });
        } else {
          // DestructureTarget
          for (const n of stmt.name.names) {
            scope.define(n, {
              mutable: stmt.mutable,
              kind: "destructured",
            });
          }
        }
        break;
      }

      case "FnStmt": {
        // Already registered in first pass; now analyze body
        const fnScope = new Scope(scope);
        for (const p of stmt.params) {
          fnScope.define(p, { mutable: false, kind: "parameter" });
        }
        analyzeExpr(stmt.body, fnScope);
        break;
      }

      case "ForStmt": {
        analyzeExpr(stmt.iterable, scope);
        const forScope = new Scope(scope);
        forScope.define(stmt.variable, { mutable: false, kind: "loop-var" });
        analyzeExpr(stmt.body, forScope);
        break;
      }

      case "DoStmt":
        analyzeExpr(stmt.body, scope);
        analyzeExpr(stmt.condition, scope);
        break;

      case "ExprStmt":
        analyzeExpr(stmt.expr, scope);
        break;

      case "UseStmt":
        // Register imported names
        if (stmt.imports) {
          for (const imp of stmt.imports) {
            scope.define(imp, { mutable: false, kind: "import" });
          }
        } else if (stmt.wildcard) {
          // Wildcard import — can't track names statically
        } else {
          // Default: import the module name
          const moduleName = stmt.path[stmt.path.length - 1];
          scope.define(moduleName, { mutable: false, kind: "import" });
        }
        break;

      case "TypeStmt":
        scope.define(stmt.name, { mutable: false, kind: "type" });
        break;

      case "AssignStmt": {
        const sym = scope.lookup(stmt.target);
        if (!sym && !BUILTINS.has(stmt.target)) {
          error(stmt.loc, `Undefined variable: '${stmt.target}'`);
        } else if (sym && !sym.mutable) {
          error(stmt.loc, `Cannot reassign immutable variable: '${stmt.target}'`);
        }
        analyzeExpr(stmt.value, scope);
        break;
      }

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

  analyzeStmts(program.stmts, globalScope);
  return diagnostics;
}
