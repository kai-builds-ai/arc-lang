# ============================================================================
# Template Engine in Arc
# ============================================================================
# A full template engine with variable substitution, conditionals, for loops,
# filters, template inheritance, includes, and HTML escaping.
# Demonstrates: regex, pattern matching, closures, pipelines, recursion,
# string interpolation, collections, higher-order functions.
# ============================================================================

use regex
use collections
use json

# --- Token Types ---

let TK_TEXT       = "TEXT"
let TK_VAR        = "VAR"
let TK_IF         = "IF"
let TK_ELSE       = "el"
let TK_ENDIF      = "ENDIF"
let TK_FOR        = "FOR"
let TK_ENDFOR     = "ENDFOR"
let TK_BLOCK      = "BLOCK"
let TK_ENDBLOCK   = "ENDBLOCK"
let TK_EXTENDS    = "EXTENDS"
let TK_INCLUDE    = "INCLUDE"
let TK_COMMENT    = "COMMENT"

# --- Tokenizer ---

let TAG_PATTERN = regex.compile(r"\{\{(.*?)\}\}|\{%(.*?)%\}|\{#(.*?)#\}")

pub fn tokenize(template) => {
    let mut tokens = []
    let mut remaining = template
    
    loop {
        let m = regex.search(TAG_PATTERN, remaining)
        match m {
            nil => {
                match remaining != "" {
                    true => tokens = tokens |> collections.append({ type: TK_TEXT, value: remaining }),
                    false => {}
                }
                break
            },
            _ => {
                let before = remaining |> collections.slice(0, m.start)
                match before != "" {
                    true => tokens = tokens |> collections.append({ type: TK_TEXT, value: before }),
                    false => {}
                }
                
                let token = match [m[1], m[2], m[3]] {
                    [v, nil, nil] => parse_var_tag(v |> trim()),
                    [nil, s, nil] => parse_statement_tag(s |> trim()),
                    [nil, nil, _] => { type: TK_COMMENT, value: "" }
                }
                
                tokens = tokens |> collections.append(token)
                remaining = remaining |> collections.slice(m.end)
            }
        }
    }
    
    tokens
}

fn parse_var_tag(content) => {
    # Variable with optional filters: {{ name | upper | truncate:20 }}
    let parts = content |> split("|") |> collections.map(fn(p) => p |> trim())
    let var_name = parts[0]
    let filters = parts |> collections.skip(1) |> collections.map(fn(f) => {
        let fp = f |> split(":")
        match collections.length(fp) {
            1 => { name: fp[0] |> trim(), arg: nil },
            _ => { name: fp[0] |> trim(), arg: fp[1] |> trim() }
        }
    })
    { type: TK_VAR, name: var_name, filters: filters }
}

fn parse_statement_tag(content) => {
    let words = content |> split_whitespace()
    match words[0] {
        "if" => { type: TK_IF, condition: words |> collections.skip(1) |> collections.join(" ") },
        "el" => { type: TK_ELSE, value: "" },
        "endif" => { type: TK_ENDIF, value: "" },
        "for" => {
            # {% for item in items %}
            { type: TK_FOR, var_name: words[1], iterable: words[3] }
        },
        "endfor" => { type: TK_ENDFOR, value: "" },
        "block" => { type: TK_BLOCK, name: words[1] },
        "endblock" => { type: TK_ENDBLOCK, value: "" },
        "extends" => { type: TK_EXTENDS, parent: words[1] |> trim_quotes() },
        "include" => { type: TK_INCLUDE, template: words[1] |> trim_quotes() },
        _ => { type: TK_TEXT, value: "" }
    }
}

# --- AST Builder ---

fn build_ast(tokens) => {
    let mut pos = 0
    
    fn parse_nodes(stop_types) => {
        let mut nodes = []
        loop {
            match pos >= collections.length(tokens) {
                true => break,
                false => {
                    let token = tokens[pos]
                    match collections.contains(stop_types, token.type) {
                        true => break,
                        false => {
                            pos = pos + 1
                            let node = match token.type {
                                TK_TEXT => { type: "text", value: token.value },
                                TK_VAR => { type: "var", name: token.name, filters: token.filters },
                                TK_COMMENT => nil,
                                TK_IF => {
                                    let body = parse_nodes([TK_ELSE, TK_ENDIF])
                                    let else_body = match tokens[pos].type {
                                        TK_ELSE => {
                                            pos = pos + 1
                                            parse_nodes([TK_ENDIF])
                                        },
                                        _ => []
                                    }
                                    pos = pos + 1 # skip ENDIF
                                    { type: "if", condition: token.condition, body: body, else_body: else_body }
                                },
                                TK_FOR => {
                                    let body = parse_nodes([TK_ENDFOR])
                                    pos = pos + 1 # skip ENDFOR
                                    { type: "for", var_name: token.var_name, iterable: token.iterable, body: body }
                                },
                                TK_BLOCK => {
                                    let body = parse_nodes([TK_ENDBLOCK])
                                    pos = pos + 1
                                    { type: "block", name: token.name, body: body }
                                },
                                TK_EXTENDS => { type: "extends", parent: token.parent },
                                TK_INCLUDE => { type: "include", template: token.template },
                                _ => nil
                            }
                            match node {
                                nil => {},
                                _ => nodes = nodes |> collections.append(node)
                            }
                        }
                    }
                }
            }
        }
        nodes
    }
    
    parse_nodes([])
}

