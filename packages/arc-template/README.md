# arc-template

String template engine for Arc with variable substitution, conditionals, loops, filters, and HTML escaping.

## Install

```toml
[dependencies]
arc-template = "0.1.0"
```

## Quick Start

```arc
use arc-template: render

let html = render("Hello, {{ name }}! You have {{ count }} messages.", {
  name: "Alice",
  count: 5
})
# => "Hello, Alice! You have 5 messages."
```

## Template Syntax

### Variables

```
{{ variable }}
{{ user.name }}          — dot notation
{{ name | upper }}       — with filter
{{! user_input }}        — HTML escaped
{{# This is a comment #}} — stripped from output
```

### Conditionals

```
{{% if logged_in }}
  Welcome back, {{ name }}!
{{% el }}
  Please log in.
{{% end }}
```

### Loops

```
{{% for item in items }}
  <li>{{ item.name }} - {{ item.price }}</li>
{{% end }}
```

## Filters

| Filter | Description |
|--------|-------------|
| `upper` | Uppercase |
| `lower` | Lowercase |
| `trim` | Strip whitespace |
| `capitalize` | Capitalize first letter |
| `reverse` | Reverse string |
| `length` | String/list length |
| `json` | JSON encode |

### Custom Filters

```arc
use arc-template: register_filter, render

register_filter("currency", fn(v) => "${v}.00")
render("Price: {{ price | currency }}", {price: "29"})
# => "Price: $29.00"
```

## Template Builder

Fluent API with pipelines:

```arc
use arc-template: template, set, set_all, to_string

let email = template("Dear {{ name }},\n\n{{ body }}\n\nBest,\n{{ sender }}")
  |> set("name", "Alice")
  |> set("sender", "Bob")
  |> set("body", "Thanks for using Arc!")
  |> to_string
```

## API Reference

| Function | Description |
|----------|-------------|
| `render(tpl, data)` | Render template with data |
| `escape_html(s)` | Escape HTML entities |
| `register_filter(name, fn)` | Add custom filter |
| `template(tpl)` | Create template builder |
| `set(t, key, value)` | Set template variable |
| `set_all(t, data)` | Set multiple variables |
| `to_string(t)` | Render template builder |

## Token Comparison

**Arc (arc-template):**
```arc
let html = template("Hello {{ name | upper }}!")
  |> set("name", user.name)
  |> to_string
```
~20 tokens

**JavaScript (Handlebars):**
```javascript
const Handlebars = require('handlebars');
Handlebars.registerHelper('upper', s => s.toUpperCase());
const template = Handlebars.compile('Hello {{upper name}}!');
const html = template({ name: user.name });
```
~40 tokens

**Savings: ~50%**
