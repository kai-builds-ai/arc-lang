// =============================================================================
// url-shortener.arc — URL Shortener Service
// =============================================================================
// Demonstrates: fn, let, mut, match, |>, =>, pub, import, @GET/@POST, closures,
// higher-order functions, string interpolation, crypto, datetime, collections,
// json, async/await, pattern matching
// =============================================================================

import crypto
import datetime
import collections
import json

// --- URL record ---
pub struct UrlRecord {
  short_code: str,
  original_url: str,
  created_at: datetime,
  expires_at: datetime?,
  creator_ip: str,
  mut clicks: list,
  mut total_clicks: int,
}

// --- Click event ---
pub struct ClickEvent {
  timestamp: datetime,
  referrer: str,
  user_agent: str,
  ip: str,
}

// --- URL Store ---
pub struct UrlStore {
  mut urls: map,
  mut code_to_url: map,
  base_url: str,
  code_length: int,
  mut rate_limits: map,
  rate_limit_max: int,
  rate_limit_window_ms: int,
}

pub fn new_store(base_url: str) -> UrlStore {
  UrlStore {
    urls: {},
    code_to_url: {},
    base_url: base_url,
    code_length: 6,
    rate_limits: {},
    rate_limit_max: 10,
    rate_limit_window_ms: 60000,
  }
}

// --- Generate short code from URL ---
fn generate_code(url: str, length: int) -> str {
  let hash = crypto::sha256(url + "{datetime::now()}")
  let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let hash_bytes = crypto::hex_to_bytes(hash)

  range(0, length)
    |> map(fn(i) => {
      let idx = hash_bytes[i] % str::len(chars)
      chars |> str::char_at(idx)
    })
    |> str::join("")
}

