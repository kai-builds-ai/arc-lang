# Fetch news from multiple sources

use result

pub let SOURCES = [
  {name: "TechNews", url: "api.technews.example.com/v1/articles"},
  {name: "WorldWire", url: "api.worldwire.example.com/latest"},
  {name: "SciDaily", url: "api.scidaily.example.com/feed"}
]

pub fn fetch_source(source) {
  let response = @GET "{source.url}?limit=10"

  if response == nil {
    print("  Warning: Failed to fetch {source.name}")
    result.err("No response from {source.name}")
  } el {
    let articles = response.articles or response.items or []
    result.ok({
      source: source.name,
      articles: articles
    })
  }
}

pub fn fetch_all_sources(sources) {
  print("Fetching from {len(sources)} sources...")

  let results = sources |> map(s => fetch_source(s))

  let successes = results |> filter(r => result.result_is_ok(r)) |> map(r => result.result_unwrap(r))
  let failures = results |> filter(r => result.result_is_err(r))

  print("  Done: {len(successes)} sources loaded, {len(failures)} failed")
  successes
}
