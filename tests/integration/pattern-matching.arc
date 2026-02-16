# TEST: Pattern matching
let x = 2
let r = match x { 1 => "one", 2 => "two", _ => "other" }
assert(r == "two", "literal match")

# Wildcard
let w = match 99 { _ => "wild" }
assert(w == "wild", "wildcard")

# Binding
let b = match 42 { n => n + 1 }
assert(b == 43, "binding pattern")

# Bool patterns
let t = match true { true => "yes", false => "no" }
assert(t == "yes", "bool pattern")

# Nil pattern
let n = match nil { nil => "nothing", _ => "something" }
assert(n == "nothing", "nil pattern")

# String pattern
let s = match "hello" { "hello" => 1, _ => 0 }
assert(s == 1, "string pattern")

# Multiple arms
let v = match 5 { 1 => "a", 2 => "b", 3 => "c", _ => "d" }
assert(v == "d", "fallthrough to wildcard")

print("pattern-matching: all passed")
