# Test unicode in various positions

# Unicode in strings should work fine
let a = "héllo wörld"
print(a)

let b = "emoji: 🎉🚀"
print(b)

# Unicode identifiers - NOT supported by lexer (only a-z, A-Z, _)
# This should fail or produce unexpected behavior
# let café = 1  # The 'é' will be an unknown character
