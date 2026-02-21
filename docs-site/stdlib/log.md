---
title: log
---

# log

Structured logging with levels and colors.

```arc
use log
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `debug` | `(msg: String) -> nil` | Log at debug level |
| `info` | `(msg: String) -> nil` | Log at info level |
| `warn` | `(msg: String) -> nil` | Log at warn level |
| `error` | `(msg: String) -> nil` | Log at error level |
| `fatal` | `(msg: String) -> never` | Log and exit |
| `set_level` | `(level: String) -> nil` | Set minimum log level |
| `with` | `(fields: Map) -> Logger` | Create child logger with extra fields |
| `json` | `(level, msg, fields) -> nil` | Emit structured JSON log entry |
| `child_debug` | `(logger, msg) -> nil` | Log debug with child logger |
| `child_info` | `(logger, msg) -> nil` | Log info with child logger |
| `child_warn` | `(logger, msg) -> nil` | Log warn with child logger |
| `child_error` | `(logger, msg) -> nil` | Log error with child logger |

### Example

```arc
use log

log.set_level("info")
log.info("Server started")
log.warn("Disk usage high")
log.error("Connection failed")

let logger = log.with({service: "api", version: "1.0"})
log.child_info(logger, "Request received")  # Log with child logger context

log.json("info", "request", {method: "GET", path: "/api/users", status: 200})
```
