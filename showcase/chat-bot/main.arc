# Arc Chat Bot — A Conversational AI Agent Framework
# Demonstrates: pattern matching, pipelines, closures, higher-order functions

# --- Intent Recognition ---

fn classify_intent(text) {
  let lower_text = lower(text)
  if contains(lower_text, "weather") or contains(lower_text, "forecast") { ret "weather" }
  if contains(lower_text, "search") or contains(lower_text, "find") { ret "search" }
  if contains(lower_text, "joke") or contains(lower_text, "funny") { ret "jokes" }
  if contains(lower_text, "help") or contains(lower_text, "commands") { ret "help" }
  if contains(lower_text, "hello") or contains(lower_text, "hi") { ret "greeting" }
  if contains(lower_text, "bye") or contains(lower_text, "goodbye") { ret "farewell" }
  "unknown"
}

# --- Response Handlers ---

fn handle_greeting(user) => "Hey there, {user}! How can I help you today?"

fn handle_farewell(user) => "Goodbye {user}! Have a great day!"

fn handle_help() => "Bot Commands: weather [city], search [topic], joke, help, bye"

fn handle_weather(text) {
  let city = if contains(text, "in ") {
    let parts = split(text, "in ")
    if len(parts) > 1 { trim(parts[1]) } el { "New York" }
  } el { "New York" }
  let weather = @GET "api/weather/{city}"
  "Weather for {city}: {weather}"
}

fn handle_search(text) {
  let query = if contains(text, "search ") {
    let parts = split(text, "search ")
    if len(parts) > 1 { trim(parts[1]) } el { text }
  } el { text }
  let results = @GET "api/search/{query}"
  "Search results for '{query}': {results}"
}

fn handle_joke() {
  let jokes = [
    "Why do programmers prefer dark mode? Because light attracts bugs!",
    "There are 10 types of people: those who understand binary and those who don't.",
    "A SQL query walks into a bar, sees two tables, and asks: Can I JOIN you?"
  ]
  jokes[0]
}

# --- Middleware ---

fn log_message(ctx) {
  print("[BOT] User={ctx.user} Intent={ctx.intent} Message={ctx.message}")
  ctx
}

fn track_context(ctx) {
  let history = push(ctx.history, { message: ctx.message, intent: ctx.intent })
  let new_ctx = { user: ctx.user, message: ctx.message, intent: ctx.intent, history: history, response: ctx.response }
  new_ctx
}

# --- Message Router ---

fn route_message(ctx) {
  let response = match ctx.intent {
    "greeting" => handle_greeting(ctx.user),
    "farewell" => handle_farewell(ctx.user),
    "help" => handle_help(),
    "weather" => handle_weather(ctx.message),
    "search" => handle_search(ctx.message),
    "jokes" => handle_joke(),
    _ => "I'm not sure what you mean. Try 'help' to see what I can do!"
  }
  { user: ctx.user, message: ctx.message, intent: ctx.intent, history: ctx.history, response: response }
}

# --- Process Message ---

fn process_message(user, message, history) {
  let intent = classify_intent(message)
  let ctx = { user: user, message: message, intent: intent, history: history, response: nil }

  let result = ctx |> log_message |> track_context |> route_message
  result
}

# --- Demo ---

print("Arc ChatBot v1.0")
print("---")

let mut history = []

let messages = [
  "Hello!",
  "What's the weather in London?",
  "Tell me a joke",
  "search Arc programming language",
  "help",
  "Goodbye!"
]

for msg in messages {
  print("\nUser: {msg}")
  let result = process_message("Alice", msg, history)
  print("Bot: {result.response}")
  history = result.history
}

print("\nConversation history: {len(history)} messages")
