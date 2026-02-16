# arc-logger tests
use std/test: describe, it, expect_eq, expect_true, expect_nil

describe("logger creation", fn {
  it("creates a logger with name", fn {
    let log = logger("test-app")
    expect_eq(log._name, "test-app")
    expect_eq(log._level, "info")
    expect_eq(log._format, "pretty")
  })

  it("sets level via pipeline", fn {
    let log = logger("app") |> level("debug")
    expect_eq(log._level, "debug")
  })

  it("sets format via pipeline", fn {
    let log = logger("app") |> format("json")
    expect_eq(log._format, "json")
  })

  it("adds context", fn {
    let log = logger("app") |> context({env: "prod", version: "1.0"})
    expect_eq(log._context.env, "prod")
    expect_eq(log._context.version, "1.0")
  })

  it("creates child logger", fn {
    let parent = logger("app") |> context({env: "prod"})
    let child_log = child(parent, "db", {host: "localhost"})
    expect_eq(child_log._name, "app:db")
    expect_eq(child_log._context.env, "prod")
    expect_eq(child_log._context.host, "localhost")
  })
})

describe("log levels", fn {
  it("emits at or above level", fn {
    let log = logger("test") |> level("warn")
    # info should be suppressed (below warn)
    let result = info(log, "hello", nil)
    expect_nil(result)
  })

  it("emits at matching level", fn {
    let log = logger("test") |> level("info")
    let result = info(log, "hello", nil)
    expect_eq(result.level, "info")
    expect_eq(result.msg, "hello")
  })

  it("emits above level", fn {
    let log = logger("test") |> level("info")
    let result = error(log, "bad thing", nil)
    expect_eq(result.level, "error")
  })

  it("debug is lowest level", fn {
    let log = logger("test") |> level("debug")
    let result = debug(log, "trace info", nil)
    expect_eq(result.level, "debug")
  })
})

describe("log entry structure", fn {
  it("includes all fields", fn {
    let log = logger("myapp") |> level("debug") |> context({req_id: "abc"})
    let entry = info(log, "request handled", {status: 200})
    expect_eq(entry.level, "info")
    expect_eq(entry.msg, "request handled")
    expect_eq(entry.name, "myapp")
    expect_eq(entry.data.status, 200)
    expect_eq(entry.context.req_id, "abc")
    expect_true(entry.time != nil)
    expect_true(entry.timestamp != nil)
  })
})

describe("convenience constructors", fn {
  it("creates with create()", fn {
    let log = create("app")
    expect_eq(log._name, "app")
  })

  it("creates json logger", fn {
    let log = json_logger("app")
    expect_eq(log._format, "json")
  })
})

describe("LEVELS constant", fn {
  it("has correct ordering", fn {
    expect_true(LEVELS.debug < LEVELS.info)
    expect_true(LEVELS.info < LEVELS.warn)
    expect_true(LEVELS.warn < LEVELS.error)
    expect_true(LEVELS.error < LEVELS.silent)
  })
})

run_tests()
