# API Server / Request Handler
# Demonstrates routing via pattern matching, middleware via pipelines,
# and tool call syntax for database operations.

# --- Middleware (functions composed via pipeline) ---

fn log_request(req) {
  print("[{req.method}] {req.path} from {req.ip}")
  req
}

fn parse_body(req) {
  if req.body != nil {
    { method: req.method, path: req.path, ip: req.ip, body: req.body, params: req.params }
  } el { req }
}

fn authenticate(req) {
  let token = req.headers.authorization
  match token {
    nil => { authenticated: false, user: nil, req: req },
    t => {
      let user = { name: "admin", role: "admin", token: t }
      { authenticated: true, user: user, req: req }
    }
  }
}

# --- Response helpers ---

fn json_response(status, data) => {
  status: status,
  body: data,
  headers: { content_type: "application/json" }
}

fn not_found() => json_response(404, { error: "Not found" })

# --- Route handlers ---

fn get_users(ctx) {
  let users = [
    { id: 1, name: "Alice", role: "admin" },
    { id: 2, name: "Bob", role: "user" }
  ]
  json_response(200, { users: users, count: len(users) })
}

fn get_user(ctx, id) {
  json_response(200, { id: id, name: "Alice", role: "admin" })
}

fn create_user(ctx) {
  let body = ctx.req.body
  json_response(201, { created: body })
}

# --- Router: Pattern matching on method + path ---

fn route(req) {
  # Apply middleware pipeline
  let ctx = req |> log_request |> parse_body |> authenticate

  match req.method {
    "GET" => {
      match req.path {
        "/health" => json_response(200, { status: "ok" }),
        "/api/users" => {
          if ctx.authenticated { get_users(ctx) }
          el { json_response(401, { error: "Unauthorized" }) }
        },
        _ => {
          if starts(req.path, "/api/users/") {
            let id = slice(req.path, 11, len(req.path))
            get_user(ctx, id)
          } el { not_found() }
        }
      }
    },
    "POST" => {
      match req.path {
        "/api/users" => {
          if ctx.authenticated and ctx.user.role == "admin" {
            create_user(ctx)
          } el { json_response(403, { error: "Forbidden" }) }
        },
        _ => not_found()
      }
    },
    _ => not_found()
  }
}

# --- Main: Process incoming request ---

print("Arc API Server initialized")
print("Routes: /health, /api/users, /api/users/:id")
print("")

# Simulate handling a request
let sample_request = {
  method: "GET",
  path: "/api/users",
  ip: "127.0.0.1",
  body: nil,
  params: {},
  headers: { authorization: "token_abc123" }
}

let response = route(sample_request)
print("Response status: {response.status}")
print("Response body: {response.body}")
