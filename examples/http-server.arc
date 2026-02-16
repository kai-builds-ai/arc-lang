// ============================================================================
// HTTP Server Framework in Arc
// ============================================================================
// A full HTTP server with request parsing, route matching, middleware pipeline,
// JSON helpers, static file serving, and CORS support.
// Demonstrates: @GET/@POST decorators, async/await, regex, pattern matching,
// closures, pipelines, pub, string interpolation, higher-order functions.
// ============================================================================

import net
import regex
import json
import collections
import io
import datetime

// --- HTTP Request Parsing ---

pub fn parse_request(raw) => {
    let lines = raw |> split("\r\n")
    let request_line = lines[0]
    
    let parts = regex.match(r"^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\s+(\S+)\s+HTTP/(\S+)", request_line)
    match parts {
        nil => { error: "Malformed request line" },
        _ => {
            let method = parts[1]
            let full_path = parts[2]
            let version = parts[3]
            
            // Parse path and query string
            let path_parts = full_path |> split("?")
            let path = path_parts[0]
            let query = match collections.length(path_parts) > 1 {
                true => parse_query(path_parts[1]),
                false => {}
            }
            
            // Parse headers
            let header_lines = lines
                |> collections.skip(1)
                |> collections.take_while(fn(line) => line != "")
            
            let headers = header_lines |> collections.reduce({}, fn(h, line) => {
                let kv = regex.match(r"^([^:]+):\s*(.+)$", line)
                match kv {
                    nil => h,
                    _ => collections.set(h, kv[1] |> lowercase(), kv[2])
                }
            })
            
            // Parse body
            let body_start = collections.index_of(lines, "") + 1
            let body = match body_start < collections.length(lines) {
                true => lines |> collections.skip(body_start) |> collections.join("\r\n"),
                false => ""
            }
            
            {
                method: method,
                path: path,
                query: query,
                version: version,
                headers: headers,
                body: body,
                params: {},
                raw: raw
            }
        }
    }
}

fn parse_query(qs) => {
    qs |> split("&") |> collections.reduce({}, fn(params, pair) => {
        let kv = pair |> split("=")
        match collections.length(kv) {
            2 => collections.set(params, url_decode(kv[0]), url_decode(kv[1])),
            _ => params
        }
    })
}

fn url_decode(s) => {
    s
    |> regex.replace_all(r"\+", " ")
    |> regex.replace_all(r"%([0-9A-Fa-f]{2})", fn(m) => char_from_hex(m[1]))
}

// --- HTTP Response Builder ---

pub fn response(status, body, headers) => {
    let status_text = match status {
        200 => "OK",
        201 => "Created",
        204 => "No Content",
        301 => "Moved Permanently",
        302 => "Found",
        304 => "Not Modified",
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        405 => "Method Not Allowed",
        500 => "Internal Server Error",
        _ => "Unknown"
    }
    
    let default_headers = {
        "Content-Type": "text/plain",
        "Content-Length": "${collections.length(body)}",
        "Server": "Arc-HTTP/1.0",
        "Date": datetime.now() |> datetime.to_rfc2822()
    }
    
    let all_headers = collections.merge(default_headers, headers)
    
    let header_str = all_headers
        |> collections.entries()
        |> collections.map(fn(e) => "${e.key}: ${e.value}")
        |> collections.join("\r\n")
    
    "HTTP/1.1 ${status} ${status_text}\r\n${header_str}\r\n\r\n${body}"
}

pub fn json_response(status, data) => {
    let body = json.encode(data, indent: 2)
    response(status, body, { "Content-Type": "application/json" })
}

pub fn html_response(status, html) => {
    response(status, html, { "Content-Type": "text/html; charset=utf-8" })
}

pub fn redirect(url, permanent) => {
    let status = match permanent { true => 301, false => 302 }
    response(status, "", { "Location": url })
}

pub fn not_found(message) => {
    json_response(404, { error: message or "Not Found" })
}

// --- Router ---

pub fn router() => {
    {
        routes: [],
        middleware: [],
        error_handler: fn(req, err) => json_response(500, { error: "${err}" })
    }
}

