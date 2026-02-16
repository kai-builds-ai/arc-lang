# Arc Language Audit Report — Round 2
## Lexer, Error Reporting, Module System, Security Sandbox, REPL, Version System

**Date:** 2026-02-16  
**Auditor:** Subagent deep audit  
**Scope:** lexer.ts, errors.ts, modules.ts, security.ts, repl.ts, version.ts

---

## Summary

Found and fixed **8 bugs** across all audited components. All 508 existing tests continue to pass after fixes.

| # | Component | Severity | Bug | Status |
|---|-----------|----------|-----|--------|
| 1 | Lexer | Medium | Missing escape sequences: `\0`, `\r`, `\xNN`, `\u{NNNN}`, `\uNNNN`, `\{` | **Fixed** |
| 2 | Lexer | Medium | Empty string interpolation `{}` crashes with "Undefined variable: " | **Fixed** |
| 3 | Lexer | Low | Interpolation doesn't handle strings inside `{}` (brace miscounting) | **Fixed** |
| 4 | Modules | High | Circular imports silently return empty exports instead of erroring | **Fixed** |
| 5 | Security | High | `validateImport()` reads `(useStmt as any).module` but UseStmt has `.path` — import blocking is completely broken | **Fixed** |
| 6 | Version | Medium | `compareSemver` crashes on partial versions (NaN) and ignores pre-release tags | **Fixed** |
| 7 | Version | Medium | Caret operator `^0.x.y` doesn't constrain minor version when major=0; exact match uses `>=` instead of `==` | **Fixed** |
| 8 | REPL | Low | Multi-line brace counting doesn't skip braces inside strings or comments | **Fixed** |

---

## Detailed Findings

### Bug 1: Missing Escape Sequences (lexer.ts)

**Before:** The lexer only handled `\n`, `\t`, `\\`, `\"`. Any other escape like `\0`, `\x41`, `\u0041`, `\r` would silently pass through the character after the backslash (e.g., `\x41` → `"x41"`, `\0` → `"0"`).

**Fix:** Added support for `\r`, `\0`, `\{` (literal brace), `\xNN` (2-digit hex), `\uNNNN` (4-digit unicode), and `\u{NNNN}` (braced unicode codepoint).

**Test:** `lexer-escape-sequences.arc` — `\x41` now outputs `A`, `\0` outputs null character.

### Bug 2: Empty String Interpolation Crash (lexer.ts)

**Before:** `"text {} more"` would produce an Ident token with empty string value. The parser would create an Identifier with name `""`, and `env.get("")` would throw "Undefined variable: ".

**Fix:** Empty interpolation `{}` now produces an empty StringInterpPart instead of an Ident token.

**Test:** `empty-interp-test.arc` — `"before {} after"` → `"before  after"`.

### Bug 3: String Literals Inside Interpolation (lexer.ts)

**Before:** The lexer counted `{` and `}` naively inside interpolation expressions. A string containing braces inside `{}` would miscount. E.g., `"{if true { "yes" } el { "no" }}"` would terminate the interpolation at the wrong `}`.

**Fix:** The brace-counting loop now skips over string literals (respecting backslash escapes within them).

### Bug 4: Circular Import Silent Failure (modules.ts)

**Before:** Circular imports (A imports B, B imports A) would silently resolve with empty exports because `moduleCache` was pre-populated with `{}`. B would import A's empty exports, failing with "Module mod_a does not export 'greet_a'" — confusing and misleading.

**Fix:** Added a `modulesInProgress` set checked **before** the cache. Now throws `"Circular import detected: <path>"` with a clear message.

**Test:** `modules/test_circular.arc` — now gives explicit circular import error. Diamond dependencies (`modules/test_diamond.arc`) still work correctly.

### Bug 5: Security Import Validation Broken (security.ts)

**Before:** In `SafeInterpreter.run()`, the code did:
```ts
validateImport((useStmt as any).module, this.config);
```
But `UseStmt` has no `.module` property — it has `.path` (a `string[]`). So `(useStmt as any).module` was always `undefined`, and `validateImport("undefined", config)` would never match any blocklist. **This means import blocking in the sandbox was completely non-functional.**

**Fix:** Changed to `validateImport(useStmt.path.join("/"), this.config)`.

### Bug 6: Semver Comparison NaN and Pre-release (version.ts)

**Before:** `compareSemver("1.0", "1.0.0")` would compare `NaN` (from `pa[2]`) with `0`. Due to NaN comparison semantics (`NaN < 0` = false, `NaN > 0` = false), it accidentally returned 0. But `compareSemver("1.0.0-beta", "1.0.0")` would have `pa[2] = NaN` (from `parseInt("0-beta")`), silently wrong.

**Fix:** Default missing parts to 0 with `?? 0`, skip NaN values, and handle pre-release suffixes (pre-release is less than release).

### Bug 7: Caret Version + Exact Match Semantics (version.ts)

