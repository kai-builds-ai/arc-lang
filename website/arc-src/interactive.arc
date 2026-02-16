# Arc Interactive Website Components
# Compiled to JS and embedded in the website
# This proves Arc can build real things!

# Token counter: compare Arc vs JS token counts
fn count_tokens(code) {
  code
    |> split(" ")
    |> filter(t => len(t) > 0)
    |> len()
}

# Calculate savings percentage
fn calc_savings(arc_count, js_count) {
  100 - (arc_count * 100 / js_count)
}

# Format a number to fixed decimal places  
fn format_pct(n) {
  round(n)
}

# Example comparisons
let examples = [
  "HTTP fetch: 16 vs 24 tokens",
  "Data pipeline: 12 vs 22 tokens",
  "Pattern matching: 8 vs 18 tokens"
]

let total_examples = len(examples)
print("Arc Interactive Components loaded")
print("Examples available: {total_examples}")
