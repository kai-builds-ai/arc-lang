# ETL Workflow
# Demonstrates: data transformation pipeline

fn create_step(name, deps) => { name: name, deps: deps, status: "pending" }

fn run_step(step, data) {
  print("  [{step.name}] Processing {len(data)} records...")
  let result = match step.name {
    "extract" => [
      { id: 1, value: 100, category: "A" },
      { id: 2, value: 200, category: "B" },
      { id: 3, value: 150, category: "A" },
      { id: 4, value: 300, category: "C" },
      { id: 5, value: 50, category: "B" }
    ],
    "transform" => data |> map(r => {
      { id: r.id, value: r.value * 1.1, category: upper(r.category), processed: true }
    }),
    "validate" => data |> filter(r => r.value > 60),
    "load" => {
      print("    Loaded {len(data)} records to destination")
      data
    },
    _ => data
  }
  print("  [{step.name}] Output: {len(result)} records")
  result
}

# --- ETL Pipeline ---
print("=== ETL Workflow ===")

let steps = ["extract", "transform", "validate", "load"]
let mut data = []

for step_name in steps {
  data = run_step(create_step(step_name, []), data)
}

print("")
print("Final output: {len(data)} records")
for r in data {
  print("  Record {r.id}: value={r.value} category={r.category}")
}
