# Arc Language Tour

A complete walkthrough of every Arc feature with examples.

## Variables & Bindings

```arc
let x = 42                      # immutable
let mut count = 0                # mutable

# Destructuring
let {name, age} = getUser()      # map destructuring
let [first, second] = items      # list destructuring
```

Immutable by default. Use `mut` when you need to reassign.

## Functions

### Expression Body

For single-expression functions — no braces, no `return`:

```arc
fn add(a, b) => a + b
fn square(x) => x * x
fn greet(name) => "Hello, {name}!"
```

### Block Body

For multi-statement functions — last expression is the return value:

```arc
fn process(data) {
  let cleaned = data |> trim |> lowercase
  let parsed = parse(cleaned)
  parsed  # implicit return
}
```

### Closures / Lambdas

```arc
let double = x => x * 2
let add = (a, b) => a + b
numbers |> map(x => x * 2)
```

## Pattern Matching

Arc's most powerful feature. Replaces if/else chains, switch statements, and type checks:

```arc
# Value matching
match n {
  0 => "zero",
  1 | 2 => "small",
  n if n < 0 => "negative",
  n => "other: {n}"
}

# Wildcard / binding
match items {
  [] => "empty",
  [x] => "single: {x}",
  _ => "multiple items"
}
```

## Pipeline Operator

Read left-to-right instead of inside-out:

```arc
# Without pipeline (nested)
print(join(sort(filter(words, w => len(w) > 3)), ", "))

# With pipeline (linear)
words
  |> filter(w => len(w) > 3)
  |> sort
  |> join(", ")
  |> print
```

Pipelines pass the left value as the first argument to the right function.

## Collections

### Lists

```arc
let nums = [1, 2, 3, 4, 5]
let first = nums[0]
let combined = [1, 2] ++ [3, 4]    # concat with ++
```

### Maps

```arc
let user = {name: "Alice", age: 30}
let name = user.name                 # dot access
let age = user["age"]                # bracket access
let shorthand = {name, age}          # same as {name: name, age: age}
```

### Ranges

```arc
let r = 1..10                        # 1 to 9
let digits = 0..10                   # 0 to 9
```

### Comprehensions

```arc
let evens = [x * 2 for x in 1..10]
let squares = [x * x for x in 1..10 if x % 2 == 0]
```

## String Interpolation

Expressions inside `{}` in strings:

```arc
let name = "Arc"
let msg = "Hello, {name}!"
let math = "2 + 3 = {2 + 3}"              # expressions work
let info = "length: {len(items)}"          # function calls
let first = "first item: {items[0]}"       # indexing
let nested = "User: {user.name} ({user.age})"
```

Full expressions are supported inside `{}` — variables, math, function calls, property access, indexing.

Use `\{` to escape braces in strings: `"literal \{braces\}"`

## Type System

Arc's type system is **declaration-based, not annotation-based** — by design. Instead of adding types to every function signature (more tokens, more ceremony), you declare meaningful types once and let the checker do the work.

### Primitive Types

`Number`, `String`, `Bool`, `Nil`, `Any`

### Type Declarations

```arc
# Give meaning to primitives
type Email = String matching /^[^@]+@[^@]+$/
type Age = Number where x >= 0 and x <= 150
type Positive = Number where x > 0
type Username = String matching /^[a-zA-Z_]\w{2,19}$/

# Composite types
type User = {name: String, age: Age, email: Email}

# Union types
type Status = "active" | "inactive" | "banned"
```

### Constrained Types

The `where` and `matching` keywords let you encode validation directly into types:

```arc
type Positive = Number where x > 0       # runtime constraint
type Email = String matching /\S+@\S+/    # regex validation
```

This is more powerful than simple type annotations — your types carry *meaning*, not just structure.

### Type Checking

```bash
arc check file.arc    # Static type checking
```

### Why No Inline Annotations?

Arc is designed for **token efficiency**. Inline annotations like `fn add(x: Number, y: Number): Number` add tokens to every function — that's cost when AI agents write and read your code. Instead, declare a type once, use it everywhere. Less ceremony, same safety.

## Tool Calls

First-class API and tool integration with `@`:

```arc
# HTTP methods
let user = @GET "api/users/{id}"
@POST "api/users" {name: "Arc", role: "agent"}
@PUT "api/users/{id}" updated_user
@DELETE "api/users/{id}"

# Custom tools
let answer = @llm("Summarize: {text}")
let files = @shell("ls -la")
```

No imports, no client setup, no serialization. Just call it.

## Error Handling

Arc uses map-based results for error handling:

```arc
fn safe_divide(a, b) {
  if b == 0 { {ok: false, error: "division by zero"} }
  else { {ok: true, value: a / b} }
}

let result = safe_divide(10, 3)
if result.ok {
  print("Result: {result.value}")
} else {
  print("Error: {result.error}")
}
```

## Async / Concurrency

### Auto-Await

Most async calls are auto-awaited — no ceremony:

```arc
let user = fetchUser(id)   # auto-awaited
```

### Parallel Fetch

Fetch multiple resources concurrently:

```arc
let [users, posts, stats] = fetch [
  @GET "api/users",
  @GET "api/posts",
  @GET "api/stats"
]
```

### Explicit Async

```arc
let task = async { heavyComputation() }
let result = await task
```

## Control Flow

### If / El (Expression)

```arc
let label = if count > 0 { "active" } else { "empty" }

if ready {
  go()
} else {
  wait()
}
```

### For Loops

```arc
for item in items { process(item) }
for i in 0..10 { print(i) }
for user in users { print("{user.name}: {user.age}") }
```

### Do Loops

```arc
do {
  let input = readline()
} until input == "quit"
```

## Modules

```arc
use std/io
use std/http: GET, POST
use mylib/utils: *
```

`use` with `/` paths and `:` for selective imports. `pub` marks public exports:

```arc
pub fn greet(name) => "Hello, {name}!"
```

---

**Next:** See the [Standard Library Tutorial](/stdlib-tutorial) for hands-on examples, or the [Standard Library Reference](/stdlib-reference) for full API docs.
