---
title: error
---

# error

Error handling utilities with native implementation.

```arc
use error
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `error` | `(msg) -> Error` | Create an error value |
| `is_error` | `(val) -> Bool` | Check if value is an error |
| `wrap_error` | `(msg, cause) -> Error` | Wrap an error with additional context |
| `try_fn` | `(fn) -> Result` | Run function, catching errors as Result |
| `try_catch` | `(fn, handler) -> Any` | Try/catch wrapper |
| `try_finally` | `(fn, cleanup) -> Any` | Try/finally wrapper |
| `try_catch_finally` | `(fn, handler, cleanup) -> Any` | Try/catch/finally wrapper |
| `throw` | `(msg) -> never` | Throw an error |
| `retry` | `(fn, attempts) -> Result` | Retry a function on failure |
