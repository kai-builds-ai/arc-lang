# arc-cli tests
use std/test: describe, it, expect_eq, expect_true

describe("cli builder", () => {
  it("creates a CLI with name", () => {
    let c = cli("myapp")
    expect_eq(c.name, "myapp")
  })

  it("chains options via pipeline", () => {
    let c = cli("myapp")
      |> version("1.0.0")
      |> description("My cool app")
      |> flag("verbose", "v", "Enable verbose output", false)
      |> option("output", "o", "Output file", "out.txt")
    expect_eq(c.version, "1.0.0")
    expect_eq(c.description, "My cool app")
    expect_eq(len(c._flags), 2)
  })
})

describe("parse", () => {
  it("parses long flags", () => {
    let c = cli("test") |> flag("verbose", "v", "Verbose", false)
    let result = parse(c, ["--verbose"])
    expect_eq(result.flags["verbose"], true)
  })

  it("parses short flags", () => {
    let c = cli("test") |> flag("verbose", "v", "Verbose", false)
    let result = parse(c, ["-v"])
    expect_eq(result.flags["verbose"], true)
  })

  it("parses option values", () => {
    let c = cli("test") |> option("output", "o", "Output file", nil)
    let result = parse(c, ["--output", "file.txt"])
    expect_eq(result.flags["output"], "file.txt")
  })

  it("parses short option values", () => {
    let c = cli("test") |> option("output", "o", "Output file", nil)
    let result = parse(c, ["-o", "file.txt"])
    expect_eq(result.flags["output"], "file.txt")
  })

  it("parses positional args", () => {
    let c = cli("test") |> arg("file", "Input file", true)
    let result = parse(c, ["input.arc"])
    expect_eq(result.args, ["input.arc"])
  })

  it("parses mixed flags and args", () => {
    let c = cli("test")
      |> flag("verbose", "v", "Verbose", false)
      |> option("output", "o", "Output", nil)
      |> arg("file", "Input", true)
    let result = parse(c, ["-v", "--output", "out.js", "input.arc"])
    expect_eq(result.flags["verbose"], true)
    expect_eq(result.flags["output"], "out.js")
    expect_eq(result.args, ["input.arc"])
  })

  it("identifies subcommands", () => {
    let c = cli("test")
      |> command("build", "Build the project", nil)
      |> command("test", "Run tests", nil)
    let result = parse(c, ["build"])
    expect_eq(result.command.name, "build")
  })

  it("uses default values", () => {
    let c = cli("test")
      |> flag("verbose", "v", "Verbose", false)
      |> option("output", "o", "Output", "default.txt")
    let result = parse(c, [])
    expect_eq(result.flags["verbose"], false)
    expect_eq(result.flags["output"], "default.txt")
  })
})

describe("validation", () => {
  it("passes with all required args", () => {
    let c = cli("test") |> arg("file", "Input", true)
    let parsed = parse(c, ["input.arc"])
    let result = validate(c, parsed)
    expect_true(result.ok)
  })

  it("fails with missing required args", () => {
    let c = cli("test") |> arg("file", "Input", true)
    let parsed = parse(c, [])
    let result = validate(c, parsed)
    if result.ok { expect_true(false, "Should have failed") }
    el { expect_true(len(result.errors) > 0) }
  })
})

describe("help generation", () => {
  it("generates help text", () => {
    let c = cli("myapp")
      |> version("1.0.0")
      |> description("A test app")
      |> flag("verbose", "v", "Enable verbose output", false)
      |> arg("file", "Input file", true)
    let text = help(c)
    expect_true(contains(text, "myapp v1.0.0"))
    expect_true(contains(text, "A test app"))
    expect_true(contains(text, "--verbose"))
    expect_true(contains(text, "<file>"))
  })

  it("shows subcommands in help", () => {
    let c = cli("myapp")
      |> version("1.0.0")
      |> command("build", "Build project", nil)
      |> command("test", "Run tests", nil)
    let text = help(c)
    expect_true(contains(text, "COMMANDS:"))
    expect_true(contains(text, "build"))
    expect_true(contains(text, "test"))
  })
})

run_tests()
