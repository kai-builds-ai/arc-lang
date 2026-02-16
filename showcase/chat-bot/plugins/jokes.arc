# ============================================================================
# Jokes Plugin — Fun responses with multiple joke sources
# ============================================================================

import std/json
import std/regex
import std/string
import std/collections
import std/math
import "../main.arc" as core

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

let JOKE_API = "https://official-joke-api.appspot.com/random_joke"
let DAD_JOKE_API = "https://icanhazdadjoke.com"
let PROGRAMMING_JOKES_API = "https://v2.jokeapi.dev/joke/Programming"

# ---------------------------------------------------------------------------
# Joke Type Detection
# ---------------------------------------------------------------------------

fn detect_joke_type(text: str) -> str {
  match {
    regex/is_match(regex/new("(?i)(dad|corny|cheesy)"), text) => "dad",
    regex/is_match(regex/new("(?i)(programming|code|dev|tech|computer)"), text) => "programming",
    regex/is_match(regex/new("(?i)(random|any|surprise)"), text) => "random",
    _ => {
      # Rotate through types for variety
      let types = ["random", "dad", "programming"]
      let idx = math/random_int(0, 2)
      types[idx]
    }
  }
}

# ---------------------------------------------------------------------------
# Joke Fetchers
# ---------------------------------------------------------------------------

fn fetch_random_joke() -> result {
  core/with_retry(fn() => {
    let response = @GET(JOKE_API)
    match response.status {
      200 => {
        let data = json/parse(response.body)
        ok({ setup: data.setup, punchline: data.punchline, type: "random" })
      },
      _ => err("Joke API unavailable")
    }
  }, 2, 300)
}

fn fetch_dad_joke() -> result {
  core/with_retry(fn() => {
    let response = @GET(DAD_JOKE_API, {
      headers: { "Accept": "application/json" }
    })
    match response.status {
      200 => {
        let data = json/parse(response.body)
        ok({ setup: data.joke, punchline: nil, type: "dad" })
      },
      _ => err("Dad joke API unavailable")
    }
  }, 2, 300)
}

fn fetch_programming_joke() -> result {
  core/with_retry(fn() => {
    let response = @GET(PROGRAMMING_JOKES_API, {
      params: { type: "twopart" }
    })
    match response.status {
      200 => {
        let data = json/parse(response.body)
        match data.type {
          "twopart" => ok({ setup: data.setup, punchline: data.delivery, type: "programming" }),
          "single" => ok({ setup: data.joke, punchline: nil, type: "programming" }),
          _ => err("Unexpected joke format")
        }
      },
      _ => err("Programming joke API unavailable")
    }
  }, 2, 300)
}

# ---------------------------------------------------------------------------
# Formatting
# ---------------------------------------------------------------------------

let joke_emojis = {
  random: "😄",
  dad: "👨",
  programming: "💻"
}

fn format_joke(joke: map) -> str {
  let emoji = joke_emojis[joke.type] ?? "😄"
  match joke.punchline {
    nil => "{emoji} {joke.setup}",
    _ => "{emoji} {joke.setup}\n\n🥁 {joke.punchline}"
  }
}

# ---------------------------------------------------------------------------
# Fallback Jokes (offline mode)
# ---------------------------------------------------------------------------

let fallback_jokes = [
  { setup: "Why do programmers prefer dark mode?", punchline: "Because light attracts bugs!", type: "programming" },
  { setup: "What's a pirate's favorite programming language?", punchline: "R!", type: "programming" },
  { setup: "Why don't scientists trust atoms?", punchline: "Because they make up everything!", type: "random" },
  { setup: "I told my wife she was drawing her eyebrows too high.", punchline: "She looked surprised.", type: "dad" },
  { setup: "What do you call a fake noodle?", punchline: "An impasta!", type: "dad" },
  { setup: "Why did the Arc developer smile?", punchline: "Because the pipeline just worked. |>", type: "programming" }
]

fn pick_fallback(joke_type: str) -> map {
  let matching = fallback_jokes
    |> collections/filter(fn(j) => j.type == joke_type)

  match collections/length(matching) {
    0 => fallback_jokes[math/random_int(0, collections/length(fallback_jokes) - 1)],
    n => matching[math/random_int(0, n - 1)]
  }
}

# ---------------------------------------------------------------------------
# Public Handlers
# ---------------------------------------------------------------------------

pub fn handle(ctx: map) -> str {
  let joke_type = detect_joke_type(ctx.message)

  let fetcher = match joke_type {
    "dad" => fetch_dad_joke,
    "programming" => fetch_programming_joke,
    _ => fetch_random_joke
  }

  match await fetcher() {
    ok(joke) => format_joke(joke),
    err(_) => {
      let fallback = pick_fallback(joke_type)
      "{format_joke(fallback)}\n_(offline mode)_"
    }
  }
}

pub fn quick_summary(ctx: map) -> str {
  match await fetch_random_joke() {
    ok(joke) => "😄 Quick joke: {joke.setup}",
    err(_) => nil
  }
}
