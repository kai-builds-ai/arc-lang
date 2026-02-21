---
title: path
---

# path

Path manipulation utilities.

```arc
use path
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `join` | `(...parts) -> String` | Join path segments |
| `dirname` | `(p: String) -> String` | Directory name |
| `basename` | `(p: String) -> String` | File name |
| `extname` | `(p: String) -> String` | File extension |
| `resolve` | `(p: String) -> String` | Resolve to absolute path |
| `normalize` | `(p: String) -> String` | Normalize path separators and dots |
| `is_absolute` | `(p: String) -> Bool` | Check if path is absolute |
| `sep` | `() -> String` | Platform path separator |

### Example

```arc
use path

path.join("src", "lib", "utils.arc")  # => "src/lib/utils.arc"
path.dirname("/home/user/file.arc")    # => "/home/user"
path.basename("/home/user/file.arc")   # => "file.arc"
path.extname("main.arc")              # => ".arc"
path.is_absolute("/usr/bin")          # => true
```
