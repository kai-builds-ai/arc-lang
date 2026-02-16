# Test number edge cases

# Leading zeros - should these be octal? Currently parsed as decimal
let a = 007
print(a)

# Hex literals - not supported, should error or parse
# let b = 0xFF  # This will lex as 0, then 'xFF' as ident

# Float edge cases
let c = 0.5
print(c)

let d = 1.0
print(d)

# Number followed by range
let e = 1..5
print(e)

# Multiple dots in a number - what happens?
# let f = 1.2.3  # should this error?

# Very large number
let g = 99999999999999999999
print(g)
