# Arc Toolchain Bug Report

## Bug 1: JS Codegen — Broken Control Flow (CRITICAL)

**File:** `compiler/src/codegen-js.ts`  
**Severity:** Critical — all compiled programs with if/else or match produce wrong results

**Problem:** The `emitBlock` function emitted IR instructions linearly, rendering `branch`, `jump`, and `label` instructions as comments. This meant both branches of an `if/else` always executed sequentially, with the last branch's value winning. Match expressions similarly always matched the last arm.

**Reproduction:**
```arc
fn test_if(x) {
  if x > 5 { "big" } el { "small" }
}
print(test_if(10))  # Expected: "big", Got: "small"
```

**Fix:** Replaced the linear `emitBlock` with a state-machine approach that splits IR instructions into labeled sections and emits a `while(true) { switch(__pc) { ... } }` loop with proper `__pc` assignments for branches and jumps.

**Verified:** `test_if(10)` → `"big"`, match expressions dispatch correctly.

---

## Bug 2: Build System — `newProject` Generates Invalid Arc Syntax

**File:** `compiler/src/build.ts`, `newProject()` function  
**Severity:** High — every new project fails to parse/compile

**Problem:** The project template used `do/end` block syntax (`fn main() do ... end`) which doesn't exist in Arc. Arc uses `{ }` for blocks.

**Reproduction:**
```bash
arc new myproject
cd myproject
arc build  # Parse error: Expected LBrace, got Do 'do'
```

**Fix:** Changed template to use correct `{ }` syntax:
```arc
fn main() {
  let msg = "Hello from myproject!"
  print(msg)
}
```

Also fixed the test template (`tests/main.test.arc`).

---

## Bug 3: Formatter — Ignores `maxLineLength` for If/Else Expressions

**File:** `compiler/src/formatter.ts`  
**Severity:** Medium — formatter produces lines exceeding configured max length

**Problem:** The `IfExpr` case in `formatExpr` always tried to inline the entire if/else chain regardless of line length. Nested if/else blocks could produce lines 130+ chars long despite a `maxLineLength` of 100.

**Reproduction:**
```arc
fn complex(x) {
  if x > 100 {
    if x > 200 {
      if x > 300 {
        "very very very deep nesting here"
      } el {
        "medium deep nesting here"
      }
    } el { "shallow nesting here" }
  } el { "not nested at all" }
}
```

Formatter collapsed the inner nesting into a single 131-char line.

**Fix:** Added line-length checking to `IfExpr` formatting. When the single-line form exceeds `maxLineLength`, the formatter now uses `formatBlockMultiline` (new helper) to force multi-line block output. The result properly breaks across lines while still inlining short blocks.

---

## Summary

| # | Component | Severity | Status |
|---|-----------|----------|--------|
| 1 | codegen-js.ts | Critical | Fixed & verified |
| 2 | build.ts | High | Fixed & verified |
| 3 | formatter.ts | Medium | Fixed & verified |
