# `return` → `ret` Migration Report

**Date:** 2026-02-16
**Total keyword replacements:** 51

## Files Changed

| File | Replacements |
|------|-------------|
| `examples/binary-tree.arc` | 5 |
| `examples/calculator.arc` | 2 |
| `examples/chat-protocol.arc` | 1 |
| `examples/cron-parser.arc` | 7 |
| `examples/diff-algorithm.arc` | 3 |
| `examples/linked-list.arc` | 7 |
| `examples/package-registry.arc` | 12 |
| `examples/testing-framework.arc` | 2 |
| `examples/url-shortener.arc` | 8 |
| `examples/web-scraper.arc` | 2 |
| `stdlib/error.arc` | 1 |
| `test-return.arc` | 1 |

## Files NOT Changed (intentionally)

- **`examples/compiler.arc`** — `return` appears inside string literals representing the compiled language's source code (not Arc keywords)
- **`stdlib/io.arc`**, **`stdlib/net.arc`**, **`stdlib/os.arc`** — `return` only in comments (English prose)
- **`website/arc-src/stats.arc`** — `return` inside a JavaScript string literal
- **`docs/tutorials/*.md`** — all `return` instances are in JavaScript code blocks or English prose, not Arc code blocks

## Preserved Instances

- 4 comments containing "return" (English word) were preserved:
  - `stdlib/error.arc`: 3 comments ("Assert condition or return error", etc.)
  - `examples/package-registry.arc`: 1 comment ("Already resolved — return cached")
- String literals containing "return" (e.g., in `compiler.arc`) were not touched
- No variable names like `return_addr` were found

## Verification

Attempted to run examples via `npx tsx src/index.ts run`. The compiler has pre-existing parse errors on most example files (unsupported syntax like map literals `{0: 0}`, comments `//`, pattern matching `[head, ...tail]`). These errors are unrelated to the `return` → `ret` change — the compiler appears to be a work-in-progress that doesn't yet support the full Arc syntax used in examples.
