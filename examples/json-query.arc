// =============================================================================
// json-query.arc — A jq-like JSON Query Language
// =============================================================================
// Demonstrates: fn, let, mut, match, |>, =>, pub, import, string interpolation,
// closures, higher-order functions, collections, regex, pattern matching
// =============================================================================

import json
import regex
import collections

// --- Token types for query parsing ---
pub enum TokenType {
  Dot,
  BracketOpen,
  BracketClose,
  Identifier(str),
  Number(int),
  Pipe,
  Filter,
  Map,
  Select,
  Wildcard,
  Colon,
  String(str),
}

// --- Tokenizer: breaks query string into tokens ---
pub fn tokenize(query: str) -> list {
  let mut tokens = []
  let mut i = 0
  let chars = query |> str::to_chars()

  while i < chars |> len() {
    let ch = chars[i]
    match ch {
      '.' => {
        tokens = tokens |> append(TokenType::Dot)
        i = i + 1
      }
      '[' => {
        tokens = tokens |> append(TokenType::BracketOpen)
        i = i + 1
      }
      ']' => {
        tokens = tokens |> append(TokenType::BracketClose)
        i = i + 1
      }
      '|' => {
        tokens = tokens |> append(TokenType::Pipe)
        i = i + 1
      }
      '*' => {
        tokens = tokens |> append(TokenType::Wildcard)
        i = i + 1
      }
      ':' => {
        tokens = tokens |> append(TokenType::Colon)
        i = i + 1
      }
      ' ' => { i = i + 1 }
      _ => {
        // Parse identifiers or numbers
        let is_digit = regex::matches(str::from_char(ch), "^[0-9]$")
        let is_alpha = regex::matches(str::from_char(ch), "^[a-zA-Z_]$")

        if is_digit {
          let mut num_str = ""
          while i < len(chars) && regex::matches(str::from_char(chars[i]), "^[0-9]$") {
            num_str = "{num_str}{chars[i]}"
            i = i + 1
          }
          tokens = tokens |> append(TokenType::Number(int::parse(num_str)))
        } else if is_alpha {
          let mut ident = ""
          while i < len(chars) && regex::matches(str::from_char(chars[i]), "^[a-zA-Z_0-9]$") {
            ident = "{ident}{chars[i]}"
            i = i + 1
          }
          match ident {
            "select" => tokens = tokens |> append(TokenType::Select)
            "map" => tokens = tokens |> append(TokenType::Map)
            "filter" => tokens = tokens |> append(TokenType::Filter)
            _ => tokens = tokens |> append(TokenType::Identifier(ident))
          }
        } else {
          i = i + 1
        }
      }
    }
  }
  tokens
}

// --- AST nodes for parsed queries ---
pub enum QueryExpr {
  Root,
  Field(str),
  Index(int),
  WildcardAccess,
  Pipe(QueryExpr, QueryExpr),
  FilterExpr(fn),
  MapExpr(fn),
  SelectExpr(str, str),
  Slice(int, int),
  Identity,
}

// --- Parse tokens into a query expression tree ---
pub fn parse(tokens: list) -> QueryExpr {
  let mut expr = QueryExpr::Root
  let mut i = 0

  while i < tokens |> len() {
    let token = tokens[i]
    let next_expr = match token {
      TokenType::Dot => {
        i = i + 1
        if i < len(tokens) {
          match tokens[i] {
            TokenType::Identifier(name) => QueryExpr::Field(name)
            TokenType::Wildcard => QueryExpr::WildcardAccess
            _ => QueryExpr::Identity
          }
        } else {
          QueryExpr::Identity
        }
      }
      TokenType::BracketOpen => {
        i = i + 1
        let inner = match tokens[i] {
          TokenType::Number(n) => {
            // Check for slice notation
            if i + 1 < len(tokens) && tokens[i + 1] == TokenType::Colon {
              i = i + 2
              let end = match tokens[i] {
                TokenType::Number(m) => m
                _ => -1
              }
              QueryExpr::Slice(n, end)
            } else {
              QueryExpr::Index(n)
            }
          }
          TokenType::Wildcard => QueryExpr::WildcardAccess
          _ => QueryExpr::Identity
        }
        i = i + 1 // skip closing bracket
        inner
      }
      TokenType::Pipe => {
        i = i + 1
        let right = parse(tokens |> collections::slice(i, len(tokens)))
        i = len(tokens) // consume rest
        QueryExpr::Pipe(expr, right)
      }
      _ => QueryExpr::Identity
    }

    expr = if expr == QueryExpr::Root {
      next_expr
    } else {
      match next_expr {
        QueryExpr::Identity => expr
        _ => QueryExpr::Pipe(expr, next_expr)
      }
    }
    i = i + 1
  }
  expr
}

