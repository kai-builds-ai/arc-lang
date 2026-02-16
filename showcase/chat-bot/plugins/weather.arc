# ============================================================================
# Weather Plugin — External API integration with retry and caching
# ============================================================================

import std/json
import std/regex
import std/datetime
import std/string
import std/collections
import "../main.arc" as core

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

let API_BASE = "https://api.openweathermap.org/data/2.5"
let CACHE_TTL_SECONDS = 300
let weather_cache = {}

# ---------------------------------------------------------------------------
# Entity Extraction Helpers
# ---------------------------------------------------------------------------

fn extract_city(ctx: map) -> str {
  ctx.entities.city ?? ctx.session.context.entities.city ?? "New York"
}

fn extract_units(text: str) -> str {
  let celsius = regex/new("(?i)(celsius|metric|°c)")
  match regex/is_match(celsius, text) {
    true => "metric",
    false => "imperial"
  }
}

# ---------------------------------------------------------------------------
# API Calls with Retry
# ---------------------------------------------------------------------------

fn fetch_current(city: str, units: str) -> result {
  core/with_retry(fn() => {
    let response = @GET("{API_BASE}/weather", {
      params: { q: city, units: units, appid: "demo_key" }
    })
    match response.status {
      200 => ok(json/parse(response.body)),
      404 => err("City '{city}' not found"),
      _ => err("API error: {response.status}")
    }
  }, 3, 1000)
}

fn fetch_forecast(city: str, units: str) -> result {
  core/with_retry(fn() => {
    let response = @GET("{API_BASE}/forecast", {
      params: { q: city, units: units, cnt: 5, appid: "demo_key" }
    })
    match response.status {
      200 => ok(json/parse(response.body)),
      _ => err("Forecast unavailable: {response.status}")
    }
  }, 2, 500)
}

# ---------------------------------------------------------------------------
# Response Formatting
# ---------------------------------------------------------------------------

fn format_weather(data: map, units: str) -> str {
  let temp = data.main.temp
  let feels = data.main.feels_like
  let desc = data.weather[0].description
  let humidity = data.main.humidity
  let wind = data.wind.speed
  let unit_label = match units { "metric" => "°C", _ => "°F" }
  let wind_label = match units { "metric" => "m/s", _ => "mph" }
  let icon = match {
    regex/is_match(regex/new("(?i)clear"), desc) => "☀️",
    regex/is_match(regex/new("(?i)cloud"), desc) => "☁️",
    regex/is_match(regex/new("(?i)rain"), desc) => "🌧️",
    regex/is_match(regex/new("(?i)snow"), desc) => "❄️",
    regex/is_match(regex/new("(?i)thunder"), desc) => "⛈️",
    _ => "🌤️"
  }

  "{icon} **Weather in {data.name}**\n" ++
  "• Temperature: {temp}{unit_label} (feels like {feels}{unit_label})\n" ++
  "• Conditions: {desc}\n" ++
  "• Humidity: {humidity}%\n" ++
  "• Wind: {wind} {wind_label}"
}

fn format_forecast(data: map, units: str) -> str {
  let unit_label = match units { "metric" => "°C", _ => "°F" }

  let items = data.list
    |> collections/map(fn(entry) => {
      let dt = datetime/from_unix(entry.dt)
      let time = datetime/format(dt, "ddd HH:mm")
      let temp = entry.main.temp
      let desc = entry.weather[0].description
      "  • {time}: {temp}{unit_label}, {desc}"
    })
    |> string/join("\n")

  "📅 **5-Period Forecast:**\n{items}"
}

# ---------------------------------------------------------------------------
# Cache Layer
# ---------------------------------------------------------------------------

fn cache_key(city: str, kind: str) -> str {
  "{string/lowercase(city)}:{kind}"
}

fn get_cached(city: str, kind: str) -> option {
  let key = cache_key(city, kind)
  match weather_cache[key] {
    some(entry) => {
      let age = datetime/diff_seconds(datetime/now(), entry.timestamp)
      match age < CACHE_TTL_SECONDS {
        true => some(entry.data),
        false => none
      }
    },
    none => none
  }
}

fn set_cache(city: str, kind: str, data: any) {
  let key = cache_key(city, kind)
  weather_cache[key] = { data: data, timestamp: datetime/now() }
}

# ---------------------------------------------------------------------------
# Public Handlers
# ---------------------------------------------------------------------------

pub fn handle(ctx: map) -> str {
  let city = extract_city(ctx)
  let units = extract_units(ctx.message)
  let wants_forecast = regex/is_match(regex/new("(?i)(forecast|week|days)"), ctx.message)

  match wants_forecast {
    true => {
      let cached = get_cached(city, "forecast")
      let data = match cached {
        some(d) => ok(d),
        none => {
          let result = await fetch_forecast(city, units)
          match result {
            ok(d) => { set_cache(city, "forecast", d); ok(d) },
            err(e) => err(e)
          }
        }
      }
      match data {
        ok(d) => format_forecast(d, units),
        err(e) => "⚠️ {e}"
      }
    },
    false => {
      let cached = get_cached(city, "current")
      let data = match cached {
        some(d) => ok(d),
        none => {
          let result = await fetch_current(city, units)
          match result {
            ok(d) => { set_cache(city, "current", d); ok(d) },
            err(e) => err(e)
          }
        }
      }
      match data {
        ok(d) => format_weather(d, units),
        err(e) => "⚠️ {e}"
      }
    }
  }
}

pub fn quick_summary(ctx: map) -> str {
  let city = extract_city(ctx)
  match await fetch_current(city, "imperial") {
    ok(d) => "🌡️ {city}: {d.main.temp}°F, {d.weather[0].description}",
    err(_) => nil
  }
}
