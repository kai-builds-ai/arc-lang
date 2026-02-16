# Entry point for news-digest

use fetcher: SOURCES, fetch_all_sources
use processor: process_articles, build_digest
use formatter: format_digest, format_compact

fn main() {
  print("Starting News Digest...\n")

  let raw_data = fetch_all_sources(SOURCES)
  let articles = process_articles(raw_data)
  print("Processed {len(articles)} unique articles\n")

  let digest = build_digest(articles)
  let output = format_digest(digest)
  print(output)

  let compact = format_compact(digest)
  print("\n\n--- COMPACT VERSION ---\n")
  print(compact)
}

main()
