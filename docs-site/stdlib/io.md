---
title: io
---

# io

File and console I/O with native Node.js fs implementation.

```arc
use io
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `read_file` | `(path) -> Result<String>` | Read file contents |
| `write_file` | `(path, content) -> Result<nil>` | Write string to file |
| `read_lines` | `(path) -> Result<[String]>` | Read file as lines |
| `write_lines` | `(path, lines) -> Result<nil>` | Write list of lines to file |
| `exists` | `(path) -> Bool` | Check if path exists |
| `append` | `(path, content) -> Result<nil>` | Append string to file |

> `print(...)` is a built-in and does not require import.
