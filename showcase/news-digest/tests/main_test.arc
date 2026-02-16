# Tests for news-digest

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
