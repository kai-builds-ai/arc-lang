---
title: os
---

# os

Operating system interaction with native implementation. Includes command injection protection.

```arc
use os
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `cwd` | `() -> String` | Current working directory |
| `get_env` | `(name) -> String \| nil` | Get environment variable |
| `env` | `(name) -> String \| nil` | Get environment variable (alias) |
| `set_env` | `(name, value) -> nil` | Set environment variable |
| `list_dir` | `(path) -> [String]` | List directory contents |
| `is_file` | `(path) -> Bool` | Check if path is a file |
| `is_dir` | `(path) -> Bool` | Check if path is a directory |
| `mkdir` | `(path) -> nil` | Create directory |
| `rmdir` | `(path) -> nil` | Remove directory |
| `remove` | `(path) -> nil` | Remove file |
| `rename` | `(from, to) -> nil` | Rename/move file |
| `copy` | `(src, dst) -> nil` | Copy file |
| `file_size` | `(path) -> Int` | Get file size in bytes |
| `file_ext` | `(path) -> String` | Get file extension |
| `join_path` | `(...parts) -> String` | Join path segments |
| `parent_dir` | `(path) -> String` | Get parent directory |
| `basename` | `(path) -> String` | Get file name from path |
| `exec` | `(cmd) -> Map` | Execute shell command (10s timeout, injection-protected) |
| `platform` | `() -> String` | OS platform name |
| `home_dir` | `() -> String` | User home directory |
| `temp_dir` | `() -> String` | Temp directory path |
