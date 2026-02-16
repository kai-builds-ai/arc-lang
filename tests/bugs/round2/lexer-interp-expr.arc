# BUG: String interpolation with expressions doesn't work
# The lexer captures text between {} as a single Ident token
# but the parser expects it to be a valid identifier name

let x = 10
let y = 20

# This should print "sum: 30" but the interpolation expression "x + y" 
# is treated as a single identifier name
let a = "sum: {x + y}"
print(a)
