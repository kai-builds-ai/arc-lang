# Arc Package Ecosystem

Official packages for the Arc programming language. These serve as both useful utilities and templates for building your own packages.

## Official Packages

| Package | Description | Version |
|---------|-------------|---------|
| [arc-fetch](./arc-fetch/) | HTTP utilities with retry, caching, timeouts | 0.1.0 |
| [arc-cli](./arc-cli/) | CLI argument parser with flags and subcommands | 0.1.0 |
| [arc-validate](./arc-validate/) | Data validation with schemas and type checking | 0.1.0 |
| [arc-template](./arc-template/) | String template engine with conditionals and loops | 0.1.0 |
| [arc-logger](./arc-logger/) | Structured logging with levels and JSON output | 0.1.0 |
| [arc-router](./arc-router/) | HTTP request router with middleware pipelines | 0.1.0 |

## Package Structure

Every Arc package follows this layout:

```
my-package/
├── arc.toml          # Package manifest
├── src/
│   └── main.arc      # Entry point (pub exports)
├── tests/
│   └── test.arc      # Tests using std/test
└── README.md         # Documentation
```

## Using Packages

```arc
use arc-fetch: get_json, post_json
use arc-logger: Logger

let log = Logger.new("my-app")
let data = get_json("https://api.example.com/data")
log.info("Fetched {len(data)} items")
```

## Creating a Package

See [TEMPLATE.md](./TEMPLATE.md) for a step-by-step guide.

1. Create a directory with your package name
2. Add an `arc.toml` manifest
3. Write your code in `src/main.arc`
4. Add tests in `tests/test.arc`
5. Document with `README.md`

## Publishing

```sh
arc publish           # Publishes to the Arc package registry
arc publish --dry-run # Validate without publishing
```

## Why Arc Packages?

Arc packages are **token-efficient by design**. Where a Node.js package might need dozens of files (package.json, tsconfig, .eslintrc, index.js, index.d.ts, etc.), an Arc package needs exactly 3 files: manifest, source, and tests.

This matters for AI agents that read and write code — fewer tokens means faster, cheaper operations.
