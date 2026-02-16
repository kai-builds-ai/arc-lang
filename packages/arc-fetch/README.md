# arc-fetch

HTTP utility package for Arc with retry logic, caching, timeouts, and fluent request builders.

## Install

```toml
[dependencies]
arc-fetch = "0.1.0"
```

## Quick Start

```arc
use arc-fetch: get_json, post_json

# Simple GET
let users = get_json("https://api.example.com/users")

# POST with data
let created = post_json("https://api.example.com/users", {
  name: "Alice",
  email: "alice@example.com"
})
```

## Request Builder

Chain options with pipelines:

```arc
use arc-fetch: request, body, timeout, retries, auth, cache, send

let response = request("GET", "https://api.example.com/data")
  |> auth("my-token")
  |> timeout(5000)
  |> retries(3)
  |> cache(60000)
  |> send
```

## Headers Builder

```arc
use arc-fetch: headers, with_header, with_auth, with_json

let h = headers()
  |> with_auth("my-token")
  |> with_json
  |> with_header("X-Request-Id", "abc-123")
```

## Parallel Fetch

```arc
use arc-fetch: fetch_all, fetch_map

# Fetch multiple URLs
let [users, posts] = fetch_all(["/api/users", "/api/posts"])

# Named parallel fetch
let data = fetch_map({
  users: "/api/users",
  config: "/api/config",
  stats: "/api/stats"
})
print(data.users)
```

## URL Helpers

```arc
use arc-fetch: with_params, query_string

let url = with_params("https://api.example.com/search", {q: "arc lang", limit: 10})
# => "https://api.example.com/search?q=arc+lang&limit=10"
```

## API Reference

| Function | Description |
|----------|-------------|
| `get_json(url)` | GET with JSON headers |
| `post_json(url, data)` | POST with JSON body |
| `put_json(url, data)` | PUT with JSON body |
| `delete_url(url)` | DELETE request |
| `request(method, url)` | Start a request builder |
| `body(req, data)` | Set request body |
| `timeout(req, ms)` | Set timeout in ms |
| `retries(req, n)` | Set retry count |
| `cache(req, ttl_ms)` | Enable response caching |
| `auth(req, token)` | Set Bearer auth |
| `header(req, k, v)` | Set custom header |
| `send(req)` | Execute the request |
| `fetch_all(urls)` | Parallel GET |
| `fetch_map(map)` | Named parallel GET |
| `with_params(url, params)` | Append query params |
| `clear_cache()` | Clear response cache |

## Token Comparison

**Arc (arc-fetch):**
```arc
let data = request("GET", "/api/users")
  |> auth(token)
  |> timeout(5000)
  |> retries(3)
  |> send
```
~30 tokens

**JavaScript equivalent:**
```javascript
const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token}`, ...options.headers }
      });
      clearTimeout(timeout);
      return await response.json();
    } catch (e) { if (i === retries - 1) throw e; }
  }
};
const data = await fetchWithRetry("/api/users", {});
```
~120 tokens

**Savings: ~75%**