# --- Filters ---

let FILTERS = {
    "upper": fn(val, _) => val |> uppercase(),
    "lower": fn(val, _) => val |> lowercase(),
    "trim": fn(val, _) => val |> trim(),
    "title": fn(val, _) => val |> split(" ") |> collections.map(fn(w) => {
        match collections.length(w) > 0 {
            true => (w[0] |> uppercase()) + (w |> collections.slice(1) |> lowercase()),
            false => w
        }
    }) |> collections.join(" "),
    "truncate": fn(val, arg) => {
        let max_len = arg |> to_number() or 50
        match collections.length(val) > max_len {
            true => (val |> collections.slice(0, max_len)) + "...",
            false => val
        }
    },
    "escape": fn(val, _) => html_escape(val),
    "default": fn(val, arg) => match val { nil => arg, "" => arg, _ => val },
    "length": fn(val, _) => "${collections.length(val)}",
    "reverse": fn(val, _) => val |> collections.reverse() |> match is_list(val) { true => val, false => collections.join("") },
    "join": fn(val, arg) => val |> collections.join(arg or ", "),
    "first": fn(val, _) => match is_list(val) { true => val[0], false => val[0] },
    "last": fn(val, _) => match is_list(val) { true => val |> collections.last(), false => val |> collections.last() },
    "replace": fn(val, arg) => {
        let parts = arg |> split(",")
        val |> regex.replace_all(parts[0], parts[1] or "")
    },
    "json": fn(val, _) => json.encode(val),
    "nl2br": fn(val, _) => val |> regex.replace_all(r"\n", "<br>"),
    "strip_tags": fn(val, _) => val |> regex.replace_all(r"<[^>]+>", ""),
    "pluralize": fn(val, arg) => {
        let n = val |> to_number()
        match n == 1 { true => "", false => arg or "s" }
    }
}

fn apply_filters(value, filters) => {
    filters |> collections.reduce("${value}", fn(val, filter) => {
        let filter_fn = collections.get(FILTERS, filter.name, nil)
        match filter_fn {
            nil => { print("Unknown filter: ${filter.name}"); val },
            f => f(val, filter.arg)
        }
    })
}

fn html_escape(s) => {
    "${s}"
    |> regex.replace_all(r"&", "&amp;")
    |> regex.replace_all(r"<", "&lt;")
    |> regex.replace_all(r">", "&gt;")
    |> regex.replace_all(r'"', "&quot;")
    |> regex.replace_all(r"'", "&#39;")
}

# --- Variable Resolution ---

fn resolve_var(name, context) => {
    let parts = name |> split(".")
    parts |> collections.reduce(context, fn(obj, part) => {
        match obj {
            nil => nil,
            _ => collections.get(obj, part, nil)
        }
    })
}

# --- Condition Evaluation ---

fn eval_condition(condition, context) => {
    let parts = condition |> split_whitespace()
    match collections.length(parts) {
        1 => {
            let val = resolve_var(parts[0], context)
            truthy(val)
        },
        3 => {
            let left = resolve_value(parts[0], context)
            let op = parts[1]
            let right = resolve_value(parts[2], context)
            match op {
                "==" => left == right,
                "!=" => left != right,
                ">" => left > right,
                "<" => left < right,
                ">=" => left >= right,
                "<=" => left <= right,
                "in" => collections.contains(right, left),
                _ => false
            }
        },
        _ => {
            match parts[0] {
                "not" => !eval_condition(parts |> collections.skip(1) |> collections.join(" "), context),
                _ => false
            }
        }
    }
}

fn resolve_value(token, context) => {
    match token {
        s if s |> starts_with("'") => s |> trim_quotes(),
        s if regex.test(r"^[0-9]+$", s) => s |> to_number(),
        s if s == "true" => true,
        s if s == "false" => false,
        s if s == "nil" => nil,
        _ => resolve_var(token, context)
    }
}

fn truthy(val) => {
    match val {
        nil => false,
        false => false,
        0 => false,
        "" => false,
        [] => false,
        _ => true
    }
}

# --- Renderer ---

