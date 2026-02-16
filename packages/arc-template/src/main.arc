# arc-template — String template engine for Arc
# Variable substitution, conditionals, loops, filters, escaping
#
# Template syntax:
#   {{ variable }}           — variable substitution
#   {{ variable | filter }}  — apply filter
#   {{% if condition }}...{{% end }}  — conditional
#   {{% for item in list }}...{{% end }}  — loop
#   {{! escaped }}           — HTML escaped output
#   {{# comment #}}          — comment (stripped)

# --- Built-in Filters ---

let mut _filters = {
  upper: fn(v) => upper(v),
  lower: fn(v) => lower(v),
  trim: fn(v) => trim(v),
  capitalize: fn(v) => upper(slice(v, 0, 1)) ++ slice(v, 1, len(v)),
  reverse: fn(v) => reverse(v),
  length: fn(v) => str(len(v)),
  default: fn(v, fallback) => if v == nil or v == "" { fallback } el { v },
  truncate: fn(v, n) => if len(v) > n { slice(v, 0, n) ++ "..." } el { v },
  json: fn(v) => json_encode(v),
  join: fn(v, sep) => join(v, sep)
}

pub fn register_filter(name, f) {
  _filters[name] = f
}

# --- HTML Escaping ---

pub fn escape_html(s) {
  s |> replace("&", "&amp;")
    |> replace("<", "&lt;")
    |> replace(">", "&gt;")
    |> replace("\"", "&quot;")
    |> replace("'", "&#39;")
}

# --- Template Rendering ---

pub fn render(template, data) {
  template
    |> strip_comments
    |> process_conditionals(data)
    |> process_loops(data)
    |> process_variables(data)
}

fn strip_comments(tpl) {
  # Remove {{# ... #}} comments
  let mut result = tpl
  let mut start = index_of(result, "{{#")
  do {
    if start == -1 { break }
    let end = index_of(result, "#}}", start)
    if end == -1 { break }
    result = slice(result, 0, start) ++ slice(result, end + 3, len(result))
    start = index_of(result, "{{#")
  } until start == -1
  result
}

fn process_conditionals(tpl, data) {
  # Process {{% if condition }}...{{% el }}...{{% end }}
  let mut result = tpl
  let mut start = index_of(result, "{{% if ")

  do {
    if start == -1 { break }
    let cond_end = index_of(result, "}}", start)
    let condition = slice(result, start + 7, cond_end) |> trim

    let end_tag = index_of(result, "{{% end }}", start)
    let else_tag = index_of(result, "{{% el }}", start)

    let truthy = resolve_value(condition, data)

    if else_tag != -1 and else_tag < end_tag {
      let true_block = slice(result, cond_end + 2, else_tag)
      let false_block = slice(result, else_tag + 9, end_tag)
      let replacement = if truthy { true_block } el { false_block }
      result = slice(result, 0, start) ++ replacement ++ slice(result, end_tag + 10, len(result))
    } el {
      let block = slice(result, cond_end + 2, end_tag)
      let replacement = if truthy { block } el { "" }
      result = slice(result, 0, start) ++ replacement ++ slice(result, end_tag + 10, len(result))
    }

    start = index_of(result, "{{% if ")
  } until start == -1
  result
}

fn process_loops(tpl, data) {
  # Process {{% for item in list }}...{{% end }}
  let mut result = tpl
  let mut start = index_of(result, "{{% for ")

  do {
    if start == -1 { break }
    let tag_end = index_of(result, "}}", start)
    let loop_expr = slice(result, start + 8, tag_end) |> trim

    # Parse "item in list"
    let parts = split(loop_expr, " in ")
    let item_name = parts[0] |> trim
    let list_name = parts[1] |> trim

    let end_tag = index_of(result, "{{% end }}", start)
    let body = slice(result, tag_end + 2, end_tag)

    let list = resolve_value(list_name, data) or []
    let rendered = list |> map(fn(item) {
      let item_data = {..data}
      item_data[item_name] = item
      body |> process_variables(item_data)
    }) |> join("")

    result = slice(result, 0, start) ++ rendered ++ slice(result, end_tag + 10, len(result))
    start = index_of(result, "{{% for ")
  } until start == -1
  result
}

fn process_variables(tpl, data) {
  let mut result = tpl

  # Process escaped {{! var }}
  let mut start = index_of(result, "{{!")
  do {
    if start == -1 { break }
    let end = index_of(result, "}}", start)
    let expr = slice(result, start + 3, end) |> trim
    let value = resolve_value(expr, data)
    let escaped = escape_html(str(value or ""))
    result = slice(result, 0, start) ++ escaped ++ slice(result, end + 2, len(result))
    start = index_of(result, "{{!")
  } until start == -1

  # Process {{ var }} and {{ var | filter }}
  start = index_of(result, "{{")
  do {
    if start == -1 { break }
    # Skip if it's a block tag
    if slice(result, start, start + 3) == "{{%" {
      start = index_of(result, "{{", start + 2)
    } el {
      let end = index_of(result, "}}", start)
      let expr = slice(result, start + 2, end) |> trim

      let value = if contains(expr, "|") {
        let parts = split(expr, "|")
        let var_name = parts[0] |> trim
        let filter_name = parts[1] |> trim
        let raw = resolve_value(var_name, data)
        apply_filter(filter_name, raw)
      } el {
        resolve_value(expr, data)
      }

      result = slice(result, 0, start) ++ str(value or "") ++ slice(result, end + 2, len(result))
      start = index_of(result, "{{")
    }
  } until start == -1

  result
}

fn resolve_value(path, data) {
  # Handle dot notation: "user.name" => data.user.name
  let parts = split(path, ".")
  let mut current = data
  for p in parts {
    if current == nil { nil }
    el { current = current[p] }
  }
  current
}

fn apply_filter(name, value) {
  let f = _filters[name]
  if f != nil { f(value) } el { value }
}

# --- Template Builder ---

pub fn template(tpl) => {_template: tpl, _data: {}}

pub fn set(t, key, value) {
  let d = t._data
  d[key] = value
  {..t, _data: d}
}

pub fn set_all(t, data) => {..t, _data: {..t._data, ..data}}

pub fn to_string(t) => render(t._template, t._data)

# --- Convenience ---

pub fn render_string(tpl, data) => render(tpl, data)

pub fn from_file(path) {
  let content = read_file(path)
  template(content)
}
