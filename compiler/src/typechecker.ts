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
    }
  }

  function walkExpr(expr: AST.Expr): void {
    if (expr.kind === "MatchExpr") {
      checkMatchExhaustiveness(expr);
      for (const arm of expr.arms) {
        walkExpr(arm.body);
      }
    } else if (expr.kind === "BlockExpr") {
      for (const s of expr.stmts) {
        walkStmt(s);
      }
    } else if (expr.kind === "IfExpr") {
      walkExpr(expr.then);
      if (expr.else_) walkExpr(expr.else_);
    }
  }

  function checkMatchExhaustiveness(matchExpr: AST.MatchExpr): void {
    const hasWildcard = matchExpr.arms.some(a => a.pattern.kind === "WildcardPattern");
    if (!hasWildcard) {
      // Check if subject is a known enum type
      if (matchExpr.subject.kind === "Identifier") {
        // Can't easily determine type without full type inference, so just warn
        diagnostics.push({
          level: "warning",
          message: `Match expression may not be exhaustive (no wildcard pattern)`,
          loc: matchExpr.loc,
        });
      }
    }
  }

  return diagnostics;
}
