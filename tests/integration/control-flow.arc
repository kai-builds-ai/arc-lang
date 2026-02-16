# TEST: Control flow

# Basic if
assert(if true { 1 } el { 2 } == 1, "if true")
assert(if false { 1 } el { 2 } == 2, "if false")

# If as expression
let v = if 5 > 3 { "yes" } el { "no" }
assert(v == "yes", "if expr")

# Nested if/el
let n = 15
let category = if n < 0 { "neg" } el { if n < 10 { "small" } el { if n < 100 { "medium" } el { "large" } } }
assert(category == "medium", "nested if/el")

# Deep nested if
let deep = if true { if true { if true { if true { if true { "deep" } el { "x" } } el { "x" } } el { "x" } } el { "x" } } el { "x" }
assert(deep == "deep", "deep nested if")

# If with complex condition
assert(if 1 < 2 and 3 < 4 { true } el { false }, "complex and cond")
assert(if 1 > 2 or 3 < 4 { true } el { false }, "complex or cond")
assert(if not false { true } el { false }, "not cond")

# If without else returns nil
let maybe = if false { 42 }
assert(maybe == nil, "if no else returns nil")

# For loop over list
let mut total = 0
for x in [1, 2, 3, 4, 5] { total = total + x }
assert(total == 15, "for over list")

# For loop over range
let mut sum2 = 0
for i in 1..6 { sum2 = sum2 + i }
assert(sum2 == 15, "for over range")

# Nested for loops
let mut count = 0
for i in 1..4 {
  for j in 1..4 {
    count = count + 1
  }
}
assert(count == 9, "nested for loops")

# For with computation
let mut squares_sum = 0
for x in [1, 2, 3, 4] { squares_sum = squares_sum + x * x }
assert(squares_sum == 30, "for with computation")

# Do-while loop
let mut dw = 0
do { dw = dw + 1 } while dw < 5
assert(dw == 5, "do while")

# Do-until loop
let mut du = 0
do { du = du + 1 } until du == 3
assert(du == 3, "do until")

# Do-while executes at least once
let mut once = 0
do { once = once + 1 } while false
assert(once == 1, "do while at least once")

# For loop over empty list
let mut empty_count = 0
for x in [] { empty_count = empty_count + 1 }
assert(empty_count == 0, "for over empty list")

# For loop building result via mutable
let mut collected = []
for x in [1, 2, 3] { collected = push(collected, x * 10) }
assert(len(collected) == 3, "for building list len")
assert(head(collected) == 10, "for building list head")
assert(last(collected) == 30, "for building list last")

# Truthiness in conditions
assert(if 1 { "truthy" } el { "falsy" } == "truthy", "1 is truthy")
assert(if 0 { "truthy" } el { "falsy" } == "falsy", "0 is falsy")
assert(if "" { "truthy" } el { "falsy" } == "falsy", "empty string falsy")
assert(if "a" { "truthy" } el { "falsy" } == "truthy", "non-empty string truthy")
assert(if nil { "truthy" } el { "falsy" } == "falsy", "nil is falsy")

print("control-flow: all passed")
