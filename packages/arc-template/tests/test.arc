# arc-template tests
use std/test: describe, it, expect_eq, expect_true

describe("variable substitution", fn {
  it("replaces simple variables", fn {
    let result = render("Hello, {{ name }}!", {name: "World"})
    expect_eq(result, "Hello, World!")
  })

  it("handles dot notation", fn {
    let result = render("{{ user.name }} is {{ user.age }}", {user: {name: "Alice", age: 30}})
    expect_eq(result, "Alice is 30")
  })

  it("handles missing variables", fn {
    let result = render("Hello, {{ name }}!", {})
    expect_eq(result, "Hello, !")
  })

  it("substitutes multiple variables", fn {
    let result = render("{{ a }} + {{ b }} = {{ c }}", {a: "1", b: "2", c: "3"})
    expect_eq(result, "1 + 2 = 3")
  })
})

describe("filters", fn {
  it("applies upper filter", fn {
    let result = render("{{ name | upper }}", {name: "hello"})
    expect_eq(result, "HELLO")
  })

  it("applies lower filter", fn {
    let result = render("{{ name | lower }}", {name: "HELLO"})
    expect_eq(result, "hello")
  })

  it("applies capitalize filter", fn {
    let result = render("{{ name | capitalize }}", {name: "hello"})
    expect_eq(result, "Hello")
  })

  it("applies trim filter", fn {
    let result = render("{{ name | trim }}", {name: "  hello  "})
    expect_eq(result, "hello")
  })
})

describe("conditionals", fn {
  it("renders if block when truthy", fn {
    let result = render("{{% if show }}Visible{{% end }}", {show: true})
    expect_eq(result, "Visible")
  })

  it("hides if block when falsy", fn {
    let result = render("{{% if show }}Visible{{% end }}", {show: false})
    expect_eq(result, "")
  })

  it("renders else block", fn {
    let result = render("{{% if show }}Yes{{% el }}No{{% end }}", {show: false})
    expect_eq(result, "No")
  })
})

describe("loops", fn {
  it("iterates over list", fn {
    let result = render("{{% for item in items }}{{ item }} {{% end }}", {items: ["a", "b", "c"]})
    expect_eq(trim(result), "a b c")
  })

  it("handles empty list", fn {
    let result = render("{{% for item in items }}{{ item }}{{% end }}", {items: []})
    expect_eq(result, "")
  })
})

describe("HTML escaping", fn {
  it("escapes HTML entities", fn {
    let result = escape_html("<script>alert('xss')</script>")
    expect_true(contains(result, "&lt;"))
    expect_true(contains(result, "&gt;"))
    expect_true(not contains(result, "<script>"))
  })

  it("escapes via {{! }} syntax", fn {
    let result = render("{{! content }}", {content: "<b>bold</b>"})
    expect_true(contains(result, "&lt;b&gt;"))
  })
})

describe("comments", fn {
  it("strips comments", fn {
    let result = render("Hello {{# this is a comment #}}World", {})
    expect_eq(result, "Hello World")
  })
})

describe("template builder", fn {
  it("builds and renders via pipeline", fn {
    let result = template("Hello, {{ name }}!")
      |> set("name", "Arc")
      |> to_string
    expect_eq(result, "Hello, Arc!")
  })

  it("sets multiple values", fn {
    let result = template("{{ greeting }}, {{ name }}!")
      |> set_all({greeting: "Hi", name: "World"})
      |> to_string
    expect_eq(result, "Hi, World!")
  })
})

describe("custom filters", fn {
  it("registers and uses custom filter", fn {
    register_filter("double", fn(v) => v ++ v)
    let result = render("{{ name | double }}", {name: "ha"})
    expect_eq(result, "haha")
  })
})

run_tests()
