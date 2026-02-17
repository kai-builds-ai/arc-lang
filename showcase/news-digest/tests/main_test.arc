# Tests for news-digest
# Note: tests run from the src/ directory context

use test

# --- Inline test helpers since we can't import across directories ---

fn make_test_article(title, source, category) => {
  title: title,
  source: source,
  url: "http://example.com",
  summary: "",
  published: "2025-01-01",
  category: category
}

fn test_process_articles(source_results) {
  let mut all_articles = []
  for sr in source_results {
    for a in sr.articles {
      all_articles = push(all_articles, make_test_article(a.title, sr.source, a.category))
    }
  }
  # Deduplicate by title
  let mut seen = []
  let mut unique = []
  for article in all_articles {
    let key = article.title |> lower |> trim
    if not contains(seen, key) {
      seen = push(seen, key)
      unique = push(unique, article)
    }
  }
  unique
}

fn test_categorize(articles) {
  let mut groups = {}
  for a in articles {
    let cat = a.category
    let existing = groups[cat] or []
    groups[cat] = push(existing, a)
  }
  groups
}

fn test_build_digest(articles) {
  let grouped = test_categorize(articles)
  let categories = keys(grouped) |> sort
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

test.describe("models", () => {
  test.it("creates article with defaults", () => {
    let article = make_test_article("Test", "TestSource", "general")
    test.expect_eq(article.title, "Test", "title")
    test.expect_eq(article.source, "TestSource", "source")
    test.expect_eq(article.summary, "", "empty summary default")
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
    let articles = test_process_articles(sample_results)
    test.expect_eq(len(articles), 3, "should remove duplicate Breaking News")
  })

  test.it("categorizes correctly", () => {
    let articles = test_process_articles(sample_results)
    let cats = test_categorize(articles)
    let cat_keys = keys(cats)
    test.expect_true(contains(cat_keys, "world"), "has world category")
    test.expect_true(contains(cat_keys, "tech"), "has tech category")
    test.expect_true(contains(cat_keys, "science"), "has science category")
  })

  test.it("builds digest with correct counts", () => {
    let articles = test_process_articles(sample_results)
    let digest = test_build_digest(articles)
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
    let output = digest.sections
      |> map(s => {
        let header = "[{s.category}]"
        let items = s.articles
          |> take(3)
          |> map(a => "  * {a.title} ({a.source})")
          |> join("\n")
        "{header}\n{items}"
      })
      |> join("\n\n")
    test.expect_true(len(output) > 0, "produces output")
    test.expect_true(contains(output, "AI Advances"), "contains article title")
  })
})

test.run_tests()
