# =============================================================================
# rate-limiter.arc — Rate Limiting Library
# =============================================================================
# Demonstrates: fn, let, mut, match, |>, =>, pub, import, datetime, collections,
# closures, higher-order functions, string interpolation, pattern matching, map
# =============================================================================

use datetime
use collections

# --- Rate limit result ---
pub struct RateLimitResult {
  allowed: bool,
  remaining: int,
  reset_at: datetime,
  retry_after_ms: int,
}

# --- Token Bucket Algorithm ---
pub struct TokenBucket {
  mut buckets: map,
  capacity: int,
  refill_rate: float, # tokens per second
  refill_interval_ms: int,
}

pub fn new_token_bucket(capacity: int, refill_rate: float) -> TokenBucket {
  TokenBucket {
    buckets: {},
    capacity: capacity,
    refill_rate: refill_rate,
    refill_interval_ms: (1000.0 / refill_rate) |> to_int(),
  }
}

pub fn token_bucket_check(limiter: mut TokenBucket, key: str) -> RateLimitResult {
  let now = datetime::now()
  let bucket = limiter.buckets[key] ?? {
    "tokens": limiter.capacity |> to_float(),
    "last_refill": now,
  }

  # Calculate tokens to add based on elapsed time
  let elapsed_ms = datetime::diff_ms(now, bucket["last_refill"])
  let new_tokens = (elapsed_ms |> to_float()) / 1000.0 * limiter.refill_rate
  let current_tokens = math::min(
    (bucket["tokens"] + new_tokens),
    limiter.capacity |> to_float()
  )

  if current_tokens >= 1.0 {
    # Allow request, consume a token
    limiter.buckets = limiter.buckets |> map::set(key, {
      "tokens": current_tokens - 1.0,
      "last_refill": now,
    })

    let remaining = (current_tokens - 1.0) |> to_int()
    RateLimitResult {
      allowed: true,
      remaining: remaining,
      reset_at: now |> datetime::add_ms(limiter.refill_interval_ms),
      retry_after_ms: 0,
    }
  } el {
    # Deny request
    let wait_ms = ((1.0 - current_tokens) / limiter.refill_rate * 1000.0) |> to_int()
    limiter.buckets = limiter.buckets |> map::set(key, {
      "tokens": current_tokens,
      "last_refill": now,
    })

    RateLimitResult {
      allowed: false,
      remaining: 0,
      reset_at: now |> datetime::add_ms(wait_ms),
      retry_after_ms: wait_ms,
    }
  }
}

# --- Sliding Window Algorithm ---
pub struct SlidingWindow {
  mut windows: map,
  max_requests: int,
  window_ms: int,
}

pub fn new_sliding_window(max_requests: int, window_ms: int) -> SlidingWindow {
  SlidingWindow {
    windows: {},
    max_requests: max_requests,
    window_ms: window_ms,
  }
}

pub fn sliding_window_check(limiter: mut SlidingWindow, key: str) -> RateLimitResult {
  let now = datetime::now()
  let now_ms = datetime::to_epoch_ms(now)
  let window_start = now_ms - limiter.window_ms

  # Get existing timestamps, filter expired
  let timestamps = limiter.windows[key] ?? []
  let valid = timestamps |> filter(fn(ts) => ts > window_start)

  if len(valid) < limiter.max_requests {
    # Allow and record
    let updated = valid |> append(now_ms)
    limiter.windows = limiter.windows |> map::set(key, updated)

    let remaining = limiter.max_requests - len(updated)
    RateLimitResult {
      allowed: true,
      remaining: remaining,
      reset_at: now |> datetime::add_ms(limiter.window_ms),
      retry_after_ms: 0,
    }
  } el {
    # Deny — find when oldest will expire
    let oldest = valid[0]
    let retry_after = (oldest + limiter.window_ms) - now_ms

    limiter.windows = limiter.windows |> map::set(key, valid)

    RateLimitResult {
      allowed: false,
      remaining: 0,
      reset_at: datetime::from_epoch_ms(oldest + limiter.window_ms),
      retry_after_ms: retry_after |> to_int(),
    }
  }
}

# --- Fixed Window Algorithm ---
pub struct FixedWindow {
  mut windows: map,
  max_requests: int,
  window_ms: int,
}

pub fn new_fixed_window(max_requests: int, window_ms: int) -> FixedWindow {
  FixedWindow {
    windows: {},
    max_requests: max_requests,
    window_ms: window_ms,
  }
}

pub fn fixed_window_check(limiter: mut FixedWindow, key: str) -> RateLimitResult {
  let now = datetime::now()
  let now_ms = datetime::to_epoch_ms(now)
  let window_key = "{key}:{now_ms / limiter.window_ms}"

  let count = limiter.windows[window_key] ?? 0
  let window_end_ms = ((now_ms / limiter.window_ms) + 1) * limiter.window_ms
  let reset_at = datetime::from_epoch_ms(window_end_ms)

  if count < limiter.max_requests {
    limiter.windows = limiter.windows |> map::set(window_key, count + 1)

    RateLimitResult {
      allowed: true,
      remaining: limiter.max_requests - count - 1,
      reset_at: reset_at,
      retry_after_ms: 0,
    }
  } el {
    let retry_after = window_end_ms - now_ms

    RateLimitResult {
      allowed: false,
      remaining: 0,
      reset_at: reset_at,
      retry_after_ms: retry_after |> to_int(),
    }
  }
}

