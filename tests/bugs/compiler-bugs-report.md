# Arc Compiler Bug Report

**Date:** 2026-02-16  
**Auditor:** Kai (automated audit)  
**Scope:** `compiler/src/lexer.ts`, `compiler/src/parser.ts`, `compiler/src/interpreter.ts`, `compiler/src/ast.ts`

---

## Bug 1: Unterminated string literals silently accepted

**File:** `compiler/src/lexer.ts`  
**Severity:** High  
**Test:** `bug1-unterminated-string.arc`

**Description:** The lexer's string parsing loop only checked for the closing `"` quote but had no guard against reaching a newline or EOF. An unterminated string like `"hello world` (no closing quote) would silently consume all remaining source code into the string value, producing no error.

**Reproduction:**
```arc
let x = "hello world
print(x)
```
Before fix: `x` gets value `"hello world\nprint(x)\n"`, `print(x)` is never executed, no error reported.

**Fix:** Added newline and EOF checks inside the string lexing loop. The lexer now throws `Unterminated string literal at line X, col Y`.

---

## Bug 2: Backslash escape at EOF produces "undefined" in string

**File:** `compiler/src/lexer.ts`  
**Severity:** High  
**Test:** `bug2-escape-at-eof.arc`

**Description:** When a string contains a backslash `\` as the last character before EOF (e.g., `"hello\`), the lexer calls `advance()` to read the escape character. Since there's nothing left, `source[i++]` returns JavaScript `undefined`, which gets coerced to the string `"undefined"` and concatenated into the string value.

**Reproduction:**
```arc
let x = "hello\
```
Before fix: `x` gets value `"helloundefined"`.

**Fix:** Added a bounds check after consuming the backslash. If `i >= source.length`, throws `Unterminated string literal (escape at end of file)`.

---

## Bug 3: Division/modulo by zero returns Infinity/NaN instead of error

**File:** `compiler/src/interpreter.ts`  
**Severity:** Medium  
**Test:** `bug3-division-by-zero.arc`

**Description:** The `/` and `%` binary operators delegated directly to JavaScript's arithmetic, which returns `Infinity` for `x/0` and `NaN` for `x%0`. These values then propagate silently through subsequent computations, causing confusing downstream behavior.

**Reproduction:**
```arc
let x = 10 / 0
print(x)    # prints "Infinity"
let y = 10 % 0
print(y)    # prints "NaN"
```

**Fix:** Added zero-divisor checks before both `/` and `%` operations. Now throws `Division by zero at line X` / `Modulo by zero at line X`.

---

## Bug 4: `ret` keyword defined in lexer but not handled by parser or interpreter

**File:** `compiler/src/parser.ts`, `compiler/src/interpreter.ts`, `compiler/src/ast.ts`  
**Severity:** High  
**Test:** `bug4-ret-keyword.arc`

**Description:** The `ret` keyword was registered in the lexer's keyword table (producing a `Ret` token), but the parser had no case for it in `parseStmt()`. Any use of `ret` caused a parse error: `Unexpected token: Ret 'ret'`. This meant early return from functions was completely broken.

**Reproduction:**
```arc
fn foo(x) {
  ret x + 1
}
print(foo(5))
```
Before fix: `Parse error at line 3, col 3: Unexpected token: Ret 'ret'`

**Fix:**
1. Added `RetStmt` node type to `ast.ts`
2. Added `parseRet()` method to parser
3. Added `ReturnSignal` exception class to interpreter
4. Handle `RetStmt` in `evalStmt` by throwing `ReturnSignal`
5. Catch `ReturnSignal` in the function call handler to implement early return

After fix: Correctly prints `6`.

---

## Summary

| # | Bug | Severity | Component | Fixed |
|---|-----|----------|-----------|-------|
| 1 | Unterminated strings silently accepted | High | Lexer | ✅ |
| 2 | Escape at EOF produces "undefined" | High | Lexer | ✅ |
| 3 | Division by zero returns Infinity/NaN | Medium | Interpreter | ✅ |
| 4 | `ret` keyword not implemented | High | Parser + Interpreter + AST | ✅ |

All fixes verified with test files in `tests/bugs/`.
