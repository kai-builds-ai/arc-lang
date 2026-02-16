# =============================================================================
# diff-algorithm.arc — Text Diff Algorithm (LCS-based)
# =============================================================================
# Demonstrates: fn, let, mut, match, |>, =>, pub, import, closures,
# higher-order functions, string interpolation, pattern matching, collections
# =============================================================================

use collections

# --- Diff operation types ---
pub enum DiffOp {
  Equal(str),
  Add(str),
  Remove(str),
}

# --- Diff result ---
pub struct DiffResult {
  ops: list,
  old_lines: list,
  new_lines: list,
  stats: DiffStats,
}

pub struct DiffStats {
  additions: int,
  deletions: int,
  unchanged: int,
  total_old: int,
  total_new: int,
}

# --- Compute LCS (Longest Common Subsequence) table ---
fn build_lcs_table(old_lines: list, new_lines: list) -> list {
  let m = len(old_lines)
  let n = len(new_lines)

  # Initialize (m+1) x (n+1) table with zeros
  let mut table = range(0, m + 1) |> map(fn(_) => {
    range(0, n + 1) |> map(fn(_) => 0)
  })

  # Fill the table
  range(1, m + 1) |> each(fn(i) {
    range(1, n + 1) |> each(fn(j) {
      if old_lines[i - 1] == new_lines[j - 1] {
        table[i][j] = table[i - 1][j - 1] + 1
      } el {
        table[i][j] = math::max(table[i - 1][j], table[i][j - 1])
      }
    })
  })

  table
}

# --- Backtrack through LCS table to generate diff ops ---
fn backtrack(table: list, old_lines: list, new_lines: list) -> list {
  let mut ops = []
  let mut i = len(old_lines)
  let mut j = len(new_lines)

  while i > 0 || j > 0 {
    if i > 0 && j > 0 && old_lines[i - 1] == new_lines[j - 1] {
      ops = [DiffOp::Equal(old_lines[i - 1])] |> concat(ops)
      i = i - 1
      j = j - 1
    } el if j > 0 && (i == 0 || table[i][j - 1] >= table[i - 1][j]) {
      ops = [DiffOp::Add(new_lines[j - 1])] |> concat(ops)
      j = j - 1
    } el if i > 0 {
      ops = [DiffOp::Remove(old_lines[i - 1])] |> concat(ops)
      i = i - 1
    }
  }

  ops
}

# --- Main diff function ---
pub fn diff(old_text: str, new_text: str) -> DiffResult {
  let old_lines = old_text |> str::split("\n")
  let new_lines = new_text |> str::split("\n")

  let table = build_lcs_table(old_lines, new_lines)
  let ops = backtrack(table, old_lines, new_lines)

  let stats = compute_stats(ops, old_lines, new_lines)

  DiffResult {
    ops: ops,
    old_lines: old_lines,
    new_lines: new_lines,
    stats: stats,
  }
}

fn compute_stats(ops: list, old_lines: list, new_lines: list) -> DiffStats {
  let additions = ops |> filter(fn(op) => match op {
    DiffOp::Add(_) => true
    _ => false
  }) |> len()

  let deletions = ops |> filter(fn(op) => match op {
    DiffOp::Remove(_) => true
    _ => false
  }) |> len()

  let unchanged = ops |> filter(fn(op) => match op {
    DiffOp::Equal(_) => true
    _ => false
  }) |> len()

  DiffStats {
    additions: additions,
    deletions: deletions,
    unchanged: unchanged,
    total_old: len(old_lines),
    total_new: len(new_lines),
  }
}

# --- Generate unified diff output ---
pub fn unified_diff(result: DiffResult, old_name: str, new_name: str) -> str {
  let mut output = []
  output = output |> append("--- {old_name}")
  output = output |> append("+++ {new_name}")

  # Generate hunks
  let hunks = generate_hunks(result.ops, 3) # 3 lines of context

  hunks |> each(fn(hunk) {
    output = output |> append("@@ -{hunk.old_start},{hunk.old_count} +{hunk.new_start},{hunk.new_count} @@")

    hunk.lines |> each(fn(line) {
      output = output |> append(line)
    })
  })

  output |> str::join("\n")
}

pub struct Hunk {
  old_start: int,
  old_count: int,
  new_start: int,
  new_count: int,
  lines: list,
}

fn generate_hunks(ops: list, context: int) -> list {
  let mut hunks = []
  let mut current_hunk = nil
  let mut old_line = 1
  let mut new_line = 1
  let mut context_buffer = []

  ops |> each(fn(op) {
    match op {
      DiffOp::Equal(line) => {
        if current_hunk != nil {
          # Add trailing context
          if len(current_hunk.lines) > 0 {
            current_hunk.lines = current_hunk.lines |> append(" {line}")
            current_hunk.old_count = current_hunk.old_count + 1
            current_hunk.new_count = current_hunk.new_count + 1
          }
        }

        # Keep context buffer
        context_buffer = context_buffer |> append(" {line}")
        if len(context_buffer) > context {
          context_buffer = context_buffer |> collections::slice(1, len(context_buffer))
        }

        old_line = old_line + 1
        new_line = new_line + 1
      }
      DiffOp::Add(line) => {
        if current_hunk == nil {
          current_hunk = Hunk {
            old_start: old_line - len(context_buffer),
            old_count: len(context_buffer),
            new_start: new_line - len(context_buffer),
            new_count: len(context_buffer),
            lines: context_buffer |> collections::clone(),
          }
          context_buffer = []
        }
        current_hunk.lines = current_hunk.lines |> append("+{line}")
        current_hunk.new_count = current_hunk.new_count + 1
        new_line = new_line + 1
      }
      DiffOp::Remove(line) => {
        if current_hunk == nil {
          current_hunk = Hunk {
            old_start: old_line - len(context_buffer),
            old_count: len(context_buffer),
            new_start: new_line - len(context_buffer),
            new_count: len(context_buffer),
            lines: context_buffer |> collections::clone(),
          }
          context_buffer = []
        }
        current_hunk.lines = current_hunk.lines |> append("-{line}")
        current_hunk.old_count = current_hunk.old_count + 1
        old_line = old_line + 1
      }
    }
  })

  if current_hunk != nil {
    hunks = hunks |> append(current_hunk)
  }

  hunks
}

