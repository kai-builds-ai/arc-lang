# Data types and constructors

pub fn make_article(raw, source_name) => {
  title: raw.title,
  source: source_name,
  url: raw.url,
  summary: raw.description,
  published: raw.date,
  category: raw.category
}
