# Arc Showcase Projects

Real-world programs written in Arc, demonstrating the language's token efficiency and expressive power.

## Projects

### 🌤️ [Weather Agent](./weather-agent/)
A CLI weather dashboard that fetches data from multiple cities in parallel, categorizes conditions via pattern matching, and displays a formatted table. Demonstrates: `@GET`, `fetch []`, `match`, `|>`, collections, string formatting, error handling.

### 📊 [Data Pipeline](./data-pipeline/)
An ETL pipeline that reads CSV data, transforms/filters/aggregates it, and outputs JSON. Includes a side-by-side comparison with equivalent JavaScript showing ~50% token savings.

### 🌐 [API Server](./api-server/)
A REST API handler with routing via pattern matching, middleware via pipelines, and tool call syntax for database operations. Demonstrates Arc's strength for backend service code.

### 🤖 [Chat Bot](./chat-bot/)
A conversational AI agent framework with a plugin architecture, middleware chains, session management, and rate limiting. 285 lines of Arc with 3 plugins (weather, search, jokes). Uses regex for intent parsing, crypto for session tokens, datetime for timestamps, parallel fetch for multi-source queries. ~50% fewer tokens than equivalent JS.

### ⏰ [Task Scheduler](./task-scheduler/)
A workflow orchestration engine with DAG dependency resolution (Kahn's algorithm), priority queues, cron scheduling, parallel execution with concurrency control, and retry with exponential backoff. Includes 3 workflow definitions (CI/CD deploy, ETL pipeline, health monitoring). ~480 lines of Arc vs ~1,435 in JS (66% reduction).

---

Each project includes a `README.md` with feature highlights and a walkthrough of the Arc code.
