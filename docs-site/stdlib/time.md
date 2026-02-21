---
title: time
---

# time

Date, time, and duration utilities.

```arc
use time
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `now` | `() -> Timestamp` | Current Unix timestamp (ms) |
| `format_duration` | `(ms) -> String` | Format milliseconds as human-readable duration |
| `sleep` | `(ms)` | Pause execution |
