# Test string interpolation edge cases

let x = 42
let y = "world"

# Basic interpolation
let a = "hello {y}!"
print(a)

# Nested braces in interpolation - lexer counts brace depth
let b = "value: {x}"
print(b)

# Empty interpolation
let c = "empty: {} end"
print(c)

# Interpolation with expression - the lexer treats everything between {} as an ident
# This means expressions like {x + 1} won't work properly
let d = "expr: {x + 1} done"
print(d)

# Adjacent interpolations
let e = "{x}{y}"
print(e)

# Interpolation at start
let f = "{x} is the answer"
print(f)

# Interpolation at end
let g = "the answer is {x}"
print(g)