pub fn add_route(router, method, pattern, handler) => {
    let route = {
        method: method |> uppercase(),
        pattern: pattern,
        regex: compile_route_pattern(pattern),
        handler: handler
    }
    let mut r = router
    r.routes = r.routes |> collections.append(route)
    r
}

fn compile_route_pattern(pattern) => {
    let regex_str = pattern
        |> regex.replace_all(r":([a-zA-Z_]+)", "(?P<$1>[^/]+)")
        |> fn(s) => "^${s}$"
    regex.compile(regex_str)
}

@GET
pub fn get(router, pattern, handler) => add_route(router, "GET", pattern, handler)

@POST
pub fn post(router, pattern, handler) => add_route(router, "POST", pattern, handler)

pub fn put(router, pattern, handler) => add_route(router, "PUT", pattern, handler)

pub fn delete(router, pattern, handler) => add_route(router, "DELETE", pattern, handler)

// --- Middleware ---

pub fn use_middleware(router, middleware_fn) => {
    let mut r = router
    r.middleware = r.middleware |> collections.append(middleware_fn)
    r
}

// Common middleware

pub fn cors_middleware(allowed_origins) => fn(req, next) => {
    let origin = collections.get(req.headers, "origin", "*")
    let allowed = match allowed_origins {
        ["*"] => true,
        _ => collections.contains(allowed_origins, origin)
    }
    
    match req.method {
        "OPTIONS" => response(204, "", {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400"
        }),
        _ => {
            let res = next(req)
            match allowed {
                true => res |> add_header("Access-Control-Allow-Origin", origin),
                false => res
            }
        }
    }
}

pub fn logger_middleware() => fn(req, next) => {
    let start = datetime.now()
    let res = next(req)
    let elapsed = datetime.diff(datetime.now(), start)
    print("[${datetime.now() |> datetime.format("%H:%M:%S")}] ${req.method} ${req.path} - ${elapsed}ms")
    res
}

pub fn json_body_middleware() => fn(req, next) => {
    let content_type = collections.get(req.headers, "content-type", "")
    let mut r = req
    match content_type |> contains("application/json") {
        true => {
            r.json_body = json.decode(req.body)
        },
        false => {}
    }
    next(r)
}

pub fn rate_limit_middleware(max_requests, window_ms) => {
    let mut requests = {}
    
    fn(req, next) => {
        let ip = collections.get(req.headers, "x-forwarded-for", "unknown")
        let now = datetime.now() |> datetime.to_epoch_ms()
        
        let entry = collections.get(requests, ip, { count: 0, reset_at: now + window_ms })
        
        match now > entry.reset_at {
            true => {
                requests = collections.set(requests, ip, { count: 1, reset_at: now + window_ms })
                next(req)
            },
            false => match entry.count >= max_requests {
                true => json_response(429, { error: "Too many requests" }),
                false => {
                    requests = collections.set(requests, ip, { count: entry.count + 1, reset_at: entry.reset_at })
                    next(req)
                }
            }
        }
    }
}

fn add_header(response_str, key, value) => {
    response_str |> regex.replace(r"\r\n\r\n", "\r\n${key}: ${value}\r\n\r\n")
}

// --- Static File Serving ---

pub fn static_files(directory, prefix) => fn(req, next) => {
    match req.path |> starts_with(prefix) {
        true => {
            let file_path = req.path |> regex.replace("^${prefix}", directory)
            let mime = guess_mime(file_path)
            match io.read_file(file_path) {
                { ok: content } => response(200, content, { "Content-Type": mime }),
                { error: _ } => next(req)
            }
        },
        false => next(req)
    }
}

fn guess_mime(path) => {
    let ext = path |> regex.match(r"\.([^.]+)$")
    match ext {
        nil => "application/octet-stream",
        _ => match ext[1] {
            "html" => "text/html",
            "css" => "text/css",
            "js" => "application/javascript",
            "json" => "application/json",
            "png" => "image/png",
            "jpg" => "image/jpeg",
            "gif" => "image/gif",
            "svg" => "image/svg+xml",
            "txt" => "text/plain",
            "xml" => "application/xml",
            "pdf" => "application/pdf",
            _ => "application/octet-stream"
        }
    }
}

// --- Route Matching and Dispatch ---

fn match_route(router, req) => {
    router.routes |> collections.find(fn(route) => {
        route.method == req.method and regex.test(route.regex, req.path)
    })
}

