# TEST: Error handling basics
# Nil coalescing via or
let x = nil
let val = x or 42
assert(val == 42, "nil or default")

let y = 10
let val2 = y or 42
assert(val2 == 10, "non-nil or")

# False or
let f = false
let val3 = f or "fallback"
assert(val3 == "fallback", "false or fallback")

print("error-handling: all passed")
