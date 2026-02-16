# 📰 News Digest

A news aggregator CLI that fetches from multiple sources in parallel, deduplicates and categorizes articles, and produces a formatted digest.

Demonstrates the full Arc development workflow: modules, parallel fetch, pattern matching, pipelines, Result error handling, and testing.

## Structure

```
news-digest/
├── arc.toml
├── src/
│   ├── main.arc         — Entry point
│   ├── models.arc       — Data types (Article, Digest)
│   ├── fetcher.arc      — Parallel source fetching
│   ├── processor.arc    — Dedup, categorize, build digest
│   └── formatter.arc    — Text and compact output formatting
└── tests/
    └── main_test.arc    — Unit tests
```

## Key Features

- **Parallel fetch** from 3 news APIs with `fetch []`
- **Pattern matching** to handle different API response shapes
- **Result type** error handling (no try/catch)
- **Pipelines** for data transformation
- **Modules** with `pub`/`use` for clean organization
- **Tests** with `std/test`

## Token Comparison

| Component | Arc | JavaScript | Savings |
|-----------|-----|-----------|---------|
| Data models | ~60 | ~110 | 45% |
| Fetcher | ~120 | ~250 | 52% |
| Processor | ~100 | ~200 | 50% |
| Formatter | ~150 | ~280 | 46% |
| Main | ~40 | ~70 | 43% |
| Tests | ~120 | ~220 | 45% |
| **Total** | **~590** | **~1,130** | **~48%** |

## Running

```bash
arc run src/main.arc
arc test
arc fmt
arc lint
```
