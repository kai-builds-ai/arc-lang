# Transform raw data into a structured digest

use std/collections
use std/strings
use models: Article, make_article

pub fn process_articles(source_results) {
  source_results
    |> map(sr => sr.articles |> map(a => make_article(a, sr.source)))
    |> collections.flatten
    |> deduplicate
    |> sort_by_date
}

fn deduplicate(articles) {
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
