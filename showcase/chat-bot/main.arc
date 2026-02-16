# ============================================================================
# Arc Chat Bot — A Conversational AI Agent Framework
# Demonstrates: pattern matching, pipelines, middleware, async, error handling,
# collections, crypto, datetime, regex, JSON, closures, higher-order functions
# ============================================================================

import std/json
import std/crypto
import std/datetime
import std/collections
import std/regex
import std/string
import std/math

import "./plugins/weather.arc" as weather_plugin
import "./plugins/search.arc" as search_plugin
import "./plugins/jokes.arc" as jokes_plugin

# ---------------------------------------------------------------------------
# Session & Token Management
# ---------------------------------------------------------------------------

pub fn create_session(user_id: str) -> map {
  let token = crypto/random_hex(32)
  let now = datetime/now()
  {
    id: token,
    user_id: user_id,
    created_at: now,
    last_active: now,
    context: {
      history: [],
      intent_counts: {},
      entities: {},
      mood: "neutral"
    },
    rate_limit: {
      tokens_used: 0,
      window_start: now,
      max_per_minute: 30
    }
  }
}

pub fn refresh_session(session: map) -> map {
  { ...session, last_active: datetime/now() }
}

# ---------------------------------------------------------------------------
# Rate Limiting
# ---------------------------------------------------------------------------

fn check_rate_limit(session: map) -> result {
  let rl = session.rate_limit
  let elapsed = datetime/diff_seconds(datetime/now(), rl.window_start)

  match elapsed > 60 {
    true => ok({ ...rl, tokens_used: 1, window_start: datetime/now() }),
    false => match rl.tokens_used >= rl.max_per_minute {
      true => err("Rate limit exceeded. Please wait {60 - elapsed}s."),
      false => ok({ ...rl, tokens_used: rl.tokens_used + 1 })
    }
  }
}

# ---------------------------------------------------------------------------
# Intent Recognition via Regex + Pattern Matching
# ---------------------------------------------------------------------------

let intent_patterns = [
  { pattern: regex/new("(?i)\\b(weather|forecast|temperature|rain)\\b"), intent: "weather" },
  { pattern: regex/new("(?i)\\b(search|find|look up|google|what is)\\b"), intent: "search" },
  { pattern: regex/new("(?i)\\b(joke|funny|laugh|humor|amuse)\\b"), intent: "jokes" },
  { pattern: regex/new("(?i)\\b(help|commands|what can you)\\b"), intent: "help" },
  { pattern: regex/new("(?i)\\b(hi|hello|hey|greetings|sup)\\b"), intent: "greeting" },
  { pattern: regex/new("(?i)\\b(bye|goodbye|see you|later|quit)\\b"), intent: "farewell" },
  { pattern: regex/new("(?i)\\b(history|previous|context|remember)\\b"), intent: "history" },
  { pattern: regex/new("(?i)\\b(status|stats|uptime|info)\\b"), intent: "status" }
]

fn classify_intent(text: str) -> str {
  let matched = intent_patterns
    |> collections/find(fn(p) => regex/is_match(p.pattern, text))

  match matched {
    some(p) => p.intent,
    none => "unknown"
  }
}

# ---------------------------------------------------------------------------
# Entity Extraction
# ---------------------------------------------------------------------------

let entity_extractors = {
  city: regex/new("(?i)(?:in|at|for|near)\\s+([A-Z][a-z]+(?:\\s[A-Z][a-z]+)*)"),
  number: regex/new("(\\d+)"),
  topic: regex/new("(?i)(?:about|for|on|regarding)\\s+(.+?)(?:\\?|$|\\.|!)"),
  time_ref: regex/new("(?i)(today|tomorrow|tonight|this week|next week)")
}

fn extract_entities(text: str) -> map {
  entity_extractors
    |> collections/map_entries(fn(key, pattern) => {
      let capture = regex/capture(pattern, text, 1)
      match capture {
        some(val) => { key: string/trim(val) },
        none => { key: nil }
      }
    })
    |> collections/reject_values(fn(v) => v == nil)
}

# ---------------------------------------------------------------------------
# Middleware Architecture
# ---------------------------------------------------------------------------

# Each middleware: fn(ctx) -> ctx
# ctx = { message, session, intent, entities, response, metadata }

