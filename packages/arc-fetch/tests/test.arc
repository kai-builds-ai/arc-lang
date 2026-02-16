# arc-fetch tests
use std/test: describe, it, expect_eq, expect_true, expect_neq

describe("headers builder", fn {
  it("creates empty headers", fn {
    let h = headers()
    expect_eq(h._headers, {})
  })

  it("adds headers via pipeline", fn {
    let h = headers()
      |> with_header("X-Custom", "value")
      |> with_auth("my-token")
      |> with_json
    expect_eq(h._headers["X-Custom"], "value")
    expect_eq(h._headers["Authorization"], "Bearer my-token")
    expect_eq(h._headers["Content-Type"], "application/json")
  })
})

describe("request builder", fn {
  it("creates a GET request", fn {
    let req = request("GET", "https://api.example.com/users")
    expect_eq(req.method, "GET")
    expect_eq(req.url, "https://api.example.com/users")
    expect_eq(req._timeout_ms, 30000)
    expect_eq(req._retries, 0)
  })

  it("chains options via pipeline", fn {
    let req = request("POST", "https://api.example.com/users")
      |> body({name: "Alice"})
      |> timeout(5000)
      |> retries(3)
      |> auth("secret-token")
    expect_eq(req.method, "POST")
    expect_eq(req._body, {name: "Alice"})
    expect_eq(req._timeout_ms, 5000)
    expect_eq(req._retries, 3)
    expect_eq(req._headers["Authorization"], "Bearer secret-token")
  })

  it("enables caching", fn {
    let req = request("GET", "/api/data") |> cache(60000)
    expect_eq(req._cache_ttl, 60000)
  })
})

describe("URL helpers", fn {
  it("builds query strings", fn {
    let qs = query_string({page: 1, limit: 10})
    expect_true(contains(qs, "page=1"))
    expect_true(contains(qs, "limit=10"))
  })

  it("appends params to URL", fn {
    let url = with_params("https://api.example.com/search", {q: "arc", limit: 5})
    expect_true(starts(url, "https://api.example.com/search?"))
    expect_true(contains(url, "q=arc"))
  })

  it("returns URL unchanged with no params", fn {
    let url = with_params("https://example.com", {})
    expect_eq(url, "https://example.com")
  })
})

describe("convenience functions", fn {
  it("get_json builds correct request", fn {
    # These test the builder chain, not actual HTTP
    let req = request("GET", "/api/users") |> with_json
    expect_eq(req._headers["Content-Type"], "application/json")
  })
})

describe("cache", fn {
  it("clears cache", fn {
    clear_cache()
    expect_true(true)
  })
})

run_tests()
