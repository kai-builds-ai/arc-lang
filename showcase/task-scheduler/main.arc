# Task Scheduler & Workflow Orchestration Engine
# A full-featured DAG-based task scheduler written in Arc

import std/collections
import std/datetime
import std/crypto
import std/json
import std/regex
import std/error
import std/math

# ============================================================
# Task Data Structures
# ============================================================

pub fn create_task(name, handler, opts) => {
  let id = crypto.uuid_v4()
  let now = datetime.now()
  {
    id: id,
    name: name,
    handler: handler,
    state: "pending",
    priority: opts.priority ?? 5,
    dependencies: opts.dependencies ?? [],
    deadline: opts.deadline ?? nil,
    timeout_ms: opts.timeout_ms ?? 30000,
    retries: opts.retries ?? 3,
    retry_delay_ms: opts.retry_delay_ms ?? 1000,
    cron: opts.cron ?? nil,
    metadata: opts.metadata ?? {},
    created_at: now,
    started_at: nil,
    completed_at: nil,
    result: nil,
    error: nil,
    attempt: 0
  }
}

# Task state machine via pattern matching
pub fn transition(task, event) => match event {
  "start" => match task.state {
    "pending" => { ...task, state: "running", started_at: datetime.now(), attempt: task.attempt + 1 }
    _ => error.throw("Cannot start task in state {task.state}")
  }
  "complete" => match task.state {
    "running" => { ...task, state: "completed", completed_at: datetime.now() }
    _ => error.throw("Cannot complete task in state {task.state}")
  }
  "fail" => match task.state {
    "running" => {
      let next_state = if task.attempt < task.retries { "pending" } else { "failed" }
      { ...task, state: next_state, completed_at: datetime.now() }
    }
    _ => error.throw("Cannot fail task in state {task.state}")
  }
  "cancel" => { ...task, state: "cancelled", completed_at: datetime.now() }
  _ => error.throw("Unknown event: {event}")
}

# ============================================================
# DAG Dependency Resolver
# ============================================================

pub fn build_dag(tasks) => {
  let task_map = tasks |> collections.index_by(fn(t) => t.id)
  let adjacency = tasks |> collections.map(fn(t) => {
    { id: t.id, deps: t.dependencies }
  }) |> collections.index_by(fn(n) => n.id)
  { task_map: task_map, adjacency: adjacency }
}

# Topological sort using Kahn's algorithm
pub fn topo_sort(dag) => {
  let in_degree = dag.adjacency
    |> collections.map_values(fn(node) => node.deps |> collections.length())

  let queue = in_degree
    |> collections.entries()
    |> collections.filter(fn(e) => e.value == 0)
    |> collections.map(fn(e) => e.key)

  let sorted = []
  let visited = 0
  let current_queue = queue

  # Iterative BFS-based topological sort
  fn process(q, sorted, in_deg) => match collections.length(q) {
    0 => { sorted: sorted, in_degree: in_deg }
    _ => {
      let node_id = collections.first(q)
      let rest = collections.rest(q)
      let new_sorted = collections.append(sorted, node_id)

      # Find dependents and decrement their in-degree
      let dependents = dag.adjacency
        |> collections.entries()
        |> collections.filter(fn(e) => collections.contains(e.value.deps, node_id))

      let updated_deg = dependents
        |> collections.reduce(in_deg, fn(acc, dep) => {
          collections.set(acc, dep.key, acc[dep.key] - 1)
        })

      let new_ready = dependents
        |> collections.filter(fn(d) => updated_deg[d.key] == 0)
        |> collections.map(fn(d) => d.key)

      let next_queue = collections.concat(rest, new_ready)
      process(next_queue, new_sorted, updated_deg)
    }
  }

  let result = process(current_queue, [], in_degree)

  # Cycle detection
  let total = dag.adjacency |> collections.length()
  if collections.length(result.sorted) != total {
    error.throw("Cycle detected in task dependency graph!")
  }
  result.sorted
}

