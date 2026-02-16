# Arc Standard Library Reference

Complete API reference for all Arc standard library modules.

> All 11 stdlib modules are implemented and tested.

---

## Table of Contents

- [math](#math) ✅
- [strings](#strings) ✅
- [collections](#collections) ✅
- [map](#map) ✅
- [io](#io) ✅
- [http](#http) ✅
- [json](#json) ✅
- [csv](#csv) ✅
- [test](#test) ✅
- [result](#result) ✅
- [time](#time) ✅

---

## math

Mathematical constants and functions.

```arc
use math
```

### Constants

#### `PI`
```arc
pub let PI = 3.141592653589793
```
The ratio of a circle's circumference to its diameter.

#### `E`
```arc
pub let E = 2.718281828459045
```
Euler's number, the base of natural logarithms.

### Functions

#### `abs(x) -> Number`
Returns the absolute value of `x`.

```arc
math.abs(-5)   # => 5
math.abs(3)    # => 3
```

#### `pow(base, exp) -> Number`
Returns `base` raised to the power `exp` (integer exponents).

```arc
math.pow(2, 10)  # => 1024
math.pow(3, 0)   # => 1
```

#### `sqrt(x) -> Number | nil`
Returns the square root of `x` using Newton's method. Returns `nil` for negative inputs.

```arc
math.sqrt(144)  # => 12
math.sqrt(2)    # => 1.4142135623730951
math.sqrt(-1)   # => nil
```

#### `ceil(x) -> Int`
Returns the smallest integer greater than or equal to `x`.

```arc
math.ceil(4.2)   # => 5
math.ceil(-1.7)  # => -1
math.ceil(3.0)   # => 3
```

#### `floor(x) -> Int`
Returns the largest integer less than or equal to `x`.

```arc
math.floor(4.9)   # => 4
math.floor(-1.2)  # => -2
math.floor(3.0)   # => 3
```

#### `clamp(x, lo, hi) -> Number`
Constrains `x` to the range `[lo, hi]`.

```arc
math.clamp(15, 0, 10)   # => 10
math.clamp(-5, 0, 10)   # => 0
math.clamp(5, 0, 10)    # => 5
```

---

## strings

String manipulation utilities beyond the built-in string functions.

```arc
use strings
```

### Functions

#### `pad_left(s, width, ch) -> String`
Pads string `s` on the left with character `ch` until it reaches `width`.

```arc
strings.pad_left("42", 5, "0")    # => "00042"
strings.pad_left("hello", 3, " ") # => "hello"  (already >= width)
```

#### `pad_right(s, width, ch) -> String`
Pads string `s` on the right with character `ch` until it reaches `width`.

```arc
strings.pad_right("hi", 5, ".")   # => "hi..."
```

#### `capitalize(s) -> String`
Capitalizes the first letter and lowercases the rest.

```arc
strings.capitalize("hello")   # => "Hello"
strings.capitalize("aRC")     # => "Arc"
strings.capitalize("")        # => ""
```

#### `words(s) -> [String]`
Splits a string into a list of words (split by spaces, trimmed, empty strings removed).

```arc
strings.words("  hello   world  ")  # => ["hello", "world"]
```

---

## collections

🚧 **Planned** — List, set, and queue utilities.

```arc
use collections
```

### Expected Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `range` | `(start, end, step?) -> [Int]` | Generate a range of integers |
| `zip` | `(a, b) -> [(Any, Any)]` | Pair elements from two lists |
| `flatten` | `(nested) -> [Any]` | Flatten nested lists one level |
| `chunk` | `(list, size) -> [[Any]]` | Split list into chunks |
| `unique` | `(list) -> [Any]` | Remove duplicates |
| `sort_by` | `(list, fn) -> [Any]` | Sort by key function |
| `group_by` | `(list, fn) -> Map` | Group elements by key function |

> Built-in list functions (`map`, `filter`, `reduce`, `take`, `skip`, `find`, `contains`, `len`, `push`, `concat`) are available without import.

---

## map

🚧 **Planned** — Map/dictionary utilities.

```arc
use map
```

### Expected Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `keys` | `(m) -> [Any]` | Get all keys |
| `values` | `(m) -> [Any]` | Get all values |
| `entries` | `(m) -> [(Any, Any)]` | Get key-value pairs |
| `merge` | `(a, b) -> Map` | Merge two maps (b overwrites a) |
| `has_key` | `(m, key) -> Bool` | Check if key exists |
| `map_values` | `(m, fn) -> Map` | Transform all values |

---

## io

🚧 **Planned** — File and console I/O.

```arc
use io
```

### Expected Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `read_file` | `(path) -> Result<String>` | Read file contents |
| `write_file` | `(path, content) -> Result<nil>` | Write string to file |
| `append_file` | `(path, content) -> Result<nil>` | Append to file |
| `read_lines` | `(path) -> Result<[String]>` | Read file as lines |
| `exists` | `(path) -> Bool` | Check if path exists |
| `stdin` | `() -> String` | Read line from stdin |

> `print(...)` is a built-in and does not require import.

---

## http

🚧 **Planned** — HTTP client using Arc's native `@` tool-call syntax.

```arc
use http
```

### Expected Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `get` | `(url, headers?) -> Result<Response>` | HTTP GET |
| `post` | `(url, body, headers?) -> Result<Response>` | HTTP POST |
| `put` | `(url, body, headers?) -> Result<Response>` | HTTP PUT |
| `delete` | `(url, headers?) -> Result<Response>` | HTTP DELETE |

> Arc also supports the `@GET`, `@POST` syntax for inline HTTP calls — see the [Language Tour](language-tour.md).

---

## json

🚧 **Planned** — JSON serialization and deserialization.

```arc
use json
```

### Expected Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `parse` | `(s: String) -> Result<Any>` | Parse JSON string to Arc value |
| `stringify` | `(value, indent?) -> String` | Convert Arc value to JSON string |
| `pretty` | `(value) -> String` | Pretty-print with 2-space indent |

---

## csv

🚧 **Planned** — CSV parsing and generation.

```arc
use csv
```

### Expected Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `parse` | `(s: String, sep?) -> [[String]]` | Parse CSV to rows |
| `parse_records` | `(s: String, sep?) -> [Map]` | Parse CSV with header row to maps |
| `stringify` | `(rows: [[String]], sep?) -> String` | Convert rows to CSV string |

---

## test

🚧 **Planned** — Testing framework.

```arc
use test
```

### Expected Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `assert` | `(cond, msg?)` | Assert condition is truthy |
| `assert_eq` | `(a, b, msg?)` | Assert equality |
| `assert_ne` | `(a, b, msg?)` | Assert inequality |
| `assert_err` | `(result, msg?)` | Assert Result is Err |
| `assert_ok` | `(result, msg?)` | Assert Result is Ok |
| `run` | `(tests: [fn])` | Run test suite |

### Example

```arc
use test

fn test_addition() {
  test.assert_eq(1 + 1, 2, "basic addition")
}

fn test_string() {
  test.assert("hello" |> len > 0, "non-empty")
}

test.run([test_addition, test_string])
```

---

## result

🚧 **Planned** — Error handling with Result types.

```arc
use result
```

Arc uses `Result<T>` as the standard error-handling pattern — either `Ok(value)` or `Err(message)`.

### Expected Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `ok` | `(value) -> Result<T>` | Wrap value in Ok |
| `err` | `(msg) -> Result<T>` | Create an Err |
| `is_ok` | `(r) -> Bool` | Check if Ok |
| `is_err` | `(r) -> Bool` | Check if Err |
| `unwrap` | `(r) -> T` | Get value or panic |
| `unwrap_or` | `(r, default) -> T` | Get value or default |
| `map` | `(r, fn) -> Result<U>` | Transform Ok value |
| `flat_map` | `(r, fn) -> Result<U>` | Chain Result-returning functions |

### Example

```arc
use result

let r = result.ok(42)
let doubled = r |> result.map(x => x * 2)  # Ok(84)

let e = result.err("not found")
result.unwrap_or(e, 0)  # => 0
```

---

## time

🚧 **Planned** — Date, time, and duration utilities.

```arc
use time
```

### Expected Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `now` | `() -> Timestamp` | Current Unix timestamp (ms) |
| `format` | `(ts, fmt) -> String` | Format timestamp |
| `parse` | `(s, fmt) -> Result<Timestamp>` | Parse date string |
| `sleep` | `(ms)` | Pause execution |
| `elapsed` | `(start) -> Int` | Milliseconds since start |

---

## Built-in Functions (No Import Required)

These are available globally in every Arc program:

| Function | Description |
|----------|-------------|
| `print(...)` | Print to stdout |
| `len(x)` | Length of string, list, or map |
| `str(x)` | Convert to string |
| `int(x)` | Convert to integer |
| `float(x)` | Convert to float |
| `type(x)` | Get type name as string |
| `split(s, sep)` | Split string by separator |
| `join(list, sep)` | Join list into string |
| `trim(s)` | Trim whitespace |
| `upper(s)` | Uppercase string |
| `lower(s)` | Lowercase string |
| `slice(x, start, end)` | Slice string or list |
| `map(list, fn)` | Transform each element |
| `filter(list, fn)` | Keep matching elements |
| `reduce(list, init, fn)` | Fold list to single value |
| `find(list, fn)` | Find first match |
| `contains(list, val)` | Check membership |
| `push(list, val)` | Append to list |
| `concat(a, b)` | Concatenate lists |
| `take(list, n)` | First n elements |
| `skip(list, n)` | Skip first n elements |
| `sort(list)` | Sort list |
| `reverse(list)` | Reverse list |
| `keys(map)` | Map keys |
| `values(map)` | Map values |
