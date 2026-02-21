---
title: regex
---

# regex

Regular expression operations with native implementation and ReDoS protection.

```arc
use regex
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `find` | `(pattern, str) -> Match \| nil` | Find first match |
| `find_all` | `(pattern, str) -> [Match]` | Find all matches |
| `match_all` | `(pattern, str) -> [Match]` | All matches (alias for find_all) |
| `test` | `(pattern, str) -> Bool` | Test if pattern matches |
| `replace` | `(pattern, str, replacement) -> String` | Replace first match |
| `replace_first` | `(pattern, str, replacement) -> String` | Replace first match |
| `replace_all` | `(pattern, str, replacement) -> String` | Replace all matches |
| `split` | `(pattern, str) -> [String]` | Split by pattern |
| `capture` | `(pattern, str) -> [String] \| nil` | Capture groups from first match |
| `capture_all` | `(pattern, str) -> [[String]]` | All capture groups |
| `escape` | `(str) -> String` | Escape regex metacharacters |
| `is_valid` | `(pattern) -> Bool` | Check if pattern is valid regex |
