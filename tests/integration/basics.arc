# TEST: Basic variables and math
let x = 42
assert(x == 42, "let binding")

let y = x + 8
assert(y == 50, "addition")

assert(10 - 3 == 7, "subtraction")
assert(4 * 5 == 20, "multiplication")
assert(10 % 3 == 1, "modulo")
assert(2 ** 3 == 8, "power")

# Comparisons
assert(1 == 1, "equality")
assert(1 != 2, "inequality")
assert(1 < 2, "less than")
assert(2 > 1, "greater than")
assert(1 <= 1, "less or equal")
assert(2 >= 1, "greater or equal")

# Booleans
assert(true and true, "and true")
assert(not (true and false), "and false")
assert(true or false, "or")
assert(not false, "not")

# Nil
assert(nil == nil, "nil equality")

# Strings
let s = "hello"
assert(len(s) == 5, "string length")

# Let mut
let mut counter = 0
assert(counter == 0, "mutable let")

print("basics: all passed")
