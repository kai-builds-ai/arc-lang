---
title: collections
---

# collections

List, set, and queue utilities.

```arc
use collections
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `set` | `(list) -> [Any]` | Remove duplicates (returns deduplicated list) |
| `unique` | `(list) -> [Any]` | Alias for `set` |
| `group_by` | `(list, fn) -> Map` | Group elements by key function |
| `count_by` | `(list, fn) -> Map` | Count elements by key function |
| `chunk` | `(list, size) -> [[Any]]` | Split list into chunks |
| `flatten` | `(nested) -> [Any]` | Flatten nested lists one level |
| `zip_with` | `(a, b, fn) -> [Any]` | Combine two lists element-wise with a function |
| `partition` | `(list, fn) -> [[Any], [Any]]` | Split list into [matches, non-matches] |
| `frequencies` | `(list) -> Map` | Count occurrences of each element |
| `min_by` | `(list, fn) -> Any` | Minimum element by key function |
| `max_by` | `(list, fn) -> Any` | Maximum element by key function |
| `sort_by` | `(list, fn) -> [Any]` | Sort by key function |
| `index_of` | `(list, val) -> Int \| nil` | Index of first occurrence |
| `includes` | `(list, val) -> Bool` | Check if list contains value |

> Built-in list functions (`map`, `filter`, `reduce`, `take`, `skip`, `find`, `contains`, `len`, `push`, `concat`) are available without `use`.
