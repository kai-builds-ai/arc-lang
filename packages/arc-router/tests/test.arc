# arc-router tests
use std/test: describe, it, expect_eq, expect_true

describe("router creation", fn {
  it("creates empty router", fn {
    let r = router()
    expect_eq(len(r._routes), 0)
    expect_eq(len(r._middleware), 0)
  })
})

describe("route registration", fn {
  it("adds GET route", fn {
    let r = router() |> get("/users", fn(req) => ok([]))
    expect_eq(len(r._routes), 1)
    expect_eq(r._routes[0].method, "GET")
    expect_eq(r._routes[0].path, "/users")
  })

  it("adds multiple routes", fn {
    let r = router()
      |> get("/users", fn(req) => ok([]))
      |> post("/users", fn(req) => created(req.body))
      |> delete("/users/:id", fn(req) => no_content())
    expect_eq(len(r._routes), 3)
  })
})

describe("route matching", fn {
  it("matches exact paths", fn {
    let r = router() |> get("/users", fn(req) => ok({path: "users"}))
    let response = handle(r, {method: "GET", path: "/users"})
    expect_eq(response.status, 200)
  })

  it("extracts path params", fn {
    let r = router() |> get("/users/:id", fn(req) => ok({id: req.params.id}))
    let response = handle(r, {method: "GET", path: "/users/42"})
    expect_eq(response.status, 200)
    let body = json_decode(response.body)
    expect_eq(body.id, "42")
  })

  it("extracts multiple params", fn {
    let r = router() |> get("/users/:userId/posts/:postId", fn(req) {
      ok({user: req.params.userId, post: req.params.postId})
    })
    let response = handle(r, {method: "GET", path: "/users/1/posts/99"})
    let body = json_decode(response.body)
    expect_eq(body.user, "1")
    expect_eq(body.post, "99")
  })

  it("returns 404 for no match", fn {
    let r = router() |> get("/users", fn(req) => ok([]))
    let response = handle(r, {method: "GET", path: "/posts"})
    expect_eq(response.status, 404)
  })

  it("matches by method", fn {
    let r = router()
      |> get("/data", fn(req) => ok("get"))
      |> post("/data", fn(req) => ok("post"))
    let get_resp = handle(r, {method: "GET", path: "/data"})
    let post_resp = handle(r, {method: "POST", path: "/data"})
    expect_eq(get_resp.status, 200)
    expect_eq(post_resp.status, 200)
  })
})

describe("route groups", fn {
  it("prefixes routes in group", fn {
    let r = router() |> group("/api/v1", fn(sub) {
      sub |> get("/users", fn(req) => ok([]))
          |> get("/posts", fn(req) => ok([]))
    })
    expect_eq(len(r._routes), 2)
    expect_eq(r._routes[0].path, "/api/v1/users")
    expect_eq(r._routes[1].path, "/api/v1/posts")
  })
})

describe("middleware", fn {
  it("runs middleware before handler", fn {
    let add_header = fn(req, next) {
      let resp = next(req)
      {..resp, custom: "added"}
    }

    let r = router()
      |> use_middleware(add_header)
      |> get("/test", fn(req) => ok("hello"))
    let response = handle(r, {method: "GET", path: "/test"})
    expect_eq(response.custom, "added")
  })
})

describe("response helpers", fn {
  it("creates json response", fn {
    let resp = json_response({name: "test"}, 200)
    expect_eq(resp.status, 200)
    expect_eq(resp.headers["Content-Type"], "application/json")
  })

  it("creates text response", fn {
    let resp = text_response("hello", 200)
    expect_eq(resp.status, 200)
    expect_eq(resp.body, "hello")
  })

  it("creates redirect", fn {
    let resp = redirect("/login", 301)
    expect_eq(resp.status, 301)
    expect_eq(resp.headers["Location"], "/login")
  })

  it("creates status helpers", fn {
    expect_eq(ok("data").status, 200)
    expect_eq(created("data").status, 201)
    expect_eq(no_content().status, 204)
    expect_eq(bad_request("err").status, 400)
    expect_eq(unauthorized("err").status, 401)
    expect_eq(forbidden("err").status, 403)
    expect_eq(not_found_response("err").status, 404)
    expect_eq(server_error("err").status, 500)
  })
})

describe("custom 404", fn {
  it("uses custom not found handler", fn {
    let r = router()
      |> not_found(fn(req) => json_response({error: "Oops", path: req.path}, 404))
    let response = handle(r, {method: "GET", path: "/nope"})
    expect_eq(response.status, 404)
    let body = json_decode(response.body)
    expect_eq(body.path, "/nope")
  })
})

run_tests()