# Find tasks with all dependencies satisfied
pub fn get_ready_tasks(dag, completed_ids) => {
  dag.adjacency
    |> collections.entries()
    |> collections.filter(fn(entry) => {
      let task = dag.task_map[entry.key]
      let deps_met = entry.value.deps
        |> collections.every(fn(dep) => collections.contains(completed_ids, dep))
      task.state == "pending" && deps_met
    })
    |> collections.map(fn(entry) => dag.task_map[entry.key])
}

# ============================================================
# Priority Queue
# ============================================================

pub fn priority_enqueue(queue, task) => {
  collections.append(queue, task)
    |> collections.sort_by(fn(a, b) => {
      # Lower priority number = higher priority; then earlier deadline first
      if a.priority != b.priority {
        a.priority - b.priority
      } else {
        match [a.deadline, b.deadline] {
          [nil, nil] => 0
          [nil, _]  => 1
          [_, nil]  => -1
          _         => datetime.compare(a.deadline, b.deadline)
        }
      }
    })
}

pub fn priority_dequeue(queue) => match collections.length(queue) {
  0 => { task: nil, queue: [] }
  _ => { task: collections.first(queue), queue: collections.rest(queue) }
}

# ============================================================
# Cron Expression Parser
# ============================================================

let cron_field_pattern = regex.compile("^(\\*|\\d+)(/\\d+)?$")

pub fn parse_cron(expression) => {
  # Format: "minute hour day_of_month month day_of_week"
  let fields = expression |> string.split(" ")
  if collections.length(fields) != 5 {
    error.throw("Invalid cron expression: {expression}")
  }
  let [minute, hour, dom, month, dow] = fields
  {
    minute: parse_cron_field(minute, 0, 59),
    hour: parse_cron_field(hour, 0, 23),
    day_of_month: parse_cron_field(dom, 1, 31),
    month: parse_cron_field(month, 1, 12),
    day_of_week: parse_cron_field(dow, 0, 6)
  }
}

fn parse_cron_field(field, min, max) => match field {
  "*" => collections.range(min, max + 1)
  _ => {
    if regex.test(cron_field_pattern, field) {
      let parts = string.split(field, "/")
      match collections.length(parts) {
        1 => [int(field)]
        2 => {
          let base = if parts[0] == "*" { min } else { int(parts[0]) }
          let step = int(parts[1])
          collections.range(base, max + 1)
            |> collections.filter(fn(v) => (v - base) % step == 0)
        }
      }
    } else {
      error.throw("Invalid cron field: {field}")
    }
  }
}

pub fn cron_matches_now(schedule) => {
  let now = datetime.now()
  let minute = datetime.minute(now)
  let hour = datetime.hour(now)
  let dom = datetime.day(now)
  let month = datetime.month(now)
  let dow = datetime.day_of_week(now)

  collections.contains(schedule.minute, minute) &&
  collections.contains(schedule.hour, hour) &&
  collections.contains(schedule.day_of_month, dom) &&
  collections.contains(schedule.month, month) &&
  collections.contains(schedule.day_of_week, dow)
}

# ============================================================
# Middleware Pipeline
# ============================================================

pub fn create_middleware_pipeline() => {
  { before_run: [], after_run: [], on_error: [] }
}

pub fn add_middleware(pipeline, hook, handler) => match hook {
  "before_run" => { ...pipeline, before_run: collections.append(pipeline.before_run, handler) }
  "after_run"  => { ...pipeline, after_run: collections.append(pipeline.after_run, handler) }
  "on_error"   => { ...pipeline, on_error: collections.append(pipeline.on_error, handler) }
  _ => error.throw("Unknown middleware hook: {hook}")
}

fn run_middleware(handlers, context) => {
  handlers |> collections.reduce(context, fn(ctx, handler) => handler(ctx))
}

# ============================================================
# Event Logger
# ============================================================

pub fn create_logger() => { events: [] }

pub fn log_event(logger, level, message, task_id) => {
  let event = {
    timestamp: datetime.format(datetime.now(), "ISO8601"),
    level: level,
    message: message,
    task_id: task_id ?? nil
  }
  { events: collections.append(logger.events, event) }
}

