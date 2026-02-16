# Tutorial 3: Pattern Matching

Pattern matching is Arc's Swiss Army knife for control flow. It replaces if/else chains, switch statements, type checks, and destructuring — all in one clean construct.

---

## The Basics

A `match` expression takes a value and checks it against a series of patterns:

```arc
let day = "Monday"

let mood = match day {
  "Friday" => "🎉",
  "Saturday" | "Sunday" => "😎",
  _ => "😤"
}

print(mood)    # "😤"
```

Each arm has a **pattern** on the left and a **result** on the right, separated by `=>`. Arc checks from top to bottom and evaluates the first match.

The `_` is a **wildcard** — it matches anything. Think of it as "everything else."

### Match Is an Expression

Unlike `switch` in JavaScript, `match` returns a value. You can assign it, pass it to a function, or use it in a pipeline:

```arc
let label = match status_code {
  200 => "OK",
  404 => "Not Found",
  500 => "Server Error",
  _ => "Unknown"
}

# Or inline
print(match count { 0 => "none", 1 => "one", _ => "many" })
```

## Pattern Types

### Literal Patterns

Match exact values — numbers, strings, booleans:

```arc
match x {
  0 => "zero",
  1 => "one",
  42 => "the answer",
  _ => "something else"
}
```

### Or Patterns (`|`)

Match multiple values in one arm:

```arc
match key {
  "q" | "Q" | "quit" | "exit" => shutdown(),
  "h" | "help" => show_help(),
  _ => process(key)
}
```

This replaces fallthrough in JavaScript's `switch`:

**JavaScript (fallthrough):**
```javascript
switch (key) {
  case "q":
  case "Q":
  case "quit":
  case "exit":
    shutdown();
    break;
  case "h":
  case "help":
    showHelp();
    break;
  default:
    process(key);
}
```

**Arc:**
```arc
match key {
  "q" | "Q" | "quit" | "exit" => shutdown(),
  "h" | "help" => show_help(),
  _ => process(key)
}
```

30+ tokens vs ~15 tokens. No `break` to forget, no accidental fallthrough.

### Variable Binding

When a pattern is a name (not a literal), it binds the matched value:

```arc
match age {
  0 => "newborn",
  n => "age: {n}"    # n captures the value
}
```

### Guard Clauses (`if`)

Add conditions to patterns with `if`:

```arc
match temperature {
  t if t > 40 => "dangerously hot",
  t if t > 30 => "hot",
  t if t > 20 => "pleasant",
  t if t > 10 => "cool",
  t => "cold ({t}°)"
}
```

Guards are checked after the pattern matches. If the guard fails, matching continues to the next arm.

### Range Patterns

Match ranges of values:

```arc
match score {
  90..101 => "A",
  80..90 => "B",
  70..80 => "C",
  60..70 => "D",
  _ => "F"
}
```

## Destructuring

Pattern matching really shines when you destructure complex data.

### Map Destructuring

```arc
match response {
  {status: 200, body} => parse(body),
  {status: 404} => nil,
  {status: s} if s >= 500 => retry(),
  _ => error("unexpected")
}
```

This is powerful: you're simultaneously checking structure *and* extracting values. The `body` in `{status: 200, body}` binds `response.body` to the variable `body`. The `s` in `{status: s}` captures whatever the status is.

### List Destructuring

```arc
match items {
  [] => "empty list",
  [x] => "single item: {x}",
  [first, second] => "pair: {first}, {second}",
  [head, ..tail] => "head: {head}, rest has {len(tail)} items"
}
```

The `..tail` syntax captures all remaining elements.

### Nested Destructuring

You can go as deep as you need:

```arc
match event {
  {type: "click", target: {id, class}} =>
    print("Clicked #{id} (.{class})"),
  {type: "keypress", key: "Enter"} =>
    submit(),
  _ =>
    nil
}
```

### Variant / Result Matching

Arc's `Result` type uses variant patterns:

```arc
match fetch_data(url) {
  Ok(data) => process(data),
  Err("timeout") => retry(),
  Err(msg) => print("Failed: {msg}")
}
```

This is the idiomatic way to handle errors in Arc — no try/catch, just explicit pattern matching on the result.

## Replacing If/Else Chains

One of the most common uses of `match` is replacing verbose conditional logic.

### Before: If/Else Chain

```arc
fn classify(x) {
  if x < 0 {
    "negative"
  } el if x == 0 {
    "zero"
  } el if x < 10 {
    "small"
  } el if x < 100 {
    "medium"
  } el {
    "large"
  }
}
```

### After: Match with Guards

```arc
fn classify(x) => match x {
  x if x < 0 => "negative",
  0 => "zero",
  x if x < 10 => "small",
  x if x < 100 => "medium",
  _ => "large"
}
```

The match version is more scannable — each case is on one line, and the pattern/result relationship is visually clear.

## Side-by-Side: Arc vs JavaScript

### API Response Handler

**JavaScript:**
```javascript
function handleResponse(response) {
  switch (response.status) {
    case 200:
      return JSON.parse(response.body);
    case 201:
      return { created: true, data: JSON.parse(response.body) };
    case 400:
      throw new Error(`Bad request: ${response.body}`);
    case 401:
    case 403:
      redirectToLogin();
      return null;
    case 404:
      return null;
    case 500:
      console.error("Server error");
      return retry(response.url);
    default:
      throw new Error(`Unexpected status: ${response.status}`);
  }
}
```

