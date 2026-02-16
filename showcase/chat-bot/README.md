# 🤖 Arc ChatBot — Conversational AI Agent Framework

A fully-featured chatbot framework written entirely in **Arc**, demonstrating the language's expressiveness, conciseness, and modern design.

## Architecture

```
┌─────────────────────────────────────────────┐
│                  main.arc                    │
│                                              │
│  Input → Intent Classification → Middleware  │
│           Pipeline → Router → Response       │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Logging  │→│Rate Limit│→│Sentiment │→...│
│  └──────────┘  └──────────┘  └──────────┘  │
│                     │                        │
│         ┌───────────┼───────────┐            │
│         ▼           ▼           ▼            │
│   ┌──────────┐┌──────────┐┌──────────┐      │
│   │ Weather  ││ Search   ││  Jokes   │      │
│   │ Plugin   ││ Plugin   ││  Plugin  │      │
│   └──────────┘└──────────┘└──────────┘      │
└─────────────────────────────────────────────┘
```

### How It Works

1. **Input** arrives as raw text
2. **Intent classification** uses regex pattern matching to determine what the user wants
3. **Entity extraction** pulls structured data (cities, topics, numbers) from the message
4. **Middleware pipeline** processes the context through a chain of transforms:
   - Logging, rate limiting, sentiment analysis, context tracking
5. **Router** dispatches to the appropriate handler or plugin via `match`
6. **Plugins** make async API calls with retry logic
7. **Response** is formatted using string templates and returned

### Plugin System

Each plugin exports two functions:

```arc
pub fn handle(ctx: map) -> str      # Full response
pub fn quick_summary(ctx: map) -> str  # One-line summary for multi-source
```

Plugins receive the full conversation context and can:
- Access extracted entities and conversation history
- Make external API calls with `@GET`/`@POST`
- Use the shared `with_retry` utility
- Cache results for performance

## Arc Features Demonstrated

| Feature | Usage |
|---|---|
| **Pattern matching** (`match`) | Intent routing, error handling, response selection |
| **Pipelines** (`\|>`) | Middleware chains, data transformation, collection processing |
| **Closures / Higher-order fns** | `build_pipeline`, middleware architecture, `with_retry` |
| **Async / Await** | All external API calls |
| **Parallel fetch** | `multi_source_response` fetches weather + search + jokes simultaneously |
| **`@GET` / `@POST`** | Weather API, DuckDuckGo, Wikipedia, joke APIs |
| **Regex** | Intent classification, entity extraction, sentiment analysis |
| **JSON module** | Parsing all API responses |
| **Collections** | `map`, `filter`, `reduce`, `take`, `group_by`, `sort_by`, `find` |
| **String interpolation** | Template-based response generation with `{variable}` |
| **Crypto module** | Session token generation via `random_hex` |
| **Datetime module** | Message timestamps, rate limit windows, cache TTL |
| **Error handling** | `result` type with `ok`/`err`, retry logic |
| **Spread operator** | Immutable context updates with `{ ...ctx, field: value }` |
| **Module system** | `import` with aliasing, `pub` exports |

## File Structure

```
showcase/chat-bot/
├── main.arc                 # Core framework (280+ lines)
├── plugins/
│   ├── weather.arc          # Weather plugin with caching
│   ├── search.arc           # Parallel DDG + Wikipedia search
│   └── jokes.arc            # Multi-source joke fetcher
├── README.md                # This file
└── equivalent-lines.md      # Comparison with JavaScript
```

## Running

```bash
arc run showcase/chat-bot/main.arc
```

Then interact:
```
🤖 Arc ChatBot v1.0 — Type 'help' to get started!
─────────────────────────────────────────────────
> hello
Hey there, interactive_user! 👋 How can I help you today?

> weather in Tokyo
☀️ **Weather in Tokyo**
• Temperature: 52°F (feels like 48°F)
• Conditions: clear sky
• Humidity: 45%
• Wind: 8.5 mph

> search quantum computing
📚 **Quantum computing** (Wikipedia)
Quantum computing is a type of computation that harnesses...

> joke
💻 Why did the Arc developer smile?
🥁 Because the pipeline just worked. |>

> status
📊 **Bot Status**
• Session: a3f7c2d1...
• Messages: 4
• Uptime: 120s
• Mood: positive
```

## Token Efficiency

See [equivalent-lines.md](./equivalent-lines.md) for a detailed comparison, but the summary:

- **Arc**: ~550 lines across 4 files
- **Equivalent JavaScript**: ~1,100+ lines
- **Token reduction**: ~48% fewer tokens in Arc
- **Key savings**: No `const`/`let`/`var` noise, no `function` keyword, no braces for control flow, built-in `|>` replaces chained method calls, `match` replaces `if/else if/else` chains, `@GET` replaces `fetch()` boilerplate
