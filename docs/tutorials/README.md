# Arc Tutorials

Welcome to the Arc tutorial series! These tutorials will take you from writing your first line of Arc to building real-world programs.

## Who Are These For?

These tutorials are designed for developers who already know at least one programming language (JavaScript, Python, etc.) and want to learn Arc. We assume you understand basic programming concepts — variables, functions, loops — but we don't assume any Arc knowledge.

## The Tutorials

| # | Tutorial | What You'll Learn |
|---|----------|-------------------|
| 1 | [Hello, World!](01-hello-world.md) | Installation, REPL, variables, types, and your first program |
| 2 | [Functions & Pipelines](02-functions-and-pipelines.md) | Defining functions, the `\|>` operator, higher-order functions |
| 3 | [Pattern Matching](03-pattern-matching.md) | `match` expressions, destructuring, replacing if/else chains |
| 4 | [Async & Tool Calls](04-async-and-tools.md) | `@GET`/`@POST`, parallel fetch, error handling with `result` |
| 5 | [Modules & Packages](05-modules-and-packages.md) | `use`/`pub`, stdlib, creating modules, `arc pkg` |
| 6 | [Real-World Project](06-real-world-project.md) | Building a complete program with the full Arc workflow |

## How to Use These Tutorials

Each tutorial builds on concepts from previous ones, so we recommend going in order. That said, if you're already comfortable with the basics, feel free to jump to the topic that interests you.

Every tutorial includes:
- **Explanations** — not just what, but *why*
- **Code examples** — lots of them, all runnable
- **Try it yourself** — exercises to solidify your understanding
- **Token comparisons** — see how Arc compares to JavaScript

## Prerequisites

- **Node.js 18+** and npm installed
- A terminal / command line
- A text editor (VS Code, Vim, whatever you prefer)

## Quick Setup

```bash
git clone https://github.com/kai-builds-ai/arc-lang.git
cd arc-lang/compiler && npm install && cd ..
```

You're ready. Start with [Tutorial 1: Hello, World!](01-hello-world.md)
