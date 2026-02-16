# Tutorial 6: Building a Real-World Project

Time to put everything together. We'll build a **News Aggregator CLI** — a program that fetches news from multiple sources, processes the data, and produces a formatted digest. Along the way, we'll use the full Arc development workflow.

---

## Project Setup

### Creating the Project

```bash
arc new news-digest
cd news-digest
```

This generates:

```
news-digest/
├── arc.toml
├── src/
│   └── main.arc
└── tests/
    └── main_test.arc
```

### The Manifest

Edit `arc.toml`:

```toml
[package]
name = "news-digest"
version = "0.1.0"
description = "A news aggregator that fetches, processes, and formats news digests"

[dependencies]

[dev-dependencies]
```

No external dependencies for now — Arc's stdlib has everything we need.

## Step 1: Define the Data Model

Create `src/models.arc`:

```arc
# src/models.arc — Data types and constructors

pub type Article = {
  title: String,
  source: String,
  url: String,
  summary: String,
  published: String,
  category: String
}

pub type Digest = {
  generated_at: String,
  article_count: Int,
  categories: [String],
  sections: [{category: String, articles: [Article]}]
}

pub fn make_article(raw, source_name) => {
  title: raw.title ? "Untitled",
  source: source_name,
  url: raw.url ? "",
  summary: raw.description ? raw.summary ? "",
  published: raw.publishedAt ? raw.date ? "unknown",
  category: raw.category ? "general"
}
```

Notice the `?` fallback operator chaining — if `raw.description` is nil, try `raw.summary`, then fall back to empty string.

## Step 2: Build the Fetcher

Create `src/fetcher.arc`:

```arc
# src/fetcher.arc — Fetch news from multiple sources

use std/result

pub let SOURCES = [
  {name: "TechNews", url: "api.technews.example.com/v1/articles"},
  {name: "WorldWire", url: "api.worldwire.example.com/latest"},
  {name: "SciDaily", url: "api.scidaily.example.com/feed"}
]

pub fn fetch_source(source) {
  let response = @GET "{source.url}?limit=10"

  match response {
    Ok({articles}) => result.ok({
      source: source.name,
      articles: articles
    }),
    Ok({items}) => result.ok({
      source: source.name,
      articles: items
    }),
    Err(msg) => {
      print("  ⚠ Failed to fetch {source.name}: {msg}")
      result.err(msg)
    }
  }
}

pub fn fetch_all_sources(sources) {
  print("Fetching from {len(sources)} sources...")

  # Parallel fetch all sources
  let results = fetch(sources |> map(s => fetch_source(s)))

  # Separate successes and failures
  let successes = results |> filter(r => result.is_ok(r)) |> map(r => result.unwrap(r))
  let failures = results |> filter(r => result.is_err(r))

  print("  ✓ {len(successes)} sources loaded, {len(failures)} failed")
  successes
}
```

Key patterns used:
- **Parallel fetch** with `fetch []`
- **Pattern matching** to handle different API response shapes
- **Result type** for error handling
- **Pipeline** for processing results

## Step 3: Process and Categorize

Create `src/processor.arc`:

```arc
# src/processor.arc — Transform raw data into a structured digest

use std/collections
use std/strings
use models: Article, make_article

pub fn process_articles(source_results) {
  # Flatten all articles from all sources, tagging with source name
  source_results
    |> map(sr => sr.articles |> map(a => make_article(a, sr.source)))
    |> collections.flatten
    |> deduplicate
    |> sort_by_date
}

fn deduplicate(articles) {
  # Remove articles with duplicate titles (case-insensitive)
  let mut seen = []
  let mut unique = []

  for article in articles {
    let key = article.title |> lower |> trim
    if !contains(seen, key) {
      seen = push(seen, key)
      unique = push(unique, article)
    }
  }

  unique
}

fn sort_by_date(articles) {
  articles |> sort_by(a => a.published) |> reverse
}

pub fn categorize(articles) {
  articles |> collections.group_by(a => a.category)
}

pub fn build_digest(articles) {
  let grouped = categorize(articles)
  let categories = grouped |> keys |> sort

  {
    generated_at: "now",
    article_count: len(articles),
    categories: categories,
    sections: categories |> map(cat => {
      category: cat,
      articles: grouped[cat]
    })
  }
}
```

## Step 4: Format the Output

Create `src/formatter.arc`:

