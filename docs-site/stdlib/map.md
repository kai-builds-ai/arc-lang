---
title: map
---

# map

Map/dictionary utilities.

```arc
use map
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `merge` | `(a, b) -> Map` | Merge two maps (b overwrites a) |
| `map_values` | `(m, fn) -> Map` | Transform all values |
| `map_keys` | `(m, fn) -> Map` | Transform all keys |
| `filter_map` | `(m, fn) -> Map` | Filter entries by predicate |
| `from_pairs` | `(pairs) -> Map` | Create map from key-value pairs |
| `to_pairs` | `(m) -> [(Any, Any)]` | Convert map to key-value pairs |
| `pick` | `(m, keys) -> Map` | Select only specified keys |
| `omit` | `(m, keys) -> Map` | Remove specified keys |

> Built-in `keys(m)`, `values(m)` are available without `use`.
