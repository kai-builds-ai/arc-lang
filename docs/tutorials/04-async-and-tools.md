# Tutorial 4: Async & Tool Calls

Arc was designed for AI agents, and agents live on the internet. This tutorial covers Arc's first-class support for HTTP requests, parallel operations, and robust error handling.

---

## Tool Calls: The `@` Syntax

In most languages, making an HTTP request requires importing a library, creating a client, serializing data, handling promises, and parsing the response. In Arc, it's one line:

```arc
let user = @GET "api/users/42"
```

That's it. No imports, no setup, no `.then()` chains. The `@` prefix marks a **tool call** — a first-class operation that Arc handles natively.

### HTTP Methods

```arc
# GET — fetch data
let users = @GET "api/users"
let user = @GET "api/users/{id}"

# POST — create data
let created = @POST "api/users" {name: "Alice", role: "admin"}

# PUT — update data
@PUT "api/users/{id}" {name: "Alice", role: "superadmin"}

# DELETE — remove data
@DELETE "api/users/{id}"
```

The body is passed directly as a map — no `JSON.stringify`, no `Content-Type` header. Arc handles serialization automatically.

### Compared to JavaScript

**JavaScript (fetch):**
```javascript
const response = await fetch("https://api.example.com/users/42", {
  method: "GET",
  headers: { "Content-Type": "application/json" }
});
const user = await response.json();
```

**JavaScript (axios):**
```javascript
const { data: user } = await axios.get("https://api.example.com/users/42");
```

**Arc:**
```arc
let user = @GET "api/users/42"
```

One line. ~5 tokens vs ~25-40 in JavaScript. When your agent makes hundreds of API calls, this adds up dramatically.

### POST with Data

**JavaScript:**
```javascript
const response = await fetch("https://api.example.com/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: "hello", channel: "general" })
});
const result = await response.json();
```

**Arc:**
```arc
let result = @POST "api/messages" {text: "hello", channel: "general"}
```

The map after the URL is the body. Arc serializes it, sets the headers, awaits the response, and parses the result.

## Async / Await

### Auto-Await

Most async operations in Arc are **auto-awaited**. When you call a function that returns a future, Arc waits for it automatically:

```arc
let user = fetch_user(id)      # auto-awaited
let posts = get_posts(user.id) # auto-awaited
print(posts)
```

No `await` keyword cluttering every line. The code reads synchronously, but executes asynchronously under the hood.

### When You Need Explicit Async

Sometimes you want to start work without waiting. Use `async` to create a task:

```arc
let task = async { heavy_computation(data) }

# ... do other work ...

let result = await task    # now wait for it
```

### Async Functions

```arc
pub async fn fetch_user(id: Int) -> Result<User> {
  @GET "api/users/{id}"
}
```

The `async` keyword marks a function whose body may contain asynchronous operations.

## Parallel Fetch

This is one of Arc's killer features. Fetch multiple resources **concurrently** with a single construct:

```arc
let [users, posts, stats] = fetch [
  @GET "api/users",
  @GET "api/posts?limit=10",
  @GET "api/stats/today"
]
```

All three requests fire simultaneously. Arc waits for all of them to complete, then destructures the results into three variables.

### Compared to JavaScript

**JavaScript:**
```javascript
const [users, posts, stats] = await Promise.all([
  fetch("https://api.example.com/users").then(r => r.json()),
  fetch("https://api.example.com/posts?limit=10").then(r => r.json()),
  fetch("https://api.example.com/stats/today").then(r => r.json())
]);
```

**Arc:**
```arc
let [users, posts, stats] = fetch [
  @GET "api/users",
  @GET "api/posts?limit=10",
  @GET "api/stats/today"
]
```

Fewer tokens, less ceremony, same parallelism.

### Building a Dashboard

Here's a real-world example — fetching all data needed for a dashboard:

```arc
fn load_dashboard(user_id) {
  let [profile, notifications, feed, weather] = fetch [
    @GET "api/users/{user_id}",
    @GET "api/notifications?unread=true",
    @GET "api/feed?limit=20",
    @GET "api/weather?city={profile.city}"
  ]

  {
    greeting: "Welcome back, {profile.name}!",
    unread: len(notifications),
    top_stories: feed |> take(5) |> map(s => s.title),
    weather: weather.summary
  }
}
```

Four parallel requests, destructured results, and a clean summary object — all in about 15 lines.

## Error Handling with `result`

Network calls fail. APIs return errors. Data is missing. Arc handles this with the `Result` type and the `result` module.

### The Result Type

Every operation that can fail returns a `Result`, which is either `Ok(value)` or `Err(message)`:

```arc
use result

let r = result.ok(42)         # Ok(42)
let e = result.err("timeout") # Err("timeout")

result.is_ok(r)    # true
result.is_err(e)   # true
```

### Pattern Matching on Results

The idiomatic way to handle results is pattern matching:

```arc
match @GET "api/users/{id}" {
  Ok(user) => print("Found: {user.name}"),
  Err(msg) => print("Error: {msg}")
}
```

No try/catch, no exception handling. The error is a value you can inspect, match, and pass around.

### The `?` Operator

For functions that should propagate errors upward, use `?`:

```arc
fn get_user_posts(id) {
  let user = @GET "api/users/{id}"?          # propagate error if fails
  let posts = @GET "api/posts?author={id}"?  # propagate error if fails
  {user, posts}                               # return both on success
}
```

If either request fails, the function immediately returns the `Err`. No nesting, no early returns — just `?`.

### Error Chaining with Pipelines

