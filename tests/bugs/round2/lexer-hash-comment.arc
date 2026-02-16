# The hash character is used for comments
# But it's also listed in TokenType as Hash
# Test that # in strings works
let a = "hello # world"
print(a)

# Hash at end of file (no newline after)
# This comment has no trailing newline