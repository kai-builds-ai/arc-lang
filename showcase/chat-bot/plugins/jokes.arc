# Jokes Plugin for Arc ChatBot
# Demonstrates: lists, random selection, pattern matching

let joke_categories = {
  programming: [
    "Why do programmers prefer dark mode? Because light attracts bugs!",
    "There are 10 types of people: those who understand binary and those who don't.",
    "A SQL query walks into a bar, sees two tables, and asks: Can I JOIN you?"
  ],
  general: [
    "I told my wife she was drawing her eyebrows too high. She looked surprised.",
    "Why don't scientists trust atoms? Because they make up everything!",
    "What do you call a fake noodle? An impasta!"
  ],
  math: [
    "Why was six afraid of seven? Because seven eight nine!",
    "Parallel lines have so much in common. It's a shame they'll never meet.",
    "Why did the obtuse angle go to the beach? Because it was over 90 degrees!"
  ]
}

fn get_joke(category) {
  let jokes = match category {
    "programming" => joke_categories.programming,
    "math" => joke_categories.math,
    _ => joke_categories.general
  }
  # Return first joke (in a real app, would be random)
  jokes[0]
}

fn handle(ctx) {
  let category = if contains(lower(ctx.message), "programming") { "programming" }
    el if contains(lower(ctx.message), "math") { "math" }
    el { "general" }
  get_joke(category)
}

# --- Demo ---
print("=== Jokes Plugin Demo ===")

let categories = ["programming", "math", "general"]
for cat in categories {
  let joke = get_joke(cat)
  print("{cat}: {joke}")
}
