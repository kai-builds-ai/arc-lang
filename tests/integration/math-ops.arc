# TEST: Math operations

# Basic arithmetic
assert(1 + 2 == 3, "addition")
assert(10 - 7 == 3, "subtraction")
assert(3 * 4 == 12, "multiplication")
assert(15 / 3 == 5, "division")
assert(17 % 5 == 2, "modulo")
assert(2 ** 10 == 1024, "exponentiation")

# Negative numbers
assert(-5 + 3 == -2, "negative add")
assert(-5 * -3 == 15, "neg times neg")
assert(-10 / 2 == -5, "neg division")
assert(-7 % 3 == -1, "neg modulo")

# Float operations
assert(1.5 + 2.5 == 4.0, "float add")
assert(3.0 * 2.0 == 6.0, "float mul")
assert(7.5 / 2.5 == 3.0, "float div")
assert(0.1 + 0.2 != 0.3, "float imprecision exists")

# Precedence
assert(2 + 3 * 4 == 14, "mul before add")
assert((2 + 3) * 4 == 20, "parens override")
assert(2 * 3 ** 2 == 18, "exp before mul")
assert(10 - 2 - 3 == 5, "left assoc subtraction")
assert(100 / 10 / 2 == 5, "left assoc division")

# Large numbers
assert(2 ** 20 == 1048576, "2^20")
assert(999999 + 1 == 1000000, "large add")
assert(1000000 * 1000 == 1000000000, "large mul")

# Zero
assert(0 + 0 == 0, "zero add")
assert(0 * 999 == 0, "zero mul")
assert(0 ** 0 == 1, "zero to zero")

# Mixed int and float
assert(1 + 0.5 == 1.5, "int plus float")
assert(3 * 1.5 == 4.5, "int times float")

# Unary minus
assert(-(-5) == 5, "double neg")
assert(-(3 + 4) == -7, "neg grouped expr")

# Chained operations
assert(1 + 2 + 3 + 4 + 5 == 15, "chained add")
assert(2 * 3 * 4 == 24, "chained mul")

# Comparison with arithmetic
assert(2 + 2 > 3, "add then compare gt")
assert(2 * 3 <= 6, "mul then compare le")
assert(10 % 3 == 1, "mod then compare eq")

# abs, min, max, round
assert(abs(-42) == 42, "abs negative")
assert(abs(42) == 42, "abs positive")
assert(min(3, 1, 2) == 1, "min")
assert(max(3, 1, 2) == 3, "max")
assert(round(3.7) == 4, "round up")
assert(round(3.2) == 3, "round down")

# int/float conversion
assert(int(3.9) == 3, "int truncates")
assert(float("3.14") == 3.14, "float parse")
assert(int("42") == 42, "int parse")

print("math-ops: all passed")
