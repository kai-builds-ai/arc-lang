# Integration tests for stdlib/test module

use test

describe("expect_eq", () => {
  it("equal integers", () => {
    expect_eq(1, 1, "1 should equal 1")
  })
  it("equal strings", () => {
    expect_eq("hello", "hello", "strings should match")
  })
})

describe("expect_neq", () => {
  it("different values", () => {
    expect_neq(1, 2, "1 should not equal 2")
  })
})

describe("expect_true and expect_false", () => {
  it("truthy values", () => {
    expect_true(true, "true is truthy")
    expect_true(1, "1 is truthy")
    expect_true("hi", "non-empty string is truthy")
  })
  it("falsy values", () => {
    expect_false(false, "false is falsy")
    expect_false(nil, "nil is falsy")
  })
})

describe("expect_nil", () => {
  it("nil value", () => {
    expect_nil(nil, "nil should be nil")
  })
})

describe("expect_gt and expect_lt", () => {
  it("greater than", () => {
    expect_gt(5, 3, "5 > 3")
  })
  it("less than", () => {
    expect_lt(2, 10, "2 < 10")
  })
})

run_tests()
print("stdlib-test: all passed")
