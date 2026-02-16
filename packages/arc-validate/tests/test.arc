# arc-validate tests
use std/test: describe, it, expect_eq, expect_true

describe("type validators", fn {
  it("validates strings", fn {
    expect_eq(validate(is_string(), "hello"), Ok("hello"))
    match validate(is_string(), 42) {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })

  it("validates numbers", fn {
    expect_eq(validate(is_number(), 42), Ok(42))
    match validate(is_number(), "nope") {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })

  it("validates bools", fn {
    expect_eq(validate(is_bool(), true), Ok(true))
  })

  it("validates lists", fn {
    expect_eq(validate(is_list(), [1, 2]), Ok([1, 2]))
  })

  it("validates maps", fn {
    expect_eq(validate(is_map(), {a: 1}), Ok({a: 1}))
  })
})

describe("string validators", fn {
  it("checks min length", fn {
    expect_eq(validate(min_length(3), "hello"), Ok("hello"))
    match validate(min_length(3), "hi") {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })

  it("checks max length", fn {
    expect_eq(validate(max_length(5), "hello"), Ok("hello"))
    match validate(max_length(3), "hello") {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })

  it("validates email format", fn {
    expect_eq(validate(email(), "user@example.com"), Ok("user@example.com"))
    match validate(email(), "not-an-email") {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })

  it("validates URL format", fn {
    expect_eq(validate(url(), "https://example.com"), Ok("https://example.com"))
    match validate(url(), "not-a-url") {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })

  it("validates UUID format", fn {
    expect_eq(validate(uuid(), "550e8400-e29b-41d4-a716-446655440000"), Ok("550e8400-e29b-41d4-a716-446655440000"))
    match validate(uuid(), "not-a-uuid") {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })

  it("validates one_of", fn {
    let v = one_of(["red", "green", "blue"])
    expect_eq(validate(v, "red"), Ok("red"))
    match validate(v, "purple") {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })

  it("validates not_empty", fn {
    expect_eq(validate(not_empty(), "hello"), Ok("hello"))
    match validate(not_empty(), "") {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })
})

describe("number validators", fn {
  it("checks min value", fn {
    expect_eq(validate(min_val(0), 5), Ok(5))
    match validate(min_val(10), 5) {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })

  it("checks range", fn {
    expect_eq(validate(range(1, 10), 5), Ok(5))
    match validate(range(1, 10), 15) {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })

  it("checks positive", fn {
    expect_eq(validate(positive(), 1), Ok(1))
    match validate(positive(), -1) {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })
})

describe("combinators", fn {
  it("chains validators", fn {
    let v = chain([is_string(), min_length(3), max_length(10)])
    expect_eq(validate(v, "hello"), Ok("hello"))
    match validate(v, "hi") {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })

  it("handles required fields", fn {
    let v = required(is_string())
    match validate(v, nil) {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
    expect_eq(validate(v, "hello"), Ok("hello"))
  })

  it("handles optional fields", fn {
    let v = optional(is_string())
    expect_eq(validate(v, nil), Ok(nil))
    expect_eq(validate(v, "hello"), Ok("hello"))
  })

  it("custom validator", fn {
    let even = custom("Must be even", fn(v) => v % 2 == 0)
    expect_eq(validate(even, 4), Ok(4))
    match validate(even, 3) {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })
})

describe("schema validation", fn {
  it("validates a complete schema", fn {
    let user_schema = schema({
      name: required(chain([is_string(), min_length(1)])),
      email: required(email()),
      age: required(chain([is_number(), range(0, 150)])),
      role: optional(one_of(["admin", "user", "guest"]))
    })

    let valid_user = {name: "Alice", email: "alice@example.com", age: 30, role: "admin"}
    match validate(user_schema, valid_user) {
      Ok(data) => {
        expect_eq(data.name, "Alice")
        expect_eq(data.email, "alice@example.com")
      },
      Err(_) => expect_true(false, "Should have passed")
    }
  })

  it("collects schema errors", fn {
    let s = schema({
      name: required(is_string()),
      age: required(is_number())
    })
    match validate(s, {name: 42, age: "old"}) {
      Err(errors) => {
        expect_true(errors["name"] != nil)
        expect_true(errors["age"] != nil)
      },
      _ => expect_true(false, "Should have failed")
    }
  })
})

describe("list validators", fn {
  it("validates list items", fn {
    let v = list_of(is_number())
    expect_eq(validate(v, [1, 2, 3]), Ok([1, 2, 3]))
    match validate(v, [1, "two", 3]) {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })

  it("validates non-empty list", fn {
    expect_eq(validate(non_empty_list(), [1]), Ok([1]))
    match validate(non_empty_list(), []) {
      Err(_) => expect_true(true),
      _ => expect_true(false)
    }
  })
})

run_tests()