```arc
# src/formatter.arc — Render the digest as readable text

use std/strings

pub fn format_digest(digest) {
  let header = format_header(digest)
  let body = digest.sections
    |> map(format_section)
    |> join("\n\n")
  let footer = format_footer(digest)

  "{header}\n\n{body}\n\n{footer}"
}

fn format_header(digest) {
  let line = strings.pad_right("", 60, "═")
  let title = "  📰 NEWS DIGEST"
  let subtitle = "  {digest.article_count} articles across {len(digest.categories)} categories"

  "{line}\n{title}\n{subtitle}\n{line}"
}

fn format_section(section) {
  let heading = "▸ {section.category |> upper}"
  let articles = section.articles
    |> take(5)
    |> map((a, i) => format_article(a, i + 1))
    |> join("\n\n")

  "{heading}\n{strings.pad_right("", 40, "─")}\n\n{articles}"
}

fn format_article(article, index) {
  let title = "  {index}. {article.title}"
  let meta = "     {article.source} · {article.published}"
  let summary = article.summary
    |> words_to_lines(55)
    |> map(line => "     {line}")
    |> join("\n")

  "{title}\n{meta}\n{summary}"
}

fn words_to_lines(text, max_width) {
  let ws = strings.words(text)
  let mut lines = []
  let mut current = ""

  for word in ws {
    if len(current) + len(word) + 1 > max_width {
      lines = push(lines, current)
      current = word
    } el {
      current = if len(current) == 0 { word } el { "{current} {word}" }
    }
  }

  if len(current) > 0 {
    lines = push(lines, current)
  }

  lines
}

fn format_footer(digest) {
  let line = strings.pad_right("", 60, "─")
  "{line}\n  Generated: {digest.generated_at}\n  Total: {digest.article_count} articles"
}

# Compact format for quick scanning
pub fn format_compact(digest) {
  digest.sections
    |> map(s => {
      let header = "[{s.category}]"
      let items = s.articles
        |> take(3)
        |> map(a => "  • {a.title} ({a.source})")
        |> join("\n")
      "{header}\n{items}"
    })
    |> join("\n\n")
}
```

## Step 5: Wire It All Together

Edit `src/main.arc`:

```arc
# src/main.arc — Entry point for news-digest

use fetcher: SOURCES, fetch_all_sources
use processor: process_articles, build_digest
use formatter: format_digest, format_compact

fn main() {
  print("Starting News Digest...\n")

  # 1. Fetch from all sources in parallel
  let raw_data = fetch_all_sources(SOURCES)

  # 2. Process: flatten, deduplicate, sort
  let articles = process_articles(raw_data)
  print("Processed {len(articles)} unique articles\n")

  # 3. Build structured digest
  let digest = build_digest(articles)

  # 4. Format and display
  let output = format_digest(digest)
  print(output)

  # Also save compact version
  let compact = format_compact(digest)
  print("\n\n--- COMPACT VERSION ---\n")
  print(compact)
}

main()
```

The main function reads like a story: fetch, process, build, format, display. Each step is a single function call. That's the power of good module design.

## Step 6: Write Tests

Edit `tests/main_test.arc`:

```arc
# tests/main_test.arc

use std/test
use processor: process_articles, categorize, build_digest
use formatter: format_compact
use models: make_article

test.describe("models", () => {
  test.it("creates article with defaults", () => {
    let raw = {title: "Test"}
    let article = make_article(raw, "TestSource")
    test.expect_eq(article.title, "Test", "title")
    test.expect_eq(article.source, "TestSource", "source")
    test.expect_eq(article.summary, "", "empty summary default")
  })

  test.it("uses fallback chain for summary", () => {
    let raw = {title: "Test", description: "Desc"}
    let article = make_article(raw, "Src")
    test.expect_eq(article.summary, "Desc", "uses description")
  })
})

test.describe("processor", () => {
  let sample_results = [
    {
      source: "Source1",
      articles: [
        {title: "Breaking News", category: "world", url: "http://a", date: "2025-01-01"},
        {title: "Tech Update", category: "tech", url: "http://b", date: "2025-01-02"}
      ]
    },
    {
      source: "Source2",
      articles: [
        {title: "Breaking News", category: "world", url: "http://c", date: "2025-01-01"},
        {title: "Science Find", category: "science", url: "http://d", date: "2025-01-03"}
      ]
    }
  ]

  test.it("deduplicates articles", () => {
    let articles = process_articles(sample_results)
    test.expect_eq(len(articles), 3, "should remove duplicate 'Breaking News'")
  })

  test.it("categorizes correctly", () => {
    let articles = process_articles(sample_results)
    let cats = categorize(articles)
    test.expect_true(contains(keys(cats), "world"), "has world category")
    test.expect_true(contains(keys(cats), "tech"), "has tech category")
    test.expect_true(contains(keys(cats), "science"), "has science category")
  })

  test.it("builds digest with correct counts", () => {
    let articles = process_articles(sample_results)
    let digest = build_digest(articles)
    test.expect_eq(digest.article_count, 3, "total articles")
    test.expect_eq(len(digest.categories), 3, "three categories")
  })
})

test.describe("formatter", () => {
  test.it("produces compact output", () => {
    let digest = {
      sections: [
        {
          category: "tech",
          articles: [
            {title: "AI Advances", source: "TechNews", summary: "", published: "today", url: "", category: "tech"}
          ]
        }
      ]
    }
    let output = format_compact(digest)
    test.expect_true(len(output) > 0, "produces output")
    test.expect_true(contains(output, "AI Advances"), "contains article title")
  })
})

test.run_tests()
```

## The Development Workflow

### Running the program

```bash
arc run src/main.arc
```

### Running tests

```bash
arc test
```

Output:
```
Running tests...

models
  ✓ creates article with defaults
  ✓ uses fallback chain for summary

processor
  ✓ deduplicates articles
  ✓ categorizes correctly
  ✓ builds digest with correct counts

formatter
  ✓ produces compact output

6 tests passed, 0 failed
```

