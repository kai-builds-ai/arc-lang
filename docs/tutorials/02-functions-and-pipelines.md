# Tutorial 2: Functions & Pipelines

Functions are how you organize code in Arc. Pipelines are how you make it flow. Together, they're the backbone of idiomatic Arc.

---

## Defining Functions

Arc has two function styles: **expression body** for one-liners and **block body** for everything else.

### Expression Body

When a function is a single expression, use `=>`:

```arc
fn add(a, b) => a + b
fn square(x) => x * x
fn greet(name) => "Hello, {name}!"
```

No braces, no `return`. The expression *is* the return value. This is the style you'll use most often — Arc encourages small, focused functions.

### Block Body

When you need multiple statements, use braces. The last expression in the block is returned:

```arc
fn process(data) {
  let cleaned = trim(data)
  let words = split(cleaned, " ")
  let count = len(words)
  print("Processing {count} words...")
  words    # this is the return value
}
```

No `return` keyword needed. The last expression is *implicitly* returned. This eliminates a common source of noise in other languages.

### Compared to JavaScript

**Arc:**
```arc
fn factorial(n) {
  if n <= 1 { 1 }
  el { n * factorial(n - 1) }
}
```

**JavaScript:**
```javascript
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
```

No `return`, no semicolons, no parentheses around the condition. It reads cleaner and uses fewer tokens.

## Default Parameters

Functions can have default values:

```arc
fn greet(name, greeting = "Hello") => "{greeting}, {name}!"

greet("Alice")            # "Hello, Alice!"
greet("Alice", "Hey")     # "Hey, Alice!"
```

## Closures and Lambdas

Anonymous functions (lambdas) use the `=>` arrow:

```arc
# Single parameter — no parens needed
let double = x => x * 2

# Multiple parameters
let add = (a, b) => a + b

# Inline in function calls
[1, 2, 3] |> map(x => x * 2)       # [2, 4, 6]
[1, 2, 3] |> filter(x => x > 1)    # [2, 3]
```

