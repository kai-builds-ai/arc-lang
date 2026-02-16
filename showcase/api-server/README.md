# 🌐 API Server

A REST API request handler written in Arc demonstrating routing, middleware, and CRUD operations.

## Architecture

```
Request → log_request → parse_body → authenticate → route(match) → Handler → Response
```

### Middleware Pipeline
Middleware functions are composed via the `|>` pipeline operator:
```arc
let ctx = req |> log_request |> parse_body |> authenticate
```

### Routing via Pattern Matching
Routes are matched on `[method, path]` tuples with guards:
```arc
match [req.method, req.path] {
  ["GET", "/health"] => json_response(200, { status: "ok" })
  ["GET", path] if starts(path, "/api/users/") => get_user(ctx, id)
  _ => not_found()
}
```

### Tool Calls for Database
Database queries use Arc's `@` tool call syntax:
```arc
let user = @db("SELECT * FROM users WHERE id = {id}")
```

### Authorization
Role-based access control via higher-order functions:
```arc
fn require_role(role) {
  ctx => {
    if ctx.user.role == role { ok(ctx) }
    el { err({ status: 403, body: { error: "Forbidden" } }) }
  }
}
```

## Arc Features Used

- **`match` on tuples** — Clean routing without a framework
- **`|>` pipelines** — Middleware composition
- **`@db()` tool calls** — First-class database access
- **Higher-order functions** — `require_role(role)` returns a function
- **Result type** — `ok()`/`err()` for auth flow control
- **String interpolation** — SQL queries, error messages
- **Type definitions** — `type User = { ... }`

## How to Run

```bash
arc run showcase/api-server/main.arc
```
