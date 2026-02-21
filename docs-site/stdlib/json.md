---
title: json
---

# json

JSON serialization and deserialization.

```arc
use json
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `from_json` | `(s: String) -> Result<Any>` | Parse JSON string to Arc value |
| `to_json` | `(value, indent?) -> String` | Convert Arc value to JSON string |
| `pretty` | `(value) -> String` | Pretty-print with 2-space indent |
| `get_path` | `(value, path) -> Any` | Get nested value by dot-separated path |
