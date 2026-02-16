# TEST: Advanced pattern matching

# Match on strings
let s = match "hello" { "hi" => 1, "hello" => 2, _ => 0 }
assert(s == 2, "match string")

# Match as expression in let
let grade = match 85 {
  _ => if 85 >= 90 { "A" } el { if 85 >= 80 { "B" } el { "C" } }
}
assert(grade == "B", "match expr in let")

# Match with binding and computation
let doubled = match 21 { n => n * 2 }
assert(doubled == 42, "match binding compute")

# Match boolean
let yesno = match false { true => "yes", false => "no" }
assert(yesno == "no", "match bool false")

# Match nil
let n_result = match nil { nil => "nothing", _ => "something" }
assert(n_result == "nothing", "match nil")

# Match with multiple literal arms
let day = match 3 {
  1 => "mon",
  2 => "tue",
  3 => "wed",
  4 => "thu",
  5 => "fri",
  _ => "weekend"
}
assert(day == "wed", "match multiple arms")

# Match falls through to wildcard
let fallback = match 999 { 1 => "one", 2 => "two", _ => "other" }
assert(fallback == "other", "match wildcard fallback")

# Match on negative
let neg = match -1 { 0 => "zero", _ => "nonzero" }
assert(neg == "nonzero", "match negative via wildcard")

# Match with array pattern
let arr_match = match [1, 2, 3] { [a, b, c] => a + b + c, _ => 0 }
assert(arr_match == 6, "match array pattern")

# Match array pattern mismatch falls through
let arr2 = match [1, 2] { [a, b, c] => "three", [a, b] => "two", _ => "other" }
assert(arr2 == "two", "match array len mismatch")

# Nested match
let nested = match "a" {
  "a" => match 1 { 1 => "a1", _ => "a?" },
  _ => "other"
}
assert(nested == "a1", "nested match")

# Match result used in arithmetic
let val = match 10 { n => n } + 5
assert(val == 15, "match in arithmetic")

# Match on string with binding
let greeting = match "world" { name => "hello " ++ name }
assert(greeting == "hello world", "match string binding")

# Match empty list
let empty = match [] { [] => "empty", _ => "non-empty" }
assert(empty == "empty", "match empty array")

# Match single element list
let single = match [42] { [x] => x, _ => 0 }
assert(single == 42, "match single elem array")

# Match with function call in body
fn double(x) => x * 2
let m_fn = match 5 { n => double(n) }
assert(m_fn == 10, "match with fn call")

# Match true literal
let t = match true { true => 1, false => 0 }
assert(t == 1, "match true literal")

print("advanced-match: all passed")
