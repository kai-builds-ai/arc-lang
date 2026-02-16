# Arc Task Scheduler & Workflow Engine

A full-featured **DAG-based task scheduling and workflow orchestration engine** written entirely in Arc — demonstrating that Arc can express complex backend systems with dramatically less code than JavaScript/TypeScript.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Scheduler Engine                │
│  ┌───────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ DAG       │  │ Priority │  │ Cron         │  │
│  │ Resolver  │  │ Queue    │  │ Scheduler    │  │
│  └─────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│        └──────────────┼───────────────┘          │
│                       ▼                          │
│  ┌────────────────────────────────────────────┐  │
│  │         Parallel Execution Engine          │  │
│  │   (concurrency control, timeout, retry)    │  │
│  └──────────────────┬─────────────────────────┘  │
│                     ▼                            │
│  ┌──────────────────────────────────────┐        │
│  │     Middleware Pipeline              │        │
│  │  before_run → execute → after_run    │        │
│  │                     └→ on_error      │        │
│  └──────────────────────────────────────┘        │
│                     ▼                            │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ Logger   │  │ Reporter │  │ Serialization │  │
│  └──────────┘  └──────────┘  └───────────────┘  │
└─────────────────────────────────────────────────┘
```

## Components

### DAG Dependency Resolver (`build_dag`, `topo_sort`)
Tasks declare dependencies by ID. The engine builds an adjacency map, computes in-degrees, and runs **Kahn's algorithm** for topological sorting. Cycle detection is built-in — if the sorted output is shorter than the task count, a cycle exists.

### Priority Queue
Tasks are sorted by `(priority, deadline)` using `collections.sort_by`. Lower priority number = higher urgency. Ties broken by earliest deadline (deadline-monotonic scheduling).

### State Machine
Task states transition via pattern matching:
```
pending → running → completed
                  → failed (retries exhausted)
                  → pending (retry)
```
Invalid transitions throw errors.

### Parallel Execution
Independent tasks (no mutual dependencies) execute in parallel via `parallel { ... }`. A configurable `max_concurrency` limit batches tasks using `collections.chunks`.

### Retry with Exponential Backoff
Failed tasks retry up to N times with delay `base * 2^(attempt-1)` using `async.sleep` and the error module's `try/catch`.

### Cron Scheduling
Cron expressions (`"*/5 * * * *"`) are parsed via regex into sets of valid values per field. `cron_matches_now` checks the current datetime against the schedule.

### Middleware Pipeline
Lifecycle hooks (`before_run`, `after_run`, `on_error`) are functions composed via `reduce`. Each middleware receives and returns a context object — pure functional composition.

### Reporting
`generate_report` uses `collections.group_by` to bucket tasks by state, `reduce` to sum durations, and computes failure rates — all output as JSON.

## Workflows

| Workflow | File | Description |
|----------|------|-------------|
| **Deploy** | `workflows/deploy.arc` | CI/CD: checkout → lint → test → build → security scan → staging → smoke test → production → notify |
| **ETL** | `workflows/etl.arc` | Data pipeline: extract (3 sources) → validate → deduplicate → normalize → enrich → aggregate → quality check → load → manifest |
| **Monitoring** | `workflows/monitoring.arc` | Health checks: HTTP, database, Redis, disk, CPU, SSL cert, queues — all parallel with alerting |

## Arc Features Demonstrated

| Feature | Usage |
|---------|-------|
| `fn` / closures | Task handlers, deferred execution, middleware |
| `match` / pattern matching | State transitions, cron field parsing, queue ops |
| `\|>` pipe operator | Fluent data transformation chains throughout |
| `async/await` | Task execution, retry delays, timeouts |
| `parallel { }` | Concurrent independent task batches |
| `try/catch` | Retry logic with exponential backoff |
| `import` | Module system for workflows importing scheduler |
| `pub` | Public API surface for each module |
| `collections.*` | `map`, `filter`, `reduce`, `group_by`, `sort_by`, `chunks`, `index_by` |
| `datetime.*` | Timestamps, formatting, duration math, cron matching |
| `crypto.*` | UUID generation for task IDs |
| `json.*` | Serialization/deserialization of tasks and reports |
| `regex.*` | Cron expression parsing |
| `error.*` | Error creation, message extraction, throwing |
| String interpolation `{}` | Log messages, URLs, report formatting |
| Spread `...obj` | Immutable record updates for state transitions |
| `??` nil coalescing | Default values throughout config handling |

## Token & Line Comparison vs Node.js

See [`equivalent-lines.md`](./equivalent-lines.md) for detailed analysis. Summary:

| Metric | Arc | Node.js (equivalent) | Reduction |
|--------|-----|----------------------|-----------|
| **Lines of code** | ~480 | ~1,400+ | **~66%** |
| **Estimated tokens** | ~4,200 | ~13,000+ | **~68%** |
| **Files** | 5 | 12+ | **~58%** |
| **Dependencies** | 0 (stdlib) | 5-8 npm packages | **100%** |

## Running

```arc
import "showcase/task-scheduler/main" as scheduler
import "showcase/task-scheduler/workflows/deploy" as deploy

# Run a deploy pipeline
await deploy.run_deploy({ app_name: "myapp", version: "2.1.0", environment: "production" })
```

## Key Design Decisions

1. **Immutable state** — Tasks are never mutated; `transition()` returns new records with spread syntax
2. **Functional composition** — Middleware, pipelines, and reducers compose via higher-order functions
3. **No classes needed** — Records + functions + closures replace OOP patterns entirely
4. **Built-in concurrency** — `parallel` blocks replace manual Promise.all + semaphore libraries
5. **Pattern matching over conditionals** — State machines are declarative, not imperative
