# TODO List Manager
# Demonstrates: lists, mutability, pattern matching, maps, pipelines, string interpolation

let mut todos = []
let mut next_id = 1

fn add_todo(text) {
  let todo = {id: next_id, text: text, done: false}
  todos = todos ++ [todo]
  next_id = next_id + 1
  print("Added: [{todo.id}] {text}")
}

fn remove_todo(id) {
  todos = todos |> filter(t => t.id != id)
  print("Removed todo {id}")
}

fn mark_done(id) {
  todos = todos |> map(t => match t {
    {id: tid} if tid == id => {id: t.id, text: t.text, done: true},
    _ => t
  })
  print("Marked todo {id} as done")
}

fn list_todos() {
  if len(todos) == 0 {
    print("No todos!")
  } el {
    print("--- TODO List ---")
    for t in todos {
      let status = if t.done { "✓" } el { " " }
      print("[{status}] {t.id}. {t.text}")
    }
    let done_count = todos |> filter(t => t.done) |> len
    print("--- {done_count}/{len(todos)} complete ---")
  }
}

# Demo usage
add_todo("Learn Arc syntax")
add_todo("Write examples")
add_todo("Build compiler")
add_todo("Take over the world")

list_todos()

mark_done(1)
mark_done(2)
remove_todo(4)

list_todos()

# Filter views with pipelines
let pending = todos |> filter(t => not t.done)
print("Pending: {len(pending)}")

let done = todos |> filter(t => t.done) |> map(t => t.text)
print("Completed: {done}")
