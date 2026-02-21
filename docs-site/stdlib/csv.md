---
title: csv
---

# csv

CSV parsing and generation.

```arc
use csv
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `parse_csv` | `(s: String, sep?) -> [[String]]` | Parse CSV to rows |
| `parse_csv_headers` | `(s: String, sep?) -> [Map]` | Parse CSV with header row to maps |
| `to_csv` | `(rows: [[String]], sep?) -> String` | Convert rows to CSV string |