```arc
use result

let username = @GET "api/users/{id}"
  |> result.map(user => user.name)
  |> result.unwrap_or("Unknown")
```

This says: fetch the user, if successful extract the name, if anything failed use "Unknown". Clean and linear.

### The `try_fn` Pattern

For wrapping operations that might throw:

```arc
use result

let data = result.try_fn(() => parse(raw_input))

match data {
  Ok(parsed) => process(parsed),
  Err(msg) => print("Parse error: {msg}")
}
```

### Nil Coalescing

For simpler cases where you just need a fallback:

```arc
let name = user?.name ? "Anonymous"
let port = config?.server?.port ? 8080
```

The `?.` is optional chaining (returns `nil` if any part is missing), and `?` provides a default value.

## Building an API Client

Let's put it all together and build a complete API client for a todo-list service.

```arc
use result
use json

# Configuration
let BASE = "api.todos.example.com/v1"

# Fetch all todos for a user
fn get_todos(user_id) {
  @GET "{BASE}/users/{user_id}/todos"
}

# Create a new todo
fn create_todo(user_id, title) {
  @POST "{BASE}/users/{user_id}/todos" {
    title: title,
    completed: false
  }
}

# Toggle a todo's completion status
fn toggle_todo(user_id, todo_id) {
  let todo = @GET "{BASE}/todos/{todo_id}"?
  @PUT "{BASE}/todos/{todo_id}" {
    completed: !todo.completed
  }
}

# Get a summary of a user's todos
fn todo_summary(user_id) {
  let todos = get_todos(user_id)?

  let completed = todos |> filter(t => t.completed)
  let pending = todos |> filter(t => !t.completed)

  {
    total: len(todos),
    done: len(completed),
    pending: len(pending),
    next: pending |> take(3) |> map(t => t.title),
    progress: "{len(completed) * 100 / len(todos)}%"
  }
}

# Main flow
fn main() {
  let summary = todo_summary("user_123")

  match summary {
    Ok(s) => {
      print("Progress: {s.progress}")
      print("Next up:")
      for title in s.next {
        print("  • {title}")
      }
    },
    Err(msg) => print("Failed to load todos: {msg}")
  }
}
```

**Token count comparison:**

| | Arc | JavaScript |
|---|---|---|
| API client (5 functions) | ~180 tokens | ~350 tokens |
| Savings | — | ~49% more tokens |

The savings come from: no `async/await` ceremony, `@` tool calls, string interpolation, pipeline operators, pattern matching instead of try/catch, and implicit returns.

## Custom Tools

The `@` syntax isn't limited to HTTP. It's a general tool call mechanism:

```arc
# LLM calls
let summary = @llm("Summarize this article: {text}")

# Shell commands
let files = @shell("ls -la")

# Database queries
let users = @db("SELECT * FROM users WHERE active = true")
```

The tool prefix after `@` determines the handler. HTTP methods (`GET`, `POST`, `PUT`, `DELETE`) are built-in. Other tools can be registered by the runtime.

## Try It Yourself

### Exercise 1: Simple Fetch
Write a function that fetches a user by ID and returns their name, or "Unknown" if the fetch fails.

### Exercise 2: Parallel Dashboard
Write a function `weather_report(cities)` that takes a list of city names, fetches weather for all of them in parallel, and returns a formatted report:
```
NYC: 72°F, Sunny
London: 58°F, Cloudy
Tokyo: 68°F, Clear
```

### Exercise 3: Error Pipeline
Write a chain that: fetches a user, extracts their email, validates it's not empty, and returns a formatted string — all using `|>` and `result.map`. Handle every possible failure.

### Exercise 4: CRUD Client
Build a complete CRUD client for a "notes" API with functions: `list_notes()`, `get_note(id)`, `create_note(title, body)`, `update_note(id, changes)`, `delete_note(id)`. Include error handling.

<details>
<summary>Solutions</summary>

**Exercise 1:**
```arc
use result

fn get_username(id) {
  @GET "api/users/{id}"
    |> result.map(u => u.name)
    |> result.unwrap_or("Unknown")
}
```

**Exercise 2:**
```arc
fn weather_report(cities) {
  let results = fetch(cities |> map(c => @GET "api/weather?city={c}"))

  results
    |> map(w => "{w.city}: {w.temp}°F, {w.condition}")
    |> join("\n")
}
```

**Exercise 3:**
```arc
use result

fn get_user_email(id) {
  @GET "api/users/{id}"
    |> result.map(u => u.email)
    |> result.flat_map(email =>
      if len(email) > 0 { result.ok(email) }
      el { result.err("empty email") }
    )
    |> result.map(email => "Contact: <{email}>")
}
```

**Exercise 4:**
```arc
let BASE = "api.notes.example.com/v1"

fn list_notes() => @GET "{BASE}/notes"
fn get_note(id) => @GET "{BASE}/notes/{id}"
fn create_note(title, body) => @POST "{BASE}/notes" {title, body}
fn update_note(id, changes) => @PUT "{BASE}/notes/{id}" changes
fn delete_note(id) => @DELETE "{BASE}/notes/{id}"

# Usage with error handling
fn show_note(id) {
  match get_note(id) {
    Ok(note) => print("# {note.title}\n\n{note.body}"),
    Err(msg) => print("Could not load note: {msg}")
  }
}
```

</details>

## What's Next?

You now know how to make API calls, handle concurrency, and manage errors in Arc. In [Tutorial 5: Modules & Packages](05-modules-and-packages.md), we'll learn how to organize your code into reusable modules.
