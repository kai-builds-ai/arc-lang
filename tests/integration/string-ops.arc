# TEST: String operations

# Concatenation
assert("hello" ++ " " ++ "world" == "hello world", "string concat")
assert("" ++ "a" == "a", "concat empty left")
assert("a" ++ "" == "a", "concat empty right")

# Length
assert(len("hello") == 5, "string len")
assert(len("") == 0, "empty string len")
assert(len("abc def") == 7, "string len with space")

# String interpolation
let name = "arc"
assert("hello {name}" == "hello arc", "basic interpolation")
let x = 42
assert("val={x}" == "val=42", "int interpolation")
let b = true
assert("{b}" == "true", "bool interpolation")
assert("{nil}" == "nil", "nil interpolation")

# Multiple interpolations
let a = 1
let c = 3
assert("{a}-{x}-{c}" == "1-42-3", "multi interpolation")

# trim
assert(trim("  hello  ") == "hello", "trim both")
assert(trim("hello") == "hello", "trim no-op")
assert(trim("  ") == "", "trim all spaces")

# split and join
let parts = split("a,b,c", ",")
assert(len(parts) == 3, "split len")
assert(head(parts) == "a", "split head")
assert(last(parts) == "c", "split last")
assert(join(parts, "-") == "a-b-c", "join")
assert(join([], ",") == "", "join empty")

# upper / lower
assert(upper("hello") == "HELLO", "upper")
assert(lower("HELLO") == "hello", "lower")
assert(upper("") == "", "upper empty")

# replace
assert(replace("hello world", "world", "arc") == "hello arc", "replace")
assert(replace("aaa", "a", "b") == "bbb", "replace all")
assert(replace("abc", "x", "y") == "abc", "replace no match")

# contains
assert(contains("hello world", "world") == true, "contains true")
assert(contains("hello", "xyz") == false, "contains false")
assert(contains("", "") == true, "contains empty in empty")

# starts / ends
assert(starts("hello", "hel") == true, "starts true")
assert(starts("hello", "xyz") == false, "starts false")
assert(ends("hello", "llo") == true, "ends true")
assert(ends("hello", "xyz") == false, "ends false")

# slice
assert(slice("hello", 0, 3) == "hel", "slice string")
assert(slice("hello", 1, 4) == "ell", "slice mid")

# chars
let ch = chars("abc")
assert(len(ch) == 3, "chars len")
assert(head(ch) == "a", "chars head")

# repeat
assert(repeat("ab", 3) == "ababab", "repeat")
assert(repeat("x", 0) == "", "repeat zero")

# str conversion
assert(str(42) == "42", "str from int")
assert(str(true) == "true", "str from bool")
assert(str(nil) == "nil", "str from nil")
assert(str([1, 2]) == "[1, 2]", "str from list")

# string + number coercion
assert("count: " + 5 == "count: 5", "string plus number")

print("string-ops: all passed")
