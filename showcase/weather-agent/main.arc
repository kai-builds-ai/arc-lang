# Weather Dashboard CLI Agent
# Demonstrates: tool calls, pattern matching, pipelines, formatting

# --- Configuration ---

let cities = ["New York", "London", "Tokyo", "Sydney", "Paris"]

# --- Fetch weather data ---

fn fetch_weather(city) {
  let data = @GET "api/weather/{city}"
  { city: city, data: data }
}

# --- Categorize conditions ---

fn categorize(condition) => match condition {
  "clear" => "Clear",
  "sunny" => "Sunny",
  "cloudy" => "Cloudy",
  "rain" => "Rain",
  "snow" => "Snow",
  _ => condition
}

fn temp_indicator(temp) => match temp {
  t if t < 0 => "freezing",
  t if t < 10 => "cold",
  t if t < 20 => "mild",
  t if t < 30 => "warm",
  _ => "hot"
}

# --- Build display ---

fn format_city(entry) {
  let feeling = temp_indicator(15)
  "{entry.city}: {entry.data} ({feeling})"
}

# --- Main ---

print("Weather Dashboard")
print(repeat("-", 40))

let results = cities |> map(c => fetch_weather(c))

for r in results {
  print(format_city(r))
}

print("")
print("Fetched weather for {len(results)} cities")

# --- Analysis ---

print("")
print("Analysis:")
let city_count = len(cities)
print("  Total cities monitored: {city_count}")

# Demo of pattern matching with conditions
let sample_temps = [5, 15, 25, 35, -5]
print("  Temperature classifications:")
for t in sample_temps {
  let class = temp_indicator(t)
  print("    {t}C => {class}")
}

print("")
print("Dashboard complete.")
