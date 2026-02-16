# Arc Showcase Projects

Real-world programs written in Arc, demonstrating the language's token efficiency and expressive power.

## Projects

### 🌤️ [Weather Agent](./weather-agent/)
A CLI weather dashboard that fetches data from multiple cities in parallel, categorizes conditions via pattern matching, and displays a formatted table. Demonstrates: `@GET`, `fetch []`, `match`, `|>`, collections, string formatting, error handling.

### 📊 [Data Pipeline](./data-pipeline/)
An ETL pipeline that reads CSV data, transforms/filters/aggregates it, and outputs JSON. Includes a side-by-side comparison with equivalent JavaScript showing ~50% token savings.

### 🌐 [API Server](./api-server/)
A REST API handler with routing via pattern matching, middleware via pipelines, and tool call syntax for database operations. Demonstrates Arc's strength for backend service code.

---

Each project includes a `README.md` with feature highlights and a walkthrough of the Arc code.
