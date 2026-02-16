# arc-cli tests
use std/test: describe, it, expect_eq, expect_true

describe("cli builder", fn {
  it("creates a CLI with name", fn {
    let c = cli("myapp")
    expect_eq(c.name, "myapp")
  })

  it("chains options via pipeline", fn {
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

describe("parse", fn {
  it("parses long flags", fn {
    let c = cli("test") |> flag("verbose", "v", "Verbose", false)
    let result = parse(c, ["--verbose"])
    expect_eq(result.flags["verbose"], true)
  })

  it("parses short flags", fn {
    let c = cli("test") |> flag("verbose", "v", "Verbose", false)
    let result = parse(c, ["-v"])
    expect_eq(result.flags["verbose"], true)
  })

  it("parses option values", fn {
    let c = cli("test") |> option("output", "o", "Output file", nil)
    let result = parse(c, ["--output", "file.txt"])
    expect_eq(result.flags["output"], "file.txt")
  })

  it("parses short option values", fn {
    let c = cli("test") |> option("output", "o", "Output file", nil)
    let result = parse(c, ["-o", "file.txt"])
    expect_eq(result.flags["output"], "file.txt")
  })

  it("parses positional args", fn {
    let c = cli("test") |> arg("file", "Input file", true)
    let result = parse(c, ["input.arc"])
    expect_eq(result.args, ["input.arc"])
  })

  it("parses mixed flags and args", fn {
    let c = cli("test")
      |> flag("verbose", "v", "Verbose", false)
      |> option("output", "o", "Output", nil)
      |> arg("file", "Input", true)
    let result = parse(c, ["-v", "--output", "out.js", "input.arc"])
    expect_eq(result.flags["verbose"], true)
    expect_eq(result.flags["output"], "out.js")
    expect_eq(result.args, ["input.arc"])
  })

  it("identifies subcommands", fn {
    let c = cli("test")
      |> command("build", "Build the project", nil)
      |> command("test", "Run tests", nil)
    let result = parse(c, ["build"])
    expect_eq(result.command.name, "build")
  })

  it("uses default values", fn {
    let c = cli("test")
      |> flag("verbose", "v", "Verbose", false)
      |> option("output", "o", "Output", "default.txt")
    let result = parse(c, [])
    expect_eq(result.flags["verbose"], false)
    expect_eq(result.flags["output"], "default.txt")
  })
})

describe("validation", fn {
  it("passes with all required args", fn {
    let c = cli("test") |> arg("file", "Input", true)
    let parsed = parse(c, ["input.arc"])
    let result = validate(c, parsed)
    expect_true(result == Ok(parsed))
  })

  it("fails with missing required args", fn {
    let c = cli("test") |> arg("file", "Input", true)
    let parsed = parse(c, [])
    match validate(c, parsed) {
      Err(errors) => expect_true(len(errors) > 0),
      Ok(_) => expect_true(false, "Should have failed")
    }
  })
})

describe("help generation", fn {
  it("generates help text", fn {
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

  it("shows subcommands in help", fn {
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
