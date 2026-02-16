# TEST: Pipeline operator
let doubled = [1, 2, 3] |> map(x => x * 2)
assert(len(doubled) == 3, "pipe map len")
assert(head(doubled) == 2, "pipe map head")
assert(last(doubled) == 6, "pipe map last")

# Pipeline to filter
let evens = [1, 2, 3, 4, 5, 6] |> filter(x => x % 2 == 0)
assert(len(evens) == 3, "pipe filter")

# Chained pipeline
let result = [1, 2, 3, 4, 5] |> filter(x => x > 2) |> map(x => x * 10)
assert(len(result) == 3, "chained pipe len")
assert(head(result) == 30, "chained pipe head")

# Pipeline to sort
let sorted = [3, 1, 2] |> sort
assert(head(sorted) == 1, "pipe sort")

# Pipeline to sum
let total = [1, 2, 3] |> sum
assert(total == 6, "pipe sum")

# Pipeline to reverse
let rev = [1, 2, 3] |> reverse
assert(head(rev) == 3, "pipe reverse")

print("pipeline: all passed")
