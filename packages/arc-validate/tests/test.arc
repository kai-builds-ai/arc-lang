# arc-validate tests
use pkg: *
use test: describe, it, expect_eq, expect_true, run_tests

describe("type validators", () => {
  it("validates strings", () => {
    let r = validate(is_string(), "hello")
    expect_true(r.ok)
    expect_eq(r.value, "hello")
    let r2 = validate(is_string(), 42)
    expect_true(not r2.ok)
  })

  it("validates numbers", () => {
    let r = validate(is_number(), 42)
    expect_true(r.ok)
    expect_eq(r.value, 42)
    let r2 = validate(is_number(), "nope")
    expect_true(not r2.ok)
  })

  it("validates bools", () => {
    let r = validate(is_bool(), true)
    expect_true(r.ok)
  })

  it("validates lists", () => {
    let r = validate(is_list(), [1, 2])
    expect_true(r.ok)
  })

  it("validates maps", () => {
    let r = validate(is_map(), {a: 1})
    expect_true(r.ok)
  })
})

describe("string validators", () => {
  it("checks min length", () => {
    let r = validate(min_length(3), "hello")
    expect_true(r.ok)
    let r2 = validate(min_length(3), "hi")
    expect_true(not r2.ok)
  })

  it("checks max length", () => {
    let r = validate(max_length(5), "hello")
    expect_true(r.ok)
    let r2 = validate(max_length(3), "hello")
    expect_true(not r2.ok)
  })

  it("validates email format", () => {
    let r = validate(email(), "user@example.com")
    expect_true(r.ok)
    let r2 = validate(email(), "not-an-email")
    expect_true(not r2.ok)
  })

  it("validates URL format", () => {
    let r = validate(url(), "https://example.com")
    expect_true(r.ok)
    let r2 = validate(url(), "not-a-url")
    expect_true(not r2.ok)
  })

  it("validates UUID format", () => {
    let r = validate(uuid(), "550e8400-e29b-41d4-a716-446655440000")
    expect_true(r.ok)
    let r2 = validate(uuid(), "not-a-uuid")
    expect_true(not r2.ok)
  })

  it("validates one_of", () => {
    let v = one_of(["red", "green", "blue"])
    let r = validate(v, "red")
    expect_true(r.ok)
    let r2 = validate(v, "purple")
    expect_true(not r2.ok)
  })

  it("validates not_empty", () => {
    let r = validate(not_empty(), "hello")
    expect_true(r.ok)
    let r2 = validate(not_empty(), "")
    expect_true(not r2.ok)
  })
})

describe("number validators", () => {
  it("checks min value", () => {
    let r = validate(min_val(0), 5)
    expect_true(r.ok)
    let r2 = validate(min_val(10), 5)
    expect_true(not r2.ok)
  })

  it("checks range", () => {
    let r = validate(range(1, 10), 5)
    expect_true(r.ok)
    let r2 = validate(range(1, 10), 15)
    expect_true(not r2.ok)
  })

  it("checks positive", () => {
    let r = validate(positive(), 1)
    expect_true(r.ok)
    let r2 = validate(positive(), -1)
    expect_true(not r2.ok)
  })
})

describe("combinators", () => {
  it("chains validators", () => {
    let v = chain([is_string(), min_length(3), max_length(10)])
    let r = validate(v, "hello")
    expect_true(r.ok)
    let r2 = validate(v, "hi")
    expect_true(not r2.ok)
  })

  it("handles required fields", () => {
    let v = required(is_string())
    let r = validate(v, nil)
    expect_true(not r.ok)
    let r2 = validate(v, "hello")
    expect_true(r2.ok)
  })

  it("handles optional fields", () => {
    let v = optional(is_string())
    let r = validate(v, nil)
    expect_true(r.ok)
    let r2 = validate(v, "hello")
    expect_true(r2.ok)
  })

  it("custom validator", () => {
    let even = custom("Must be even", v => v % 2 == 0)
    let r = validate(even, 4)
    expect_true(r.ok)
    let r2 = validate(even, 3)
    expect_true(not r2.ok)
  })
})

describe("schema validation", () => {
  it("validates a complete schema", () => {
    let user_schema = schema({
      name: required(chain([is_string(), min_length(1)])),
      email: required(email()),
      age: required(chain([is_number(), range(0, 150)])),
      role: optional(one_of(["admin", "user", "guest"]))
    })

    let valid_user = {name: "Alice", email: "alice@example.com", age: 30, role: "admin"}
    let r = validate(user_schema, valid_user)
    expect_true(r.ok)
    expect_eq(r.value.name, "Alice")
    expect_eq(r.value.email, "alice@example.com")
  })

  it("collects schema errors", () => {
    let s = schema({
      name: required(is_string()),
      age: required(is_number())
    })
    let r = validate(s, {name: 42, age: "old"})
    expect_true(not r.ok)
    expect_true(r.error["name"] != nil)
    expect_true(r.error["age"] != nil)
  })
})

describe("list validators", () => {
  it("validates list items", () => {
    let v = list_of(is_number())
    let r = validate(v, [1, 2, 3])
    expect_true(r.ok)
    let r2 = validate(v, [1, "two", 3])
    expect_true(not r2.ok)
  })

  it("validates non-empty list", () => {
    let r = validate(non_empty_list(), [1])
    expect_true(r.ok)
    let r2 = validate(non_empty_list(), [])
    expect_true(not r2.ok)
  })
})

run_tests()
