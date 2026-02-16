# Arc Stdlib Bug Report

**Date:** 2026-02-16  
**Auditor:** OpenClaw subagent  
**Method:** Code review + reproduction via integration tests

---

## Bug 1: `math.floor()` returns wrong result for negative non-integers

**File:** `stdlib/math.arc`  
**Severity:** High — produces mathematically incorrect results

**Description:** `floor(-2.3)` returned `-4` instead of `-3`. The built-in `int()` function already performs `Math.floor()` (truncation toward negative infinity), but the stdlib `floor()` applied an additional `- 1` for negative numbers, double-flooring the value.

**Before:**
```arc
pub fn floor(x) {
  let i = int(x)
  if float(i) == float(x) { i }
  el if x < 0 { i - 1 }  # BUG: int() already floors
  el { i }
}
```

**Fix:** Simplified to `int(x)` since `int()` already does `Math.floor()`.

**Reproduction:** `floor(-2.3)` → expected `-3`, got `-4`

---

## Bug 2: `math.ceil()` returns wrong result for negative non-integers

**File:** `stdlib/math.arc`  
**Severity:** High — produces mathematically incorrect results

**Description:** `ceil(-2.3)` returned `-3` instead of `-2`. The `el` branch for non-positive numbers returned `i` (which is `int(x)` = `Math.floor(x)` = `-3`), but ceil should round toward positive infinity.

**Before:**
```arc
pub fn ceil(x) {
  let i = int(x)
  if float(i) == float(x) { i }
  el if x > 0 { i + 1 }
  el { i }  # BUG: should be i + 1
}
```

**Fix:** Changed `el { i }` to `el { i + 1 }` since for negative non-integers, `int(x)` gives the floor, and ceil is floor + 1.

**Reproduction:** `ceil(-2.3)` → expected `-2`, got `-3`

---

## Bug 3: `json.to_json()` doesn't escape double quotes in strings

**File:** `stdlib/json.arc`  
**Severity:** High — produces invalid JSON output

**Description:** The internal `_quote()` function escapes backslashes, newlines, and tabs, but does NOT escape double quote characters inside strings. This produces malformed JSON like `"he said "hi""` instead of `"he said \"hi\""`.

**Before:**
```arc
fn _quote(s) {
  let escaped = replace(replace(s, "\\", "\\\\"), "\n", "\\n")
  let escaped = replace(escaped, "\t", "\\t")
  _Q ++ escaped ++ _Q
}
```

**Fix:** Added `let escaped = replace(escaped, "\"", "\\\"")` before the final concatenation.

**Reproduction:** `to_json("he said \"hi\"")` → expected `"he said \"hi\""`, got `"he said "hi""`

---

## Bug 4: `strings.pad_left()` / `pad_right()` overshoot target width with multi-char pad strings

**File:** `stdlib/strings.arc`  
**Severity:** Medium — produces strings longer than requested width

**Description:** When called with a multi-character pad string (e.g., `"abc"`), the function appends the entire string each iteration. This can overshoot the target width. For example, `pad_left("hi", 4, "abc")` returned `"abchi"` (length 5) instead of a 4-character string.

**Fix:** Changed to use only the first character of the pad string via `slice(str(ch), 0, 1)`.

**Reproduction:** `pad_left("hi", 4, "abc")` → expected length 4, got length 5

---

## Verification

All 4 bugs were reproduced with dedicated `.arc` test files before fixing. After fixes:
- All 4 bug reproduction tests pass ✓
- Full test suite: **508 passed, 0 failed** ✓ (original 504 + 4 new tests)