Lambdas capture their surrounding scope (they're closures):

```arc
fn make_adder(n) => x => x + n

let add5 = make_adder(5)
add5(10)    # 15
add5(20)    # 25
```

## Type Annotations

You can annotate parameter and return types:

```arc
fn add(a: Int, b: Int) -> Int => a + b

fn find_user(id: Int) -> Result<User> {
  @GET "api/users/{id}"
}
```

Types are optional for local functions but recommended for public APIs — they serve as documentation and catch errors early.

## The Pipeline Operator `|>`

This is Arc's signature feature. The pipeline operator passes the result of the left side as the first argument to the right side:

```arc
# These are equivalent:
print(join(sort(filter(words, w => len(w) > 3)), ", "))

words
  |> filter(w => len(w) > 3)
  |> sort
  |> join(", ")
  |> print
```

Read the pipeline version top to bottom: start with `words`, filter them, sort them, join them, print them. The data flows in the order you think about it.

### How It Works

`a |> f(b)` becomes `f(a, b)`. The left side is inserted as the first argument:

```arc
[1, 2, 3] |> map(x => x * 2)
# is the same as
map([1, 2, 3], x => x * 2)
```

When the function takes only one argument, you can omit the parentheses:

```arc
[3, 1, 2] |> sort |> reverse |> print
# is the same as
print(reverse(sort([3, 1, 2])))
```

### Why Pipelines Matter

Compare these two approaches for processing API data:

**Nested (inside-out reading):**
```arc
let result = join(map(filter(take(sort_by(users, u => u.age), 10), u => u.active), u => u.name), "\n")
```

**Pipeline (left-to-right reading):**
```arc
let result = users
  |> sort_by(u => u.age)
  |> take(10)
  |> filter(u => u.active)
  |> map(u => u.name)
  |> join("\n")
```

The pipeline version tells a story: take the users, sort by age, take the first 10, keep the active ones, extract names, join with newlines. Each step is clear and self-contained.

### Multi-line Pipelines

For complex transformations, put each step on its own line:

```arc
let report = transactions
  |> filter(t => t.amount > 0)
  |> sort_by(t => t.date)
  |> map(t => {
    date: t.date,
    label: "{t.merchant}: ${t.amount}"
  })
  |> take(20)
```

## Higher-Order Functions

Higher-order functions take other functions as arguments or return them. Arc's built-in list functions are all higher-order.

### map

Transform every element:

```arc
[1, 2, 3] |> map(x => x * 2)         # [2, 4, 6]
["hello", "world"] |> map(upper)       # ["HELLO", "WORLD"]
```

### filter

Keep elements that match a condition:

```arc
[1, 2, 3, 4, 5] |> filter(x => x > 3)       # [4, 5]
["arc", "", "lang"] |> filter(s => len(s) > 0) # ["arc", "lang"]
```

### reduce

Combine all elements into a single value:

```arc
[1, 2, 3, 4] |> reduce(0, (sum, x) => sum + x)    # 10
[1, 2, 3, 4] |> reduce(1, (prod, x) => prod * x)   # 24

# Building a string
["Arc", "is", "great"] |> reduce("", (s, w) => "{s} {w}" |> trim)
```

`reduce` takes an initial value and a function that combines the accumulator with each element.

### find

Get the first element matching a condition:

```arc
[1, 2, 3, 4] |> find(x => x > 2)    # 3
```

### Chaining Them Together

The real power emerges when you chain these operations:

```arc
let users = [
  {name: "Alice", age: 32, active: true},
  {name: "Bob", age: 25, active: false},
  {name: "Carol", age: 28, active: true},
  {name: "Dave", age: 35, active: true}
]

let result = users
  |> filter(u => u.active)
  |> filter(u => u.age >= 30)
  |> map(u => u.name)
  |> join(", ")

print(result)    # "Alice, Dave"
```

### Writing Your Own Higher-Order Functions

Functions that accept functions are easy to write:

```arc
fn apply_twice(f, x) => f(f(x))

apply_twice(x => x * 2, 3)      # 12  (3 → 6 → 12)
apply_twice(x => x ++ "!", "hi")  # "hi!!"

fn compose(f, g) => x => f(g(x))

let shout = compose(upper, s => s ++ "!")
shout("hello")    # "HELLO!"
```

## Real-World Example: Token Savings

Let's build a function that takes a list of blog posts and creates an RSS-like summary.

**Arc (≈85 tokens):**
```arc
fn summarize_posts(posts, limit = 5) {
  posts
    |> filter(p => p.published)
    |> sort_by(p => p.date)
    |> reverse
    |> take(limit)
    |> map(p => "• {p.title} ({p.date})\n  {p.summary |> take(100)}...")
    |> join("\n\n")
}
```

**JavaScript (≈140 tokens):**
```javascript
function summarizePosts(posts, limit = 5) {
  return posts
    .filter(p => p.published)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map(p => `• ${p.title} (${p.date})\n  ${p.summary.slice(0, 100)}...`)
    .join("\n\n");
}
```

Arc saves tokens through: no `return`, `|>` instead of `.`, `{x}` instead of `${x}`, built-in `sort_by`/`take`/`reverse` as first-class functions. That's roughly a **40% reduction**.

## Visibility: `pub`

By default, functions are private to their module. Use `pub` to export them:

```arc
pub fn greet(name) => "Hello, {name}!"    # visible to importers
fn helper(x) => x * 2                      # private to this file
```

We'll cover modules fully in [Tutorial 5](05-modules-and-packages.md).

## Try It Yourself

### Exercise 1: Pipeline Warm-up
Given the list `[5, 3, 8, 1, 9, 2, 7]`, use a pipeline to: filter out numbers less than 4, sort the remaining, reverse them, and join with " > ".

Expected output: `"9 > 8 > 7 > 5"`

### Exercise 2: Custom Higher-Order Function
Write a function `unless(condition, f)` that calls `f()` only when `condition` is false. Use it:
```arc
unless(false, () => print("This should print!"))
unless(true, () => print("This should NOT print"))
```

### Exercise 3: Data Processing
Given this list of products:
```arc
let products = [
  {name: "Laptop", price: 999, in_stock: true},
  {name: "Phone", price: 699, in_stock: true},
  {name: "Tablet", price: 499, in_stock: false},
  {name: "Watch", price: 299, in_stock: true},
  {name: "Earbuds", price: 149, in_stock: true}
]
```
Write a pipeline that: keeps only in-stock items under $500, sorts by price, and produces a string like `"Watch ($299), Earbuds ($149)"`.

### Exercise 4: Compose
Write a `pipe` function that takes a list of functions and returns a new function that applies them left-to-right:
```arc
let transform = pipe([x => x * 2, x => x + 1, str])
transform(5)    # "11"
```

<details>
<summary>Solutions</summary>

**Exercise 1:**
```arc
[5, 3, 8, 1, 9, 2, 7]
  |> filter(x => x >= 4)
  |> sort
  |> reverse
  |> join(" > ")
  |> print
```

**Exercise 2:**
```arc
fn unless(condition, f) {
  if not condition { f() }
}
```

**Exercise 3:**
```arc
products
  |> filter(p => p.in_stock and p.price < 500)
  |> sort_by(p => p.price)
  |> reverse
  |> map(p => "{p.name} (${p.price})")
  |> join(", ")
  |> print
```

**Exercise 4:**
```arc
fn pipe(fns) => x => fns |> reduce(x, (acc, f) => f(acc))
```

</details>

## What's Next?

You now understand functions and pipelines — the core of idiomatic Arc. In [Tutorial 3: Pattern Matching](03-pattern-matching.md), we'll explore Arc's most powerful control flow feature: `match` expressions.
