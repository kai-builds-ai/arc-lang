# Learn Arc: Async & Tool Calls
# Extracted from Tutorial 4 — @GET/@POST, parallel fetch, Result handling

# --- Tool Calls ---
let user = @GET "api/users/42"
let created = @POST "api/users" {name: "Alice", role: "admin"}
@PUT "api/users/{id}" {name: "Alice", role: "superadmin"}
@DELETE "api/users/{id}"

# --- Parallel Fetch ---
let [users, posts, stats] = fetch [
  @GET "api/users",
  @GET "api/posts?limit=10",
  @GET "api/stats/today"
]

# --- Dashboard with parallel fetch ---
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

# --- Error Handling with Result ---
use result

match @GET "api/users/{id}" {
  Ok(user) => print("Found: {user.name}"),
  Err(msg) => print("Error: {msg}")
}

# --- ? Operator for error propagation ---
fn get_user_posts(id) {
  let user = @GET "api/users/{id}"?
  let posts = @GET "api/posts?author={id}"?
  {user, posts}
}

# --- Error chaining with pipelines ---
let username = @GET "api/users/{id}"
  |> result.map(user => user.name)
  |> result.unwrap_or("Unknown")

# --- Nil coalescing ---
let name = user?.name ? "Anonymous"
let port = config?.server?.port ? 8080

# --- Complete API Client ---
let BASE = "api.todos.example.com/v1"

fn get_todos(user_id) {
  @GET "{BASE}/users/{user_id}/todos"
}

fn create_todo(user_id, title) {
  @POST "{BASE}/users/{user_id}/todos" {
    title: title,
    completed: false
  }
}

fn toggle_todo(user_id, todo_id) {
  let todo = @GET "{BASE}/todos/{todo_id}"?
  @PUT "{BASE}/todos/{todo_id}" {
    completed: !todo.completed
  }
}

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

# --- Custom Tools ---
let summary = @llm("Summarize this article: {text}")
let files = @shell("ls -la")
let users = @db("SELECT * FROM users WHERE active = true")
