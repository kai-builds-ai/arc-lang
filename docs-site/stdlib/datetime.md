---
title: datetime
---

# datetime

Date and time operations with native implementation.

```arc
use datetime
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `now` | `() -> Number` | Current Unix timestamp (milliseconds) |
| `today` | `() -> Map` | Current date as `{year, month, day, hour, minute, second, ms}` |
| `parse` | `(str) -> Timestamp` | Parse date string |
| `format` | `(ts, fmt) -> String` | Format timestamp |
| `add_days` | `(ts, days) -> Timestamp` | Add days to timestamp |
| `add_hours` | `(ts, hours) -> Timestamp` | Add hours to timestamp |
| `add_minutes` | `(ts, minutes) -> Timestamp` | Add minutes to timestamp |
| `diff_days` | `(a, b) -> Number` | Days between two timestamps |
| `diff_hours` | `(a, b) -> Number` | Hours between two timestamps |
| `diff_minutes` | `(a, b) -> Number` | Minutes between two timestamps |
| `day_of_week` | `(ts) -> String` | Day of week name |
| `is_before` | `(a, b) -> Bool` | Check if timestamp a is before b |
| `is_after` | `(a, b) -> Bool` | Check if timestamp a is after b |
| `to_iso` | `(ts) -> String` | Convert timestamp to ISO 8601 string |
| `from_iso` | `(str) -> Timestamp` | Parse ISO 8601 string to timestamp |