// --- Execute a query expression against JSON data ---
pub fn execute(data: any, expr: QueryExpr) -> any {
  match expr {
    QueryExpr::Root => data
    QueryExpr::Identity => data
    QueryExpr::Field(name) => {
      match data {
        map => data[name]
        _ => null
      }
    }
    QueryExpr::Index(i) => {
      match data {
        list => data[i]
        _ => null
      }
    }
    QueryExpr::WildcardAccess => {
      match data {
        list => data
        map => data |> map::values()
        _ => [data]
      }
    }
    QueryExpr::Slice(start, end) => {
      let actual_end = if end == -1 { len(data) } else { end }
      data |> collections::slice(start, actual_end)
    }
    QueryExpr::Pipe(left, right) => {
      let intermediate = execute(data, left)
      execute(intermediate, right)
    }
    QueryExpr::FilterExpr(predicate) => {
      data |> filter(predicate)
    }
    QueryExpr::MapExpr(transform) => {
      data |> map(transform)
    }
    QueryExpr::SelectExpr(key, value) => {
      data |> filter(fn(item) => item[key] == value)
    }
  }
}

// --- High-level query function ---
pub fn query(json_str: str, query_str: str) -> any {
  let data = json::parse(json_str)
  let tokens = tokenize(query_str)
  let expr = parse(tokens)
  execute(data, expr)
}

// --- Built-in transformation functions ---
pub fn jq_length(data: any) -> int {
  match data {
    list => data |> len()
    map => data |> map::keys() |> len()
    str => data |> str::len()
    _ => 0
  }
}

pub fn jq_keys(data: any) -> list {
  match data {
    map => data |> map::keys() |> collections::sort()
    list => range(0, len(data)) |> to_list()
    _ => []
  }
}

pub fn jq_values(data: any) -> list {
  match data {
    map => data |> map::values()
    list => data
    _ => [data]
  }
}

pub fn jq_flatten(data: list) -> list {
  data |> reduce([], fn(acc, item) => {
    match item {
      list => acc |> concat(item)
      _ => acc |> append(item)
    }
  })
}

pub fn jq_unique(data: list) -> list {
  data |> collections::unique()
}

pub fn jq_group_by(data: list, key: str) -> map {
  data |> reduce({}, fn(groups, item) => {
    let k = item[key] |> to_string()
    let existing = groups[k] ?? []
    groups |> map::set(k, existing |> append(item))
  })
}

pub fn jq_sort_by(data: list, key: str) -> list {
  data |> collections::sort_by(fn(a, b) => {
    if a[key] < b[key] { -1 }
    else if a[key] > b[key] { 1 }
    else { 0 }
  })
}

// --- Pretty printer for query results ---
pub fn pretty_print(data: any, indent: int) -> str {
  let spaces = " " |> str::repeat(indent)
  match data {
    null => "null"
    bool => if data { "true" } else { "false" }
    int => "{data}"
    float => "{data}"
    str => "\"{data}\""
    list => {
      let items = data |> map(fn(item) => "{spaces}  {pretty_print(item, indent + 2)}")
      "[\n{items |> str::join(",\n")}\n{spaces}]"
    }
    map => {
      let entries = data |> map::entries() |> map(fn(entry) => {
        "{spaces}  \"{entry.key}\": {pretty_print(entry.value, indent + 2)}"
      })
      "{\n{entries |> str::join(",\n")}\n{spaces}}"
    }
    _ => "{data}"
  }
}

// --- Demo ---
fn main() {
  let sample_json = json::stringify({
    "users": [
      { "name": "Alice", "age": 30, "role": "admin" },
      { "name": "Bob", "age": 25, "role": "user" },
      { "name": "Charlie", "age": 35, "role": "admin" },
      { "name": "Diana", "age": 28, "role": "user" },
    ],
    "metadata": { "total": 4, "version": "1.0" }
  })

  // Query: get all user names
  let names = query(sample_json, ".users[*].name")
  print("All names: {pretty_print(names, 0)}")

  // Query: get first user
  let first = query(sample_json, ".users[0]")
  print("First user: {pretty_print(first, 0)}")

  // Query: get metadata version
  let ver = query(sample_json, ".metadata.version")
  print("Version: {ver}")

  // Programmatic operations
  let data = json::parse(sample_json)
  let admins = data["users"]
    |> filter(fn(u) => u["role"] == "admin")
    |> map(fn(u) => u["name"])
  print("Admins: {admins}")

  let grouped = data["users"] |> jq_group_by("role")
  print("Grouped by role: {jq_keys(grouped)}")

  let sorted = data["users"] |> jq_sort_by("age")
  print("Sorted by age: {sorted |> map(fn(u) => "{u["name"]}({u["age"]})") |> str::join(", ")}")
}
