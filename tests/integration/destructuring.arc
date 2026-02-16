# TEST: Destructuring
# Array destructuring
let [a, b, c] = [10, 20, 30]
assert(a == 10, "array destruct a")
assert(b == 20, "array destruct b")
assert(c == 30, "array destruct c")

# Object destructuring
let m = {x: 1, y: 2, z: 3}
let {x, y, z} = m
assert(x == 1, "obj destruct x")
assert(y == 2, "obj destruct y")
assert(z == 3, "obj destruct z")

# Two-element destructure
let [first, second] = [100, 200]
assert(first == 100, "two elem first")
assert(second == 200, "two elem second")

print("destructuring: all passed")
