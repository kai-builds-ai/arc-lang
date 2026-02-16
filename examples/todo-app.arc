// =============================================================================
// todo-app.arc — Full TODO Application
// =============================================================================
// Demonstrates: fn, let, mut, match, |>, =>, pub, import, @GET/@POST, closures,
// higher-order functions, string interpolation, pattern matching, json, io,
// datetime, regex, collections, async/await
// =============================================================================

import json
import io
import datetime
import regex
import collections

// --- Priority levels ---
pub enum Priority {
  Critical,
  High,
  Medium,
  Low,
  None,
}

pub fn priority_value(p: Priority) -> int {
  match p {
    Priority::Critical => 4
    Priority::High => 3
    Priority::Medium => 2
    Priority::Low => 1
    Priority::None => 0
  }
}

pub fn priority_from_str(s: str) -> Priority {
  match s |> str::to_lower() {
    "critical" => Priority::Critical
    "high" => Priority::High
    "medium" => Priority::Medium
    "low" => Priority::Low
    _ => Priority::None
  }
}

pub fn priority_label(p: Priority) -> str {
  match p {
    Priority::Critical => "🔴 CRITICAL"
    Priority::High => "🟠 HIGH"
    Priority::Medium => "🟡 MEDIUM"
    Priority::Low => "🟢 LOW"
    Priority::None => "⚪ NONE"
  }
}

// --- Todo status ---
pub enum Status {
  Pending,
  InProgress,
  Done,
  Cancelled,
}

pub fn status_icon(s: Status) -> str {
  match s {
    Status::Pending => "○"
    Status::InProgress => "◐"
    Status::Done => "●"
    Status::Cancelled => "✗"
  }
}

// --- Todo item ---
pub struct Todo {
  id: int,
  title: str,
  description: str,
  priority: Priority,
  status: Status,
  due_date: datetime?,
  tags: list,
  created_at: datetime,
  updated_at: datetime,
  completed_at: datetime?,
}

// --- Todo store ---
pub struct TodoStore {
  mut todos: list,
  mut next_id: int,
  storage_path: str,
}

pub fn new_store(path: str) -> TodoStore {
  TodoStore {
    todos: [],
    next_id: 1,
    storage_path: path,
  }
}

// --- CRUD Operations ---

// Create
pub fn add(store: mut TodoStore, title: str, opts: map) -> Todo {
  let now = datetime::now()
  let todo = Todo {
    id: store.next_id,
    title: title,
    description: opts["description"] ?? "",
    priority: opts["priority"] ?? Priority::None,
    status: Status::Pending,
    due_date: opts["due_date"] ?? null,
    tags: opts["tags"] ?? [],
    created_at: now,
    updated_at: now,
    completed_at: null,
  }

  store.todos = store.todos |> append(todo)
  store.next_id = store.next_id + 1
  todo
}

// Read
pub fn get(store: TodoStore, id: int) -> Todo? {
  store.todos |> find_by(fn(t) => t.id == id)
}

pub fn list_all(store: TodoStore) -> list {
  store.todos
}

// Update
pub fn update(store: mut TodoStore, id: int, updates: map) -> Todo? {
  let mut found = null
  store.todos = store.todos |> map(fn(todo) {
    if todo.id == id {
      let updated = Todo {
        ...todo,
        title: updates["title"] ?? todo.title,
        description: updates["description"] ?? todo.description,
        priority: updates["priority"] ?? todo.priority,
        tags: updates["tags"] ?? todo.tags,
        due_date: updates["due_date"] ?? todo.due_date,
        updated_at: datetime::now(),
      }
      found = updated
      updated
    } else {
      todo
    }
  })
  found
}

// Delete
pub fn remove(store: mut TodoStore, id: int) -> bool {
  let before = len(store.todos)
  store.todos = store.todos |> filter(fn(t) => t.id != id)
  len(store.todos) < before
}

// --- Status transitions ---
pub fn start(store: mut TodoStore, id: int) -> Todo? {
  set_status(store, id, Status::InProgress)
}

pub fn complete(store: mut TodoStore, id: int) -> Todo? {
  let now = datetime::now()
  store.todos = store.todos |> map(fn(todo) {
    if todo.id == id {
      Todo { ...todo, status: Status::Done, completed_at: now, updated_at: now }
    } else { todo }
  })
  get(store, id)
}

