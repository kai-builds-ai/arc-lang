# =============================================================================
# markdown-parser.arc — Markdown to HTML Converter
# =============================================================================
# Demonstrates: fn, let, mut, match, |>, =>, pub, import, regex, closures,
# higher-order functions, string interpolation, pattern matching, collections
# =============================================================================

use regex
use collections

# --- Block types ---
pub enum Block {
  Heading(int, str),
  Paragraph(str),
  CodeBlock(str, str),
  Blockquote(str),
  UnorderedList(list),
  OrderedList(list),
  HorizontalRule,
  BlankLine,
  Image(str, str),
}

# --- Parse markdown into blocks ---
pub fn parse_blocks(markdown: str) -> list {
  let lines = markdown |> str::split("\n")
  let mut blocks = []
  let mut i = 0

  while i < len(lines) {
    let line = lines[i]
    let trimmed = line |> str::trim()

    # Blank line
    if trimmed == "" {
      blocks = blocks |> append(Block::BlankLine)
      i = i + 1
      continue
    }

    # Horizontal rule
    if regex::matches(trimmed, "^(---+|\\*\\*\\*+|___+)$") {
      blocks = blocks |> append(Block::HorizontalRule)
      i = i + 1
      continue
    }

    # Headings (# to ######)
    let heading_match = regex::capture(line, "^(#{1,6})\\s+(.+)$")
    if heading_match != nil {
      let level = heading_match[1] |> str::len()
      let text = heading_match[2]
      blocks = blocks |> append(Block::Heading(level, text))
      i = i + 1
      continue
    }

    # Code block (fenced with ```)
    if regex::matches(trimmed, "^```") {
      let lang = trimmed |> str::slice(3, str::len(trimmed)) |> str::trim()
      let mut code_lines = []
      i = i + 1

      while i < len(lines) && !(lines[i] |> str::trim() |> str::starts_with("```")) {
        code_lines = code_lines |> append(lines[i])
        i = i + 1
      }
      i = i + 1 # skip closing ```

      let code = code_lines |> str::join("\n")
      blocks = blocks |> append(Block::CodeBlock(lang, code))
      continue
    }

    # Blockquote
    if regex::matches(trimmed, "^>\\s*") {
      let mut quote_lines = []
      while i < len(lines) && regex::matches(lines[i] |> str::trim(), "^>") {
        let content = lines[i] |> str::trim()
          |> regex::replace("^>\\s?", "")
        quote_lines = quote_lines |> append(content)
        i = i + 1
      }
      let quote_text = quote_lines |> str::join("\n")
      blocks = blocks |> append(Block::Blockquote(quote_text))
      continue
    }

    # Unordered list
    if regex::matches(trimmed, "^[-\\*\\+]\\s+") {
      let mut items = []
      while i < len(lines) && regex::matches(lines[i] |> str::trim(), "^[-\\*\\+]\\s+") {
        let item = lines[i] |> str::trim()
          |> regex::replace("^[-\\*\\+]\\s+", "")
        items = items |> append(item)
        i = i + 1
      }
      blocks = blocks |> append(Block::UnorderedList(items))
      continue
    }

    # Ordered list
    if regex::matches(trimmed, "^\\d+\\.\\s+") {
      let mut items = []
      while i < len(lines) && regex::matches(lines[i] |> str::trim(), "^\\d+\\.\\s+") {
        let item = lines[i] |> str::trim()
          |> regex::replace("^\\d+\\.\\s+", "")
        items = items |> append(item)
        i = i + 1
      }
      blocks = blocks |> append(Block::OrderedList(items))
      continue
    }

    # Image (standalone)
    let img_match = regex::capture(trimmed, "^!\\[([^\\]]*)\\]\\(([^\\)]+)\\)$")
    if img_match != nil {
      blocks = blocks |> append(Block::Image(img_match[1], img_match[2]))
      i = i + 1
      continue
    }

    # Paragraph (collect consecutive non-special lines)
    let mut para_lines = []
    while i < len(lines) {
      let l = lines[i] |> str::trim()
      if l == "" { break }
      if regex::matches(l, "^(#{1,6}\\s|```|>\\s|[-\\*\\+]\\s|\\d+\\.\\s|---+|\\*\\*\\*+|___+)") { break }
      para_lines = para_lines |> append(l)
      i = i + 1
    }
    let para_text = para_lines |> str::join(" ")
    blocks = blocks |> append(Block::Paragraph(para_text))
  }

  blocks
}

# --- Parse inline elements ---
pub fn parse_inline(text: str) -> str {
  text
    # Code spans (before other formatting)
    |> replace_pattern("`([^`]+)`", fn(m) => "<code>{m[1]}</code>")
    # Images
    |> replace_pattern("!\\[([^\\]]*)\\]\\(([^\\)]+)\\)", fn(m) => {
      "<img src=\"{m[2]}\" alt=\"{m[1]}\" />"
    })
    # Links
    |> replace_pattern("\\[([^\\]]+)\\]\\(([^\\)]+)\\)", fn(m) => {
      "<a href=\"{m[2]}\">{m[1]}</a>"
    })
    # Bold + Italic
    |> replace_pattern("\\*\\*\\*([^\\*]+)\\*\\*\\*", fn(m) => "<strong><em>{m[1]}</em></strong>")
    # Bold
    |> replace_pattern("\\*\\*([^\\*]+)\\*\\*", fn(m) => "<strong>{m[1]}</strong>")
    |> replace_pattern("__([^_]+)__", fn(m) => "<strong>{m[1]}</strong>")
    # Italic
    |> replace_pattern("\\*([^\\*]+)\\*", fn(m) => "<em>{m[1]}</em>")
    |> replace_pattern("_([^_]+)_", fn(m) => "<em>{m[1]}</em>")
    # Strikethrough
    |> replace_pattern("~~([^~]+)~~", fn(m) => "<del>{m[1]}</del>")
    # Line breaks
    |> str::replace("  \n", "<br />\n")
}

