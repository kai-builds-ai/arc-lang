# Render the digest as readable text

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