fn extract_params(route, path) => {
    let m = regex.match(route.regex, path)
    match m {
        nil => {},
        _ => m.named or {}
    }
}

pub fn dispatch(router, raw_request) => {
    let req = parse_request(raw_request)
    
    match req {
        { error: e } => json_response(400, { error: e }),
        _ => {
            // Build middleware chain
            let handler = fn(req) => {
                let route = match_route(router, req)
                match route {
                    nil => not_found("No route for ${req.method} ${req.path}"),
                    _ => {
                        let params = extract_params(route, req.path)
                        let mut r = req
                        r.params = params
                        route.handler(r)
                    }
                }
            }
            
            // Apply middleware in reverse order (outermost first)
            let chain = router.middleware
                |> collections.reverse()
                |> collections.reduce(handler, fn(next, mw) => {
                    fn(req) => mw(req, next)
                })
            
            chain(req)
        }
    }
}

// --- Server ---

pub async fn listen(router, host, port) => {
    print("Arc HTTP server starting on ${host}:${port}...")
    let server = await net.listen(host, port)
    print("Server listening on http://${host}:${port}")
    
    loop {
        let conn = await server.accept()
        // Handle each connection concurrently
        async {
            let raw = await conn.read()
            let response = dispatch(router, raw)
            await conn.write(response)
            conn.close()
        }
    }
}

// --- Main Demo ---

fn main() => {
    print("=== Arc HTTP Server Demo ===\n")
    
    // In-memory data store
    let mut items = [
        { id: 1, name: "Widget", price: 9.99 },
        { id: 2, name: "Gadget", price: 24.99 },
        { id: 3, name: "Doohickey", price: 4.99 }
    ]
    let mut next_id = 4
    
    let app = router()
        |> use_middleware(logger_middleware())
        |> use_middleware(cors_middleware(["*"]))
        |> use_middleware(json_body_middleware())
        |> use_middleware(static_files("./public", "/static"))
        |> get("/", fn(req) => html_response(200, "<h1>Welcome to Arc Server</h1>"))
        |> get("/api/items", fn(req) => json_response(200, { items: items, count: collections.length(items) }))
        |> get("/api/items/:id", fn(req) => {
            let id = req.params.id |> to_number()
            let item = items |> collections.find(fn(i) => i.id == id)
            match item {
                nil => not_found("Item ${id} not found"),
                _ => json_response(200, item)
            }
        })
        |> post("/api/items", fn(req) => {
            let data = req.json_body
            let item = {
                id: next_id,
                name: data.name,
                price: data.price
            }
            next_id = next_id + 1
            items = items |> collections.append(item)
            json_response(201, item)
        })
        |> delete("/api/items/:id", fn(req) => {
            let id = req.params.id |> to_number()
            items = items |> collections.filter(fn(i) => i.id != id)
            json_response(200, { deleted: id })
        })
        |> get("/api/search", fn(req) => {
            let q = collections.get(req.query, "q", "")
            let results = items
                |> collections.filter(fn(i) => i.name |> lowercase() |> contains(q |> lowercase()))
            json_response(200, { results: results, query: q })
        })
        |> get("/health", fn(req) => json_response(200, {
            status: "healthy",
            uptime: datetime.now() |> datetime.to_iso(),
            items_count: collections.length(items)
        }))
    
    // Demo: simulate request dispatch
    print("Simulating requests:\n")
    
    let test_requests = [
        "GET / HTTP/1.1\r\nHost: localhost\r\n\r\n",
        "GET /api/items HTTP/1.1\r\nHost: localhost\r\n\r\n",
        "GET /api/items/2 HTTP/1.1\r\nHost: localhost\r\n\r\n",
        "POST /api/items HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\n\r\n{\"name\":\"Thingamajig\",\"price\":14.99}",
        "GET /api/search?q=widget HTTP/1.1\r\nHost: localhost\r\n\r\n",
        "GET /nonexistent HTTP/1.1\r\nHost: localhost\r\n\r\n"
    ]
    
    test_requests |> collections.each(fn(raw) => {
        let res = dispatch(app, raw)
        print("Response: ${res |> collections.slice(0, 80)}...\n")
    })
}

main()
