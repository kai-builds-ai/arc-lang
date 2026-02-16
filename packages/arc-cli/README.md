# arc-cli

CLI argument parser for Arc with flags, subcommands, and auto-generated help.

## Install

```toml
[dependencies]
arc-cli = "0.1.0"
```

## Quick Start

```arc
use arc-cli: cli, flag, option, arg, command, run

let app = cli("myapp")
  |> version("1.0.0")
  |> description("My awesome tool")
  |> flag("verbose", "v", "Enable verbose output", false)
  |> option("output", "o", "Output file", "out.txt")
  |> arg("input", "Input file", true)
  |> action(fn(parsed) {
    if parsed.flags["verbose"] { print("Verbose mode!") }
    print("Input: {parsed.args[0]}")
    print("Output: {parsed.flags["output"]}")
  })

run(app, argv)
```

## Subcommands

```arc
let app = cli("arc")
  |> version("0.1.0")
  |> command("build", "Compile the project", fn(p) {
    print("Building...")
  })
  |> command("test", "Run tests", fn(p) {
    print("Testing...")
  })
  |> command("publish", "Publish package", fn(p) {
    print("Publishing...")
  })

run(app, argv)
```

## Auto-Generated Help

```
myapp v1.0.0
My awesome tool

USAGE:
  myapp [OPTIONS] <input>

OPTIONS:
  -v, --verbose    Enable verbose output
  -o, --output     Output file (default: out.txt)

COMMANDS:
  build    Compile the project
  test     Run tests
```

## API Reference

| Function | Description |
|----------|-------------|
| `cli(name)` | Create a CLI definition |
| `version(c, v)` | Set version |
| `description(c, d)` | Set description |
| `flag(c, long, short, desc, default)` | Add boolean flag |
| `option(c, long, short, desc, default)` | Add value option |
| `arg(c, name, desc, required)` | Add positional argument |
| `command(c, name, desc, handler)` | Add subcommand |
| `action(c, handler)` | Set default action |
| `parse(c, argv)` | Parse arguments |
| `validate(c, parsed)` | Validate parsed args |
| `help(c)` | Generate help text |
| `run(c, argv)` | Parse, validate, and run |

## Token Comparison

**Arc (arc-cli):**
```arc
let app = cli("myapp")
  |> version("1.0.0")
  |> flag("verbose", "v", "Verbose", false)
  |> option("output", "o", "Output", "out.txt")
  |> arg("input", "Input file", true)
  |> run(argv)
```
~40 tokens

**JavaScript (commander.js):**
```javascript
const { Command } = require('commander');
const program = new Command();
program
  .name('myapp')
  .version('1.0.0')
  .option('-v, --verbose', 'Verbose')
  .option('-o, --output <file>', 'Output', 'out.txt')
  .argument('<input>', 'Input file')
  .action((input, options) => { /* ... */ });
program.parse(process.argv);
```
~65 tokens

**Savings: ~38%**
