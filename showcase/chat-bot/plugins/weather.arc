# Weather Plugin for Arc ChatBot
# Demonstrates: tool calls, pattern matching, pipelines

fn extract_city(text) {
  let lower_text = lower(text)
  if contains(lower_text, "in ") {
    let parts = split(lower_text, "in ")
    if len(parts) > 1 { trim(parts[1]) } el { "New York" }
  } el { "New York" }
}

fn format_weather(data) {
  "Temperature: {data.temp}, Conditions: {data.conditions}, Humidity: {data.humidity}"
}

fn handle(ctx) {
  let city = extract_city(ctx.message)
  let data = @GET "api/weather/{city}"
  let formatted = "Weather for {city}: {data}"
  formatted
}

# --- Demo ---
print("=== Weather Plugin Demo ===")

let test_messages = [
  "What's the weather in Paris?",
  "Weather forecast in Tokyo",
  "How's the weather?"
]

for msg in test_messages {
  let city = extract_city(msg)
  print("Message: {msg}")
  print("  City: {city}")
  let result = @GET "api/weather/{city}"
  print("  Result: {result}")
}
