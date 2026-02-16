# arc-router — HTTP request router for Arc
# Route matching, path params, middleware pipelines, method routing

# --- Router ---

pub fn router() => {
  _routes: [],
  _middleware: [],
  _not_found: (req) => {status: 404, body: "Not Found: {req.method} {req.path}"}
}

# --- Route Registration ---

pub fn get(r, path, handler) => add_route(r, "GET", path, handler)
pub fn post(r, path, handler) => add_route(r, "POST", path, handler)
pub fn put(r, path, handler) => add_route(r, "PUT", path, handler)
pub fn delete(r, path, handler) => add_route(r, "DELETE", path, handler)
pub fn patch(r, path, handler) => add_route(r, "PATCH", path, handler)

pub fn route(r, method, path, handler) => add_route(r, method, path, handler)

fn add_route(r, method, path, handler) {
  let rt = {method: upper(method), path: path, handler: handler, _middleware: []}
  {_routes: r._routes ++ [rt], _middleware: r._middleware, _not_found: r._not_found}
}

# --- Route Groups ---

pub fn group(r, prefix, setup_fn) {
  let sub = router()
  let configured = setup_fn(sub)
  let prefixed_routes = configured._routes |> map(rt => {
    method: rt.method, path: prefix ++ rt.path, handler: rt.handler, _middleware: rt._middleware
  })
  {_routes: r._routes ++ prefixed_routes, _middleware: r._middleware, _not_found: r._not_found}
}

# --- Middleware ---

pub fn use_middleware(r, mw) => {_routes: r._routes, _middleware: r._middleware ++ [mw], _not_found: r._not_found}

pub fn not_found(r, handler) => {_routes: r._routes, _middleware: r._middleware, _not_found: handler}

# --- Common Middleware ---

pub fn cors(opts) => (req, next) => {
  let response = next(req)
  let origin = if opts.origin { opts.origin } el { "*" }
  let allowed_headers = if opts.headers { opts.headers } el { "Content-Type, Authorization" }
  let mut h = if response.headers { response.headers } el { {} }
  h["Access-Control-Allow-Origin"] = origin
  h["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH"
  h["Access-Control-Allow-Headers"] = allowed_headers
  {status: response.status, body: response.body, headers: h}
}

pub fn request_logger() => (req, next) => {
  let start = now()
  let response = next(req)
  let elapsed = now() - start
  print("{req.method} {req.path} -> {response.status} ({elapsed}ms)")
  response
}

pub fn json_body() => (req, next) => {
  let parsed_body = if req.body != nil { json_decode(req.body) } el { nil }
  next({method: req.method, path: req.path, headers: req.headers, body: parsed_body, params: req.params, user: req.user})
}

pub fn auth_required(verify_fn) => (req, next) => {
  let token = req.headers["Authorization"]
  if token == nil { {status: 401, body: "Unauthorized"} }
  el {
    let result = verify_fn(token)
    if result.ok {
      next({method: req.method, path: req.path, headers: req.headers, body: req.body, params: req.params, user: result.value})
    } el {
      {status: 403, body: "Forbidden: {result.error}"}
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
      }
    }

    if matched { params } el { nil }
  }
}

# --- Request Handling ---

pub fn handle(r, req) {
  # Find matching route
  let matched = r._routes |> find(rt => {
    rt.method == req.method and match_route(rt.path, req.path) != nil
  })

  match matched {
    nil => r._not_found(req)
    rt => {
      let params = match_route(rt.path, req.path)
      let enriched_req = {method: req.method, path: req.path, headers: req.headers, body: req.body, params: params, user: req.user}

      # Build middleware chain
      let all_mw = r._middleware ++ rt._middleware
      let handler = rt.handler

      run_middleware(all_mw, enriched_req, handler)
    }
  }
}

fn run_middleware(middleware, req, handler) {
  if len(middleware) == 0 {
    handler(req)
  } el {
    let first = middleware[0]
    let rest = slice(middleware, 1, len(middleware))
    first(req, (modified_req) => {
      run_middleware(rest, modified_req, handler)
    })
  }
}

# --- Response Helpers ---

pub fn json_response(data, status) => {
  status: if status { status } el { 200 },
  headers: {content_type: "application/json"},
  body: json_encode(data)
}

pub fn text_response(text, status) => {
  status: if status { status } el { 200 },
  headers: {content_type: "text/plain"},
  body: text
}

pub fn redirect(url, status) => {
  status: if status { status } el { 302 },
  headers: {location: url},
  body: ""
}

pub fn ok(data) => json_response(data, 200)
pub fn created(data) => json_response(data, 201)
pub fn no_content() => {status: 204, body: ""}
pub fn bad_request(msg) => json_response({error: msg}, 400)
pub fn unauthorized(msg) => json_response({error: if msg { msg } el { "Unauthorized" }}, 401)
pub fn forbidden(msg) => json_response({error: if msg { msg } el { "Forbidden" }}, 403)
pub fn not_found_response(msg) => json_response({error: if msg { msg } el { "Not Found" }}, 404)
pub fn server_error(msg) => json_response({error: if msg { msg } el { "Internal Server Error" }}, 500)
