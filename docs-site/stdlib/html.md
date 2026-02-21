---
title: html
---

# html

HTML parsing and generation utilities.

```arc
use html
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `parse` | `(s: String) -> Node` | Parse HTML string into a node tree |
| `select` | `(node, selector: String) -> [Node]` | Query nodes by CSS selector |
| `text` | `(node) -> String` | Extract text content from a node |
| `attr` | `(node, name: String) -> String \| nil` | Get attribute value |
| `create` | `(tag, attrs, children) -> Node` | Create an HTML node |
| `render` | `(node) -> String` | Render node tree to HTML string |

### Example

```arc
use html

let doc = html.parse("<div class='main'><p>Hello</p></div>")
let paragraphs = html.select(doc, "p")
let content = html.text(paragraphs[0])  # => "Hello"

let node = html.create("a", {href: "/about"}, ["About Us"])
html.render(node)  # => "<a href=\"/about\">About Us</a>"
```