# --- Cleanup expired entries ---
pub fn cleanup_sliding(limiter: mut SlidingWindow) -> int {
  let now_ms = datetime::to_epoch_ms(datetime::now())
  let window_start = now_ms - limiter.window_ms
  let mut removed = 0

  let keys = limiter.windows |> map::keys()
  keys |> each(fn(key) {
    let timestamps = limiter.windows[key]
    let valid = timestamps |> filter(fn(ts) => ts > window_start)
    if len(valid) == 0 {
      limiter.windows = limiter.windows |> map::remove(key)
      removed = removed + 1
    } el {
      limiter.windows = limiter.windows |> map::set(key, valid)
    }
  })

  removed
}

pub fn cleanup_fixed(limiter: mut FixedWindow) -> int {
  let now_ms = datetime::to_epoch_ms(datetime::now())
  let current_window = now_ms / limiter.window_ms
  let mut removed = 0

  let keys = limiter.windows |> map::keys()
  keys |> each(fn(key) {
    let parts = key |> str::split(":")
    let window_num = parts[len(parts) - 1] |> int::parse()
    if window_num < current_window - 1 {
      limiter.windows = limiter.windows |> map::remove(key)
      removed = removed + 1
    }
  })

  removed
}

# --- Middleware-style rate limiter ---
pub struct RateLimiterMiddleware {
  mut limiter: any,
  algorithm: str,
  key_extractor: fn,
  on_limited: fn,
}

pub fn create_middleware(algorithm: str, config: map) -> RateLimiterMiddleware {
  let limiter = match algorithm {
    "token_bucket" => new_token_bucket(
      config["capacity"] ?? 10,
      config["refill_rate"] ?? 1.0
    )
    "sliding_window" => new_sliding_window(
      config["max_requests"] ?? 100,
      config["window_ms"] ?? 60000
    )
    "fixed_window" => new_fixed_window(
      config["max_requests"] ?? 100,
      config["window_ms"] ?? 60000
    )
    _ => panic("Unknown algorithm: {algorithm}")
  }

  RateLimiterMiddleware {
    limiter: limiter,
    algorithm: algorithm,
    key_extractor: config["key_extractor"] ?? fn(req) => req["ip"] ?? "unknown",
    on_limited: config["on_limited"] ?? fn(result) {
      print("Rate limited! Retry after {result.retry_after_ms}ms")
    },
  }
}

pub fn check_request(mw: mut RateLimiterMiddleware, request: map) -> RateLimitResult {
  let key = mw.key_extractor(request)

  let result = match mw.algorithm {
    "token_bucket" => token_bucket_check(mw.limiter, key)
    "sliding_window" => sliding_window_check(mw.limiter, key)
    "fixed_window" => fixed_window_check(mw.limiter, key)
  }

  if !result.allowed {
    mw.on_limited(result)
  }

  result
}

# --- Format result for headers ---
pub fn to_headers(result: RateLimitResult) -> map {
  {
    "X-RateLimit-Remaining": "{result.remaining}",
    "X-RateLimit-Reset": "{datetime::to_epoch_ms(result.reset_at)}",
    "Retry-After": if result.allowed { "" } el { "{result.retry_after_ms / 1000}" },
  }
}

# --- Demo ---
fn main() {
  print("=== Token Bucket Demo ===")
  let mut tb = new_token_bucket(5, 2.0)

  range(0, 8) |> each(fn(i) {
    let result = token_bucket_check(tb, "user:alice")
    let status = if result.allowed { "✓ ALLOWED" } el { "✗ DENIED" }
    print("  Request {i + 1}: {status} (remaining: {result.remaining})")
  })

  print("\n=== Sliding Window Demo ===")
  let mut sw = new_sliding_window(3, 10000)

  range(0, 5) |> each(fn(i) {
    let result = sliding_window_check(sw, "api:bob")
    let status = if result.allowed { "✓ ALLOWED" } el { "✗ DENIED" }
    print("  Request {i + 1}: {status} (remaining: {result.remaining})")
  })

  print("\n=== Fixed Window Demo ===")
  let mut fw = new_fixed_window(3, 60000)

  range(0, 5) |> each(fn(i) {
    let result = fixed_window_check(fw, "endpoint:charlie")
    let status = if result.allowed { "✓ ALLOWED" } el { "✗ DENIED" }
    let headers = to_headers(result)
    print("  Request {i + 1}: {status} | Headers: {headers}")
  })

  print("\n=== Middleware Demo ===")
  let mut mw = create_middleware("sliding_window", {
    "max_requests": 2,
    "window_ms": 5000,
    "key_extractor": fn(req) => req["ip"],
    "on_limited": fn(result) {
      print("  ⚠ Rate limited! Wait {result.retry_after_ms}ms")
    },
  })

  let requests = [
    { "ip": "192.168.1.1", "path": "/api/data" },
    { "ip": "192.168.1.1", "path": "/api/users" },
    { "ip": "192.168.1.2", "path": "/api/data" },
    { "ip": "192.168.1.1", "path": "/api/items" },
    { "ip": "192.168.1.2", "path": "/api/items" },
  ]

  requests |> each(fn(req) {
    let result = check_request(mw, req)
    let status = if result.allowed { "✓" } el { "✗" }
    print("  {status} {req["ip"]} -> {req["path"]}")
  })
}
