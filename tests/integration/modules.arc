# Module system integration tests

# Test: import all from math
use math

assert(PI > 3.14, "PI should be > 3.14")
assert(PI < 3.15, "PI should be < 3.15")
assert(E > 2.71, "E should be > 2.71")
assert(abs(-5) == 5, "abs(-5) should be 5")
assert(abs(3) == 3, "abs(3) should be 3")
assert(pow(2, 10) == 1024, "pow(2,10) should be 1024")
assert(floor(3.7) == 3, "floor(3.7) should be 3")
assert(ceil(3.2) == 4, "ceil(3.2) should be 4")
assert(clamp(5, 0, 10) == 5, "clamp(5,0,10) should be 5")
assert(clamp(-1, 0, 10) == 0, "clamp(-1,0,10) should be 0")
assert(clamp(15, 0, 10) == 10, "clamp(15,0,10) should be 10")

# Test: import all from strings
use strings

assert(capitalize("hello") == "Hello", "capitalize should work")
assert(len(words("hello world")) == 2, "words should split")
assert(pad_left("hi", 5, " ") == "   hi", "pad_left should work")
assert(pad_right("hi", 5, " ") == "hi   ", "pad_right should work")

# Test: selective import
use math: abs, PI
assert(abs(-42) == 42, "selective import abs should work")
assert(PI > 3, "selective import PI should work")

print("All module tests passed!")
