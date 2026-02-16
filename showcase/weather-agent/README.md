# 🌤️ Weather Dashboard CLI Agent

A non-trivial Arc program that fetches weather data for 8 cities in parallel, categorizes conditions, and prints a formatted CLI dashboard.

## What It Does

1. **Parallel HTTP fetch** — Fires 8 API requests concurrently using `fetch []`
2. **JSON parsing** — Parses each response with the `json` stdlib
3. **Error handling** — Wraps results in `Result` types, partitions successes/failures
4. **Pattern matching** — Categorizes weather conditions and temperature ranges
5. **Data processing** — Sorts by temperature, finds extremes, groups by condition
6. **Formatted output** — Builds a padded CLI table with emoji indicators

## Arc Features Demonstrated

| Feature | Usage |
|---------|-------|
| `@GET` tool calls | First-class HTTP requests |
| `fetch []` parallel | Concurrent data fetching |
| `match` + guards | `match temp { t if t < 0 => "🥶" ... }` |
| `\|>` pipelines | `rows \|> sort_by(...) \|> max_by(...)` |
| `use` imports | `use std/json: from_json, to_json` |
| String interpolation | `"{city}: {temp_c}°C"` |
| Result module | `ok()`, `err()`, `unwrap()`, `partition()` |
| Collections | `sort_by`, `group_by`, `max_by`, `min_by`, `partition` |
| Implicit returns | No `return` keyword needed |
| `=>` expression bodies | `fn add(a, b) => a + b` |

## How to Run

```bash
arc run showcase/weather-agent/main.arc
```

## Token Comparison

The equivalent JavaScript would require:
- `import fetch from 'node-fetch'`
- `Promise.all([...])` with `.then()` chains
- `try/catch` blocks for error handling
- `switch` statements or `if/else` chains
- Manual `padEnd()`/`padStart()` formatting

**Estimated: ~180 lines / ~450 tokens in JavaScript vs ~130 lines / ~250 tokens in Arc (~44% savings)**
