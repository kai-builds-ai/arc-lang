# Tutorial 1: Hello, World!

Your first steps with Arc — installation, the REPL, variables, types, and printing.

---

## Installing Arc

Arc's compiler runs on Node.js. If you don't have Node.js 18+ installed, grab it from [nodejs.org](https://nodejs.org).

```bash
# Clone the repository
git clone https://github.com/kai-builds-ai/arc-lang.git
cd arc-lang

# Install dependencies
cd compiler
npm install
cd ..
```

That's it. No global installs, no build step. Let's verify it works:

```bash
npx tsx compiler/src/index.ts repl
```

You should see:

```
Arc REPL v0.1 — Type expressions to evaluate
>
```

Type `2 + 2` and press Enter. If you see `4`, you're in business. Press Ctrl+C to exit.

## Your First Program

Create a file called `hello.arc`:

```arc
print("Hello, World!")
```

Run it:

```bash
npx tsx compiler/src/index.ts run hello.arc
```

```
Hello, World!
```

One line. No imports, no main function, no boilerplate. In Arc, your code runs top-to-bottom.

### Comparing with JavaScript and Python

Let's see how this scales to something slightly more interesting — greeting a user:

**Arc (24 tokens):**
```arc
let name = "Alice"
print("Hello, {name}!")
```

**JavaScript (32 tokens):**
```javascript
const name = "Alice";
console.log(`Hello, ${name}!`);
```

**Python (26 tokens):**
```python
name = "Alice"
print(f"Hello, {name}!")
```

Arc's string interpolation uses `{}` instead of `${}` — fewer characters, same clarity. And `print` is shorter than `console.log`. These small savings compound across a whole program.

## The REPL

The REPL (Read-Eval-Print Loop) is your playground. Start it up:

```bash
npx tsx compiler/src/index.ts repl
```

The REPL evaluates expressions and shows their result immediately:

```
> 42
42

> "hello" ++ " world"
"hello world"

> [1, 2, 3] |> map(x => x * 2)
[2, 4, 6]
```

Use the REPL to experiment as you learn. It's the fastest way to try ideas.

## Variables

Arc has two kinds of variables: **immutable** (the default) and **mutable** (opt-in).

### Immutable with `let`

```arc
let name = "Arc"
let version = 1
let pi = 3.14159
```

Once bound, these can't change:

```arc
let x = 10
x = 20    # Error! Can't reassign an immutable binding
```

Why immutable by default? Because most variables don't need to change. Making immutability the default eliminates a whole class of bugs — accidental reassignment, race conditions, confusing state changes.

### Mutable with `let mut`

When you *do* need mutation, say so explicitly:

```arc
let mut count = 0
count = count + 1
count = count + 1
print(count)    # 3... wait, 2. It's 2.
```

The `mut` keyword is a signal to anyone reading your code: "this value will change." It's documentation built into the syntax.

### Destructuring

You can unpack data structures right in a `let` binding:

```arc
# Map destructuring
let {name, age} = {name: "Alice", age: 30}
print(name)    # "Alice"

# List destructuring
let [first, second, ..rest] = [1, 2, 3, 4, 5]
print(first)   # 1
print(rest)    # [3, 4, 5]
```

The `..rest` syntax collects remaining elements into a list — handy for working with variable-length data.

## Types

Arc has a concise type system. Most of the time, types are inferred — you don't need to write them. But when you want to be explicit, you can:

### Primitive Types

```arc
let name: String = "Arc"
let age: Int = 1
let ratio: Float = 3.14
let active: Bool = true
let nothing: Nil = nil
```

### Type Inference

In practice, you'll rarely write type annotations for local variables:

```arc
let name = "Arc"       # Arc knows this is a String
let count = 42         # Int
let items = [1, 2, 3]  # [Int]
```

Type annotations become more useful on function signatures, which we'll cover in [Tutorial 2](02-functions-and-pipelines.md).

### Semantic Types

Arc has a unique feature: types that carry meaning and validation:

```arc
type Email = String matching /^[^@]+@[^@]+\.[^@]+$/
type Age = Int where x => x >= 0 and x <= 150
```

An `Email` isn't just a string — it's a string that *must* be a valid email address. This is checked at assignment time. We'll explore this more in later tutorials.

## Printing and String Interpolation

`print` is a built-in function — no imports needed:

```arc
print("Hello!")
print(42)
print([1, 2, 3])
```

### String Interpolation

Put any expression inside `{}` in a string:

```arc
let name = "World"
let x = 7

print("Hello, {name}!")          # Hello, World!
print("7 * 6 = {x * 6}")        # 7 * 6 = 42
print("Length: {len(name)}")     # Length: 5
```

No special prefix needed — all double-quoted strings support interpolation. Compare with JavaScript's `${expr}` or Python's `f"{expr}"` — Arc's approach saves two characters per interpolation, and those characters add up.

### String Operations

```arc
let s = "Hello, World!"

len(s)          # 13
upper(s)        # "HELLO, WORLD!"
lower(s)        # "hello, world!"
trim("  hi  ")  # "hi"
split(s, ", ")  # ["Hello", "World!"]

# Concatenation
"Hello" ++ " " ++ "World"   # "Hello World"
```

## Collections

### Lists

```arc
let numbers = [1, 2, 3, 4, 5]
let empty = []
let mixed = [1, "two", true]

# Access by index
numbers[0]    # 1
numbers[2]    # 3

# Built-in operations
len(numbers)              # 5
push(numbers, 6)          # [1, 2, 3, 4, 5, 6]
[1, 2] ++ [3, 4]         # [1, 2, 3, 4]
take(numbers, 3)          # [1, 2, 3]
skip(numbers, 2)          # [3, 4, 5]
reverse(numbers)          # [5, 4, 3, 2, 1]
sort([3, 1, 4, 1, 5])    # [1, 1, 3, 4, 5]
```

### List Comprehensions

A concise way to create lists from other lists:

```arc
let squares = [x * x for x in 1..6]          # [1, 4, 9, 16, 25]
let evens = [x for x in 1..11 if x % 2 == 0]  # [2, 4, 6, 8, 10]
```

### Maps

Maps are key-value pairs — like objects in JavaScript or dicts in Python:

```arc
let user = {name: "Alice", age: 30, active: true}

# Access
user.name       # "Alice"
user["age"]     # 30

# Built-in operations
keys(user)      # ["name", "age", "active"]
values(user)    # ["Alice", 30, true]
```

### Shorthand Syntax

When a variable name matches the key, you can use shorthand:

```arc
let name = "Alice"
let age = 30
let user = {name, age}    # same as {name: "Alice", age: 30}
```

## Ranges

Ranges generate sequences of integers:

```arc
let r = 1..5     # 1, 2, 3, 4 (end-exclusive)
let digits = 0..10
```

Ranges work with `for` loops and comprehensions:

```arc
for i in 1..4 {
  print("Count: {i}")
}
# Count: 1
# Count: 2
# Count: 3
```

## Control Flow

### If / El

`if` in Arc is an *expression* — it returns a value:

```arc
let status = if count > 0 { "active" } el { "empty" }
```

The keyword is `el`, not `else`. Two characters shorter, same meaning:

```arc
if temperature > 30 {
  print("It's hot!")
} el if temperature > 20 {
  print("Nice weather.")
} el {
  print("Bundle up!")
}
```

### For Loops

```arc
for item in items {
  print(item)
}

# With destructuring
for {name, age} in users {
  print("{name} is {age}")
}
```

## Token Comparison: A Full Example

Let's write a small program that processes a list of numbers and prints a summary.

**Arc (≈45 tokens):**
```arc
let nums = [4, -2, 7, 0, -1, 3, 8]
let positives = nums |> filter(x => x > 0)
let total = positives |> reduce(0, (sum, x) => sum + x)
print("Found {len(positives)} positives, sum = {total}")
```

**JavaScript (≈75 tokens):**
```javascript
const nums = [4, -2, 7, 0, -1, 3, 8];
const positives = nums.filter(x => x > 0);
const total = positives.reduce((sum, x) => sum + x, 0);
console.log(`Found ${positives.length} positives, sum = ${total}`);
```

Same logic, ~40% fewer tokens. The savings come from: `let` vs `const`, `print` vs `console.log`, `{expr}` vs `${expr}`, `len()` vs `.length`, and the pipeline operator making the data flow explicit.

## Try It Yourself

### Exercise 1: Personal Greeting
Write a program that stores your name and age in variables, then prints: `"Hi, I'm [name] and I'm [age] years old!"`

### Exercise 2: List Exploration
Create a list of 5 of your favorite foods. Use `len`, `take`, `reverse`, and `join` to:
1. Print how many foods you listed
2. Print the first 3
3. Print all of them in reverse order, joined by " → "

### Exercise 3: Map Practice
Create a map representing a book with keys `title`, `author`, and `pages`. Print a sentence like: `"[title] by [author] is [pages] pages long."`

### Exercise 4: Comprehension Challenge
Using a list comprehension, generate a list of all numbers from 1 to 20 that are divisible by 3. Print the result.

<details>
<summary>Solutions</summary>

**Exercise 1:**
```arc
let name = "Alex"
let age = 28
print("Hi, I'm {name} and I'm {age} years old!")
```

**Exercise 2:**
```arc
let foods = ["pizza", "sushi", "tacos", "ramen", "pasta"]
print("I have {len(foods)} favorites")
print(take(foods, 3))
print(foods |> reverse |> join(" → "))
```

**Exercise 3:**
```arc
let book = {title: "Dune", author: "Frank Herbert", pages: 412}
print("{book.title} by {book.author} is {book.pages} pages long.")
```

**Exercise 4:**
```arc
let divisible = [x for x in 1..21 if x % 3 == 0]
print(divisible)    # [3, 6, 9, 12, 15, 18]
```

</details>

## What's Next?

You now know how to write and run Arc programs, use the REPL, work with variables and types, and manipulate basic data structures. In [Tutorial 2: Functions & Pipelines](02-functions-and-pipelines.md), we'll learn how to organize code into functions and chain operations using Arc's powerful pipeline operator.
