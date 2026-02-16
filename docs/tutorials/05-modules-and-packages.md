# Tutorial 5: Modules & Packages

As your programs grow, you need to organize code into logical pieces. Arc's module system is simple: files are modules, `pub` marks exports, `use` brings things in.

---

## The Basics: `use` and `pub`

### Importing with `use`

```arc
use std/math              # import the math module
use std/strings           # import the strings module
use std/http: get, post   # import specific items
```

After importing, access module members with dot notation:

```arc
use std/math

let radius = 5
let area = math.PI * math.pow(radius, 2)
print("Area: {area}")
```

### Selective Imports

Import specific functions to use them without a prefix:

```arc
use std/math: PI, sqrt, pow

let hypotenuse = sqrt(pow(3, 2) + pow(4, 2))    # 5
```

### Wildcard Import

Import everything (use sparingly — it can cause name collisions):

```arc
use std/collections: *

let chunks = chunk([1, 2, 3, 4, 5, 6], 2)    # [[1, 2], [3, 4], [5, 6]]
```

### Exporting with `pub`

Any function, variable, or type can be exported with `pub`:

```arc
# utils.arc

pub fn greet(name) => "Hello, {name}!"
pub let VERSION = "1.0.0"
pub type Config = {host: String, port: Int}

fn internal_helper(x) => x * 2    # NOT exported — private to this file
```

Without `pub`, a definition is private to its file. This is intentional — you explicitly choose your public API.

## The Standard Library

Arc ships with a set of standard modules. Here's how to use the most common ones.

### `std/math`

```arc
use std/math

math.abs(-42)          # 42
math.pow(2, 10)        # 1024
math.sqrt(144)         # 12
math.ceil(4.2)         # 5
math.floor(4.9)        # 4
math.clamp(15, 0, 10)  # 10
math.PI                # 3.141592653589793
```

### `std/strings`

```arc
use std/strings

strings.pad_left("42", 5, "0")        # "00042"
strings.pad_right("hi", 10, ".")       # "hi........"
strings.capitalize("hello world")      # "Hello world"
strings.words("  hello   world  ")     # ["hello", "world"]
```

### `std/collections`

```arc
use std/collections

collections.unique([1, 2, 2, 3, 3])     # [1, 2, 3]
collections.chunk([1, 2, 3, 4, 5], 2)   # [[1, 2], [3, 4], [5]]
collections.flatten([[1, 2], [3], [4]])  # [1, 2, 3, 4]
collections.group_by(users, u => u.role)
collections.sort_by(users, u => u.age)
collections.zip_with([1, 2], [3, 4], (a, b) => a + b)  # [4, 6]
```

### `std/result`

```arc
use std/result

let r = result.ok(42)
let e = result.err("not found")

result.is_ok(r)                        # true
result.unwrap(r)                       # 42
result.unwrap_or(e, 0)                 # 0
result.map(r, x => x * 2)             # Ok(84)
result.try_fn(() => risky_operation()) # Ok(value) or Err(message)
```

### `std/json`

```arc
use std/json

let obj = {name: "Arc", version: 1}
let s = json.to_json(obj)          # '{"name":"Arc","version":1}'
let parsed = json.from_json(s)     # {name: "Arc", version: 1}
let pretty = json.pretty(obj)      # formatted with indentation
```

### `std/io`

```arc
use std/io

let content = io.read_lines("data.txt")    # ["line1", "line2", ...]
io.write_lines("output.txt", lines)
io.append("log.txt", "New entry\n")
io.exists("config.json")                    # true/false
```

### `std/http`

For more control than `@GET`/`@POST`:

```arc
use std/http

let response = http.get("api.example.com/data", {
  Authorization: "Bearer {token}"
})

let all = http.fetch_all([
  http.get("api/a"),
  http.get("api/b"),
  http.get("api/c")
])
```

### `std/csv`

```arc
use std/csv

let data = csv.parse_csv("name,age\nAlice,30\nBob,25")
# [["name", "age"], ["Alice", "30"], ["Bob", "25"]]

let records = csv.parse_csv_headers("name,age\nAlice,30\nBob,25")
# [{name: "Alice", age: "30"}, {name: "Bob", age: "25"}]

let output = csv.to_csv([["a", "b"], ["1", "2"]])
# "a,b\n1,2"
```

### `std/test`

```arc
use std/test

fn test_math() {
  test.expect_eq(2 + 2, 4, "basic addition")
  test.expect_true(10 > 5, "comparison")
}

test.describe("Math tests", () => {
  test.it("adds numbers", () => test.expect_eq(1 + 1, 2, "addition"))
  test.it("multiplies", () => test.expect_eq(3 * 4, 12, "multiplication"))
})

test.run_tests()
```

### `std/time`

```arc
use std/time

let now = time.now()
let formatted = time.format(now, "YYYY-MM-DD")
time.sleep(1000)    # pause for 1 second
```

## Creating Your Own Modules

A module is just a file. The filename (without `.arc`) is the module name.

### Project Structure

```
my-project/
├── main.arc
├── utils.arc
├── models/
│   ├── user.arc
│   └── post.arc
└── services/
    └── api.arc
```

### Defining a Module

```arc
# utils.arc

pub fn slugify(text) {
  text
    |> lower
    |> split(" ")
    |> join("-")
}

pub fn truncate(text, max_len) {
  if len(text) <= max_len { text }
  el { slice(text, 0, max_len) ++ "..." }
}

pub let MAX_TITLE_LENGTH = 100
```

### Using Your Module