**Arc:**
```arc
fn handle_response(response) => match response {
  {status: 200, body} => parse(body),
  {status: 201, body} => {created: true, data: parse(body)},
  {status: 400, body} => error("Bad request: {body}"),
  {status: 401 | 403} => { redirect_to_login(); nil },
  {status: 404} => nil,
  {status: 500, url} => { print("Server error"); retry(url) },
  {status: s} => error("Unexpected status: {s}")
}
```

The Arc version is shorter, but more importantly, it's *structural*. Each arm destructures the response directly — no repeated `response.status`, `response.body`. And because `match` is an expression, the whole function is a single expression body with `=>`.

### Command Parser

**JavaScript:**
```javascript
function parseCommand(input) {
  const parts = input.trim().split(" ");
  const cmd = parts[0];
  const args = parts.slice(1);

  if (cmd === "help") {
    return showHelp();
  } else if (cmd === "add" && args.length === 1) {
    return addItem(args[0]);
  } else if (cmd === "remove" && args.length === 1) {
    return removeItem(args[0]);
  } else if (cmd === "list") {
    return listItems();
  } else if (cmd === "search" && args.length >= 1) {
    return search(args.join(" "));
  } else {
    return `Unknown command: ${cmd}`;
  }
}
```

**Arc:**
```arc
fn parse_command(input) {
  let parts = input |> trim |> split(" ")
  match parts {
    ["help"] => show_help(),
    ["add", item] => add_item(item),
    ["remove", item] => remove_item(item),
    ["list"] => list_items(),
    ["search", ..words] => search(words |> join(" ")),
    [cmd, ..] => "Unknown command: {cmd}"
  }
}
```

List destructuring makes command parsing elegant. Each arm matches the exact shape of the command — no manual indexing, no length checks.

## Match in Pipelines

Since `match` is an expression, it works naturally in pipelines:

```arc
let descriptions = status_codes
  |> map(code => match code {
    200 => "OK",
    404 => "Not Found",
    _ => "Other ({code})"
  })
```

## Advanced: Nested Match

You can nest match expressions when dealing with layered decisions:

```arc
fn handle(event) => match event.type {
  "user" => match event.action {
    "login" => log_login(event.user),
    "logout" => log_logout(event.user),
    a => print("Unknown user action: {a}")
  },
  "system" => match event.level {
    "error" => alert(event.message),
    _ => log(event.message)
  },
  t => print("Unknown event type: {t}")
}
```

Though if the nesting gets deep, consider using a flat match with deeper destructuring:

```arc
fn handle(event) => match event {
  {type: "user", action: "login", user} => log_login(user),
  {type: "user", action: "logout", user} => log_logout(user),
  {type: "system", level: "error", message} => alert(message),
  {type: "system", message} => log(message),
  {type: t} => print("Unknown event type: {t}")
}
```

Flat and clear. Each line is self-contained.

## Try It Yourself

### Exercise 1: Grade Calculator
Write a function `grade(score)` that uses `match` with ranges or guards to return:
- 90-100: "A"
- 80-89: "B"
- 70-79: "C"
- 60-69: "D"
- Below 60: "F"
- Negative or above 100: "Invalid"

### Exercise 2: Shape Area
Given maps like `{shape: "circle", radius: 5}` and `{shape: "rect", width: 4, height: 6}`, write a function `area(s)` using destructuring match to calculate the area.

### Exercise 3: List Describe
Write a function that takes a list and returns:
- `"empty"` for `[]`
- `"singleton: X"` for `[X]`
- `"pair: X, Y"` for `[X, Y]`
- `"list of N starting with X"` for anything longer

### Exercise 4: Mini Calculator
Write a function `calc(expr)` where `expr` is a map like `{op: "+", a: 5, b: 3}`. Support `+`, `-`, `*`, `/` (handle divide by zero), and return `"unknown op"` for anything else.

<details>
<summary>Solutions</summary>

**Exercise 1:**
```arc
fn grade(score) => match score {
  s if s < 0 or s > 100 => "Invalid",
  s if s >= 90 => "A",
  s if s >= 80 => "B",
  s if s >= 70 => "C",
  s if s >= 60 => "D",
  _ => "F"
}
```

**Exercise 2:**
```arc
fn area(s) => match s {
  {shape: "circle", radius: r} => 3.14159 * r * r,
  {shape: "rect", width: w, height: h} => w * h,
  {shape: "triangle", base: b, height: h} => b * h / 2,
  {shape} => error("Unknown shape: {shape}")
}
```

**Exercise 3:**
```arc
fn describe(list) => match list {
  [] => "empty",
  [x] => "singleton: {x}",
  [x, y] => "pair: {x}, {y}",
  [x, ..rest] => "list of {len(rest) + 1} starting with {x}"
}
```

**Exercise 4:**
```arc
fn calc(expr) => match expr {
  {op: "+", a, b} => a + b,
  {op: "-", a, b} => a - b,
  {op: "*", a, b} => a * b,
  {op: "/", a, b: 0} => error("divide by zero"),
  {op: "/", a, b} => a / b,
  {op} => "unknown op: {op}"
}
```

</details>

## What's Next?

Pattern matching is the core of writing clean, expressive Arc. In [Tutorial 4: Async & Tool Calls](04-async-and-tools.md), we'll explore Arc's agent-native features — making HTTP requests, parallel fetching, and error handling.
