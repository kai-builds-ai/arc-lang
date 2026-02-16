# Data types and constructors

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
