# Search Plugin for Arc ChatBot
# Demonstrates: tool calls, string processing, pipelines

fn extract_query(text) {
  let lower_text = lower(text)
  if contains(lower_text, "search ") {
    let parts = split(lower_text, "search ")
    if len(parts) > 1 { trim(parts[1]) } el { text }
  } el if contains(lower_text, "find ") {
    let parts = split(lower_text, "find ")
    if len(parts) > 1 { trim(parts[1]) } el { text }
  } el { text }
}

fn handle(ctx) {
  let query = extract_query(ctx.message)
  let results = @GET "api/search/{query}"
  "Search results for '{query}': {results}"
}

# --- Demo ---
print("=== Search Plugin Demo ===")

let test_messages = [
  "search Arc language",
  "find functional programming",
  "look up pattern matching"
]

for msg in test_messages {
  let query = extract_query(msg)
  print("Message: {msg}")
  print("  Query: {query}")
  let result = @GET "api/search/{query}"
  print("  Result: {result}")
}