```arc
# main.arc

use utils
use models/user
use services/api

let title = "My Blog Post Title"
let slug = utils.slugify(title)         # "my-blog-post-title"
let short = utils.truncate(title, 10)   # "My Blog Po..."
```

The path in `use` follows the file system: `use models/user` imports from `models/user.arc`.

### Nested Modules

For deeper organization, just nest directories:

```arc
use services/auth/oauth      # services/auth/oauth.arc
use models/db/connection      # models/db/connection.arc
```

## Module Design Patterns

### Facade Module

Create a module that re-exports from several sub-modules:

```arc
# models/mod.arc (or models.arc)

pub use models/user: User, create_user
pub use models/post: Post, create_post
pub use models/comment: Comment
```

Then consumers just `use models`:

```arc
use models: User, Post, create_user
```

### Configuration Module

```arc
# config.arc

pub let DB_HOST = "localhost"
pub let DB_PORT = 5432
pub let API_BASE = "api.example.com/v1"
pub let MAX_RETRIES = 3
```

### Utility Module

Group related helper functions:

```arc
# formatting.arc

pub fn currency(amount) => "${amount}"
pub fn percent(value) => "{value}%"
pub fn pluralize(count, word) {
  if count == 1 { "{count} {word}" }
  el { "{count} {word}s" }
}
```

## Package Manager: `arc pkg`

Arc's package manager handles external dependencies.

### Initializing a Project

```bash
arc new my-project
cd my-project
```

This creates:

```
my-project/
├── arc.toml        # project manifest
├── src/
│   └── main.arc
└── tests/
    └── main_test.arc
```

### The `arc.toml` Manifest

```toml
[package]
name = "my-project"
version = "0.1.0"
description = "My Arc project"

[dependencies]
http-utils = "1.2.0"
markdown = "0.5.1"

[dev-dependencies]
benchmark = "0.3.0"
```

### Installing Packages

```bash
arc pkg add http-utils          # add a dependency
arc pkg add benchmark --dev     # add a dev dependency
arc pkg remove markdown         # remove a dependency
arc pkg install                 # install all dependencies
arc pkg update                  # update to latest compatible versions
```

### Using Installed Packages

```arc
use http-utils/client
use markdown: render

let html = render("# Hello **World**")
```

External packages are imported just like local modules — the package name is the prefix.

### Publishing a Package

```bash
arc pkg publish
```

This publishes your package to the Arc package registry, making it available for others to install.

## Comparing with JavaScript

**JavaScript module system:**
```javascript
import { readFile } from 'fs/promises';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

export function handler(req, res) {
  const id = uuidv4();
  const data = await readFile('config.json', 'utf-8');
  res.json({ id, config: JSON.parse(data) });
}

export default handler;
```

**Arc:**
```arc
use std/io
use std/json

pub fn handler(req) {
  let id = generate_id()
  let data = io.read_lines("config.json") |> join("\n") |> json.from_json
  {id, config: data}
}
```

Arc's module system is simpler: no `default` vs named exports, no `as` renaming (just use dot notation), no `require` vs `import` confusion.

## Try It Yourself

### Exercise 1: Create a Module
Create a `validators.arc` module with these public functions:
- `is_email(s)` — returns true if string contains `@` and `.`
- `is_positive(n)` — returns true if n > 0
- `is_non_empty(s)` — returns true if string length > 0 after trimming

### Exercise 2: Use the Stdlib
Write a program that uses `std/math`, `std/strings`, and `std/collections` together:
1. Generate a list of squares from 1-10 using `math.pow`
2. Format each as a padded string with `strings.pad_left`
3. Chunk the results into groups of 3 with `collections.chunk`

### Exercise 3: Project Layout
Design the file structure for a "blog engine" project. What modules would you create? What would each export? Write out the `use` statements for `main.arc`.

<details>
<summary>Solutions</summary>

**Exercise 1:**
```arc
# validators.arc

pub fn is_email(s) => contains(s, "@") and contains(s, ".")
pub fn is_positive(n) => n > 0
pub fn is_non_empty(s) => len(trim(s)) > 0
```

**Exercise 2:**
```arc
use std/math
use std/strings
use std/collections

let squares = [math.pow(x, 2) for x in 1..11]
let formatted = squares |> map(s => strings.pad_left(str(s), 4, " "))
let groups = collections.chunk(formatted, 3)

for group in groups {
  print(group |> join("  "))
}
# Output:
#    1     4     9
#   16    25    36
#   49    64    81
#  100
```

**Exercise 3:**
```
blog-engine/
├── arc.toml
├── src/
│   ├── main.arc
│   ├── config.arc          # pub: load_config, Config type
│   ├── models/
│   │   ├── post.arc        # pub: Post, create_post, update_post
│   │   ├── user.arc        # pub: User, authenticate
│   │   └── comment.arc     # pub: Comment, add_comment
│   ├── routes/
│   │   ├── posts.arc       # pub: list, show, create, delete
│   │   └── auth.arc        # pub: login, logout, register
│   ├── services/
│   │   ├── markdown.arc    # pub: render
│   │   └── feed.arc        # pub: generate_rss
│   └── utils/
│       ├── formatting.arc  # pub: date_format, slugify, truncate
│       └── validation.arc  # pub: validate_post, validate_user
└── tests/
    ├── models_test.arc
    └── routes_test.arc
```

```arc
# main.arc
use config: load_config
use models/post: Post
use models/user: authenticate
use routes/posts
use routes/auth
use services/feed
```

</details>

## What's Next?

You now know how to organize Arc code into modules and use the standard library. In [Tutorial 6: Real-World Project](06-real-world-project.md), we'll put everything together and build a complete application from scratch.
