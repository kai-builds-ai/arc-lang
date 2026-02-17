# Arc Standard Library Reference

Complete API reference for all Arc standard library modules.

> All 17 stdlib modules are implemented and tested. The 8 modules requiring native runtime access (regex, datetime, os, io, http, crypto, error, net) all have full native implementations backed by real system calls.

---

## Table of Contents

- [math](#math) ✅
- [strings](#strings) ✅
- [collections](#collections) ✅
- [map](#map) ✅
- [io](#io) ✅ Native
- [http](#http) ✅ Native
- [json](#json) ✅
- [csv](#csv) ✅
- [test](#test) ✅
- [result](#result) ✅
- [time](#time) ✅
- [regex](#regex) ✅ Native
- [datetime](#datetime) ✅ Native
- [os](#os) ✅ Native
- [error](#error) ✅ Native
- [net](#net) ✅ Native
- [crypto](#crypto) ✅ Native

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

List, set, and queue utilities.

```arc
use collections
```

### Functions

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

Map/dictionary utilities.

```arc
use map
```

### Functions

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

File and console I/O with native Node.js fs implementation.

```arc
use io
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `read_file` | `(path) -> Result<String>` | Read file contents |
| `write_file` | `(path, content) -> Result<nil>` | Write string to file |
| `read_lines` | `(path) -> Result<[String]>` | Read file as lines |
| `exists` | `(path) -> Bool` | Check if path exists |

> `print(...)` is a built-in and does not require import.

---

## http

HTTP client with native fetch implementation via sync bridge.

```arc
use http
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `get` | `(url, headers?) -> Result<Response>` | HTTP GET |
| `post` | `(url, body, headers?) -> Result<Response>` | HTTP POST |
| `put` | `(url, body, headers?) -> Result<Response>` | HTTP PUT |
| `delete` | `(url, headers?) -> Result<Response>` | HTTP DELETE |
| `fetch` | `(url, options?) -> Result<Response>` | Generic HTTP request |

> Arc also supports the `@GET`, `@POST` syntax for inline HTTP calls — see the [Language Tour](language-tour.md).

---

## json

JSON serialization and deserialization.

```arc
use json
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `parse` | `(s: String) -> Result<Any>` | Parse JSON string to Arc value |
| `stringify` | `(value, indent?) -> String` | Convert Arc value to JSON string |
| `pretty` | `(value) -> String` | Pretty-print with 2-space indent |

---

## csv

CSV parsing and generation.

```arc
use csv
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `parse` | `(s: String, sep?) -> [[String]]` | Parse CSV to rows |
| `parse_records` | `(s: String, sep?) -> [Map]` | Parse CSV with header row to maps |
| `stringify` | `(rows: [[String]], sep?) -> String` | Convert rows to CSV string |

---

## test

Testing framework.

```arc
use test
```

### Functions

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

Error handling with Result types.

```arc
use result
```

Arc uses `Result<T>` as the standard error-handling pattern — either `Ok(value)` or `Err(message)`.

### Functions

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

Date, time, and duration utilities.

```arc
use time
```

### Functions

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

---

## regex

Regular expression operations with native implementation and ReDoS protection.

```arc
use regex
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `match` | `(pattern, str) -> Match \| nil` | First match |
| `match_all` | `(pattern, str) -> [Match]` | All matches |
| `test` | `(pattern, str) -> Bool` | Test if pattern matches |
| `replace` | `(pattern, str, replacement) -> String` | Replace first match |
| `replace_all` | `(pattern, str, replacement) -> String` | Replace all matches |
| `split` | `(pattern, str) -> [String]` | Split by pattern |
| `capture` | `(pattern, str) -> [String] \| nil` | Capture groups |
| `captures_all` | `(pattern, str) -> [[String]]` | All capture groups |
| `escape` | `(str) -> String` | Escape regex metacharacters |
| `find` | `(pattern, str) -> Match \| nil` | Find first match (alias) |
| `find_all` | `(pattern, str) -> [Match]` | Find all matches (alias) |

---

## datetime

Date and time operations with native implementation.

```arc
use datetime
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `now` | `() -> String` | Current ISO 8601 timestamp |
| `today` | `() -> String` | Current date (YYYY-MM-DD) |
| `parse` | `(str) -> Timestamp` | Parse date string |
| `format` | `(ts, fmt) -> String` | Format timestamp |
| `add_days` | `(ts, days) -> Timestamp` | Add days to timestamp |
| `diff_days` | `(a, b) -> Number` | Days between two timestamps |
| `day_of_week` | `(ts) -> String` | Day of week name |

---

## os

Operating system interaction with native implementation. Includes command injection protection.

```arc
use os
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `cwd` | `() -> String` | Current working directory |
| `chdir` | `(path) -> nil` | Change directory |
| `list_dir` | `(path) -> [String]` | List directory contents |
| `mkdir` | `(path) -> nil` | Create directory |
| `remove` | `(path) -> nil` | Remove file or directory |
| `rename` | `(from, to) -> nil` | Rename/move file |
| `copy` | `(src, dst) -> nil` | Copy file |
| `exists` | `(path) -> Bool` | Check if path exists |
| `stat` | `(path) -> Map` | File metadata |
| `exec` | `(cmd) -> Map` | Execute shell command (10s timeout, injection-protected) |
| `platform` | `() -> String` | OS platform name |
| `arch` | `() -> String` | CPU architecture |
| `env` | `(name) -> String \| nil` | Get environment variable |
| `set_env` | `(name, value) -> nil` | Set environment variable |
| `homedir` | `() -> String` | User home directory |
| `tmpdir` | `() -> String` | Temp directory path |

---

## error

Error handling utilities with native implementation.

```arc
use error
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `try_catch` | `(fn, handler) -> Any` | Try/catch wrapper |
| `try_finally` | `(fn, cleanup) -> Any` | Try/finally wrapper |
| `throw` | `(msg) -> never` | Throw an error |
| `panic` | `(msg) -> never` | Unrecoverable error |

---

## net

Networking utilities with native implementation.

```arc
use net
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `dns_lookup` | `(hostname) -> String` | DNS resolution |
| `base64_encode` | `(str) -> String` | Base64 encode |
| `base64_decode` | `(str) -> String` | Base64 decode |
| `url_encode` | `(str) -> String` | URL encode |
| `parse_query` | `(str) -> Map` | Parse query string |

---

## crypto

Cryptographic operations with native implementation.

```arc
use crypto
```

### Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `sha256` | `(str) -> String` | SHA-256 hash |
| `sha512` | `(str) -> String` | SHA-512 hash |
| `hmac_sha256` | `(key, data) -> String` | HMAC-SHA256 |
| `uuid` | `() -> String` | Generate UUID v4 |
| `random_bytes` | `(n) -> String` | Random bytes (hex) |
| `md5` | `(str) -> String` | MD5 hash |
