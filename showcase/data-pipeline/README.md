# 📊 Data Pipeline (ETL)

An ETL-style data pipeline written in Arc that reads CSV sales data, transforms and enriches it, filters by business rules, aggregates by multiple dimensions, and outputs formatted reports plus JSON.

## Pipeline Stages

1. **Extract** — Parse CSV with headers into records
2. **Transform** — Compute revenue, assign tier via pattern matching
3. **Filter** — Keep only records with revenue > $100
4. **Aggregate** — Group by region and product, compute summaries
5. **Load** — Print formatted tables and output JSON

## Arc Features Used

- `use std/csv: parse_csv_headers` — CSV parsing
- `use std/json: pretty` — JSON output
- `use std/collections: group_by, sort_by, max_by, frequencies` — Data processing
- `match` with guards — Tier classification
- `|>` pipelines — Chained data transformations
- String interpolation — Report formatting
- Implicit returns — Clean function bodies

## Token Comparison: Arc vs JavaScript

| Metric | Arc (`main.arc`) | JS (`equivalent.js`) |
|--------|-----------------|---------------------|
| Lines (code only) | ~95 | ~115 |
| Approximate tokens | ~280 | ~520 |
| **Token savings** | **~46%** | — |

Key savings come from:
- `match` vs `if/else if/else` chains
- `|>` pipelines vs nested method chains
- `use` vs `import` + destructuring
- Implicit returns vs explicit `return`
- No semicolons, no `const`/`let` ambiguity
- `fn` vs `function`

## How to Run

```bash
arc run showcase/data-pipeline/main.arc
```