// --- Custom code validation ---
fn validate_code(code: str) -> { valid: bool, error: str? } {
  if str::len(code) < 3 {
    return { valid: false, error: "Code must be at least 3 characters" }
  }
  if str::len(code) > 20 {
    return { valid: false, error: "Code must be at most 20 characters" }
  }
  let valid_chars = code |> str::to_chars() |> all(fn(ch) => {
    (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') ||
    (ch >= '0' && ch <= '9') || ch == '-' || ch == '_'
  })
  if !valid_chars {
    return { valid: false, error: "Code contains invalid characters" }
  }
  { valid: true, error: null }
}

// --- Rate limiting ---
fn check_rate_limit(store: mut UrlStore, ip: str) -> bool {
  let now_ms = datetime::to_epoch_ms(datetime::now())
  let window_start = now_ms - store.rate_limit_window_ms
  let requests = store.rate_limits[ip] ?? []
  let valid = requests |> filter(fn(ts) => ts > window_start)

  if len(valid) >= store.rate_limit_max {
    store.rate_limits = store.rate_limits |> map::set(ip, valid)
    false
  } else {
    store.rate_limits = store.rate_limits |> map::set(ip, valid |> append(now_ms))
    true
  }
}

// --- Shorten a URL ---
pub fn shorten(store: mut UrlStore, url: str, opts: map) -> { short_url: str, code: str } {
  let ip = opts["ip"] ?? "unknown"

  // Rate limit check
  if !check_rate_limit(store, ip) {
    panic("Rate limit exceeded. Try again later.")
  }

  // Check if URL already shortened
  let existing = store.urls[url]
  if existing != null && opts["force"] != true {
    return {
      short_url: "{store.base_url}/{existing.short_code}",
      code: existing.short_code,
    }
  }

  // Generate or use custom code
  let code = match opts["custom_code"] {
    null => {
      let mut candidate = generate_code(url, store.code_length)
      let mut attempts = 0
      while store.code_to_url[candidate] != null && attempts < 10 {
        candidate = generate_code(url + "{attempts}", store.code_length)
        attempts = attempts + 1
      }
      candidate
    }
    custom => {
      let validation = validate_code(custom)
      if !validation.valid {
        panic("Invalid custom code: {validation.error}")
      }
      if store.code_to_url[custom] != null {
        panic("Code '{custom}' is already taken")
      }
      custom
    }
  }

  let record = UrlRecord {
    short_code: code,
    original_url: url,
    created_at: datetime::now(),
    expires_at: opts["ttl_hours"] |> map_optional(fn(h) => {
      datetime::now() |> datetime::add_hours(h)
    }),
    creator_ip: ip,
    clicks: [],
    total_clicks: 0,
  }

  store.urls = store.urls |> map::set(url, record)
  store.code_to_url = store.code_to_url |> map::set(code, url)

  {
    short_url: "{store.base_url}/{code}",
    code: code,
  }
}

fn map_optional(value: any, transform: fn) -> any {
  if value != null { transform(value) } else { null }
}

// --- Resolve a short code ---
pub fn resolve(store: mut UrlStore, code: str, click_info: map) -> str? {
  let url = store.code_to_url[code]
  if url == null { return null }

  let record = store.urls[url]

  // Check expiration
  if record.expires_at != null && datetime::is_after(datetime::now(), record.expires_at) {
    // Expired — clean up
    store.urls = store.urls |> map::remove(url)
    store.code_to_url = store.code_to_url |> map::remove(code)
    return null
  }

  // Record click
  let click = ClickEvent {
    timestamp: datetime::now(),
    referrer: click_info["referrer"] ?? "direct",
    user_agent: click_info["user_agent"] ?? "unknown",
    ip: click_info["ip"] ?? "unknown",
  }

  record.clicks = record.clicks |> append(click)
  record.total_clicks = record.total_clicks + 1

  url
}

// --- Analytics ---
pub fn get_analytics(store: UrlStore, code: str) -> map? {
  let url = store.code_to_url[code]
  if url == null { return null }

  let record = store.urls[url]
  let clicks = record.clicks

  // Clicks by date
  let by_date = clicks
    |> map(fn(c) => datetime::format(c.timestamp, "YYYY-MM-DD"))
    |> collections::group_by(fn(d) => d)
    |> map::map_values(fn(dates) => len(dates))

  // Clicks by referrer
  let by_referrer = clicks
    |> collections::group_by(fn(c) => c.referrer)
    |> map::map_values(fn(refs) => len(refs))

  // Unique visitors (by IP)
  let unique_ips = clicks
    |> map(fn(c) => c.ip)
    |> collections::unique()

  // Click timeline (last 7 days)
  let week_ago = datetime::now() |> datetime::add_days(-7)
  let recent = clicks |> filter(fn(c) => datetime::is_after(c.timestamp, week_ago))

  {
    "code": code,
    "original_url": record.original_url,
    "created_at": datetime::to_iso(record.created_at),
    "total_clicks": record.total_clicks,
    "unique_visitors": len(unique_ips),
    "clicks_by_date": by_date,
    "clicks_by_referrer": by_referrer,
    "recent_clicks_7d": len(recent),
    "last_click": if len(clicks) > 0 {
      datetime::to_iso(clicks[len(clicks) - 1].timestamp)
    } else { null },
  }
}

// --- List all URLs ---
pub fn list_urls(store: UrlStore) -> list {
  store.urls |> map::values() |> map(fn(record) => {
    {
      "code": record.short_code,
      "url": record.original_url,
      "clicks": record.total_clicks,
      "created": datetime::format(record.created_at, "YYYY-MM-DD HH:mm"),
    }
  }) |> collections::sort_by(fn(a, b) => b["clicks"] - a["clicks"])
}

// --- Delete a short URL ---
pub fn delete_url(store: mut UrlStore, code: str) -> bool {
  let url = store.code_to_url[code]
  if url == null { return false }

  store.urls = store.urls |> map::remove(url)
  store.code_to_url = store.code_to_url |> map::remove(code)
  true
}

// --- Export/Import ---
pub fn export_json(store: UrlStore) -> str {
  let data = store.urls |> map::values() |> map(fn(r) => {
    {
      "code": r.short_code,
      "url": r.original_url,
      "created_at": datetime::to_iso(r.created_at),
      "total_clicks": r.total_clicks,
    }
  })
  json::stringify(data, 2)
}

// --- HTTP API (using Arc decorators) ---
@POST("/api/shorten")
pub async fn api_shorten(req: Request) -> Response {
  let body = await req.json()
  let result = shorten(global_store, body["url"], {
    "ip": req.ip,
    "custom_code": body["custom_code"],
    "ttl_hours": body["ttl_hours"],
  })

  Response::json(result, 201)
}

@GET("/api/analytics/:code")
pub async fn api_analytics(req: Request) -> Response {
  let code = req.params["code"]
  let analytics = get_analytics(global_store, code)

  match analytics {
    null => Response::json({ "error": "Not found" }, 404)
    _ => Response::json(analytics, 200)
  }
}

@GET("/:code")
pub async fn api_redirect(req: Request) -> Response {
  let code = req.params["code"]
  let url = resolve(global_store, code, {
    "referrer": req.headers["referer"] ?? "direct",
    "user_agent": req.headers["user-agent"] ?? "unknown",
    "ip": req.ip,
  })

  match url {
    null => Response::json({ "error": "URL not found or expired" }, 404)
    _ => Response::redirect(url, 302)
  }
}

// --- Demo ---
fn main() {
  let mut store = new_store("https://short.arc")

  // Shorten some URLs
  let r1 = shorten(store, "https://example.com/very/long/path/to/page", { "ip": "192.168.1.1" })
  print("Shortened: {r1.short_url}")

  let r2 = shorten(store, "https://docs.arc-lang.org/getting-started", {
    "ip": "192.168.1.2",
    "custom_code": "arc-docs",
  })
  print("Custom: {r2.short_url}")

  let r3 = shorten(store, "https://temp.example.com/offer", {
    "ip": "192.168.1.1",
    "ttl_hours": 24,
  })
  print("Expiring: {r3.short_url}")

  // Simulate clicks
  range(0, 5) |> each(fn(i) {
    resolve(store, r1.code, {
      "referrer": if i % 2 == 0 { "google.com" } else { "twitter.com" },
      "ip": "10.0.0.{i}",
    })
  })

  range(0, 3) |> each(fn(_) {
    resolve(store, r2.code, { "referrer": "github.com" })
  })

  // Analytics
  print("\n=== Analytics: {r1.code} ===")
  let analytics = get_analytics(store, r1.code)
  print("  Total clicks: {analytics["total_clicks"]}")
  print("  Unique visitors: {analytics["unique_visitors"]}")
  print("  By referrer: {analytics["clicks_by_referrer"]}")

  // List all
  print("\n=== All URLs ===")
  list_urls(store) |> each(fn(entry) {
    print("  [{entry["code"]}] {entry["url"]} — {entry["clicks"]} clicks")
  })

  // Export
  print("\n=== Export ===")
  print(export_json(store))
}
