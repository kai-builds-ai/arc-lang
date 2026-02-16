# arc-router

HTTP request router for Arc with pattern matching, path params, middleware pipelines, and response helpers.

## Install

```toml
[dependencies]
arc-router = "0.1.0"
```

## Quick Start

```arc
use arc-router: router, get, post, handle, ok, created

let app = router()
  |> get("/", fn(req) => ok({message: "Hello, World!"}))
  |> get("/users/:id", fn(req) => ok({id: req.params.id}))
  |> post("/users", fn(req) => created(req.body))

let response = handle(app, {method: "GET", path: "/users/42"})
# => {status: 200, body: '{"id":"42"}'}
```

## Route Groups

```arc
let app = router()
  |> group("/api/v1", fn(r) {
    r |> get("/users", list_users)
      |> get("/users/:id", get_user)
      |> post("/users", create_user)
  })
  |> group("/api/v2", fn(r) {
    r |> get("/users", list_users_v2)
  })
```

## Middleware

```arc
use arc-router: router, use_middleware, cors, request_logger, auth_required

let app = router()
  |> use_middleware(request_logger())
  |> use_middleware(cors({origin: "https://myapp.com"}))
  |> use_middleware(json_body())
  |> get("/public", fn(req) => ok("hello"))
```

### Auth Middleware

```arc
let app = router()
  |> use_middleware(auth_required(fn(token) {
    match verify_jwt(token) {
      Ok(user) => Ok(user),
      Err(_) => Err("Invalid token")
    }
  }))
  |> get("/me", fn(req) => ok(req.user))
```

## Response Helpers

| Function | Status | Description |
|----------|--------|-------------|
| `ok(data)` | 200 | Success |
| `created(data)` | 201 | Created |
| `no_content()` | 204 | No content |
| `bad_request(msg)` | 400 | Bad request |
| `unauthorized(msg)` | 401 | Unauthorized |
| `forbidden(msg)` | 403 | Forbidden |
| `not_found_response(msg)` | 404 | Not found |
| `server_error(msg)` | 500 | Server error |
| `redirect(url)` | 302 | Redirect |
| `json_response(data, status)` | any | JSON response |
| `text_response(text, status)` | any | Text response |

## Full Example

```arc
use arc-router: *
use arc-logger: logger, info

let log = logger("api")

let app = router()
  |> use_middleware(request_logger())
  |> use_middleware(cors({origin: "*"}))
  |> get("/health", fn(req) => ok({status: "up"}))
  |> group("/api", fn(r) {
    r |> get("/users", fn(req) {
        let users = @GET "db/users"
        ok(users)
      })
      |> get("/users/:id", fn(req) {
        match @GET "db/users/{req.params.id}" {
          nil => not_found_response("User not found"),
          user => ok(user)
        }
      })
      |> post("/users", fn(req) {
        let user = @POST "db/users" req.body
        info(log, "User created", {id: user.id})
        created(user)
      })
  })
```

## Token Comparison

**Arc (arc-router):**
```arc
let app = router()
  |> get("/users/:id", fn(req) => ok({id: req.params.id}))
  |> post("/users", fn(req) => created(req.body))
  |> handle(req)
```
~30 tokens

**JavaScript (Express):**
```javascript
const express = require('express');
const app = express();
app.use(express.json());
app.get('/users/:id', (req, res) => res.json({ id: req.params.id }));
app.post('/users', (req, res) => res.status(201).json(req.body));
app.listen(3000);
```
~55 tokens

**Savings: ~45%**
