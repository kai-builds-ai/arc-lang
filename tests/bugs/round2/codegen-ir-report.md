# Arc Language Audit Report — Round 2
## Codegen, IR, Optimizer, Semantic Analyzer, Type Checker

**Date:** 2026-02-16  
**Scope:** `codegen-js.ts`, `codegen.ts` (WAT), `ir.ts`, `optimizer.ts`, `semantic.ts`, `typechecker.ts`  
**Method:** Wrote 40+ .arc test files, compiled to JS, ran both interpreter and compiled output, compared results  
**Test suite:** All 508 existing tests pass after fixes

---

## Bugs Found and Fixed

### 1. **Print formatting mismatch** (codegen-js.ts) — FIXED
**Severity:** Medium  
**Description:** Runtime `print` used `JSON.stringify` for objects/arrays, producing `[1,2,3]` and `["x","y"]`. Interpreter's `toStr` produces `[1, 2, 3]` and `[x, y, z]` (with spaces, no quotes on strings in lists).  
**Fix:** Added `__toStr()` to runtime that matches interpreter's `toStr` formatting. Updated `print` to use it.

### 2. **Missing runtime builtins: `upper`, `lower`, `type_of`** (codegen-js.ts) — FIXED
**Severity:** Medium  
**Description:** Interpreter exposes `upper()`, `lower()`, and `type_of()` as builtins. Codegen only had `uppercase()`/`lowercase()` and no `type_of`. Programs using these builtins crashed in compiled JS.  
**Fix:** Added `upper`, `lower`, `type_of` to both the runtime object and the builtins list in `emitCall`.

### 3. **Null-unsafe member access** (codegen-js.ts) — FIXED
**Severity:** High  
**Description:** `field` instruction emitted `obj[prop]` which throws when `obj` is `null`. Interpreter returns `nil` for member access on nil.  
**Fix:** Changed field emit to null-check: `(obj == null) ? null : (obj.__map) ? ... : obj[prop]`

### 4. **Variable shadowing broken in compiled output** (ir.ts) — FIXED
**Severity:** High  
**Description:** Block expressions (`{ let x = 20; x }`) that shadow outer variables would overwrite the outer variable because the IR used the same name for both. All variables compiled to the same flat `var x`.  
**Root cause:** IR generator had no concept of lexical scoping — all `store`/`load` operations used raw user-level variable names.  
**Fix:** Added a scope stack to `IRGenerator` with `pushScope()`/`popScope()`/`defineVar()`/`resolveVar()`. Variables in inner scopes get mangled names (e.g., `x__s0`). Updated `LetStmt`, `AssignStmt`, `Identifier`, `ForStmt`, `FnStmt`, `LambdaExpr`, and `BlockExpr` to use the scope system.

### 5. **Match guard evaluation order bug** (ir.ts) — FIXED
**Severity:** High  
**Description:** Match guards like `n if n > 10 => "big"` would try to evaluate the guard expression (`n > 10`) BEFORE binding `n` from the pattern. This caused `n` to be undefined or reference wrong values.  
**Root cause:** IR lowered pattern condition + guard condition, then branched, then bound pattern variables. But guards need the bound variables.  
**Fix:** Restructured match arm lowering: first check the pattern condition, branch to a guard label, bind pattern variables, THEN evaluate the guard, then branch to the arm body or next arm.

### 6. **`fold` missing from interpreter** (interpreter.ts) — FIXED
**Severity:** Low  
**Description:** Codegen runtime had `fold(list, init, fn)` but interpreter only had `reduce(list, fn, init)`. Note the different argument order too.  
**Fix:** Added `fold` to interpreter prelude with the correct signature `fold(list, init, fn)`.

### 7. **`var` self-reference for hoisted function stores** (codegen-js.ts) — FIXED
**Severity:** Medium  
**Description:** When a function was stored to a variable with the same name (e.g., `store outer = @fn:outer`), codegen emitted `var outer = outer;` which with `var` hoisting evaluates to `undefined`.  
**Fix:** Skip the redundant store when the variable name matches the function name, since the hoisted `function` declaration already provides the binding.

---

## Bugs Found — Not Fixed (Architectural Issues)

### 8. **Nested function definitions don't capture parent scope** (ir.ts / codegen-js.ts)
**Severity:** High  
**Description:** Functions defined inside other functions (e.g., `fn outer(x) { fn inner(y) { x + y }; inner(10) }`) don't work in compiled output. The IR hoists all functions to module level, so `inner` can't access `outer`'s parameter `x`.  
**Root cause:** IR `FnStmt` lowering pushes the inner function to the module's top-level `functions` array. Codegen emits all functions at the same level. There's no concept of function nesting or closure capture in the IR.  
**Impact:** Any nested `fn` definition that references outer variables will fail. Lambdas work because they're compiled as separate functions, but they have the same closure capture problem.  
**Suggested fix:** Track parent function context in IR. Either emit nested functions inline in codegen, or implement closure conversion (capture free variables as explicit parameters).