pub fn cancel(store: mut TodoStore, id: int) -> Todo? {
  set_status(store, id, Status::Cancelled)
}

fn set_status(store: mut TodoStore, id: int, status: Status) -> Todo? {
  store.todos = store.todos |> map(fn(todo) {
    if todo.id == id {
      Todo { ...todo, status: status, updated_at: datetime::now() }
    } else { todo }
  })
  get(store, id)
}

// --- Filtering ---
pub fn filter_by_status(store: TodoStore, status: Status) -> list {
  store.todos |> filter(fn(t) => t.status == status)
}

pub fn filter_by_priority(store: TodoStore, priority: Priority) -> list {
  store.todos |> filter(fn(t) => t.priority == priority)
}

pub fn filter_by_tag(store: TodoStore, tag: str) -> list {
  store.todos |> filter(fn(t) => t.tags |> contains(tag))
}

pub fn filter_overdue(store: TodoStore) -> list {
  let now = datetime::now()
  store.todos |> filter(fn(t) => {
    t.due_date != null && t.status != Status::Done && t.status != Status::Cancelled
      && datetime::is_before(t.due_date, now)
  })
}

pub fn filter_due_today(store: TodoStore) -> list {
  let today = datetime::today()
  let tomorrow = today |> datetime::add_days(1)
  store.todos |> filter(fn(t) => {
    t.due_date != null
      && datetime::is_after(t.due_date, today)
      && datetime::is_before(t.due_date, tomorrow)
  })
}

// --- Search ---
pub fn search(store: TodoStore, query: str) -> list {
  let pattern = regex::compile(query, "i")
  store.todos |> filter(fn(t) => {
    regex::test(pattern, t.title) || regex::test(pattern, t.description)
  })
}

// --- Sorting ---
pub fn sort_by_priority(todos: list) -> list {
  todos |> collections::sort_by(fn(a, b) => {
    priority_value(b.priority) - priority_value(a.priority)
  })
}

pub fn sort_by_due_date(todos: list) -> list {
  todos |> collections::sort_by(fn(a, b) => {
    let a_ms = if a.due_date != null { datetime::to_epoch_ms(a.due_date) } else { 9999999999999 }
    let b_ms = if b.due_date != null { datetime::to_epoch_ms(b.due_date) } else { 9999999999999 }
    a_ms - b_ms
  })
}

pub fn sort_by_created(todos: list) -> list {
  todos |> collections::sort_by(fn(a, b) => {
    datetime::to_epoch_ms(b.created_at) - datetime::to_epoch_ms(a.created_at)
  })
}

// --- Statistics ---
pub fn stats(store: TodoStore) -> map {
  let todos = store.todos
  let total = len(todos)
  let pending = todos |> filter(fn(t) => t.status == Status::Pending) |> len()
  let in_progress = todos |> filter(fn(t) => t.status == Status::InProgress) |> len()
  let done = todos |> filter(fn(t) => t.status == Status::Done) |> len()
  let cancelled = todos |> filter(fn(t) => t.status == Status::Cancelled) |> len()
  let overdue = filter_overdue(store) |> len()

  let completion_rate = if total > 0 {
    (done |> to_float()) / (total |> to_float()) * 100.0
  } else { 0.0 }

  let by_priority = todos |> reduce({}, fn(acc, t) => {
    let key = priority_label(t.priority)
    let count = acc[key] ?? 0
    acc |> map::set(key, count + 1)
  })

  let avg_completion_ms = todos
    |> filter(fn(t) => t.completed_at != null)
    |> map(fn(t) => datetime::diff_ms(t.completed_at, t.created_at))
    |> collections::average() ?? 0

  {
    "total": total,
    "pending": pending,
    "in_progress": in_progress,
    "done": done,
    "cancelled": cancelled,
    "overdue": overdue,
    "completion_rate": completion_rate,
    "by_priority": by_priority,
    "avg_completion_hours": avg_completion_ms / 3600000.0,
  }
}