pub fn format_log(event) =>
  "[{event.timestamp}] [{event.level}] {event.message}" ++
  if event.task_id { " (task: {event.task_id})" } else { "" }

# ============================================================
# Task Executor with Retry & Timeout
# ============================================================

pub async fn execute_task(task, middleware, logger) => {
  let ctx = { task: task, logger: logger }
  let ctx = run_middleware(middleware.before_run, ctx)
  let current_task = ctx.task |> transition("start")
  let log = log_event(ctx.logger, "INFO", "Starting task: {current_task.name}", current_task.id)

  let result = try {
    # Execute with timeout
    let output = await async.with_timeout(current_task.timeout_ms, fn() => {
      current_task.handler(current_task.metadata)
    })
    let done = current_task |> transition("complete")
    let done = { ...done, result: output }
    let after_ctx = run_middleware(middleware.after_run, { task: done, logger: log })
    let log2 = log_event(after_ctx.logger, "INFO", "Completed task: {done.name}", done.id)
    { task: after_ctx.task, logger: log2 }
  } catch err {
    let failed = current_task |> transition("fail")
    let failed = { ...failed, error: error.message(err) }
    let err_ctx = run_middleware(middleware.on_error, { task: failed, logger: log, error: err })
    let log2 = log_event(err_ctx.logger, "ERROR", "Task failed: {failed.name} - {error.message(err)}", failed.id)

    # Retry with exponential backoff if still pending
    if failed.state == "pending" {
      let delay = failed.retry_delay_ms * math.pow(2, failed.attempt - 1)
      let log3 = log_event(log2, "WARN", "Retrying {failed.name} in {delay}ms (attempt {failed.attempt})", failed.id)
      await async.sleep(delay)
      await execute_task(failed, middleware, log3)
    } else {
      { task: failed, logger: log2 }
    }
  }
  result
}

# ============================================================
# Parallel Execution Engine with Concurrency Control
# ============================================================

pub async fn run_parallel(tasks, middleware, logger, max_concurrency) => {
  # Batch tasks respecting concurrency limit
  let batches = tasks
    |> collections.chunks(max_concurrency)

  let initial = { results: [], logger: logger }

  let final = await batches |> collections.reduce_async(initial, async fn(acc, batch) => {
    # Execute batch in parallel using parallel fetch
    let outcomes = await parallel {
      batch |> collections.map(fn(task) => execute_task(task, middleware, acc.logger))
    }
    {
      results: collections.concat(acc.results, outcomes),
      logger: outcomes
        |> collections.last()
        |> fn(o) => o.logger
    }
  })
  final
}

# ============================================================
# Scheduler Engine
# ============================================================

pub fn create_scheduler(opts) => {
  let max_concurrency = opts.max_concurrency ?? 4
  {
    tasks: [],
    dag: nil,
    middleware: create_middleware_pipeline(),
    logger: create_logger(),
    max_concurrency: max_concurrency,
    completed_ids: [],
    cron_tasks: []
  }
}

pub fn add_task(scheduler, task) => {
  let tasks = collections.append(scheduler.tasks, task)
  let cron_tasks = if task.cron {
    let schedule = parse_cron(task.cron)
    collections.append(scheduler.cron_tasks, { task_id: task.id, schedule: schedule })
  } else {
    scheduler.cron_tasks
  }
  { ...scheduler, tasks: tasks, cron_tasks: cron_tasks }
}

pub fn use_middleware(scheduler, hook, handler) => {
  { ...scheduler, middleware: add_middleware(scheduler.middleware, hook, handler) }
}

pub async fn run(scheduler) => {
  let dag = build_dag(scheduler.tasks)
  let order = topo_sort(dag)
  let log = log_event(scheduler.logger, "INFO", "Execution order: {json.encode(order)}", nil)
  let sched = { ...scheduler, dag: dag, logger: log }

  # Process tasks in topological waves
  fn process_waves(sched) => {
    let ready = get_ready_tasks(sched.dag, sched.completed_ids)
      |> collections.sort_by(fn(a, b) => a.priority - b.priority)

    match collections.length(ready) {
      0 => sched
      _ => {
        # Execute wave in parallel
        let result = await run_parallel(ready, sched.middleware, sched.logger, sched.max_concurrency)
        let new_completed = result.results
          |> collections.filter(fn(r) => r.task.state == "completed")
          |> collections.map(fn(r) => r.task.id)

        let updated = {
          ...sched,
          completed_ids: collections.concat(sched.completed_ids, new_completed),
          logger: result.logger
        }
        process_waves(updated)
      }
    }
  }

  process_waves(sched)
}

