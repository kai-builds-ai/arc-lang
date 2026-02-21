---
title: env
---

# env

Environment variable utilities.

```arc
use env
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `get` | `(key: String) -> String \| nil` | Get environment variable |
| `get_or` | `(key: String, default: String) -> String` | Get with default fallback |
| `set` | `(key: String, val: String) -> nil` | Set environment variable |
| `remove` | `(key: String) -> nil` | Remove environment variable |
| `has` | `(key: String) -> Bool` | Check if variable exists |
| `list` | `() -> Map` | Get all environment variables |
| `require` | `(key: String) -> String` | Get or panic if missing |

### Example

```arc
use env

env.set("APP_ENV", "production")
let mode = env.get_or("APP_ENV", "development")  # => "production"
env.has("APP_ENV")                                 # => true

let db_url = env.require("DATABASE_URL")  # panics if not set
```
