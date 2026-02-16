use json

# Test: double quotes inside strings should be escaped in to_json
# Arc uses "he said \"hi\"" — the interpreter sees the string with literal quotes
let s = to_json("he said \"hi\"")
print("to_json with quotes: " ++ s)
# Should contain escaped quotes
assert(contains(s, "\\\""), "to_json should escape double quotes, got: " ++ s)
print("passed")
