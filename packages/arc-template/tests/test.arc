# arc-template tests
use pkg: *
use test: describe, it, expect_eq, expect_true, run_tests

let OPEN = "\{\{"
let CLOSE = "}}"
let OPEN_BLOCK = "\{\{%"
let OPEN_ESC = "\{\{!"
let OPEN_COMMENT = "\{\{#"
let CLOSE_COMMENT = "#}}"

describe("variable substitution", () => {
  it("replaces simple variables", () => {
    let tpl = OPEN ++ " name " ++ CLOSE
    let result = render("Hello, " ++ tpl ++ "!", {name: "World"})
    expect_eq(result, "Hello, World!")
  })

  it("handles dot notation", () => {
    let tpl1 = OPEN ++ " user.name " ++ CLOSE
    let tpl2 = OPEN ++ " user.age " ++ CLOSE
    let result = render(tpl1 ++ " is " ++ tpl2, {user: {name: "Alice", age: 30}})
    expect_eq(result, "Alice is 30")
  })

  it("handles missing variables", () => {
    let tpl = OPEN ++ " name " ++ CLOSE
    let result = render("Hello, " ++ tpl ++ "!", {})
    expect_eq(result, "Hello, !")
  })
})

describe("filters", () => {
  it("applies upper filter", () => {
    let tpl = OPEN ++ " name | upper " ++ CLOSE
    let result = render(tpl, {name: "hello"})
    expect_eq(result, "HELLO")
  })

  it("applies lower filter", () => {
    let tpl = OPEN ++ " name | lower " ++ CLOSE
    let result = render(tpl, {name: "HELLO"})
    expect_eq(result, "hello")
  })
})

describe("conditionals", () => {
  it("renders if block when truthy", () => {
    let tpl = OPEN_BLOCK ++ " if show " ++ CLOSE ++ "Visible" ++ OPEN_BLOCK ++ " end " ++ CLOSE
    let result = render(tpl, {show: true})
    expect_eq(result, "Visible")
  })

  it("hides if block when falsy", () => {
    let tpl = OPEN_BLOCK ++ " if show " ++ CLOSE ++ "Visible" ++ OPEN_BLOCK ++ " end " ++ CLOSE
    let result = render(tpl, {show: false})
    expect_eq(result, "")
  })
})

describe("loops", () => {
  it("iterates over list", () => {
    let item_tpl = OPEN ++ " item " ++ CLOSE
    let tpl = OPEN_BLOCK ++ " for item in items " ++ CLOSE ++ item_tpl ++ " " ++ OPEN_BLOCK ++ " end " ++ CLOSE
    let result = render(tpl, {items: ["a", "b", "c"]})
    expect_eq(trim(result), "a b c")
  })

  it("handles empty list", () => {
    let item_tpl = OPEN ++ " item " ++ CLOSE
    let tpl = OPEN_BLOCK ++ " for item in items " ++ CLOSE ++ item_tpl ++ OPEN_BLOCK ++ " end " ++ CLOSE
    let result = render(tpl, {items: []})
    expect_eq(result, "")
  })
})

describe("HTML escaping", () => {
  it("escapes HTML entities", () => {
    let result = escape_html("<script>alert('xss')</script>")
    expect_true(contains(result, "&lt;"))
    expect_true(contains(result, "&gt;"))
    expect_true(not contains(result, "<script>"))
  })
})

describe("comments", () => {
  it("strips comments", () => {
    let tpl = "Hello " ++ OPEN_COMMENT ++ " this is a comment " ++ CLOSE_COMMENT ++ "World"
    let result = render(tpl, {})
    expect_eq(result, "Hello World")
  })
})

describe("template builder", () => {
  it("builds and renders via pipeline", () => {
    let tpl_str = "Hello, " ++ OPEN ++ " name " ++ CLOSE ++ "!"
    let result = template(tpl_str)
      |> set("name", "Arc")
      |> to_string
    expect_eq(result, "Hello, Arc!")
  })

  it("sets multiple values", () => {
    let tpl_str = OPEN ++ " greeting " ++ CLOSE ++ ", " ++ OPEN ++ " name " ++ CLOSE ++ "!"
    let result = template(tpl_str)
      |> set_all({greeting: "Hi", name: "World"})
      |> to_string
    expect_eq(result, "Hi, World!")
  })
})

describe("custom filters", () => {
  it("registers and uses custom filter", () => {
    register_filter("double", v => v ++ v)
    let tpl = OPEN ++ " name | double " ++ CLOSE
    let result = render(tpl, {name: "ha"})
    expect_eq(result, "haha")
  })
})

run_tests()