**Before:** 
- `^0.4.0` against Arc 0.5.0 returned "Compatible" — wrong. Per semver, `^0.x.y` with major=0 should constrain the minor version (i.e., `^0.4.0` means `>=0.4.0, <0.5.0`).
- Exact match `"0.4.0"` against Arc 0.5.0 returned "Compatible" because it used `>=` instead of `===`.

**Fix:** Caret with major=0 now constrains on minor version. Exact match uses `=== 0` comparison.

### Bug 8: REPL Brace Counting in Strings (repl.ts)

**Before:** The REPL's multi-line input detection counted all `{` and `}` characters in a line, including those inside string literals and comments. Typing `let x = "{"` would cause the REPL to enter multi-line mode waiting for a matching `}`.

**Fix:** Brace counting now tracks whether we're inside a string (respecting `\` escapes) and stops at `#` comments.

---

## Additional Observations (Not Bugs, But Noteworthy)

### Lexer
- **No hex/octal/binary number literals:** `0xFF`, `0o77`, `0b1010` are not supported. `0xFF` lexes as Int `0` followed by Ident `xFF`. This is a feature gap, not a bug.
- **Leading zeros:** `007` parses as decimal `7` via `parseInt`. Acceptable but could confuse users expecting octal.
- **Unicode identifiers:** Not supported (only `a-z`, `A-Z`, `_`, `0-9`). Unicode chars in source are silently skipped by the lexer. Documented limitation.
- **Float `1.0` reports as `int`:** `parseFloat("1.0")` = `1` in JS, and `Number.isInteger(1)` = true. The type system can't distinguish `1.0` from `1`. This is a JS limitation.

### Error Reporting
- Runtime errors (e.g., "Undefined variable") don't include line/column information. The `prettyPrintError` function tries to extract location from the error message, but interpreter errors don't embed it.
- The `findClosestMatch` "did you mean?" works for `undefinedVariableError()` but the interpreter's `Env.get()` throws a plain `Error` without using the error reporting system.

### Security
- `ExecutionContext` tracks steps/recursion but is **not wired into** the interpreter's `evalExpr`/`evalStmt` — it only calls `ctx.tick()` once per top-level statement in `SafeInterpreter.run()`. Nested expressions and loops don't tick. **A `for` loop with a million iterations would only count as 1 step.** This is a significant gap but wasn't in scope to fix.
- The `validateSource` string length check uses a regex that runs on raw source, which may not match the lexer's behavior after escape processing.

### REPL
- `:reset` doesn't actually reset state (noted in the code as a limitation).
- No command history persistence across sessions.

---

## Files Modified

1. `compiler/src/lexer.ts` — Escape sequences, empty interpolation, string-aware brace counting in interpolation
2. `compiler/src/modules.ts` — Circular import detection with `modulesInProgress` set
3. `compiler/src/security.ts` — Fixed `validateImport` to use `useStmt.path.join("/")`
4. `compiler/src/version.ts` — NaN-safe semver, pre-release handling, correct caret/exact semantics
5. `compiler/src/repl.ts` — String/comment-aware brace counting

## Test Files Created

All in `tests/bugs/round2/`:
- `lexer-escape-sequences.arc` — Tests `\0`, `\x41`, `\n`, `\t`, `\\`, unknown escapes
- `lexer-numbers.arc` — Leading zeros, float edge cases, large numbers
- `lexer-unicode.arc` — Unicode in strings, emoji
- `lexer-string-interp.arc` — Various interpolation patterns
- `lexer-empty-string.arc` — Empty string, string with only escape
- `lexer-hash-comment.arc` — Hash in strings, comment at EOF
- `lexer-interp-expr.arc` — Interpolation with expressions
- `lexer-nested-interp.arc` — Nested constructs in interpolation
- `empty-interp-test.arc` — Empty `{}` interpolation
- `float-display.arc` — Float `1.0` type detection
- `error-line-col.arc` — Error location reporting
- `repl-braces-in-strings.arc` — REPL brace counting edge case
- `security-sandbox.arc` — Infinite loop for sandbox testing
- `security-validateimport-bug.arc` — Documents the validateImport bug
- `security-string-regex-bypass.arc` — Documents regex-based string check limitations
- `version-semver-edge.arc` — Documents semver edge cases
- `version-test.arc` — Placeholder
- `interp-expr-test2.arc`, `interp-expr-test3.arc` — Expression interpolation tests
- `test-version-edge-cases.ts` — TypeScript test for semver edge cases
- `modules/mod_a.arc`, `modules/mod_b.arc` — Circular import pair
- `modules/test_circular.arc` — Circular import test
- `modules/diamond_base.arc`, `diamond_left.arc`, `diamond_right.arc` — Diamond dependency
- `modules/test_diamond.arc` — Diamond dependency test
- `modules/test_nonexistent.arc` — Missing module test
- `modules/test_bad_export.arc` — Missing export test

## Test Suite Result

**508 tests passed, 0 failed** — all existing tests continue to pass with the fixes applied.