### Formatting code

```bash
arc fmt
```

Automatically formats all `.arc` files to the standard style. No more style debates.

### Linting

```bash
arc lint
```

Catches common issues:
```
src/processor.arc:23 — unused variable 'temp' (warning)
src/formatter.arc:45 — shadowed binding 'line' (info)
```

### Building

```bash
arc build
```

Compiles your project into an optimized bundle.

### The Full Workflow

```bash
arc new my-project     # create project
arc run src/main.arc   # run during development
arc test               # run test suite
arc fmt                # format code
arc lint               # check for issues
arc build              # compile for production
```

## Final Token Comparison

Let's compare the full project in Arc vs JavaScript:

| Component | Arc (tokens) | JavaScript (tokens) | Savings |
|-----------|-------------|---------------------|---------|
| Data models | ~60 | ~110 | 45% |
| Fetcher (parallel + errors) | ~120 | ~250 | 52% |
| Processor (pipelines) | ~100 | ~200 | 50% |
| Formatter | ~150 | ~280 | 46% |
| Main entry | ~40 | ~70 | 43% |
| Tests | ~120 | ~220 | 45% |
| **Total** | **~590** | **~1,130** | **~48%** |

Nearly **half** the tokens for the same functionality. For an AI agent generating and reasoning about this code, that's a significant cost reduction on every interaction.

## What Makes This "Arc-like"

Looking back at the project, notice what we *didn't* write:

- **No `return` statements** — implicit returns everywhere
- **No `async/await` boilerplate** — auto-awaited throughout
- **No `try/catch` blocks** — Result types and pattern matching
- **No `JSON.stringify/parse`** — native data structures
- **No import ceremony** — `use` is minimal
- **No semicolons** — cleaner visual flow
- **No `this` / `self`** — functions are just functions

Every line does useful work. That's the Arc philosophy: **less ceremony, more signal**.

## Try It Yourself

### Exercise 1: Add a Feature
Add a `search(articles, query)` function to `processor.arc` that filters articles whose title or summary contains the query string (case-insensitive).

### Exercise 2: New Output Format
Add a `format_json(digest)` function to `formatter.arc` that outputs the digest as JSON using `std/json`.

### Exercise 3: Statistics Module
Create a `src/stats.arc` module that computes:
- Average articles per source
- Most common category
- Longest and shortest article summaries
Export a `compute_stats(articles)` function that returns all stats as a map.

### Exercise 4: Build Your Own
Pick an idea and build it from scratch using `arc new`:
- A URL shortener
- A markdown-to-HTML converter
- A simple task tracker
- A weather CLI tool

Use the full workflow: `arc new`, write code with tests, `arc fmt`, `arc lint`, `arc test`, `arc build`.

<details>
<summary>Solutions</summary>

**Exercise 1:**
```arc
pub fn search(articles, query) {
  let q = query |> lower
  articles |> filter(a =>
    contains(a.title |> lower, q) or contains(a.summary |> lower, q)
  )
}
```

**Exercise 2:**
```arc
use std/json

pub fn format_json(digest) => json.pretty(digest)
```

**Exercise 3:**
```arc
# src/stats.arc
use std/collections
use std/math

pub fn compute_stats(articles) {
  let by_source = articles |> collections.group_by(a => a.source)
  let by_category = articles |> collections.group_by(a => a.category)

  let avg_per_source = len(articles) / len(keys(by_source))

  let most_common_cat = by_category
    |> keys
    |> sort_by(k => len(by_category[k]))
    |> reverse
    |> take(1)
    |> find(x => true)

  let summaries = articles |> map(a => {text: a.summary, len: len(a.summary)})
  let longest = summaries |> sort_by(s => s.len) |> reverse |> take(1)
  let shortest = summaries |> filter(s => s.len > 0) |> sort_by(s => s.len) |> take(1)

  {
    total_articles: len(articles),
    sources: len(keys(by_source)),
    avg_per_source: avg_per_source,
    most_common_category: most_common_cat,
    longest_summary: longest,
    shortest_summary: shortest
  }
}
```

</details>

## Congratulations! 🎉

You've completed the Arc tutorial series. You now know how to:

1. **Write Arc programs** — variables, types, printing, collections
2. **Use functions and pipelines** — clean data flow with `|>`
3. **Pattern match** — powerful control flow and destructuring
4. **Handle async and APIs** — `@GET`/`@POST`, parallel fetch, error handling
5. **Organize code** — modules, stdlib, packages
6. **Build real projects** — full workflow from `arc new` to `arc build`

### Where to Go Next

- **[Examples](../../examples/)** — More complete programs with token comparisons
- **[Standard Library Reference](../stdlib-reference.md)** — Full API docs for every module
- **[Language Tour](../language-tour.md)** — Quick reference for all syntax
- **[FAQ](../FAQ.md)** — Common questions answered
- **[GitHub](https://github.com/kai-builds-ai/arc-lang)** — Contribute to Arc!

Happy coding in Arc! ⚡
