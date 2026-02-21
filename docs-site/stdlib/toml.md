---
title: toml
---

# toml

TOML parsing and stringifying.

```arc
use toml
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `parse` | `(text: String) -> Any` | Parse TOML string to Arc value |
| `stringify` | `(value) -> String` | Convert Arc value to TOML string |

### Example

```arc
use toml

let config = toml.parse("[server]\nhost = \"localhost\"\nport = 8080")
# => {server: {host: "localhost", port: 8080}}

let text = toml.stringify({title: "My App", version: "1.0"})
```
