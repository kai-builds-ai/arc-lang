// Arc Language Type Checker (basic)

import * as AST from "./ast.js";

export interface Diagnostic {
  level: "error" | "warning";
  message: string;
  loc?: AST.Loc;
}

export function typecheck(program: AST.Program): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const typeDefinitions = new Map<string, AST.TypeExpr>();
  const knownBaseTypes = new Set(["Int", "Float", "String", "Bool", "Nil", "Any"]);

  // First pass: collect type definitions
  for (const stmt of program.stmts) {
    if (stmt.kind === "TypeStmt") {
      typeDefinitions.set(stmt.name, stmt.def);
    }
  }

  // Second pass: validate type definitions
  for (const [name, def] of typeDefinitions) {
    validateTypeExpr(def, name);
  }

  // Third pass: check match exhaustiveness
  for (const stmt of program.stmts) {
    walkStmt(stmt);
  }

  function validateTypeExpr(typeExpr: AST.TypeExpr, context: string): void {
    switch (typeExpr.kind) {
      case "NamedType":
        if (!knownBaseTypes.has(typeExpr.name) && !typeDefinitions.has(typeExpr.name)) {
          // Could be a type parameter, so just warn
          // Don't warn for single-letter names (type params)
          if (typeExpr.name.length > 1) {
            diagnostics.push({
              level: "warning",
              message: `Unknown type '${typeExpr.name}' in definition of '${context}'`,
            });
          }
        }
        break;
      case "ConstrainedType":
        validateTypeExpr(typeExpr.base, context);
        if (typeExpr.base.kind === "NamedType") {
          const baseName = typeExpr.base.name;
          if (typeExpr.constraint === "matching" && baseName !== "String") {
            diagnostics.push({
              level: "error",
              message: `'matching' constraint can only be applied to String type, got '${baseName}' in '${context}'`,
            });
          }
          if (typeExpr.constraint === "where" && !knownBaseTypes.has(baseName) && !typeDefinitions.has(baseName)) {
            diagnostics.push({
              level: "warning",
              message: `'where' constraint on unknown base type '${baseName}' in '${context}'`,
            });
          }
        }
        break;
      case "RecordType":
        for (const field of typeExpr.fields) {
          validateTypeExpr(field.type, context);
        }
        break;
      case "FunctionType":
        for (const param of typeExpr.params) {
          validateTypeExpr(param, context);
        }
        validateTypeExpr(typeExpr.ret, context);
        break;
      case "EnumType":
        for (const variant of typeExpr.variants) {
          if (variant.params) {
            for (const p of variant.params) {
              validateTypeExpr(p, context);
            }
          }
        }
        break;
      case "GenericType":
        for (const p of typeExpr.params) {
          validateTypeExpr(p, context);
        }
        break;
      case "UnionType":
        for (const v of typeExpr.variants) {
          validateTypeExpr(v, context);
        }
        break;
    }
  }

  function walkStmt(stmt: AST.Stmt): void {
    if (stmt.kind === "ExprStmt") {
      walkExpr(stmt.expr);
    } else if (stmt.kind === "LetStmt") {
      walkExpr(stmt.value);
    } else if (stmt.kind === "FnStmt") {
      walkExpr(stmt.body);
    } else if (stmt.kind === "ForStmt") {
      walkExpr(stmt.iterable);
      walkExpr(stmt.body);
    } else if (stmt.kind === "DoStmt") {
      walkExpr(stmt.body);
      walkExpr(stmt.condition);
    }
  }

  function walkExpr(expr: AST.Expr): void {
    switch (expr.kind) {
      case "MatchExpr":
        checkMatchExhaustiveness(expr);
        walkExpr(expr.subject);
        for (const arm of expr.arms) {
          if (arm.guard) walkExpr(arm.guard);
          walkExpr(arm.body);
        }
        break;
      case "BlockExpr":
        for (const s of expr.stmts) walkStmt(s);
        break;
      case "IfExpr":
        walkExpr(expr.condition);
        walkExpr(expr.then);
        if (expr.else_) walkExpr(expr.else_);
        break;
      case "BinaryExpr":
        walkExpr(expr.left);
        walkExpr(expr.right);
        break;
      case "UnaryExpr":
        walkExpr(expr.operand);
        break;
      case "CallExpr":
        walkExpr(expr.callee);
        for (const a of expr.args) walkExpr(a);
        break;
      case "LambdaExpr":
        walkExpr(expr.body);
        break;
      case "ListLiteral":
        for (const el of expr.elements) walkExpr(el);
        break;
      case "MapLiteral":
        for (const e of expr.entries) {
          if (e.spread) { walkExpr(e.spread); continue; }
          if (e.key && typeof e.key !== "string") walkExpr(e.key as AST.Expr);
          if (e.value) walkExpr(e.value);
        }
        break;
      case "PipelineExpr":
        walkExpr(expr.left);
        walkExpr(expr.right);
        break;
      case "IndexExpr":
        walkExpr(expr.object);
        walkExpr(expr.index);
        break;
      case "MemberExpr":
        walkExpr(expr.object);
        break;
      case "ListComprehension":
        walkExpr(expr.iterable);
        walkExpr(expr.expr);
        if (expr.filter) walkExpr(expr.filter);
        break;
      case "ToolCallExpr":
        walkExpr(expr.arg);
        if (expr.body) walkExpr(expr.body);
        break;
      case "RangeExpr":
        walkExpr(expr.start);
        walkExpr(expr.end);
        break;
      case "StringInterp":
        for (const part of expr.parts) {
          if (typeof part !== "string") walkExpr(part);
        }
        break;
      case "AsyncExpr":
        walkExpr(expr.body);
        break;
      case "AwaitExpr":
        walkExpr(expr.expr);
        break;
      case "FetchExpr":
        for (const t of expr.targets) walkExpr(t);
        break;
      default:
        break;
    }
  }

  function checkMatchExhaustiveness(matchExpr: AST.MatchExpr): void {
    const hasWildcard = matchExpr.arms.some(a => a.pattern.kind === "WildcardPattern");
    if (!hasWildcard) {
      // Can't easily determine type without full type inference, so just warn
      diagnostics.push({
        level: "warning",
        message: `Match expression may not be exhaustive (no wildcard pattern)`,
        loc: matchExpr.loc,
      });
    }
  }

  return diagnostics;
}
