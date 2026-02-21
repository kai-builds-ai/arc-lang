---
title: store
---

# store

Persistent JSON-backed key-value storage.

```arc
use store
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `open` | `(path) -> Store` | Open or create a JSON store file |
| `get` | `(store, key) -> Any \| nil` | Get value by key |
| `set` | `(store, key, value) -> nil` | Set key-value pair |
| `delete` | `(store, key) -> nil` | Delete a key |
| `has` | `(store, key) -> Bool` | Check if key exists |
| `keys` | `(store) -> [String]` | Get all keys |
| `values` | `(store) -> [Any]` | Get all values |
| `entries` | `(store) -> [(String, Any)]` | Get all key-value pairs |
| `clear` | `(store) -> nil` | Remove all entries |
| `size` | `(store) -> Int` | Number of entries |
| `merge` | `(store, map) -> nil` | Merge a map into the store |
| `get_or_set` | `(store, key, default_fn) -> Any` | Get existing or set default |

### Example

```arc
use store

let db = store.open("settings.json")
store.set(db, "theme", "dark")
store.set(db, "lang", "en")

let theme = store.get(db, "theme")  # => "dark"
store.has(db, "lang")               # => true
store.keys(db)                      # => ["theme", "lang"]
```