// --- Persistence ---
pub fn save(store: TodoStore) {
  let data = store.todos |> map(fn(t) => {
    {
      "id": t.id,
      "title": t.title,
      "description": t.description,
      "priority": "{t.priority}",
      "status": "{t.status}",
      "due_date": if t.due_date != null { datetime::to_iso(t.due_date) } else { null },
      "tags": t.tags,
      "created_at": datetime::to_iso(t.created_at),
      "updated_at": datetime::to_iso(t.updated_at),
      "completed_at": if t.completed_at != null { datetime::to_iso(t.completed_at) } else { null },
    }
  })
  let json_str = json::stringify(data, 2)
  io::write_file(store.storage_path, json_str)
}

pub fn load(store: mut TodoStore) {
  if io::exists(store.storage_path) {
    let content = io::read_file(store.storage_path)
    let data = json::parse(content)
    store.todos = data |> map(fn(item) => Todo {
      id: item["id"],
      title: item["title"],
      description: item["description"],
      priority: priority_from_str(item["priority"]),
      status: match item["status"] {
        "Pending" => Status::Pending
        "InProgress" => Status::InProgress
        "Done" => Status::Done
        "Cancelled" => Status::Cancelled
        _ => Status::Pending
      },
      due_date: if item["due_date"] != null { datetime::from_iso(item["due_date"]) } else { null },
      tags: item["tags"],
      created_at: datetime::from_iso(item["created_at"]),
      updated_at: datetime::from_iso(item["updated_at"]),
      completed_at: if item["completed_at"] != null { datetime::from_iso(item["completed_at"]) } else { null },
    })
    store.next_id = store.todos
      |> map(fn(t) => t.id)
      |> collections::max() + 1
  }
}

// --- Display ---
pub fn format_todo(t: Todo) -> str {
  let icon = status_icon(t.status)
  let prio = priority_label(t.priority)
  let due = if t.due_date != null {
    " 📅 {datetime::format(t.due_date, "MMM DD")}"
  } else { "" }
  let tags_str = if len(t.tags) > 0 {
    " [{t.tags |> str::join(", ")}]"
  } else { "" }

  "{icon} #{t.id} {t.title} ({prio}){due}{tags_str}"
}

pub fn print_list(todos: list, header: str) {
  print("\n=== {header} ({len(todos)}) ===")
  if len(todos) == 0 {
    print("  (empty)")
  } else {
    todos |> each(fn(t) {
      print("  {format_todo(t)}")
    })
  }
}

// --- Demo ---
fn main() {
  let mut store = new_store("todos.json")

  // Add todos
  add(store, "Design API schema", {
    "priority": Priority::Critical,
    "due_date": datetime::now() |> datetime::add_days(2),
    "tags": ["backend", "api"],
    "description": "Design the REST API schema for v2",
  })

  add(store, "Write unit tests", {
    "priority": Priority::High,
    "due_date": datetime::now() |> datetime::add_days(5),
    "tags": ["testing"],
  })

  add(store, "Update documentation", {
    "priority": Priority::Medium,
    "tags": ["docs"],
  })

  add(store, "Fix login bug", {
    "priority": Priority::Critical,
    "due_date": datetime::now() |> datetime::add_hours(-2),
    "tags": ["bug", "auth"],
  })

  add(store, "Refactor database layer", {
    "priority": Priority::Low,
    "due_date": datetime::now() |> datetime::add_days(14),
    "tags": ["backend", "tech-debt"],
  })

  // Change statuses
  start(store, 1)
  complete(store, 3)

  // Display
  print_list(list_all(store), "All Todos")
  print_list(filter_overdue(store), "⚠ Overdue")
  print_list(filter_by_tag(store, "backend") |> sort_by_priority(), "Backend Tasks")
  print_list(search(store, "bug|test"), "Search: bug|test")

  // Statistics
  let s = stats(store)
  print("\n=== Statistics ===")
  print("  Total: {s["total"]}")
  print("  Pending: {s["pending"]} | In Progress: {s["in_progress"]}")
  print("  Done: {s["done"]} | Cancelled: {s["cancelled"]}")
  print("  Overdue: {s["overdue"]}")
  print("  Completion rate: {s["completion_rate"]}%")
  print("  By priority: {s["by_priority"]}")

  // Save
  save(store)
  print("\nSaved to {store.storage_path}")
}
