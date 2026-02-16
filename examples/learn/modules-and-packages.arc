# Learn Arc: Modules & Packages
# Extracted from Tutorial 5 — use/pub, stdlib, module patterns

# --- Importing ---
use std/math
use std/strings
use std/http: get, post       # selective import
use std/math: PI, sqrt, pow   # use without prefix
use std/collections: *         # wildcard (use sparingly)

# --- Exporting ---
pub fn greet(name) => "Hello, {name}!"
pub let VERSION = "1.0.0"
pub type Config = {host: String, port: Int}
fn internal_helper(x) => x * 2    # private

# --- Stdlib Examples ---

# math
math.abs(-42)          # 42
math.pow(2, 10)        # 1024
math.sqrt(144)         # 12
math.clamp(15, 0, 10)  # 10

# strings
strings.pad_left("42", 5, "0")        # "00042"
strings.capitalize("hello world")      # "Hello world"
strings.words("  hello   world  ")     # ["hello", "world"]

# collections
collections.unique([1, 2, 2, 3, 3])     # [1, 2, 3]
collections.chunk([1, 2, 3, 4, 5], 2)   # [[1, 2], [3, 4], [5]]
collections.flatten([[1, 2], [3], [4]])  # [1, 2, 3, 4]

# json
use std/json
let obj = {name: "Arc", version: 1}
let s = json.to_json(obj)
let parsed = json.from_json(s)

# io
use std/io
let content = io.read_lines("data.txt")
io.write_lines("output.txt", lines)
io.exists("config.json")

# csv
use std/csv
let records = csv.parse_csv_headers("name,age\nAlice,30\nBob,25")
# [{name: "Alice", age: "30"}, {name: "Bob", age: "25"}]

# test
use std/test
test.describe("Math tests", () => {
  test.it("adds numbers", () => test.expect_eq(1 + 1, 2, "addition"))
})

# --- Module Design Patterns ---

# Utility module
pub fn slugify(text) {
  text |> lower |> split(" ") |> join("-")
}

pub fn truncate(text, max_len) {
  if len(text) <= max_len { text }
  el { slice(text, 0, max_len) ++ "..." }
}

# Formatting helpers
pub fn currency(amount) => "${amount}"
pub fn percent(value) => "{value}%"
pub fn pluralize(count, word) {
  if count == 1 { "{count} {word}" }
  el { "{count} {word}s" }
}

# Validators
pub fn is_email(s) => contains(s, "@") and contains(s, ".")
pub fn is_positive(n) => n > 0
pub fn is_non_empty(s) => len(trim(s)) > 0
