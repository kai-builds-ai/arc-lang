# arc-router tests
use pkg: *
use json: from_json
use test: describe, it, expect_eq, expect_true, run_tests

describe("router creation", () => {
  it("creates empty router", () => {
    let r = router()
    expect_eq(len(r._routes), 0)
    expect_eq(len(r._middleware), 0)
  })
})

describe("route registration", () => {
  it("adds GET route", () => {
    let r = router() |> get("/users", (req) => ok([]))
    expect_eq(len(r._routes), 1)
    expect_eq(r._routes[0].method, "GET")
    expect_eq(r._routes[0].path, "/users")
  })

  it("adds multiple routes", () => {
    let r = router()
      |> get("/users", (req) => ok([]))
      |> post("/users", (req) => created(req.body))
      |> delete("/users/:id", (req) => no_content())
    expect_eq(len(r._routes), 3)
  })
})

describe("route matching", () => {
  it("matches exact paths", () => {
    let r = router() |> get("/users", (req) => ok({path: "users"}))
    let response = handle(r, {method: "GET", path: "/users"})
    expect_eq(response.status, 200)
  })

  it("extracts path params", () => {
    let r = router() |> get("/users/:id", (req) => ok({id: req.params.id}))
    let response = handle(r, {method: "GET", path: "/users/42"})
    expect_eq(response.status, 200)
    let body = from_json(response.body)
    expect_eq(body.id, "42")
  })

  it("extracts multiple params", () => {
    let r = router() |> get("/users/:userId/posts/:postId", (req) => {
      ok({user: req.params.userId, post: req.params.postId})
    })
    let response = handle(r, {method: "GET", path: "/users/1/posts/99"})
    let body = from_json(response.body)
    expect_eq(body.user, "1")
    expect_eq(body.post, "99")
  })

  it("returns 404 for no match", () => {
    let r = router() |> get("/users", (req) => ok([]))
    let response = handle(r, {method: "GET", path: "/posts"})
    expect_eq(response.status, 404)
  })

  it("matches by method", () => {
    let r = router()
      |> get("/data", (req) => ok("get"))
      |> post("/data", (req) => ok("post"))
    let get_resp = handle(r, {method: "GET", path: "/data"})
    let post_resp = handle(r, {method: "POST", path: "/data"})
    expect_eq(get_resp.status, 200)
    expect_eq(post_resp.status, 200)
  })
})

describe("route groups", () => {
  it("prefixes routes in group", () => {
    let r = router() |> group("/api/v1", (sub) => {
      sub |> get("/users", (req) => ok([]))
          |> get("/posts", (req) => ok([]))
    })
    expect_eq(len(r._routes), 2)
    expect_eq(r._routes[0].path, "/api/v1/users")
    expect_eq(r._routes[1].path, "/api/v1/posts")
  })
})

describe("middleware", () => {
  it("runs middleware before handler", () => {
    let add_header = (req, next) => {
      let resp = next(req)
      {status: resp.status, body: resp.body, headers: resp.headers, custom: "added"}
    }

    let r = router()
      |> use_middleware(add_header)
      |> get("/test", (req) => ok("hello"))
    let response = handle(r, {method: "GET", path: "/test"})
    expect_eq(response.custom, "added")
  })
})

describe("response helpers", () => {
  it("creates json response", () => {
    let resp = json_response({name: "test"}, 200)
    expect_eq(resp.status, 200)
    expect_eq(resp.headers.content_type, "application/json")
  })

  it("creates text response", () => {
    let resp = text_response("hello", 200)
    expect_eq(resp.status, 200)
    expect_eq(resp.body, "hello")
  })

  it("creates redirect", () => {
    let resp = redirect("/login", 301)
    expect_eq(resp.status, 301)
    expect_eq(resp.headers.location, "/login")
  })

  it("creates status helpers", () => {
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

describe("custom 404", () => {
  it("uses custom not found handler", () => {
    let r = router()
      |> not_found((req) => json_response({error: "Oops", path: req.path}, 404))
    let response = handle(r, {method: "GET", path: "/nope"})
    expect_eq(response.status, 404)
    let body = from_json(response.body)
    expect_eq(body.path, "/nope")
  })
})

run_tests()
