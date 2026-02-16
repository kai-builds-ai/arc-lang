# Word Frequency Counter
# Demonstrates: maps, pipelines, string operations, sorting, comprehensions

let text = "the quick brown fox jumps over the lazy dog the fox the dog"

# Split, normalize, count
let words = text |> split(" ") |> map(lowercase)

let mut counts = {}
for w in words {
  counts[w] = (counts[w] ? 0) + 1
}

print("Word frequencies:")
for {k, v} in counts {
  let bar = ["#" for _ in 1..v+1] |> join("")
  print("  {k}: {v} {bar}")
}

# Top N words using pipeline
fn top_words(counts, n) =>
  counts
    |> entries
    |> sort_by(e => -e[1])
    |> take(n)
    |> map(e => "{e[0]} ({e[1]})")

print("Top 3: {top_words(counts, 3)}")

# Unique word count
let unique = counts |> keys |> len
print("Unique words: {unique}")
print("Total words: {len(words)}")
