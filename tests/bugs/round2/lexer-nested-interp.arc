# BUG: Nested string interpolation (string inside interpolation)
# The lexer's brace-counting approach doesn't handle strings inside interpolation

let name = "world"
# This has a string literal inside the interpolation braces
# The lexer will miscount braces inside the inner string
# let a = "result: {if true { "yes" } el { "no" }}"
# Simplified: even a simple nested brace should work
let b = "hello {name}!"
print(b)
