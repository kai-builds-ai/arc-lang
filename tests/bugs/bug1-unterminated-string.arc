# Bug 1: Unterminated string - lexer should error but silently produces a token
let x = "hello world
print(x)
