# Test escape sequences in strings
# \n and \t should work, but \u, \x, \0 are not handled

# Basic escapes that should work
let a = "hello\nworld"
print(a)

let b = "tab\there"
print(b)

let c = "quote\"inside"
print(c)

let d = "backslash\\"
print(d)

# These should ideally be handled but the lexer just passes them through:
let e = "\0"
print(e)
print(len(e))

# \u and \x - lexer doesn't handle these, just keeps the char after backslash
let f = "\x41"
print(f)

# Unknown escape - lexer keeps the character after backslash
let g = "\q"
print(g)
