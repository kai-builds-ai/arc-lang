# Fetch news from multiple sources

use std/result

pub let SOURCES = [
  {name: "TechNews", url: "api.technews.example.com/v1/articles"},
  {name: "WorldWire", url: "api.worldwire.example.com/latest"},
  {name: "SciDaily", url: "api.scidaily.example.com/feed"}
]

pub fn fetch_source(source) {
  let response = @GET "{source.url}?limit=10"

  match response {
    Ok({articles}) => result.ok({
      source: source.name,
      articles: articles
    }),
    Ok({items}) => result.ok({
      source: source.name,
      articles: items
    }),
    Err(msg) => {
      print("  ⚠ Failed to fetch {source.name}: {msg}")
      result.err(msg)
    }
  }
}

pub fn fetch_all_sources(sources) {
  print("Fetching from {len(sources)} sources...")

  let results = fetch(sources |> map(s => fetch_source(s)))

  let successes = results |> filter(r => result.is_ok(r)) |> map(r => result.unwrap(r))
  let failures = results |> filter(r => result.is_err(r))

  print("  ✓ {len(successes)} sources loaded, {len(failures)} failed")
  successes
}
