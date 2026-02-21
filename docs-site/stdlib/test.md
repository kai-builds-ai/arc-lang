---
title: test
---

# test

Testing framework.

```arc
use test
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `describe` | `(name, fn)` | Define a test suite |
| `it` | `(name, fn)` | Define a test case |
| `expect_eq` | `(a, b)` | Assert equality |
| `expect_neq` | `(a, b)` | Assert inequality |
| `expect_true` | `(cond)` | Assert truthy |
| `expect_false` | `(cond)` | Assert falsy |
| `expect_nil` | `(val)` | Assert nil |
| `expect_gt` | `(a, b)` | Assert a > b |
| `expect_lt` | `(a, b)` | Assert a < b |
| `run_tests` | `()` | Run all defined test suites |

### Example

```arc
use test

test.describe("math", fn() {
  test.it("adds numbers", fn() {
    test.expect_eq(1 + 1, 2)
  })
  test.it("strings are non-empty", fn() {
    test.expect_true(len("hello") > 0)
  })
})

test.run_tests()
```
