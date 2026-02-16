# arc-template — String template engine for Arc
# Variable substitution, conditionals, loops, filters, escaping

# Template delimiter strings
let OPEN_VAR = "\{\{"
let CLOSE_VAR = "}}"
let OPEN_ESC = "\{\{!"
let OPEN_BLOCK = "\{\{%"
let OPEN_COMMENT = "\{\{#"
let CLOSE_COMMENT = "#}}"
let BLOCK_IF = "\{\{% if "
let BLOCK_END = "\{\{% end }}"
let BLOCK_ELSE = "\{\{% el }}"
let BLOCK_FOR = "\{\{% for "

# --- Built-in Filters ---

let mut _filters = {
  upper: v => upper(v),
  lower: v => lower(v),
  trim_filter: v => trim(v),
  capitalize: v => upper(slice(v, 0, 1)) ++ slice(v, 1, len(v)),
  reverse: v => reverse(v),
  length: v => str(len(v)),
  json: v => json_encode(v)
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

pub fn render(tpl, data) {
  tpl
    |> strip_comments
    |> process_conditionals(data)
    |> process_loops(data)
    |> process_variables(data)
}

fn strip_comments(tpl) {
  let mut result = tpl
  let mut start = index_of(result, OPEN_COMMENT)
  do {
    if start == -1 { ret result }
    let end = index_of(result, CLOSE_COMMENT, start)
    if end == -1 { ret result }
    result = slice(result, 0, start) ++ slice(result, end + 3, len(result))
    start = index_of(result, OPEN_COMMENT)
  } until start == -1
  result
}

fn process_conditionals(tpl, data) {
  let mut result = tpl
  let mut start = index_of(result, BLOCK_IF)

  do {
    if start == -1 { ret result }
    let cond_end = index_of(result, CLOSE_VAR, start)
    let condition = slice(result, start + 7, cond_end) |> trim

    let end_tag = index_of(result, BLOCK_END, start)
    let else_tag = index_of(result, BLOCK_ELSE, start)

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

    start = index_of(result, BLOCK_IF)
  } until start == -1
  result
}

fn process_loops(tpl, data) {
  let mut result = tpl
  let mut start = index_of(result, BLOCK_FOR)

  do {
    if start == -1 { ret result }
    let tag_end = index_of(result, CLOSE_VAR, start)
    let loop_expr = slice(result, start + 8, tag_end) |> trim

    let parts = split(loop_expr, " in ")
    let item_name = parts[0] |> trim
    let list_name = parts[1] |> trim

    let end_tag = index_of(result, BLOCK_END, start)
    let body = slice(result, tag_end + 2, end_tag)

    let list = resolve_value(list_name, data)
    let items = if list != nil { list } el { [] }
    let rendered = items |> map(item => {
      let mut item_data = {}
      let data_keys = keys(data)
      for k in data_keys { item_data[k] = data[k] }
      item_data[item_name] = item
      body |> process_variables(item_data)
    }) |> join("")

    result = slice(result, 0, start) ++ rendered ++ slice(result, end_tag + 10, len(result))
    start = index_of(result, BLOCK_FOR)
  } until start == -1
  result
}

fn process_variables(tpl, data) {
  let mut result = tpl

  # Process escaped {{! var }}
  let mut start = index_of(result, OPEN_ESC)
  do {
    if start == -1 { ret result }
    let end = index_of(result, CLOSE_VAR, start)
    let expr = slice(result, start + 3, end) |> trim
    let value = resolve_value(expr, data)
    let escaped = escape_html(str(if value != nil { value } el { "" }))
    result = slice(result, 0, start) ++ escaped ++ slice(result, end + 2, len(result))
    start = index_of(result, OPEN_ESC)
  } until start == -1

  # Process {{ var }} and {{ var | filter }}
  start = index_of(result, OPEN_VAR)
  do {
    if start == -1 { ret result }
    # Skip if it's a block tag
    if slice(result, start, start + 3) == OPEN_BLOCK {
      start = index_of(result, OPEN_VAR, start + 2)
    } el {
      let end = index_of(result, CLOSE_VAR, start)
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

      result = slice(result, 0, start) ++ str(if value != nil { value } el { "" }) ++ slice(result, end + 2, len(result))
      start = index_of(result, OPEN_VAR)
    }
  } until start == -1

  result
}

fn resolve_value(path, data) {
  let parts = split(path, ".")
  let mut current = data
  for p in parts {
    if current == nil { ret nil }
    current = current[p]
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
  {_template: t._template, _data: d}
}

pub fn set_all(t, data) {
  let mut d = {}
  let t_keys = keys(t._data)
  for k in t_keys { d[k] = t._data[k] }
  let data_keys = keys(data)
  for k in data_keys { d[k] = data[k] }
  {_template: t._template, _data: d}
}

pub fn to_string(t) => render(t._template, t._data)

pub fn render_string(tpl, data) => render(tpl, data)

pub fn from_file(path) {
  let content = read_file(path)
  template(content)
}