pub fn render(ast, context, templates) => {
    let mut output = ""
    
    ast |> collections.each(fn(node) => {
        match node {
            { type: "text", value: v } => {
                output = output + v
            },
            { type: "var", name: n, filters: f } => {
                let val = resolve_var(n, context)
                let result = apply_filters(val, f)
                output = output + result
            },
            { type: "if", condition: c, body: b, else_body: eb } => {
                match eval_condition(c, context) {
                    true => output = output + render(b, context, templates),
                    false => output = output + render(eb, context, templates)
                }
            },
            { type: "for", var_name: vn, iterable: it, body: b } => {
                let items = resolve_var(it, context)
                match items {
                    nil => {},
                    _ => {
                        items |> collections.each_indexed(fn(item, index) => {
                            let loop_ctx = collections.merge(context, {
                                [vn]: item,
                                loop: {
                                    index: index,
                                    first: index == 0,
                                    last: index == collections.length(items) - 1,
                                    length: collections.length(items)
                                }
                            })
                            output = output + render(b, loop_ctx, templates)
                        })
                    }
                }
            },
            { type: "include", template: t } => {
                let tmpl = collections.get(templates, t, nil)
                match tmpl {
                    nil => output = output + "<!-- include '${t}' not found -->",
                    _ => output = output + compile_and_render(tmpl, context, templates)
                }
            },
            { type: "block", name: n, body: b } => {
                output = output + render(b, context, templates)
            },
            _ => {}
        }
    })
    
    output
}

# --- Public API ---

pub fn compile(template_str) => {
    let tokens = tokenize(template_str)
    build_ast(tokens)
}

pub fn compile_and_render(template_str, context, templates) => {
    let ast = compile(template_str)
    render(ast, context, templates or {})
}

# Template registry
pub fn create_env(templates) => {
    { templates: templates or {} }
}

pub fn add_template(env, name, source) => {
    let mut e = env
    e.templates = collections.set(e.templates, name, source)
    e
}

pub fn render_template(env, name, context) => {
    let source = collections.get(env.templates, name, nil)
    match source {
        nil => "Template '${name}' not found",
        _ => compile_and_render(source, context, env.templates)
    }
}

# --- Helper ---

fn trim_quotes(s) => s |> regex.replace(r"^['\"]|['\"]$", "")
fn split_whitespace(s) => regex.find_all(r"\S+", s) |> collections.map(fn(m) => m[0])

# --- Main Demo ---

fn main() => {
    print("=== Arc Template Engine Demo ===\n")
    
    # Simple variable substitution
    let simple = "Hello, {{ name | upper }}! You have {{ count }} messages."
    let result1 = compile_and_render(simple, { name: "alice", count: 5 }, {})
    print("1. ${result1}")
    
    # Conditionals
    let cond_tmpl = "{% if logged_in %}Welcome back, {{ user }}!{% el %}Please log in.{% endif %}"
    print("2. ${compile_and_render(cond_tmpl, { logged_in: true, user: "Bob" }, {})}")
    print("3. ${compile_and_render(cond_tmpl, { logged_in: false }, {})}")
    
    # For loops
    let list_tmpl = "<ul>{% for item in items %}<li>{{ item.name }}: ${{ item.price }}</li>{% endfor %}</ul>"
    let items = [
        { name: "Laptop", price: 999 },
        { name: "Phone", price: 499 },
        { name: "Tablet", price: 299 }
    ]
    print("4. ${compile_and_render(list_tmpl, { items: items }, {})}")
    
    # Filters
    let filter_tmpl = "{{ description | truncate:30 }} | {{ name | title }} | {{ tags | join }}"
    print("5. ${compile_and_render(filter_tmpl, {
        description: "This is a very long description that should be truncated",
        name: "hello world from arc",
        tags: ["fast", "safe", "fun"]
    }, {})}")
    
    # Includes and template registry
    let mut env = create_env({})
    env = env
        |> add_template("header", "<header><h1>{{ site_name }}</h1></header>")
        |> add_template("footer", "<footer>&copy; {{ year }} {{ site_name }}</footer>")
        |> add_template("page", "{% include 'header' %}<main>{{ content }}</main>{% include 'footer' %}")
    
    let page_result = render_template(env, "page", {
        site_name: "Arc Site",
        year: 2025,
        content: "Welcome to our website!"
    })
    print("\n6. Full page:\n${page_result}")
    
    # Nested loops with loop variable
    let table_tmpl = "{% for row in data %}Row {{ loop.index }}: {% for cell in row.cells %}[{{ cell }}]{% endfor %}\n{% endfor %}"
    print("\n7. Table:")
    print(compile_and_render(table_tmpl, {
        data: [
            { cells: ["A1", "B1", "C1"] },
            { cells: ["A2", "B2", "C2"] },
            { cells: ["A3", "B3", "C3"] }
        ]
    }, {}))
    
    # HTML escaping
    let escape_tmpl = "Safe: {{ content | escape }}"
    print("8. ${compile_and_render(escape_tmpl, { content: "<script>alert('xss')</script>" }, {})}")
    
    print("\nDone!")
}

main()
