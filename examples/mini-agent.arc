# Mini AI Agent — Showcase for Arc's agent capabilities
# Demonstrates: tool calls (@GET/@POST), pipelines, parallel fetch, pattern matching

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
  "snow" => "Bundle up! Snow with {weather.temp}F.",
  _ => "Looking good: {weather.condition}, {weather.temp}F."
}

let top_headlines = news.articles
  |> take(3)
  |> map(a => a.title)
  |> join("\n")

# Step 3: Decisions
let should_commute = if len(urgent_meetings) > 0 {
  match weather.condition {
    "storm" => false,
    _ => true
  }
} el {
  false
}

let commute_advice = if should_commute {
  "Head to the office — you have {len(urgent_meetings)} urgent meetings."
} el {
  "Work from home today."
}

# Step 4: Briefing
print("Good morning!")
print(weather_summary)
print(commute_advice)
print("Top News:")
print(top_headlines)

if len(urgent_meetings) > 0 {
  print("Urgent Meetings:")
  for m in urgent_meetings {
    print("  {m.time}: {m.title}")
  }
}

# Step 5: Post summary
@POST "api/slack/messages" {
  channel: "daily-briefing",
  text: weather_summary ++ " " ++ commute_advice
}
