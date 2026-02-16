# API Server / Request Handler
# Demonstrates routing via pattern matching, middleware via pipelines,
# and tool call syntax for database operations.

use std/json: to_json, from_json, pretty
use std/strings: pad_right, capitalize
use std/collections: sort_by, group_by
use std/result: ok, err, is_ok, unwrap, unwrap_or

# --- Types ---

type User = { id: Int, name: String, email: String, role: String }
type ApiResponse = { status: Int, body: Any, headers: Any }

# --- Middleware (functions composed via pipeline) ---

fn log_request(req) {
  print("[{req.method}] {req.path} from {req.ip}")
  req
}

fn parse_body(req) {
  if req.body != nil {
    let parsed = from_json(req.body)
    { method: req.method, path: req.path, ip: req.ip, body: parsed, params: req.params }
  } el { req }
}

fn authenticate(req) {
  let token = req.headers["authorization"]
  match token {
    nil => { authenticated: false, user: nil, req: req }
    t => {
      let user = @db("SELECT * FROM users WHERE token = '{t}' LIMIT 1")
      { authenticated: true, user: user, req: req }
    }
  }
}

fn require_auth(ctx) {
  if ctx.authenticated { ok(ctx) }
  el { err({ status: 401, body: { error: "Unauthorized" } }) }
}

fn require_role(role) {
  ctx => {
    if ctx.user.role == role { ok(ctx) }
    el { err({ status: 403, body: { error: "Forbidden: requires {role}" } }) }
  }
}

# --- Response helpers ---

fn json_response(status, data) => {
  status: status,
  body: to_json(data),
  headers: { "content-type": "application/json" }
}

fn not_found() => json_response(404, { error: "Not found" })

fn bad_request(msg) => json_response(400, { error: msg })

# --- Route handlers ---

fn get_users(ctx) {
  let users = @db("SELECT * FROM users ORDER BY name")
  json_response(200, { users: users, count: len(users) })
}

fn get_user(ctx, id) {
  let user = @db("SELECT * FROM users WHERE id = {id}")
  match user {
    nil => not_found()
    u => json_response(200, u)
  }
}

fn create_user(ctx) {
  let body = ctx.req.body
  let user = @db("INSERT INTO users (name, email, role) VALUES ('{body.name}', '{body.email}', '{body.role}')")
  json_response(201, { created: user })
}

fn update_user(ctx, id) {
  let body = ctx.req.body
  let updated = @db("UPDATE users SET name='{body.name}', email='{body.email}' WHERE id = {id}")
  match updated {
    nil => not_found()
    u => json_response(200, u)
  }
}

fn delete_user(ctx, id) {
  @db("DELETE FROM users WHERE id = {id}")
  json_response(204, nil)
}

fn get_stats(ctx) {
  let users = @db("SELECT * FROM users")
  let by_role = users |> group_by(u => u.role)
  let role_counts = keys(by_role) |> map(k => { role: k, count: len(by_role[k]) })
  json_response(200, {
    total: len(users),
    by_role: role_counts |> sort_by(r => 0 - r.count)
  })
}

# --- Router: Pattern matching on method + path ---

fn route(req) {
  # Apply middleware pipeline
  let ctx = req |> log_request |> parse_body |> authenticate

  # Match on [method, path segments]
  match [req.method, req.path] {
    # Public routes
    ["GET", "/health"] => json_response(200, { status: "ok" })

    # User CRUD (authenticated)
    ["GET", "/api/users"] => {
      let auth = require_auth(ctx)
      match auth {
        Ok(c) => get_users(c)
        Err(e) => json_response(e.status, e.body)
      }
    }

    ["GET", path] if starts(path, "/api/users/") => {
      let id = slice(path, 11, len(path))
      let auth = require_auth(ctx)
      match auth {
        Ok(c) => get_user(c, id)
        Err(e) => json_response(e.status, e.body)
      }
    }

    ["POST", "/api/users"] => {
      let auth = ctx |> require_auth
      match auth {
        Ok(c) => {
          let admin = require_role("admin")(c)
          match admin {
            Ok(ac) => create_user(ac)
            Err(e) => json_response(e.status, e.body)
          }
        }
        Err(e) => json_response(e.status, e.body)
      }
    }

    ["PUT", path] if starts(path, "/api/users/") => {
      let id = slice(path, 11, len(path))
      let auth = require_auth(ctx)
      match auth {
        Ok(c) => update_user(c, id)
        Err(e) => json_response(e.status, e.body)
      }
    }

    ["DELETE", path] if starts(path, "/api/users/") => {
      let id = slice(path, 11, len(path))
      let auth = ctx |> require_auth
      match auth {
        Ok(c) => {
          let admin = require_role("admin")(c)
          match admin {
            Ok(ac) => delete_user(ac, id)
            Err(e) => json_response(e.status, e.body)
          }
        }
        Err(e) => json_response(e.status, e.body)
      }
    }

    # Stats (admin only)
    ["GET", "/api/stats"] => {
      let auth = ctx |> require_auth
      match auth {
        Ok(c) => {
          let admin = require_role("admin")(c)
          match admin {
            Ok(ac) => get_stats(ac)
            Err(e) => json_response(e.status, e.body)
          }
        }
        Err(e) => json_response(e.status, e.body)
      }
    }

    # Catch-all
    _ => not_found()
  }
}

# --- Main: Process incoming request ---

print("🌐 Arc API Server initialized")
print("   Routes: /health, /api/users, /api/users/:id, /api/stats")
print("")

# Simulate handling a request
let sample_request = {
  method: "GET",
  path: "/api/users",
  ip: "127.0.0.1",
  body: nil,
  params: {},
  headers: { "authorization": "token_abc123" }
}

let response = route(sample_request)
print("Response: {pretty(response)}")
