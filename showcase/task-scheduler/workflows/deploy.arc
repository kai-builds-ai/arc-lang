# Deploy Workflow
# Demonstrates: sequential task execution with dependency checking

fn create_step(name, deps) => { name: name, deps: deps, status: "pending" }

fn run_step(step) {
  print("  [{step.name}] Starting...")
  # Simulate deployment step
  print("  [{step.name}] Complete")
  { name: step.name, deps: step.deps, status: "done" }
}

fn all_deps_done(step, results) {
  let deps = step.deps
  if len(deps) == 0 { ret true }
  let done = deps |> filter(d => {
    let found = results |> filter(r => r.name == d and r.status == "done")
    len(found) > 0
  })
  len(done) == len(deps)
}

fn run_workflow(steps) {
  let mut results = []
  let mut remaining = steps

  fn process() {
    let ready = remaining |> filter(s => s.status == "pending" and all_deps_done(s, results))
    if len(ready) == 0 { ret nil }

    for step in ready {
      let result = run_step(step)
      results = push(results, result)
      remaining = remaining |> map(s => if s.name == step.name { result } el { s })
    }
    process()
  }

  process()
  results
}

# --- Deploy Pipeline ---
print("=== Deploy Workflow ===")

let steps = [
  create_step("checkout", []),
  create_step("build", ["checkout"]),
  create_step("test", ["build"]),
  create_step("stage", ["test"]),
  create_step("deploy", ["stage"]),
  create_step("verify", ["deploy"])
]

let results = run_workflow(steps)
print("")
print("Completed {len(results)} steps")
for r in results {
  print("  {r.name}: {r.status}")
}