fn logging_middleware(ctx: map) -> map {
  let timestamp = datetime/format(datetime/now(), "HH:mm:ss")
  # Log: [{timestamp}] User={ctx.session.user_id} Intent={ctx.intent} Msg="{ctx.message}"
  { ...ctx, metadata: { ...ctx.metadata, logged_at: timestamp } }
}

fn rate_limit_middleware(ctx: map) -> map {
  match check_rate_limit(ctx.session) {
    ok(new_rl) => {
      ...ctx,
      session: { ...ctx.session, rate_limit: new_rl }
    },
    err(msg) => {
      ...ctx,
      response: msg,
      metadata: { ...ctx.metadata, blocked: true }
    }
  }
}

fn context_tracking_middleware(ctx: map) -> map {
  let history_entry = {
    message: ctx.message,
    intent: ctx.intent,
    entities: ctx.entities,
    timestamp: datetime/now()
  }

  let new_history = ctx.session.context.history
    |> collections/append(history_entry)
    |> collections/take_last(50)

  let intent_counts = ctx.session.context.intent_counts
  let count = intent_counts[ctx.intent] ?? 0

  {
    ...ctx,
    session: {
      ...ctx.session,
      context: {
        ...ctx.session.context,
        history: new_history,
        intent_counts: { ...intent_counts, [ctx.intent]: count + 1 },
        entities: { ...ctx.session.context.entities, ...ctx.entities }
      }
    }
  }
}

fn sentiment_middleware(ctx: map) -> map {
  let positive = regex/new("(?i)(thanks|great|awesome|love|good|nice|perfect|cool)")
  let negative = regex/new("(?i)(bad|terrible|awful|hate|worst|ugh|annoying|broken)")

  let mood = match {
    regex/is_match(positive, ctx.message) => "positive",
    regex/is_match(negative, ctx.message) => "negative",
    _ => ctx.session.context.mood
  }

  { ...ctx, session: { ...ctx.session, context: { ...ctx.session.context, mood: mood } } }
}

# ---------------------------------------------------------------------------
# Middleware Pipeline Runner (Higher-Order Function)
# ---------------------------------------------------------------------------

pub fn build_pipeline(middlewares: list) -> fn {
  fn(ctx: map) -> map {
    middlewares |> collections/reduce(ctx, fn(acc, mw) => {
      match acc.metadata.blocked ?? false {
        true => acc,
        false => mw(acc)
      }
    })
  }
}

let pre_pipeline = build_pipeline([
  logging_middleware,
  rate_limit_middleware,
  sentiment_middleware,
  context_tracking_middleware
])

# ---------------------------------------------------------------------------
# Plugin Registry
# ---------------------------------------------------------------------------

let plugins = {
  weather: weather_plugin/handle,
  search: search_plugin/handle,
  jokes: jokes_plugin/handle
}

# ---------------------------------------------------------------------------
# Response Templates
# ---------------------------------------------------------------------------

let templates = {
  greeting: [
    "Hey there, {user}! 👋 How can I help you today?",
    "Hello {user}! What's on your mind?",
    "Hi {user}! Ready to assist. What do you need?"
  ],
  farewell: [
    "Goodbye {user}! Have a great day! 🌟",
    "See you later, {user}! Take care!",
    "Bye {user}! Don't be a stranger! 👋"
  ],
  unknown: [
    "Hmm, I'm not sure what you mean. Try 'help' to see what I can do!",
    "I didn't quite catch that. Could you rephrase?",
    "Not sure about that one. Type 'help' for available commands."
  ],
  help: "🤖 **Arc ChatBot** — Available Commands:\n• **weather [city]** — Get weather forecast\n• **search [topic]** — Search the web\n• **joke** — Hear something funny\n• **history** — View conversation history\n• **status** — Bot statistics\n• **bye** — End conversation"
}

fn pick_template(category: str, vars: map) -> str {
  let pool = templates[category]
  match pool {
    list => {
      let idx = math/random_int(0, collections/length(pool) - 1)
      pool[idx] |> string/interpolate(vars)
    },
    str => pool |> string/interpolate(vars),
    _ => "I'm not sure what to say!"
  }
}

# ---------------------------------------------------------------------------
# Retry Logic for External Calls
# ---------------------------------------------------------------------------

