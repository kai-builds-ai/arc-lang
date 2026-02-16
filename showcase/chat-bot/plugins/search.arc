# ============================================================================
# Search Plugin — Web search with parallel source fetching
# ============================================================================

import std/json
import std/regex
import std/string
import std/collections
import std/datetime
import "../main.arc" as core

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

let SEARCH_API = "https://api.duckduckgo.com"
let WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary"
let MAX_RESULTS = 5

# ---------------------------------------------------------------------------
# Query Extraction
# ---------------------------------------------------------------------------

fn extract_query(ctx: map) -> str {
  let topic = ctx.entities.topic
  match topic {
    some(t) => t,
    none => {
      # Strip command words and use remaining text
      ctx.message
        |> regex/replace(regex/new("(?i)^(search|find|look up|what is|tell me about)\\s+"), "")
        |> string/trim()
    }
  }
}

# ---------------------------------------------------------------------------
# API Calls
# ---------------------------------------------------------------------------

fn search_ddg(query: str) -> result {
  core/with_retry(fn() => {
    let response = @GET(SEARCH_API, {
      params: { q: query, format: "json", no_html: 1 }
    })
    match response.status {
      200 => ok(json/parse(response.body)),
      _ => err("Search failed: {response.status}")
    }
  }, 2, 500)
}

fn search_wiki(topic: str) -> result {
  let slug = topic |> string/replace(" ", "_") |> string/trim()
  core/with_retry(fn() => {
    let response = @GET("{WIKI_API}/{slug}")
    match response.status {
      200 => ok(json/parse(response.body)),
      _ => err("Wikipedia article not found")
    }
  }, 2, 300)
}

# ---------------------------------------------------------------------------
# Result Formatting
# ---------------------------------------------------------------------------

fn format_ddg_results(data: map) -> str {
  let abstract_text = data.AbstractText ?? ""
  let related = data.RelatedTopics ?? []

  let topics = related
    |> collections/take(MAX_RESULTS)
    |> collections/filter(fn(t) => t.Text != nil)
    |> collections/map(fn(t) => {
      let text = t.Text |> string/slice(0, 120)
      "  • {text}"
    })
    |> string/join("\n")

  match abstract_text {
    "" => match topics {
      "" => nil,
      _ => "🔎 **Related Topics:**\n{topics}"
    },
    _ => "🔎 **{data.Heading ?? "Result"}**\n{abstract_text}\n\n{topics}"
  }
}

fn format_wiki_result(data: map) -> str {
  let title = data.title ?? "Unknown"
  let extract = data.extract ?? "No summary available."
  let extract_short = match string/length(extract) > 300 {
    true => "{string/slice(extract, 0, 297)}...",
    false => extract
  }

  "📚 **{title}** (Wikipedia)\n{extract_short}"
}

# ---------------------------------------------------------------------------
# Parallel Search: DDG + Wikipedia
# ---------------------------------------------------------------------------

fn parallel_search(query: str) -> str {
  let [ddg_result, wiki_result] = await parallel [
    search_ddg(query),
    search_wiki(query)
  ]

  let parts = []

  let parts = match wiki_result {
    ok(data) => collections/append(parts, format_wiki_result(data)),
    err(_) => parts
  }

  let parts = match ddg_result {
    ok(data) => {
      let formatted = format_ddg_results(data)
      match formatted {
        nil => parts,
        _ => collections/append(parts, formatted)
      }
    },
    err(_) => parts
  }

  match collections/length(parts) {
    0 => "🔍 No results found for '{query}'. Try different keywords.",
    _ => parts |> string/join("\n\n---\n\n")
  }
}

# ---------------------------------------------------------------------------
# Public Handlers
# ---------------------------------------------------------------------------

pub fn handle(ctx: map) -> str {
  let query = extract_query(ctx)
  match query {
    "" => "🔍 What would you like me to search for? Try: `search quantum computing`",
    _ => await parallel_search(query)
  }
}

pub fn quick_summary(ctx: map) -> str {
  let query = extract_query(ctx)
  match query {
    "" => nil,
    _ => match await search_wiki(query) {
      ok(data) => "📚 {data.title}: {string/slice(data.extract ?? '', 0, 100)}...",
      err(_) => nil
    }
  }
}
