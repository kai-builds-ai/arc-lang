// Arc Playground — Example Programs

const ARC_EXAMPLES = [
  {
    title: "👋 Hello World",
    code: `# Hello World in Arc

let name = "World"
print("Hello, {name}!")

# Basic math
fn add(a, b) => a + b
let result = add(3, 4)
print("3 + 4 = {result}")

# Lists and pipelines
let numbers = [1, 2, 3, 4, 5]
let doubled = numbers |> map(x => x * 2)
print("Doubled: {doubled}")

let total = numbers |> sum
print("Sum: {total}")
`
  },
  {
    title: "🔢 Fibonacci",
    code: `# Fibonacci — Recursive and Iterative

fn fib_rec(n) => match n {
  0 => 0,
  1 => 1,
  n => fib_rec(n - 1) + fib_rec(n - 2)
}

fn fib_iter(n) {
  let mut a = 0
  let mut b = 1
  for _ in 0..n {
    let temp = b
    b = a + b
    a = temp
  }
  a
}

print("Recursive fib(10): {fib_rec(10)}")
print("Iterative fib(10): {fib_iter(10)}")

let sequence = 0..10 |> map(fib_iter)
print("First 10: {sequence}")
`
  },
  {
    title: "🍺 FizzBuzz",
    code: `# FizzBuzz — The Arc Way

fn fizzbuzz(n) => match [n % 3, n % 5] {
  [0, 0] => "FizzBuzz",
  [0, _] => "Fizz",
  [_, 0] => "Buzz",
  _ => "{n}"
}

1..21 |> map(fizzbuzz) |> each(print)
`
  },
  {
    title: "🔀 Pipelines",
    code: `# Data processing with pipelines

let data = [5, 3, 8, 1, 9, 2, 7, 4, 6]

let result = data
  |> filter(x => x > 3)
  |> map(x => x * 10)
  |> sort

print("Processed: {result}")

let total = data |> sum
let count = data |> len
print("Sum: {total}, Count: {count}")

# List comprehension
let squares = [x * x for x in data if x > 3]
print("Squares of >3: {squares}")

# String processing
let words = "hello world foo bar"
let upper_words = words |> split(" ") |> map(w => upper(w)) |> join(", ")
print("Upper: {upper_words}")
`
  },
  {
    title: "🎯 Pattern Matching",
    code: `# Pattern Matching in Arc

fn describe(val) => match val {
  0 => "zero",
  1 => "one",
  n if n < 0 => "negative: {n}",
  n if n > 100 => "big: {n}",
  _ => "other"
}

print(describe(0))
print(describe(1))
print(describe(-5))
print(describe(200))
print(describe(42))

# Match on arrays
fn classify(pair) => match pair {
  [0, 0] => "origin",
  [0, _] => "y-axis",
  [_, 0] => "x-axis",
  _ => "general point"
}

print(classify([0, 0]))
print(classify([0, 5]))
print(classify([3, 0]))
print(classify([1, 2]))

# If/el expressions
let x = 42
let size = if x > 100 { "huge" } el if x > 10 { "medium" } el { "small" }
print("x={x} is {size}")
`
  },
  {
    title: "🤖 Mini Agent",
    code: `# Mini Agent — Tool Calls (mocked in playground)

print("=== Arc Agent Demo ===")

# Tool calls return mock data
let weather = @GET "api/weather/nyc"
print("Weather: {weather}")

let users = @GET "api/users"
print("Users: {users}")

# Process the data
let greeting = "Hello from Arc!"
print(greeting)

# Math + pipelines
let scores = [85, 92, 78, 95, 88]
let avg = scores |> sum
let count = scores |> len
print("Average score: {avg / count}")
print("Top scores: {scores |> filter(s => s >= 90) |> sort}")
`
  }
  {
    title: "🧠 Prompt Engineering (AI-Native)",
    code: `# Prompt Engineering — AI Agent Patterns

# Build structured chat messages
fn system(text) => {role: "system", content: text}
fn user(text) => {role: "user", content: text}
fn assistant(text) => {role: "assistant", content: text}

let messages = [
  system("You are a helpful coding assistant."),
  user("What is Arc?"),
  assistant("Arc is a language designed for AI agents."),
  user("Show me a pipeline example.")
]

# Format as chat transcript
for msg in messages {
  print("[{msg.role}]: {msg.content}")
}

# Token estimation (~4 chars per token)
fn estimate_tokens(text) => len(text) / 4

let prompt = messages |> map(m => m.content) |> join(" ")
let tokens = estimate_tokens(prompt)
print("")
print("Estimated tokens: {tokens}")
print("Estimated cost at $3/1M tokens: ${tokens * 3 / 1000000}")
`
  },
  {
    title: "🔍 Vector Similarity (AI-Native)",
    code: `# Vector Similarity — RAG Building Blocks

fn dot(a, b) {
  let mut sum = 0
  for i in 0..len(a) { sum = sum + a[i] * b[i] }
  sum
}

fn magnitude(v) {
  let mut sum = 0
  for x in v { sum = sum + x * x }
  use math
  math.sqrt(sum)
}

fn cosine(a, b) => dot(a, b) / (magnitude(a) * magnitude(b))

let query = [1.0, 0.8, 0.2, 0.0]
let doc_a = [0.9, 0.7, 0.3, 0.1]
let doc_b = [0.1, 0.0, 0.8, 0.9]
let doc_c = [0.95, 0.85, 0.15, 0.0]

print("Query vs Doc A: {cosine(query, doc_a)}")
print("Query vs Doc B: {cosine(query, doc_b)}")
print("Query vs Doc C: {cosine(query, doc_c)}")

let docs = [
  {id: "intro", vec: doc_a},
  {id: "unrelated", vec: doc_b},
  {id: "best_match", vec: doc_c}
]

let ranked = docs
  |> map(d => {id: d.id, score: cosine(query, d.vec)})
  |> sort_by(d => 0 - d.score)

print("")
print("Search results:")
for doc in ranked {
  print("  {doc.id}: {doc.score}")
}
`
  },
  {
    title: "💾 Agent Memory (AI-Native)",
    code: `# Agent Memory — State Management

let mut memory = {}

fn remember(key, value) { memory[key] = value }
fn recall(key) { memory[key] }

remember("user:name", "Kai")
remember("user:lang", "Arc")
remember("topic", "AI agents")

print("Memory:")
for k in keys(memory) {
  print("  {k} = {recall(k)}")
}

# Conversation history
let mut history = []
fn add_message(role, text) {
  history = push(history, {role: role, content: text})
}

add_message("user", "What can Arc do?")
add_message("assistant", "Arc is great for AI agents!")
add_message("user", "Show me pipelines")

print("")
print("Conversation:")
for msg in history {
  print("  [{msg.role}] {msg.content}")
}
`
  }
];
