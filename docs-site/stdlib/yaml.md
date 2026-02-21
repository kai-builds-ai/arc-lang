---
title: yaml
---

# yaml

YAML parsing and stringifying.

```arc
use yaml
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `parse` | `(text: String) -> Any` | Parse YAML string to Arc value |
| `stringify` | `(value) -> String` | Convert Arc value to YAML string |

### Example

```arc
use yaml

let data = yaml.parse("name: Alice\nage: 30")
# => {name: "Alice", age: 30}

let text = yaml.stringify({host: "localhost", port: 8080})
# => "host: localhost\nport: 8080\n"
```
