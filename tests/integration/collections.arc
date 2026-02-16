# TEST: Collections
# Lists
let nums = [1, 2, 3, 4, 5]
assert(len(nums) == 5, "list len")
assert(nums[0] == 1, "index 0")
assert(nums[4] == 5, "index 4")

# Empty list
let empty = []
assert(len(empty) == 0, "empty list")

# Maps
let m = {name: "arc", version: 1}
assert(m.name == "arc", "map member")
assert(m.version == 1, "map member 2")

# List comprehension
let squares = [x * x for x in [1, 2, 3, 4]]
assert(len(squares) == 4, "comprehension len")
assert(head(squares) == 1, "comprehension head")
assert(last(squares) == 16, "comprehension last")

# Filtered comprehension
let evens = [x for x in [1, 2, 3, 4, 5, 6] if x % 2 == 0]
assert(len(evens) == 3, "filtered comp len")
assert(head(evens) == 2, "filtered comp head")

# Range as iterable
let r = 1..5
assert(len(r) == 4, "range len")
assert(head(r) == 1, "range head")
assert(last(r) == 4, "range last")

# Comprehension with range
let doubled = [x * 2 for x in 1..5]
assert(len(doubled) == 4, "comp range len")
assert(head(doubled) == 2, "comp range head")

# List concat
let combined = [1, 2] ++ [3, 4]
assert(len(combined) == 4, "concat len")
assert(last(combined) == 4, "concat last")

# Nested lists
let nested = [[1, 2], [3, 4]]
assert(len(nested) == 2, "nested len")
let flattened = flat(nested)
assert(len(flattened) == 4, "flat len")

print("collections: all passed")