# --- Colorized diff output ---
pub fn colorized_diff(result: DiffResult) -> str {
  let RED = "\x1b[31m"
  let GREEN = "\x1b[32m"
  let RESET = "\x1b[0m"
  let CYAN = "\x1b[36m"
  let BOLD = "\x1b[1m"

  let mut output = []

  result.ops |> each(fn(op) {
    match op {
      DiffOp::Equal(line) => {
        output = output |> append("  {line}")
      }
      DiffOp::Add(line) => {
        output = output |> append("{GREEN}+ {line}{RESET}")
      }
      DiffOp::Remove(line) => {
        output = output |> append("{RED}- {line}{RESET}")
      }
    }
  })

  let stats = result.stats
  let summary = "{BOLD}{CYAN}--- Stats ---{RESET}\n"
    + "{GREEN}+{stats.additions} additions{RESET}, "
    + "{RED}-{stats.deletions} deletions{RESET}, "
    + "{stats.unchanged} unchanged"

  output |> str::join("\n") |> str::concat("\n\n{summary}")
}

# --- Generate a patch ---
pub fn generate_patch(result: DiffResult, old_name: str, new_name: str) -> str {
  let mut patch = []
  patch = patch |> append("diff --arc a/{old_name} b/{new_name}")
  patch = patch |> append(unified_diff(result, "a/{old_name}", "b/{new_name}"))
  patch |> str::join("\n")
}

# --- Apply a patch to text ---
pub fn apply_patch(original: str, patch: str) -> str {
  let lines = patch |> str::split("\n")
  let old_lines = original |> str::split("\n")
  let mut result = []
  let mut old_idx = 0

  lines |> each(fn(line) {
    if str::starts_with(line, "@@") {
      # Parse hunk header — skip for simple application
    } el if str::starts_with(line, "-") {
      # Skip removed line, advance old index
      old_idx = old_idx + 1
    } el if str::starts_with(line, "+") {
      # Add new line
      result = result |> append(line |> str::slice(1, str::len(line)))
    } el if str::starts_with(line, " ") {
      # Context line
      result = result |> append(line |> str::slice(1, str::len(line)))
      old_idx = old_idx + 1
    }
  })

  # Append remaining original lines
  while old_idx < len(old_lines) {
    result = result |> append(old_lines[old_idx])
    old_idx = old_idx + 1
  }

  result |> str::join("\n")
}

# --- Word-level diff ---
pub fn word_diff(old_text: str, new_text: str) -> str {
  let old_words = old_text |> str::split_whitespace()
  let new_words = new_text |> str::split_whitespace()

  let table = build_lcs_table(old_words, new_words)
  let ops = backtrack(table, old_words, new_words)

  let RED = "\x1b[31m"
  let GREEN = "\x1b[32m"
  let RESET = "\x1b[0m"

  ops |> map(fn(op) => match op {
    DiffOp::Equal(word) => word
    DiffOp::Add(word) => "{GREEN}[+{word}]{RESET}"
    DiffOp::Remove(word) => "{RED}[-{word}]{RESET}"
  }) |> str::join(" ")
}

# --- Similarity ratio ---
pub fn similarity(old_text: str, new_text: str) -> float {
  let result = diff(old_text, new_text)
  let total = result.stats.additions + result.stats.deletions + result.stats.unchanged
  if total == 0 { ret 1.0 }
  (result.stats.unchanged |> to_float()) / (total |> to_float())
}

# --- Demo ---
fn main() {
  let old_text = "fn greet(name: str) {
  let message = \"Hello\"
  print(\"{message}, {name}!\")
  print(\"Welcome to Arc\")
  ret message
}"

  let new_text = "fn greet(name: str, greeting: str) {
  let message = greeting
  print(\"{message}, {name}!\")
  print(\"Welcome to Arc v2\")
  log(\"Greeted {name}\")
  ret message
}"

  print("=== Line Diff ===\n")
  let result = diff(old_text, new_text)
  print(colorized_diff(result))

  print("\n\n=== Unified Diff ===\n")
  print(unified_diff(result, "greet.arc", "greet.arc"))

  print("\n\n=== Patch ===\n")
  let patch = generate_patch(result, "greet.arc", "greet.arc")
  print(patch)

  print("\n\n=== Word Diff ===\n")
  let word_result = word_diff(
    "The quick brown fox jumps over the lazy dog",
    "The quick red fox leaps over the sleepy dog"
  )
  print(word_result)

  print("\n\n=== Similarity ===")
  let sim = similarity(old_text, new_text)
  print("Similarity: {(sim * 100.0) |> to_int()}%")
}