pub fn with_retry(action: fn, max_attempts: int, delay_ms: int) -> result {
  fn attempt(n: int) -> result {
    match action() {
      ok(val) => ok(val),
      err(e) => match n >= max_attempts {
        true => err("Failed after {max_attempts} attempts: {e}"),
        false => {
          async/sleep(delay_ms * n)
          attempt(n + 1)
        }
      }
    }
  }
  attempt(1)
}

# ---------------------------------------------------------------------------
# History & Status Handlers
# ---------------------------------------------------------------------------

fn handle_history(session: map) -> str {
  let recent = session.context.history
    |> collections/take_last(10)
    |> collections/map(fn(entry) => {
      let ts = datetime/format(entry.timestamp, "HH:mm")
      "[{ts}] ({entry.intent}) {entry.message}"
    })
    |> string/join("\n")

  match recent {
    "" => "No conversation history yet.",
    _ => "📜 **Recent History:**\n{recent}"
  }
}

fn handle_status(session: map) -> str {
  let total_messages = collections/length(session.context.history)
  let uptime = datetime/diff_seconds(datetime/now(), session.created_at)
  let top_intents = session.context.intent_counts
    |> collections/entries()
    |> collections/sort_by(fn(e) => -e.value)
    |> collections/take(3)
    |> collections/map(fn(e) => "  • {e.key}: {e.value}")
    |> string/join("\n")

  let grouped = session.context.history
    |> collections/group_by(fn(e) => e.intent)
    |> collections/map_entries(fn(k, v) => collections/length(v))

  "📊 **Bot Status**\n" ++
  "• Session: {string/slice(session.id, 0, 8)}...\n" ++
  "• Messages: {total_messages}\n" ++
  "• Uptime: {uptime}s\n" ++
  "• Mood: {session.context.mood}\n" ++
  "• Top Intents:\n{top_intents}"
}

# ---------------------------------------------------------------------------
# Core Message Router
# ---------------------------------------------------------------------------

pub fn route_message(ctx: map) -> map {
  let intent = ctx.intent
  let user = ctx.session.user_id

  let response = match intent {
    "greeting" => pick_template("greeting", { user: user }),
    "farewell" => pick_template("farewell", { user: user }),
    "help" => pick_template("help", {}),
    "history" => handle_history(ctx.session),
    "status" => handle_status(ctx.session),
    "weather" => await weather_plugin/handle(ctx),
    "search" => await search_plugin/handle(ctx),
    "jokes" => await jokes_plugin/handle(ctx),
    "unknown" => pick_template("unknown", {}),
    _ => pick_template("unknown", {})
  }

  { ...ctx, response: response }
}

# ---------------------------------------------------------------------------
# Parallel Multi-Source Fetch
# ---------------------------------------------------------------------------

pub fn multi_source_response(ctx: map) -> map {
  let [weather_res, search_res, joke_res] = await parallel [
    weather_plugin/quick_summary(ctx),
    search_plugin/quick_summary(ctx),
    jokes_plugin/quick_summary(ctx)
  ]

  let combined = [weather_res, search_res, joke_res]
    |> collections/filter(fn(r) => r != nil)
    |> string/join("\n---\n")

  { ...ctx, response: "📡 **Multi-Source Results:**\n{combined}" }
}

# ---------------------------------------------------------------------------
# Main Chat Loop
# ---------------------------------------------------------------------------

pub fn process_message(session: map, raw_input: str) -> map {
  let text = raw_input |> string/trim() |> string/lowercase()
  let intent = classify_intent(raw_input)
  let entities = extract_entities(raw_input)

  let ctx = {
    message: raw_input,
    session: session |> refresh_session(),
    intent: intent,
    entities: entities,
    response: nil,
    metadata: {}
  }

  # Run through middleware pipeline, then route
  let result = ctx
    |> pre_pipeline
    |> fn(c) => match c.response {
      nil => route_message(c),
      _ => c
    }

  { session: result.session, response: result.response }
}

# ---------------------------------------------------------------------------
# Entry Point — Interactive REPL
# ---------------------------------------------------------------------------

pub fn main() {
  println("🤖 Arc ChatBot v1.0 — Type 'help' to get started!")
  println("─────────────────────────────────────────────────")

  let session = create_session("interactive_user")

  fn repl(session: map) {
    let input = readline("> ")
    match string/trim(input) {
      "" => repl(session),
      "quit" => println("👋 Goodbye!"),
      text => {
        let result = process_message(session, text)
        println("\n{result.response}\n")
        repl(result.session)
      }
    }
  }

  repl(session)
}
