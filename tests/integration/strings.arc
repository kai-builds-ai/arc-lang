# TEST: Strings
let s = "hello"
assert(len(s) == 5, "string len")
assert(upper(s) == "HELLO", "upper")
assert(lower("HELLO") == "hello", "lower")

# Interpolation
let name = "World"
let greeting = "Hello {name}"
assert(greeting == "Hello World", "interpolation")

# Escape sequences
let newlined = "a\nb"
assert(len(newlined) == 3, "escape newline len")

let tabbed = "a\tb"
assert(len(tabbed) == 3, "escape tab len")

# Concat
let combined = "foo" ++ "bar"
assert(combined == "foobar", "string concat")

# String functions
assert(trim("  hi  ") == "hi", "trim")
assert(starts("hello", "hel"), "starts")
assert(ends("hello", "llo"), "ends")
assert(contains("hello", "ell"), "contains")
assert(replace("hello", "l", "r") == "herro", "replace")
assert(join(split("a,b,c", ","), ",") == "a,b,c", "split-join roundtrip")

print("strings: all passed")
