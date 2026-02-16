# arc-logger

Structured logging for Arc with log levels, JSON output, timestamps, context, and colorized console.

## Install

```toml
[dependencies]
arc-logger = "0.1.0"
```

## Quick Start

```arc
use arc-logger: logger, info, warn, error

let log = logger("my-app")
info(log, "Server started", {port: 3000})
warn(log, "High memory usage", {percent: 85})
error(log, "Connection failed", {host: "db.local"})
```

Output:
```
2026-02-16T12:00:00Z INFO  [my-app] Server started {port: 3000}
2026-02-16T12:00:00Z WARN  [my-app] High memory usage {percent: 85}
2026-02-16T12:00:00Z ERROR [my-app] Connection failed {host: "db.local"}
```

## Log Levels

Levels filter what gets emitted: `debug < info < warn < error < silent`

```arc
let log = logger("app") |> level("warn")
info(log, "ignored", nil)    # suppressed
warn(log, "shown", nil)      # emitted
error(log, "shown", nil)     # emitted
```

## JSON Output

```arc
let log = logger("api") |> format("json")
info(log, "request", {method: "GET", path: "/users"})
```

```json
{"level":"info","msg":"request","name":"api","timestamp":"2026-02-16T12:00:00Z","method":"GET","path":"/users"}
```

## Context & Child Loggers

```arc
let log = logger("api") |> context({env: "production"})
let db_log = child(log, "db", {host: "db.local"})

info(db_log, "query executed", {duration_ms: 42})
# [api:db] query executed {duration_ms: 42} {env: "production", host: "db.local"}
```

## Timed Operations

```arc
use arc-logger: logger, timed

let log = logger("app")
let result = timed(log, "data processing", fn {
  heavy_computation()
})
# [app] data processing completed {duration_ms: 1234}
```

## API Reference

| Function | Description |
|----------|-------------|
| `logger(name)` | Create logger |
| `level(log, lvl)` | Set min level |
| `format(log, fmt)` | Set format ("pretty"/"json") |
| `context(log, ctx)` | Add context data |
| `child(log, name, ctx)` | Create child logger |
| `debug(log, msg, data)` | Log at debug |
| `info(log, msg, data)` | Log at info |
| `warn(log, msg, data)` | Log at warn |
| `error(log, msg, data)` | Log at error |
| `timed(log, label, fn)` | Time a function |
| `json_logger(name)` | Create JSON logger |
| `file_output(path)` | File output handler |

## Token Comparison

**Arc (arc-logger):**
```arc
let log = logger("api") |> context({env: "prod"})
let db = child(log, "db", {host: "localhost"})
info(db, "query done", {ms: 42})
```
~30 tokens

**JavaScript (pino):**
```javascript
const pino = require('pino');
const logger = pino({ name: 'api' });
const child = logger.child({ env: 'prod', component: 'db', host: 'localhost' });
child.info({ ms: 42 }, 'query done');
```
~45 tokens

**Savings: ~33%**
