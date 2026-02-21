# Arc Quick Start ⚡

Get running in under 2 minutes.

## Prerequisites

- **Node.js 18+** ([download](https://nodejs.org))

## Install

```bash
npm install -g arc-lang
```

## Your First Program

Create `hello.arc`:

```arc
print("Hello, World!")

let nums = [1, 2, 3] |> map(x => x * 2)
print("Doubled: {nums}")
```

Run it:

```bash
arc run hello.arc
```

## Try the REPL

```bash
arc repl
```

```
Arc REPL v0.1 — Type expressions to evaluate
> 2 + 3
5
> "hello" + " world"
hello world
> [1, 2, 3] |> map(x => x * 2)
[2, 4, 6]
> let name = "Arc"
> print("Hi, {name}!")
Hi, Arc!
```

## Next Steps

- 📚 **[Learn Arc step-by-step](examples/learn/)** — Basics, functions, patterns, async, modules
- 📖 **[Getting Started Guide](docs/getting-started.md)** — Full tutorial with language basics
- 🗺️ **[Language Tour](docs/language-tour.md)** — Complete feature walkthrough
- 💡 **[Examples](examples/)** — Real-world programs with token comparisons
- 📦 **[Standard Library](docs/stdlib-reference.md)** — Full API reference
