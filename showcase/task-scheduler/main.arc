# Task Scheduler & Workflow Orchestration
# Demonstrates: pattern matching, pipelines, closures, recursion

# --- Task Creation ---

fn create_task(name, priority, deps) => {
  name: name,
  state: "pending",
  priority: priority,
  dependencies: deps,
  result: nil
}

# --- Task State Transitions ---

fn transition(task, event) => match event {
  "start" => {
    name: task.name, state: "running", priority: task.priority,
    dependencies: task.dependencies, result: nil
  },
  "complete" => {
    name: task.name, state: "completed", priority: task.priority,
    dependencies: task.dependencies, result: "done"
  },
  "fail" => {
    name: task.name, state: "failed", priority: task.priority,
    dependencies: task.dependencies, result: "error"
  },
  _ => task
}

# --- Dependency Resolution ---

fn all_deps_met(task, completed) {
  let deps = task.dependencies
  if len(deps) == 0 { ret true }
  let met = deps |> filter(d => contains(completed, d))
  len(met) == len(deps)
}

fn get_ready_tasks(tasks, completed) {
  tasks
    |> filter(t => t.state == "pending")
    |> filter(t => all_deps_met(t, completed))
    |> sort
}

# --- Task Execution ---

fn execute_task(task) {
  print("  Running: {task.name} (priority {task.priority})")
  let started = transition(task, "start")
  # Simulate execution
  let completed = transition(started, "complete")
  print("  Completed: {completed.name}")
  completed
}

# --- Scheduler Engine ---

fn run_wave(tasks, completed) {
  let ready = get_ready_tasks(tasks, completed)
  if len(ready) == 0 { ret { tasks: tasks, completed: completed } }

  print("Wave: executing {len(ready)} tasks")

  let mut updated_tasks = tasks
  let mut new_completed = completed

  for task in ready {
    let result = execute_task(task)
    new_completed = push(new_completed, result.name)
    updated_tasks = updated_tasks |> map(t => {
      if t.name == result.name { result } el { t }
    })
  }

  # Recurse for next wave
  run_wave(updated_tasks, new_completed)
}

fn run_scheduler(tasks) {
  print("=== Task Scheduler ===")
  print("Tasks: {len(tasks)}")
  print("")
  let result = run_wave(tasks, [])
  result
}

# --- Report ---

fn generate_report(tasks) {
  let completed = tasks |> filter(t => t.state == "completed") |> len
  let failed = tasks |> filter(t => t.state == "failed") |> len
  let pending = tasks |> filter(t => t.state == "pending") |> len
  print("")
  print("=== Report ===")
  print("Completed: {completed}")
  print("Failed: {failed}")
  print("Pending: {pending}")
}

# --- Demo: DAG Workflow ---
# build -> lint -> test -> deploy
#           \-> analyze -/

let build = create_task("build", 1, [])
let lint = create_task("lint", 2, ["build"])
let analyze = create_task("analyze", 2, ["build"])
let test = create_task("test", 3, ["lint", "analyze"])
let deploy = create_task("deploy", 4, ["test"])

let tasks = [build, lint, analyze, test, deploy]
let result = run_scheduler(tasks)
generate_report(result.tasks)
