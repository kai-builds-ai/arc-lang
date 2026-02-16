# Weather Dashboard CLI Agent
# Fetches weather for multiple cities, categorizes conditions,
# and displays a formatted dashboard.

use std/json: from_json, to_json, pretty
use std/collections: sort_by, group_by, max_by, min_by, partition
use std/strings: pad_right, pad_left, capitalize
use std/result: ok, err, is_ok, unwrap, unwrap_or, map_result
use std/http: fetch_all

# --- Configuration ---

let cities = [
  "New York", "London", "Tokyo", "Sydney",
  "Paris", "Berlin", "Toronto", "Mumbai"
]

let api_base = "api.weather.service/v1/current"

# --- Fetch weather data in parallel ---

fn build_url(city) => "{api_base}?city={city}"

let urls = map(cities, c => build_url(c))

# Parallel fetch — all requests fire concurrently
let [ny, ldn, tky, syd, par, ber, tor, mum] = fetch [
  @GET "{api_base}?city=New+York"
  @GET "{api_base}?city=London"
  @GET "{api_base}?city=Tokyo"
  @GET "{api_base}?city=Sydney"
  @GET "{api_base}?city=Paris"
  @GET "{api_base}?city=Berlin"
  @GET "{api_base}?city=Toronto"
  @GET "{api_base}?city=Mumbai"
]

# --- Safe parsing with Result type ---

fn safe_parse(raw) {
  if raw == nil { err("No response") }
  el { ok(from_json(raw)) }
}

let responses = [ny, ldn, tky, syd, par, ber, tor, mum]
  |> map(r => safe_parse(r))

# Partition into successes and failures
let [good, bad] = partition(responses, r => is_ok(r))

let weather_data = good |> map(r => unwrap(r))

# --- Categorize weather with pattern matching ---

fn categorize(condition) {
  match condition {
    "clear" => { icon: "☀️", severity: 0, label: "Clear" }
    "sunny" => { icon: "☀️", severity: 0, label: "Sunny" }
    "partly_cloudy" => { icon: "⛅", severity: 1, label: "Partly Cloudy" }
    "cloudy" => { icon: "☁️", severity: 1, label: "Cloudy" }
    "overcast" => { icon: "☁️", severity: 2, label: "Overcast" }
    "rain" => { icon: "🌧️", severity: 3, label: "Rain" }
    "heavy_rain" => { icon: "⛈️", severity: 4, label: "Heavy Rain" }
    "snow" => { icon: "❄️", severity: 3, label: "Snow" }
    "thunderstorm" => { icon: "⚡", severity: 5, label: "Thunderstorm" }
    _ => { icon: "❓", severity: 1, label: capitalize(condition) }
  }
}

fn temp_indicator(temp_c) {
  match temp_c {
    t if t < 0 => "🥶"
    t if t < 10 => "🧊"
    t if t < 20 => "🌤️"
    t if t < 30 => "☀️"
    _ => "🔥"
  }
}

# --- Build display rows ---

fn build_row(entry) {
  let cat = categorize(entry.condition)
  let temp_icon = temp_indicator(entry.temp_c)
  {
    city: entry.city,
    temp_c: entry.temp_c,
    temp_f: entry.temp_c * 9 / 5 + 32,
    humidity: entry.humidity,
    wind_kph: entry.wind_kph,
    icon: cat.icon,
    label: cat.label,
    severity: cat.severity,
    temp_icon: temp_icon
  }
}

let rows = weather_data |> map(r => build_row(r))

# --- Sort and analyze ---

let by_temp = rows |> sort_by(r => r.temp_c)
let hottest = rows |> max_by(r => r.temp_c)
let coldest = rows |> min_by(r => r.temp_c)
let windiest = rows |> max_by(r => r.wind_kph)

# Group by weather category
let by_condition = rows |> group_by(r => r.label)

# --- Format output ---

fn separator() => "+" ++ repeat("-", 16) ++ "+" ++ repeat("-", 8) ++ "+" ++ repeat("-", 8) ++ "+" ++ repeat("-", 18) ++ "+" ++ repeat("-", 10) ++ "+" ++ repeat("-", 10) ++ "+"

fn header_row() {
  let c1 = pad_right(" City", 16, " ")
  let c2 = pad_right(" °C", 8, " ")
  let c3 = pad_right(" °F", 8, " ")
  let c4 = pad_right(" Condition", 18, " ")
  let c5 = pad_right(" Humid%", 10, " ")
  let c6 = pad_right(" Wind", 10, " ")
  "|{c1}|{c2}|{c3}|{c4}|{c5}|{c6}|"
}

fn format_row(r) {
  let c1 = pad_right(" {r.city}", 16, " ")
  let c2 = pad_right(" {r.temp_icon}{r.temp_c}", 8, " ")
  let c3 = pad_right(" {r.temp_f}", 8, " ")
  let c4 = pad_right(" {r.icon} {r.label}", 18, " ")
  let c5 = pad_right(" {r.humidity}%", 10, " ")
  let c6 = pad_right(" {r.wind_kph}kph", 10, " ")
  "|{c1}|{c2}|{c3}|{c4}|{c5}|{c6}|"
}

# --- Print dashboard ---

print("")
print("  🌍 Weather Dashboard — {len(rows)} cities loaded, {len(bad)} failed")
print("")
print(separator())
print(header_row())
print(separator())

for row in by_temp {
  print(format_row(row))
}

print(separator())
print("")

# Summary stats
print("  📊 Summary:")
print("    🔥 Hottest: {hottest.city} at {hottest.temp_c}°C")
print("    🥶 Coldest: {coldest.city} at {coldest.temp_c}°C")
print("    💨 Windiest: {windiest.city} at {windiest.wind_kph} kph")
print("")

# Group summary
print("  📋 By Condition:")
for label in keys(by_condition) {
  let group = by_condition[label]
  let city_names = group |> map(r => r.city) |> join(", ")
  print("    {label}: {city_names}")
}

print("")
print("  ✅ Dashboard complete.")
