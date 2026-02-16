# Security sandbox tests - this file is used to test from TypeScript directly
# These are just Arc programs that the sandbox should restrict

# Infinite loop (should be caught by step limit)
let mut i = 0
do {
  i = i + 1
} while true
