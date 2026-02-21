---
title: result
---

# result

Error handling with Result types.

```arc
use result
```

Arc uses `Result<T>` as the standard error-handling pattern — either `Ok(value)` or `Err(message)`.

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `ok` | `(value) -> Result<T>` | Wrap value in Ok |
| `err` | `(msg) -> Result<T>` | Create an Err |
| `is_ok` | `(r) -> Bool` | Check if Ok |
| `is_err` | `(r) -> Bool` | Check if Err |
| `unwrap` | `(r) -> T` | Get value or panic |
| `unwrap_or` | `(r, default) -> T` | Get value or default |
| `unwrap_err` | `(r) -> String` | Get error message or panic |
| `map` | `(r, fn) -> Result<U>` | Transform Ok value |
| `flat_map` | `(r, fn) -> Result<U>` | Chain Result-returning functions |
| `try_fn` | `(fn) -> Result<T>` | Run function, catching errors as Err |
| `result_is_ok` | `(r) -> Bool` | Check if Ok (alternate form) |
| `result_is_err` | `(r) -> Bool` | Check if Err (alternate form) |
| `result_unwrap` | `(r) -> T` | Unwrap (alternate form) |
| `result_unwrap_or` | `(r, default) -> T` | Unwrap or default (alternate form) |
| `result_map` | `(r, fn) -> Result<U>` | Map Ok value (alternate form) |
| `flat_map_result` | `(r, fn) -> Result<U>` | Chain Results (alternate form) |

### Example

```arc
use result

let r = result.ok(42)
let doubled = r |> result.map(x => x * 2)  # Ok(84)

let e = result.err("not found")
result.unwrap_or(e, 0)  # => 0
```