### 9. **For-loop closure capture shares single variable** (ir.ts)
**Severity:** Medium  
**Description:** `for i in 0..5 { fns = push(fns, () => i) }` — all closures capture the same `i` variable and see its final value. Interpreter creates a new `Env` per iteration so each closure captures its own `i`.  
**Root cause:** IR generates a single `store i = <elem>` that's overwritten each iteration. Lambdas compiled from the loop body read from this shared variable.  
**Suggested fix:** For lambda bodies inside loops, implement variable capture — either by wrapping each iteration's lambda creation in an IIFE, or by copying the loop variable into a fresh temp before creating the closure.

---

## Optimizer Analysis

### Constant Folding
- Works correctly for integer arithmetic, string concatenation, boolean operations
- **Potential issue:** Division by zero returns `null` instead of propagating error — this could mask bugs but is safe
- Float constant folding uses JS semantics (IEEE 754), which is correct for the JS target

### Dead Code Elimination
- Correctly marks `call` as having side effects (not eliminated)
- `print`, `store`, `setfield`, `setindex` all preserved — correct
- **Minor issue:** `store` instructions that store to temps never read again are kept because all `store` is considered side-effecting. Could be more aggressive for SSA temps.

### Common Subexpression Elimination
- Only handles `binop` instructions — could be extended to `call` (for pure builtins like `len`), `field`, `index`
- Remapping is applied to all operand positions — correct

### Pipeline Fusion
- Detects `map` followed by `filter` (or vice versa) and fuses them
- **Potential correctness issue:** The fused function names (`fused_map_filter`, `fused_filter_map`) are not defined in the runtime. If these survive to codegen, they'll produce calls to undefined functions. This only matters if the pipeline fusion result is actually used by codegen (currently IR-level only).

### Tool Call Batching
- Correctly identifies independent tool calls and groups them
- Dependency checking prevents batching when one call depends on another's result
- Side-effect barriers (`print`, `call`, `branch`) prevent incorrect reordering — correct

---

## Semantic Analyzer Analysis

### Strengths
- Function hoisting: analyzes function bodies with correct arity tracking
- Match exhaustiveness warnings: detects missing wildcard arms and unreachable arms after catch-all
- Scope analysis: proper nested scope handling with `Scope` class
- Mutability checking: prevents reassignment of immutable variables

### Issues Found
- **False negative:** The analyzer doesn't catch use of `fold` as an undefined variable because the builtins set includes `fold` via `reduce`. The BUILTINS set is very large and includes names that don't exist in the interpreter (e.g., `starts_with`, `ends_with`, `flat_map`, `group_by`, `sort_by`, `chunk`, `window`, `scan`). This means the analyzer accepts calls to non-existent functions.
- **No type checking on operations:** `1 + "hello"` passes semantic analysis without warning, even though it produces surprising results.
- **Pipeline right-hand side:** `x |> f(a, b)` — the analyzer visits `f(a, b)` as a standalone CallExpr, which would check arity of `f` with 2 args. But at runtime, `x` is prepended, making it 3 args. This could produce false arity errors.

---

## Type Checker Analysis

### Current State
- Very basic — primarily validates type definitions and checks match exhaustiveness
- Does NOT perform actual type inference or type checking on expressions
- Warns about unknown types in type definitions — useful but limited

### Missing
- No inference of expression types
- No checking that operators are applied to compatible types
- No function return type validation
- No checking of argument types at call sites
- Essentially a type definition validator, not a type checker

---

## WAT Codegen (codegen.ts) Analysis

### Known Limitations (by design — marked with TODOs)
- Float values truncated to i32 (`Math.round`)
- String handling: only stores offset, no length tracking
- No actual string concatenation implementation
- `setindex` is a no-op (just a comment)
- `jump`/`branch` are comments, not actual control flow — WAT codegen is incomplete
- `range` creates empty list (no iteration)
- `**` power operator stubbed as `i32.mul`

### Assessment
WAT codegen is a prototype/skeleton — not functional for real programs. JS codegen is the production target.

---

## Summary

| Category | Bugs Found | Fixed | Remaining |
|----------|-----------|-------|-----------|
| Codegen runtime | 3 | 3 | 0 |
| IR scoping | 1 | 1 | 0 |
| IR match guards | 1 | 1 | 0 |
| Interpreter parity | 1 | 1 | 0 |
| Codegen self-ref | 1 | 1 | 0 |
| Nested fn closures | 1 | 0 | 1 (architectural) |
| For-loop closures | 1 | 0 | 1 (architectural) |
| **Total** | **9** | **7** | **2** |

All 508 existing tests pass. 51 of 57 new tests pass (4 were invalid syntax, 2 are the known architectural issues).

### Files Modified
- `compiler/src/codegen-js.ts` — Print formatting, null-safe field access, missing builtins, hoisted fn store fix
- `compiler/src/ir.ts` — Scope stack for variable shadowing, match guard evaluation order
- `compiler/src/interpreter.ts` — Added `fold` builtin