fn replace_pattern(text: str, pattern: str, replacer: fn) -> str {
  regex::replace_all(text, pattern, replacer)
}

# --- Escape HTML entities ---
pub fn escape_html(text: str) -> str {
  text
    |> str::replace("&", "&amp;")
    |> str::replace("<", "&lt;")
    |> str::replace(">", "&gt;")
    |> str::replace("\"", "&quot;")
}

# --- Convert a block to HTML ---
pub fn block_to_html(block: Block) -> str {
  match block {
    Block::Heading(level, text) => {
      let inline = parse_inline(text)
      let id = text |> str::to_lower() |> regex::replace("[^a-z0-9]+", "-") |> str::trim_char('-')
      "<h{level} id=\"{id}\">{inline}</h{level}>"
    }
    Block::Paragraph(text) => {
      let inline = parse_inline(text)
      "<p>{inline}</p>"
    }
    Block::CodeBlock(lang, code) => {
      let escaped = escape_html(code)
      let lang_attr = if lang != "" { " class=\"language-{lang}\"" } el { "" }
      "<pre><code{lang_attr}>{escaped}</code></pre>"
    }
    Block::Blockquote(text) => {
      let inner = text
        |> str::split("\n")
        |> map(fn(line) => "<p>{parse_inline(line)}</p>")
        |> str::join("\n")
      "<blockquote>\n{inner}\n</blockquote>"
    }
    Block::UnorderedList(items) => {
      let li_items = items
        |> map(fn(item) => "  <li>{parse_inline(item)}</li>")
        |> str::join("\n")
      "<ul>\n{li_items}\n</ul>"
    }
    Block::OrderedList(items) => {
      let li_items = items
        |> map(fn(item) => "  <li>{parse_inline(item)}</li>")
        |> str::join("\n")
      "<ol>\n{li_items}\n</ol>"
    }
    Block::HorizontalRule => "<hr />"
    Block::BlankLine => ""
    Block::Image(alt, src) => {
      "<figure><img src=\"{src}\" alt=\"{alt}\" /><figcaption>{alt}</figcaption></figure>"
    }
  }
}

# --- Main conversion function ---
pub fn to_html(markdown: str) -> str {
  let blocks = parse_blocks(markdown)
  blocks
    |> map(block_to_html)
    |> filter(fn(html) => html != "")
    |> str::join("\n\n")
}

# --- Full HTML document wrapper ---
pub fn to_html_document(markdown: str, title: str) -> str {
  let body = to_html(markdown)
  "<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>{title}</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; }
    code { background: #f4f4f4; padding: 0.2em 0.4em; border-radius: 3px; }
    pre code { display: block; padding: 1em; overflow-x: auto; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 1em; color: #666; }
    img { max-width: 100%; }
    hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
  </style>
</head>
<body>
{body}
</body>
</html>"
}

# --- Table of contents generator ---
pub fn extract_toc(markdown: str) -> list {
  let blocks = parse_blocks(markdown)
  blocks
    |> filter(fn(block) => match block {
      Block::Heading(_, _) => true
      _ => false
    })
    |> map(fn(block) => match block {
      Block::Heading(level, text) => {
        let id = text |> str::to_lower() |> regex::replace("[^a-z0-9]+", "-") |> str::trim_char('-')
        { "level": level, "text": text, "id": id }
      }
    })
}

pub fn toc_to_html(toc: list) -> str {
  let items = toc |> map(fn(entry) => {
    let indent = "  " |> str::repeat(entry["level"] - 1)
    "{indent}<li><a href=\"#{entry["id"]}\">{entry["text"]}</a></li>"
  })
  "<nav>\n<ul>\n{items |> str::join("\n")}\n</ul>\n</nav>"
}

# --- Demo ---
fn main() {
  let markdown = "# Welcome to Arc

This is a **markdown parser** written in *Arc*. It supports ***bold italic*** text.

## Features

- Headers (h1 through h6)
- **Bold** and *italic* text
- `Inline code` spans
- [Links](https://example.com) and ![images](photo.jpg)
- ~~Strikethrough~~ text

## Code Example

```arc
fn hello(name: str) -> str {
  \"Hello, {name}!\"
}
```

> This is a blockquote
> with multiple lines

### Ordered Lists

1. First item
2. Second item
3. Third item

---

## Conclusion

Thanks for reading! Check out our [docs](https://docs.example.com)."

  print("=== Markdown to HTML ===\n")

  let html = to_html(markdown)
  print(html)

  print("\n=== Table of Contents ===\n")
  let toc = extract_toc(markdown)
  print(toc_to_html(toc))

  print("\n=== Full Document ===\n")
  let doc = to_html_document(markdown, "Arc Markdown Demo")
  print("Document length: {str::len(doc)} characters")
}
