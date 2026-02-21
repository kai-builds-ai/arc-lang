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
    title: "🧠 Prompt Templates (AI-Native)",
    code: `# Prompt Templates — Arc's AI-Native Stdlib
use prompt

# Build a prompt template
let template = "You are a {role}. The user says: {message}"
let filled = prompt.fill(template, {
  role: "helpful assistant",
  message: "What is Arc?"
})
print(filled)

# Token counting — know your costs
let text = "Arc is a language designed for AI agents with token efficiency"
let tokens = prompt.count_tokens(text)
print("Token count: {tokens}")

# Context windowing — fit prompts into model limits
let messages = [
  "First message from user",
  "Response from assistant",
  "Follow-up question",
  "Another response",
  "Final question"
]
let windowed = prompt.window(messages, 20)
print("Windowed to fit: {windowed}")
`
  },
  {
    title: "🔍 Embeddings & Similarity (AI-Native)",
    code: `# Embeddings & Similarity Search
use embed

# Cosine similarity between vectors
let vec_a = [1.0, 0.5, 0.0, 0.3]
let vec_b = [0.9, 0.6, 0.1, 0.2]
let vec_c = [0.0, 0.0, 1.0, 0.0]

let sim_ab = embed.cosine(vec_a, vec_b)
let sim_ac = embed.cosine(vec_a, vec_c)
print("Similarity A↔B: {sim_ab}")
print("Similarity A↔C: {sim_ac}")
print("A and B are more similar!")

# Find most similar from a collection
let query = [1.0, 0.5, 0.0, 0.3]
let docs = [
  [0.9, 0.6, 0.1, 0.2],
  [0.0, 0.0, 1.0, 0.0],
  [0.8, 0.4, 0.1, 0.4]
]
let best = embed.most_similar(query, docs)
print("Most similar index: {best}")

# Chunk text for embedding
let text = "Arc is a programming language. It was designed for AI agents. It uses pipelines and pattern matching."
let chunks = embed.chunk(text, 50)
print("Chunks: {chunks}")
`
  },
  {
    title: "💾 Persistent Store (AI-Native)",
    code: `# Persistent Key-Value Store
use store

# Set values
store.set("user:name", "Roger")
store.set("user:lang", "Arc")
store.set("counter", 0)

# Get values
let name = store.get("user:name")
let lang = store.get("user:lang")
print("User: {name}, Language: {lang}")

# Update counter
let mut count = store.get("counter")
count = count + 1
store.set("counter", count)
print("Visit count: {count}")

# Check existence
print("Has user:name? {store.has("user:name")}")
print("Has missing? {store.has("nope")}")

# List all keys
let keys = store.keys()
print("All keys: {keys}")

# Delete
store.del("counter")
print("After delete, keys: {store.keys()}")
`
  }
];
