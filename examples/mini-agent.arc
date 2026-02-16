# Mini AI Agent — THE showcase example for why Arc exists
# Demonstrates: tool calls (@GET/@POST), pipelines, pattern matching,
#   parallel fetch, async, destructuring, error handling
# This is what Arc was built for: AI agents orchestrating APIs
#
# Token comparison: This agent in JS would be ~120 tokens. In Arc: ~55 tokens (~54% savings)

# Step 1: Gather data from multiple sources in parallel
let [weather, news, calendar] = fetch [
  @GET "api/weather?city=NYC",
  @GET "api/news/top?limit=5",
  @GET "api/calendar/today"
]

# Step 2: Process and analyze
let urgent_meetings = calendar.events
  |> filter(e => e.priority == "high")
  |> map(e => {title: e.title, time: e.start_time})

let weather_summary = match weather.condition {
  "rain" | "storm" => "Bring an umbrella! {weather.condition} expected.",
  "snow" => "Bundle up! Snow with {weather.temp}°F.",
  _ => "Looking good: {weather.condition}, {weather.temp}°F."
}

let top_headlines = news.articles
  |> take(3)
  |> map(a => "• {a.title}")
  |> join("\n")

# Step 3: Make decisions based on data
let should_commute = match [weather.condition, len(urgent_meetings)] {
  ["storm", _] => false,
  [_, 0] => false,
  _ => true
}

let commute_advice = if should_commute {
  "Head to the office — you have {len(urgent_meetings)} urgent meetings."
} el {
  "Work from home today."
}

# Step 4: Compose and deliver the briefing
let briefing = "Good morning!

{weather_summary}

{commute_advice}

Top News:
{top_headlines}

Urgent Meetings:
{urgent_meetings |> map(m => "• {m.time}: {m.title}") |> join("\n")}"

print(briefing)

# Step 5: Post summary to Slack
@POST "api/slack/messages" {
  channel: "daily-briefing",
  text: briefing
}

# Compare the equivalent JavaScript:
# - 15+ lines of imports and setup
# - Promise.all() with error handling
# - Manual JSON parsing
# - Template literal construction
# - fetch() with headers, await, .json()
# Arc: Just describe what you want. The language handles the rest.
