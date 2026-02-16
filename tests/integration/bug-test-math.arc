# Bug test: math.floor and math.ceil with negative numbers
use math

# floor(-2.3) should be -3
let f = floor(-2.3)
print("floor(-2.3) = " ++ str(f))
assert(f == -3, "floor(-2.3) should be -3, got " ++ str(f))

# ceil(-2.3) should be -2
let c = ceil(-2.3)
print("ceil(-2.3) = " ++ str(c))
assert(c == -2, "ceil(-2.3) should be -2, got " ++ str(c))

# ceil(2.3) should be 3
let c2 = ceil(2.3)
print("ceil(2.3) = " ++ str(c2))
assert(c2 == 3, "ceil(2.3) should be 3, got " ++ str(c2))

# floor(2.3) should be 2
let f2 = floor(2.3)
print("floor(2.3) = " ++ str(f2))
assert(f2 == 2, "floor(2.3) should be 2, got " ++ str(f2))

print("all math tests passed")
