# arc-router — HTTP request router for Arc
# Route matching, path params, middleware pipelines, method routing

# --- Router ---

pub fn router() => {
  _routes: [],
  _middleware: [],
  _not_found: fn(req) => {status: 404, body: "Not Found: {req.method} {req.path}"}
}

# --- Route Registration ---

pub fn get(r, path, handler) => add_route(r, "GET", path, handler)
pub fn post(r, path, handler) => add_route(r, "POST", path, handler)
pub fn put(r, path, handler) => add_route(r, "PUT", path, handler)
pub fn delete(r, path, handler) => add_route(r, "DELETE", path, handler)
pub fn patch(r, path, handler) => add_route(r, "PATCH", path, handler)

pub fn route(r, method, path, handler) => add_route(r, method, path, handler)

fn add_route(r, method, path, handler) {
  let route = {method: upper(method), path: path, handler: handler, _middleware: []}
  {..r, _routes: r._routes ++ [route]}
}

# --- Route Groups ---

pub fn group(r, prefix, setup_fn) {
  let sub = router()
  let configured = setup_fn(sub)
  let prefixed_routes = configured._routes |> map(fn(route) {
    {..route, path: prefix ++ route.path}
  })
  {..r, _routes: r._routes ++ prefixed_routes}
}

# --- Middleware ---

pub fn use_middleware(r, mw) => {..r, _middleware: r._middleware ++ [mw]}

pub fn not_found(r, handler) => {..r, _not_found: handler}

# --- Common Middleware ---

pub fn cors(opts) => fn(req, next) {
  let response = next(req)
  let origin = opts.origin or "*"
  let headers = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH",
    "Access-Control-Allow-Headers": opts.headers or "Content-Type, Authorization"
  }
  {..response, headers: {..(response.headers or {}), ..headers}}
}

pub fn request_logger() => fn(req, next) {
  let start = now()
  let response = next(req)
  let elapsed = now() - start
  print("{req.method} {req.path} -> {response.status} ({elapsed}ms)")
  response
}

pub fn json_body() => fn(req, next) {
  let parsed_body = if req.body != nil { json_decode(req.body) } el { nil }
  next({..req, body: parsed_body})
}

pub fn auth_required(verify_fn) => fn(req, next) {
  let token = req.headers["Authorization"]
  if token == nil { {status: 401, body: "Unauthorized"} }
  el {
    match verify_fn(token) {
      Ok(user) => next({..req, user: user}),
      Err(msg) => {status: 403, body: "Forbidden: {msg}"}
    }
  }
}

# --- Path Matching ---

fn match_route(route_path, req_path) {
  let route_parts = split(route_path, "/") |> filter(p => p != "")
  let req_parts = split(req_path, "/") |> filter(p => p != "")

  if len(route_parts) != len(req_parts) { nil }
  el {
    let mut params = {}
    let mut matched = true

    for i in 0..len(route_parts) {
      let rp = route_parts[i]
      let pp = req_parts[i]

      if starts(rp, ":") {
        # Path parameter
        let param_name = slice(rp, 1, len(rp))
        params[param_name] = pp
      } el if rp == "*" {
        # Wildcard
        params["_wildcard"] = pp
      } el if rp != pp {
        matched = false
        break
      }
    }

    if matched { params } el { nil }
  }
}

# --- Request Handling ---

pub fn handle(r, req) {
  # Find matching route
  let matching = r._routes |> find(fn(route) {
    route.method == req.method and match_route(route.path, req.path) != nil
  })

  match matching {
    nil => r._not_found(req),
    route => {
      let params = match_route(route.path, req.path)
      let enriched_req = {..req, params: params}

      # Build middleware chain
      let all_mw = r._middleware ++ route._middleware
      let handler = route.handler

      run_middleware(all_mw, enriched_req, handler)
    }
  }
}

fn run_middleware(middleware, req, handler) {
  if len(middleware) == 0 {
    handler(req)
  } el {
    let [first, ..rest] = middleware
    first(req, fn(modified_req) {
      run_middleware(rest, modified_req, handler)
    })
  }
}

# --- Response Helpers ---

pub fn json_response(data, status) => {
  status: status or 200,
  headers: {"Content-Type": "application/json"},
  body: json_encode(data)
}

pub fn text_response(text, status) => {
  status: status or 200,
  headers: {"Content-Type": "text/plain"},
  body: text
}

pub fn redirect(url, status) => {
  status: status or 302,
  headers: {"Location": url},
  body: ""
}

pub fn ok(data) => json_response(data, 200)
pub fn created(data) => json_response(data, 201)
pub fn no_content() => {status: 204, body: ""}
pub fn bad_request(msg) => json_response({error: msg}, 400)
pub fn unauthorized(msg) => json_response({error: msg or "Unauthorized"}, 401)
pub fn forbidden(msg) => json_response({error: msg or "Forbidden"}, 403)
pub fn not_found_response(msg) => json_response({error: msg or "Not Found"}, 404)
pub fn server_error(msg) => json_response({error: msg or "Internal Server Error"}, 500)