# ============================================================
# Reporting & Aggregation
# ============================================================

pub fn generate_report(scheduler) => {
  let tasks = scheduler.tasks
  let by_state = tasks |> collections.group_by(fn(t) => t.state)
  let total_duration = tasks
    |> collections.filter(fn(t) => t.started_at && t.completed_at)
    |> collections.reduce(0, fn(acc, t) => {
      acc + datetime.diff_ms(t.completed_at, t.started_at)
    })

  let avg_duration = match collections.length(tasks) {
    0 => 0
    n => total_duration / n
  }

  let failure_rate = match collections.length(tasks) {
    0 => 0.0
    n => {
      let failed = by_state["failed"] ?? []
      collections.length(failed) / n * 100.0
    }
  }

  {
    total_tasks: collections.length(tasks),
    by_state: by_state |> collections.map_values(fn(group) => collections.length(group)),
    avg_duration_ms: avg_duration,
    failure_rate_pct: failure_rate,
    total_duration_ms: total_duration,
    generated_at: datetime.format(datetime.now(), "ISO8601")
  }
}

pub fn report_to_json(report) => json.encode(report, { pretty: true })

# ============================================================
# Task Serialization
# ============================================================

pub fn serialize_task(task) => {
  # Handlers are closures and can't be serialized — store name reference
  let serializable = { ...task, handler: "{task.name}_handler" }
  json.encode(serializable)
}

pub fn deserialize_task(json_str, handler_registry) => {
  let data = json.decode(json_str)
  let handler = handler_registry[data.handler] ?? fn(_) => error.throw("Unknown handler: {data.handler}")
  { ...data, handler: handler }
}

# ============================================================
# Example: Build a workflow using closures & deferred execution
# ============================================================

pub fn demo() => {
  # Create deferred task handlers using closures
  let make_handler = fn(step_name) => fn(meta) => {
    let start = datetime.now()
    # Simulate work
    async.sleep(100)
    { step: step_name, status: "ok", duration_ms: datetime.diff_ms(datetime.now(), start) }
  }

  let scheduler = create_scheduler({ max_concurrency: 2 })

  # Set up logging middleware
  let scheduler = scheduler
    |> use_middleware("before_run", fn(ctx) => {
      let log = log_event(ctx.logger, "DEBUG", "Middleware: before_run for {ctx.task.name}", ctx.task.id)
      { ...ctx, logger: log }
    })
    |> use_middleware("after_run", fn(ctx) => {
      let log = log_event(ctx.logger, "DEBUG", "Middleware: after_run for {ctx.task.name}", ctx.task.id)
      { ...ctx, logger: log }
    })

  # Define tasks with dependencies forming a DAG:
  #   build ──→ test ──→ deploy
  #     └──→ lint ──┘
  let build = create_task("build", make_handler("build"), { priority: 1 })
  let lint = create_task("lint", make_handler("lint"), { priority: 2, dependencies: [build.id] })
  let test = create_task("test", make_handler("test"), { priority: 2, dependencies: [build.id, lint.id] })
  let deploy = create_task("deploy", make_handler("deploy"), {
    priority: 3,
    dependencies: [test.id],
    deadline: datetime.add(datetime.now(), { hours: 1 })
  })

  let scheduler = scheduler
    |> add_task(build)
    |> add_task(lint)
    |> add_task(test)
    |> add_task(deploy)

  # Run the scheduler
  let result = await run(scheduler)

  # Generate and print report
  let report = generate_report(result)
  print("=== Task Scheduler Report ===")
  print(report_to_json(report))

  # Print event log
  result.logger.events
    |> collections.each(fn(e) => print(format_log(e)))
}
