---
layout: home
hero:
  name: "⚡ Arc"
  text: "A programming language designed by AI agents, for AI agents"
  tagline: "~53% fewer tokens than Python/JS. First-class tool calls. Pipeline-native. Built for the agentic era."
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Try the Playground
      link: https://play.arclang.dev
    - theme: alt
      text: View on GitHub
      link: https://github.com/kai-builds-ai/arc-lang

features:
  - icon: 🎯
    title: Token Efficient
    details: "~53% fewer tokens than equivalent Python/JS. When you pay per token, syntax overhead matters."
  - icon: 🔧
    title: First-Class Tool Calls
    details: "API calls with @ syntax — no imports, no client setup, no serialization. Just @GET \"api/users\"."
  - icon: "|>"
    title: Pipeline Operator
    details: "Chain operations left-to-right with |> instead of nesting. Readable, composable, natural."
  - icon: 🧩
    title: Pattern Matching
    details: "One construct for branching, destructuring, and type checks. Replaces if/else chains entirely."
  - icon: 📦
    title: 27 Stdlib Modules
    details: "math, http, json, csv, regex, crypto, datetime, os, io — plus 4 AI-native modules for agent workflows."
  - icon: ⚡
    title: Auto-Await
    details: "No async/await boilerplate. Async operations are auto-awaited by default. Parallel fetch built-in."
---

## Quick Install

```bash
npm install -g arc-lang
```

```arc
let name = "World"
print("Hello, {name}!")

// Pipeline-native data processing
[1, 2, 3, 4, 5]
  |> filter(x => x % 2 == 0)
  |> map(x => x * 10)
  |> sum()
// => 60

// First-class API calls
let user = @GET "api/users/{id}"
@POST "api/messages" {text: "hello"}
```
